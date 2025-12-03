import { DataSource, RawMetric, AggregatedLocation, LocationData } from '@/types';
import { parseISO, parse } from 'date-fns';

const SOURCE_TABLE_MAP: Record<string, DataSource> = {
  'prod_fact_web': 'web',
  'prod_fact_ga4': 'app',
  'prod_fact_ns': 'nextsteps',
  'prod_fact_oracle': 'youtube',
};

export const dataSources: DataSource[] = ['app', 'web', 'youtube', 'nextsteps'];

export const sourceColors: Record<DataSource, string> = {
  app: '#8b5cf6',      // purple
  web: '#f59e0b',      // amber
  youtube: '#ef4444',  // red
  nextsteps: '#ec4899', // pink
};

function parseTimestamp(timestamp: string): Date {
  try {
    const date = parseISO(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {}
  
  try {
    const date = parse(timestamp, 'yyyy-MM-dd HH:mm:ss.SSSSSS z', new Date());
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {}
  
  // Fallback
  const normalized = timestamp.replace(' ', 'T').replace(' UTC', 'Z');
  return new Date(normalized);
}

export async function loadMetrics(): Promise<RawMetric[]> {
  const res = await fetch('/data.csv');
  const text = await res.text();
  const lines = text.trim().split('\n');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    
    // Parse new CSV format: event_timestamp,event_view_count,latitude,longitude,Language_JFProd,media_component_title,source_table
    const timestamp = parseTimestamp(values[0]?.trim() || '');
    const eventViewCount = parseInt(values[1], 10);
    const lat = parseFloat(values[2]);
    const lng = parseFloat(values[3]);
    const sourceTable = values[6]?.trim();
    
    // Map to existing RawMetric format
    const source = SOURCE_TABLE_MAP[sourceTable] || 'web';
    
    // Calculate journeyViews: only nextsteps contributes
    // views: all sources contribute
    const journeyViews = source === 'nextsteps' ? eventViewCount : 0;
    
    return {
      date: timestamp.toISOString().split('T')[0],
      hour: timestamp.getUTCHours(),
      source: source,
      lat: lat,
      lng: lng,
      country: 'Unknown',
      views: eventViewCount,
      journeyViews: journeyViews,
    };
  });
}

export function aggregateByLocationHour(
  hour: number,
  metrics: RawMetric[],
  sourceFilter?: DataSource[],
  showViews = true,
  showJourneyViews = true
): AggregatedLocation[] {
  const hourMetrics = metrics.filter(m => {
    if (m.hour !== hour) return false;
    if (sourceFilter && !sourceFilter.includes(m.source)) return false;
    return true;
  });

  const locationMap = new Map<string, {
    location: LocationData;
    views: number;
    journeyViews: number;
    bySource: Record<DataSource, { views: number; journeyViews: number }>;
  }>();

  for (const metric of hourMetrics) {
    const id = `${metric.lat},${metric.lng}`;

    if (!locationMap.has(id)) {
      locationMap.set(id, {
        location: { id, lat: metric.lat, lng: metric.lng, country: metric.country },
        views: 0,
        journeyViews: 0,
        bySource: {
          app: { views: 0, journeyViews: 0 },
          web: { views: 0, journeyViews: 0 },
          youtube: { views: 0, journeyViews: 0 },
          nextsteps: { views: 0, journeyViews: 0 },
        },
      });
    }

    const data = locationMap.get(id)!;
    data.views += metric.views;
    data.journeyViews += metric.journeyViews;
    data.bySource[metric.source].views += metric.views;
    data.bySource[metric.source].journeyViews += metric.journeyViews;
  }

  return Array.from(locationMap.values()).map(d => ({
    location: d.location,
    hour,
    views: showViews ? d.views : 0,
    journeyViews: showJourneyViews ? d.journeyViews : 0,
    bySource: d.bySource,
  }));
}

export function getHourlyTotals(
  metrics: RawMetric[],
  sourceFilter?: DataSource[]
): { hour: number; views: number; journeyViews: number }[] {
  const totals: { hour: number; views: number; journeyViews: number }[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const hourMetrics = metrics.filter(m => {
      if (m.hour !== hour) return false;
      if (sourceFilter && !sourceFilter.includes(m.source)) return false;
      return true;
    });

    totals.push({
      hour,
      views: hourMetrics.reduce((sum, m) => sum + m.views, 0),
      journeyViews: hourMetrics.reduce((sum, m) => sum + m.journeyViews, 0),
    });
  }

  return totals;
}