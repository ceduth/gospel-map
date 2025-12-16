import { BigQueryReadClient } from '@google-cloud/bigquery-storage';
import { NextResponse } from 'next/server';
import path from 'path';
import avro from 'avro-js';

const debug = (...args: any[]) => process.env.DEBUG_BIGQUERY && console.log('[BQ]', ...args);

// Initialize BigQuery Storage Read API client
const client = new BigQueryReadClient({
  projectId: process.env.BIGQUERY_PROJECT_ID || 'jfp-data-warehouse',
  ...(process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) }
    : { keyFilename: path.join(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_PATH || 'service-account-key.json') }
  ),
});

const DATASET = process.env.BIGQUERY_DATASET || 'dbt_tcarvalho';

/**
 * Reads all rows from a BigQuery table using the Storage Read API.
 * This streams raw rows - no SQL aggregation available.
 */
async function readTable(tableName: string): Promise<any[]> {
  debug(`Reading table: ${tableName}`);
  
  const tablePath = client.tablePath(
    process.env.BIGQUERY_PROJECT_ID || 'jfp-data-warehouse',
    DATASET,
    tableName
  );
  debug(`Table path: ${tablePath}`);

  // Create a read session for the table
  const [session] = await client.createReadSession({
    parent: `projects/${process.env.BIGQUERY_PROJECT_ID || 'jfp-data-warehouse'}`,
    readSession: {
      table: tablePath,
      dataFormat: 'AVRO',
    },
    maxStreamCount: 1,
  });

  debug(`Session created for ${tableName}: streams=${session.streams?.length || 0}, estimatedRowCount=${session.estimatedRowCount || 'unknown'}`);
  
  if (!session.streams || session.streams.length === 0) {
    debug(`WARNING: No streams for ${tableName} - table may be empty`);
    return [];
  }

  const streamName = session.streams[0].name;
  const readRowsStream = await client.readRows({
    readStream: streamName,
    offset: 0,
  });

  const rows: any[] = [];
  
  // Parse AVRO schema from session
  let avroType: any = null;
  if (session.avroSchema?.schema) {
    debug(`${tableName} AVRO schema:`, session.avroSchema.schema);
    avroType = avro.parse(session.avroSchema.schema);
    debug(`AVRO schema parsed for ${tableName}`);
  } else {
    debug(`WARNING: No AVRO schema for ${tableName}`);
  }

  // Stream and decode AVRO rows
  let responseCount = 0;
  for await (const response of readRowsStream) {
    responseCount++;
    debug(`${tableName}: response #${responseCount}, hasAvroRows=${!!response.avroRows}, bufferLength=${response.avroRows?.serializedBinaryRows?.length || 0}`);
    
    if (response.avroRows && response.avroRows.serializedBinaryRows && avroType) {
      const buffer = response.avroRows.serializedBinaryRows;
      const decoder = avroType.createResolver(avroType);
      
      let offset = 0;
      let rowsInResponse = 0;
      while (offset < buffer.length) {
        try {
          const row = avroType.decode(buffer, offset, decoder);
          if (row) {
            rows.push(row.value);
            offset = row.offset;
            rowsInResponse++;
          } else {
            break;
          }
        } catch (e) {
          debug(`${tableName}: decode error at offset ${offset}:`, e);
          break;
        }
      }
      debug(`${tableName}: decoded ${rowsInResponse} rows from response #${responseCount}`);
    }
  }
  
  if (responseCount === 0) {
    debug(`WARNING: ${tableName} - No responses received from stream`);
  }

  debug(`${tableName}: total decoded ${rows.length} rows from ${responseCount} responses`);
  return rows;
}

/**
 * Extract primitive value from BigQuery AVRO field
 * AVRO wraps values like: {long: 123}, {double: 1.5}, {string: "foo"}
 */
function extractValue(field: any): string | number {
  if (field === null || field === undefined) return '';
  if (typeof field === 'object') {
    // AVRO union type wrappers
    if ('long' in field) return field.long;
    if ('double' in field) return field.double;
    if ('string' in field) return field.string;
    if ('int' in field) return field.int;
    if ('float' in field) return field.float;
    if ('value' in field) return extractValue(field.value);
    // Fallback: get first property
    const keys = Object.keys(field);
    if (keys.length > 0) return extractValue(field[keys[0]]);
    return '';
  }
  return field;
}

