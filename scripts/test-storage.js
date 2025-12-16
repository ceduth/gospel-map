/**
 * export \
    BIGQUERY_DATASET=prod \
    GOOGLE_SERVICE_ACCOUNT_PATH=jfp-data-warehouse-a6d5290a031a.json
    node scripts/test-storage.js
 */

const { BigQueryReadClient } = require('@google-cloud/bigquery-storage');
const path = require('path');

async function testBigQueryStorage() {
  const client = new BigQueryReadClient({
    projectId: 'jfp-data-warehouse',
    keyFilename: path.join(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_PATH || 'service-account-key.json'),
  });

  try {
    // Create read session for map_ga4 table
    console.log(client)
    const tablePath = client.tablePath(
      process.env.BIGQUERY_PROJECT_ID || 'jfp-data-warehouse',
      process.env.BIGQUERY_DATASET || 'dbt_tcarvalho',
      'map_ga4'
    );

    console.log('Creating read session for:', tablePath);

    const [session] = await client.createReadSession({
      parent: `projects/jfp-data-warehouse`,
      readSession: {
        table: tablePath,
        dataFormat: 'AVRO',
      },
      maxStreamCount: 1,
    });

    console.log('Read session created:', session.name);
    console.log('Available streams:', session.streams.length);

    if (session.streams && session.streams.length > 0) {
      const streamName = session.streams[0].name;
      console.log('Reading from stream:', streamName);

      const readRowsStream = await client.readRows({
        readStream: streamName,
        offset: 0,
      });

      let rowCount = 0;
      let sampleRows = [];

      for await (const response of readRowsStream) {
        if (response.avroRows) {
          rowCount += response.rowCount || 0;
          
          // Collect first few rows as sample
          if (sampleRows.length < 5 && response.avroRows.serializedBinaryRows) {
            sampleRows.push(response.avroRows.serializedBinaryRows);
          }
        }
      }

      console.log(`Total rows read: ${rowCount}`);
      console.log('Sample data available:', sampleRows.length > 0);
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testBigQueryStorage();