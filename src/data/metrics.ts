import { DataSource, RawMetric, AggregatedLocation, LocationData } from '@/types';
import { parseISO, parse } from 'date-fns';

const debug = (...args: any[]) => process.env.NEXT_PUBLIC_DEBUG_METRICS && console.log('[Metrics]', ...args);

export const dataSources: DataSource[] = ['app', 'web'];

export const sourceColors: Record<DataSource, string> = {
  app: '#8b5cf6',
  web: '#f59e0b',
};

function parseTimestamp(timestamp: string): Date {
  try {
    const date = parseISO(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch { }

  try {
    const date = parse(timestamp, 'yyyy-MM-dd HH:mm:ss.SSSSSS z', new Date());
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch { }

  // Fallback
  const normalized = timestamp.replace(' ', 'T').replace(' UTC', 'Z');
  return new Date(normalized);
}

function isValidCoordinate(lat: number, lng: number): boolean {
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

export async function loadMetrics(): Promise<RawMetric[]> {
  // Demo mode - skip API, use local CSV
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    debug('Demo mode enabled, using local CSV');
    const res = await fetch('/data.csv');
    const text = await res.text();
    return parseMetricsCSV(text, false);
  }

  try {
    // Try BigQuery API first
    const res = await fetch('/api/metrics');

    if (!res.ok) {
      throw new Error(`API fetch failed: ${res.status}`);
    }

    const text = await res.text();
    debug('API response first 500 chars:', text.substring(0, 500));
    
    const metrics = parseMetricsCSV(text, true);
    
    // Debug: count by source
    const sourceCounts = metrics.reduce((acc, m) => {
      acc[m.source] = (acc[m.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    debug('Metrics by source:', sourceCounts);
    debug('Total metrics loaded:', metrics.length);
    
    return metrics;

  } catch (error) {
    console.error('Failed to load from API:', error);

    // Check if fallback is disabled
    if (process.env.NEXT_PUBLIC_DISABLE_CSV_FALLBACK === 'true') {
      debug('CSV fallback disabled, returning empty');
      return [];
    }

    debug('Falling back to local CSV...');
    // Fallback to local CSV for development
    const res = await fetch('/data.csv');
    const text = await res.text();
    return parseMetricsCSV(text, false);
  }
}

function parseMetricsCSV(text: string, hasViewCount: boolean): RawMetric[] {
  const lines = text.trim().split('\n');
  debug(`Parsing CSV: ${lines.length} lines, hasViewCount=${hasViewCount}`);
  
  const platformValues = new Set<string>();
  
  const metrics = lines.slice(1)
    .map(line => {
      const values = parseCSVLine(line);

      if (hasViewCount) {
        // API format: event_timestamp,event_view_count,latitude,longitude,Language_JFProd,media_component_title,platform
        const timestamp = parseTimestamp(values[0] || '');
        const eventViewCount = parseInt(values[1], 10) || 1;
        const lat = parseFloat(values[2]) || 0;
        const lng = parseFloat(values[3]) || 0;
        const platform = (values[6] || 'web').trim() as DataSource;
        
        platformValues.add(platform);

        return {
          date: timestamp.toISOString().split('T')[0],
          hour: timestamp.getUTCHours(),
          source: platform,
          lat: lat,
          lng: lng,
          country: 'Unknown',
          views: eventViewCount,
        };
      } else {
        // Fallback CSV format: event_timestamp,latitude,longitude,Language_JFProd,media_component_title,platform
        const timestamp = parseTimestamp(values[0] || '');
        const lat = parseFloat(values[1]) || 0;
        const lng = parseFloat(values[2]) || 0;
        const platform = (values[5] || 'web').trim() as DataSource;
        
        platformValues.add(platform);

        return {
          date: timestamp.toISOString().split('T')[0],
          hour: timestamp.getUTCHours(),
          source: platform,
          lat: lat,
          lng: lng,
          country: 'Unknown',
          views: 1,
        };
      }
    })
    .filter(metric => isValidCoordinate(metric.lat, metric.lng));
  
  debug('Platform values found:', Array.from(platformValues));
  return metrics;
}

export function aggregateByLocationHour(
  hour: number,
  metrics: RawMetric[],
  sourceFilter?: DataSource[],
  showViews = true
): AggregatedLocation[] {
  const hourMetrics = metrics.filter(m => {
    if (m.hour !== hour) return false;
    if (sourceFilter && !sourceFilter.includes(m.source)) return false;
    return true;
  });

  // Debug: log once per unique hour
  if (hour === 0) {
    debug(`aggregateByLocationHour: hour=${hour}, sourceFilter=${sourceFilter}, matching=${hourMetrics.length}`);
  }

  const locationMap = new Map<string, {
    location: LocationData;
    views: number;
    bySource: Record<DataSource, { views: number }>;
  }>();

  for (const metric of hourMetrics) {
    const id = `${metric.lat},${metric.lng}`;

    if (!locationMap.has(id)) {
      locationMap.set(id, {
        location: { id, lat: metric.lat, lng: metric.lng, country: metric.country },
        views: 0,
        bySource: {
          app: { views: 0 },
          web: { views: 0 },
        },
      });
    }

    const data = locationMap.get(id)!;
    data.views += metric.views;
    data.bySource[metric.source].views += metric.views;
  }

  return Array.from(locationMap.values()).map(d => ({
    location: d.location,
    hour,
    views: showViews ? d.views : 0,
    bySource: d.bySource,
  }));
}

export function getHourlyTotals(
  metrics: RawMetric[],
  sourceFilter?: DataSource[]
): { hour: number; views: number }[] {
  
  const totals: { hour: number; views: number }[] = [];
  if (!metrics || metrics.length === 0) {
    debug('getHourlyTotals: no metrics, returning empty');
    // Return 24 empty hours to prevent errors
    for (let hour = 0; hour < 24; hour++) {
      totals.push({ hour, views: 0 });
    }
    return totals;
  }

  for (let hour = 0; hour < 24; hour++) {
    const hourMetrics = metrics.filter(m => {
      if (m.hour !== hour) return false;
      if (sourceFilter && !sourceFilter.includes(m.source)) return false;
      return true;
    });

    totals.push({
      hour,
      views: hourMetrics.reduce((sum, m) => sum + m.views, 0),
    });
  }

  // Debug: log total views
  const totalViews = totals.reduce((sum, t) => sum + t.views, 0);
  debug(`getHourlyTotals: sourceFilter=${sourceFilter}, totalViews=${totalViews}`);

  return totals;
}