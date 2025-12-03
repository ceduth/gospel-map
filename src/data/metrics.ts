import { DataSource, RawMetric, AggregatedLocation, LocationData } from '@/types';

export const dataSources: DataSource[] = ['app', 'web', 'me2', 'youtube', 'nextsteps'];

export const sourceColors: Record<DataSource, string> = {
  app: '#8b5cf6',      // purple (was blue)
  web: '#f59e0b',      // amber (was emerald)
  me2: '#f59e0b',      // amber (keep for data compatibility)
  youtube: '#ef4444',  // red (keep for data compatibility)
  nextsteps: '#ec4899', // pink (was purple)
};

export async function loadMetrics(): Promise<RawMetric[]> {
  const res = await fetch('/data.csv');
  const text = await res.text();
  const lines = text.trim().split('\n');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      date: values[0],
      hour: parseInt(values[1], 10),
      source: values[2] as DataSource,
      lat: parseFloat(values[3]),
      lng: parseFloat(values[4]),
      country: values[5],
      views: parseInt(values[6], 10),
      exposures: parseInt(values[7], 10),
    };
  });
}

export function aggregateByLocationHour(
  hour: number,
  metrics: RawMetric[],
  sourceFilter?: DataSource[],
  showViews = true,
  showExposures = true
): AggregatedLocation[] {
  const hourMetrics = metrics.filter(m => {
    if (m.hour !== hour) return false;
    if (sourceFilter && !sourceFilter.includes(m.source)) return false;
    return true;
  });

  const locationMap = new Map<string, {
    location: LocationData;
    views: number;
    exposures: number;
    bySource: Record<DataSource, { views: number; exposures: number }>;
  }>();

  for (const metric of hourMetrics) {
    const id = `${metric.lat},${metric.lng}`;

    if (!locationMap.has(id)) {
      locationMap.set(id, {
        location: { id, lat: metric.lat, lng: metric.lng, country: metric.country },
        views: 0,
        exposures: 0,
        bySource: {
          app: { views: 0, exposures: 0 },
          web: { views: 0, exposures: 0 },
          me2: { views: 0, exposures: 0 },
          youtube: { views: 0, exposures: 0 },
          nextsteps: { views: 0, exposures: 0 },
        },
      });
    }

    const data = locationMap.get(id)!;
    data.views += metric.views;
    if (metric.source === 'nextsteps') { data.exposures += metric.exposures; }  // Journey Views only count NextSteps source
    data.bySource[metric.source].views += metric.views;
    data.bySource[metric.source].exposures += metric.exposures;
  }

  return Array.from(locationMap.values()).map(d => ({
    location: d.location,
    hour,
    views: showViews ? d.views : 0,
    exposures: showExposures ? d.exposures : 0,
    bySource: d.bySource,
  }));
}

export function getHourlyTotals(
  metrics: RawMetric[],
  sourceFilter?: DataSource[]
): { hour: number; views: number; exposures: number }[] {
  const totals: { hour: number; views: number; exposures: number }[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const hourMetrics = metrics.filter(m => {
      if (m.hour !== hour) return false;
      if (sourceFilter && !sourceFilter.includes(m.source)) return false;
      return true;
    });

    totals.push({
      hour,
      views: hourMetrics.reduce((sum, m) => sum + m.views, 0),
      exposures: hourMetrics.reduce((sum, m) => sum + m.exposures, 0),
    });
  }

  return totals;
}