/**
 * Convert BigQuery microsecond timestamp to ISO string
 */
function formatTimestamp(microseconds: number): string {
  const ms = Math.floor(microseconds / 1000);
  return new Date(ms).toISOString();
}

/**
 * Aggregates rows by grouping key and summing event_view_count.
 * Mirrors the SQL: GROUP BY timestamp, lat, lng, language, title, platform
 */
function aggregateRows(rows: any[]): any[] {
  const map = new Map<string, any>();
  
  for (const row of rows) {
    // Extract primitive values BEFORE aggregation
    const rawTimestamp = extractValue(row.event_timestamp);
    const timestamp = typeof rawTimestamp === 'number' ? formatTimestamp(rawTimestamp) : rawTimestamp;
    const lat = extractValue(row.latitude);
    const lng = extractValue(row.longitude);
    const language = extractValue(row.Language_JFProd) || '';
    const title = extractValue(row.media_component_title) || '';
    const platform = extractValue(row.platform) || 'app';
    const viewCount = Number(extractValue(row.event_view_count)) || 1;
    
    const key = `${timestamp}|${lat}|${lng}|${language}|${title}|${platform}`;
    
    if (map.has(key)) {
      map.get(key).event_view_count += viewCount;
    } else {
      map.set(key, {
        event_timestamp: timestamp,
        event_view_count: viewCount,
        latitude: lat,
        longitude: lng,
        Language_JFProd: language,
        media_component_title: title,
        platform: platform,
      });
    }
  }
  
  return Array.from(map.values());
}

export async function GET() {
  try {
    // Read both tables in parallel
    debug('Starting to read tables...');
    
    const [ga4Rows, webRows] = await Promise.all([
      readTable('map_ga4').catch(err => {
        console.error('Error reading map_ga4:', err.message);
        return [];
      }),
      readTable('map_web').catch(err => {
        console.error('Error reading map_web:', err.message);
        return [];
      })
    ]);

    debug(`Raw rows fetched: ga4=${ga4Rows.length}, web=${webRows.length}`);
    
    // Debug: log first row structure to understand BigQuery field format
    if (ga4Rows.length > 0) {
      debug('Sample ga4 row structure:', JSON.stringify(ga4Rows[0], null, 2));
    }
    if (webRows.length > 0) {
      debug('Sample web row structure:', JSON.stringify(webRows[0], null, 2));
    } else {
      debug('WARNING: No web rows returned. Checking table access...');
    }
    
    // Normalize rows to match original SQL aggregation logic:
    // - map_ga4: SUM(event_view_count) - use actual event_view_count from each row
    // - map_web: COUNT(*) - each row counts as 1 view
    const normalizedGa4Rows = ga4Rows.map(row => ({
      ...row,
      event_view_count: row.event_view_count || 1,
    }));

    const normalizedWebRows = webRows.map(row => ({
      ...row,
      event_view_count: 1, // COUNT(*) = each row is 1
    }));

    // Combine and aggregate all rows
    const allRows = aggregateRows([...normalizedGa4Rows, ...normalizedWebRows]);
    
    // Format as CSV (values are already primitives from aggregation)
    const csvLines = ['event_timestamp,event_view_count,latitude,longitude,Language_JFProd,media_component_title,platform'];
    
    for (const row of allRows) {
      // Skip rows with invalid coordinates
      if (!row.latitude || !row.longitude || row.latitude === '' || row.longitude === '') continue;
      
      // Escape fields that might contain commas
      const escapeCsv = (val: string | number) => {
        const str = String(val);
        return str.includes(',') ? `"${str}"` : str;
      };
      
      const line = [
        row.event_timestamp,
        row.event_view_count,
        row.latitude,
        row.longitude,
        escapeCsv(row.Language_JFProd),
        escapeCsv(row.media_component_title),
        row.platform,
      ].join(',');
      csvLines.push(line);
    }

    const csv = csvLines.join('\n');
    
    debug(`Aggregated ${allRows.length} rows from ${ga4Rows.length} ga4 + ${webRows.length} web raw rows`);
    if (allRows.length > 0) {
      debug('Sample output row:', allRows[0]);
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });

  } catch (error) {
    console.error('BigQuery Storage Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics from BigQuery Storage' },
      { status: 500 }
    );
  }
}