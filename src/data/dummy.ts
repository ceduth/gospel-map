import { CityData, DataSource, HourlyMetric } from '@/types';

export const cities: CityData[] = [
  { id: 'nyc', name: 'New York', country: 'USA', lat: 40.7128, lng: -74.006 },
  { id: 'la', name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
  { id: 'chicago', name: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298 },
  { id: 'london', name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { id: 'sydney', name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { id: 'mumbai', name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777 },
  { id: 'dubai', name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { id: 'berlin', name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { id: 'toronto', name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { id: 'saopaulo', name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333 },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { id: 'cairo', name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { id: 'manila', name: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842 },
  { id: 'seoul', name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
  { id: 'mexico', name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
];

export const dataSources: DataSource[] = ['app', 'web', 'ga4', 'youtube', 'nextsteps'];

export const sourceColors: Record<DataSource, string> = {
  app: '#3b82f6',      
  web: '#10b981',      
  ga4: '#f59e0b',     
  youtube: '#ef4444', 
  nextsteps: '#8b5cf6',
};

// Generate random metrics with some realistic patterns
function generateMetric(cityId: string, hour: number, source: DataSource): HourlyMetric {
  const sourceMultiplier: Record<DataSource, number> = {
    youtube: 1.5,
    web: 1.2,
    app: 1.0,
    ga4: 0.8,
    nextsteps: 0.5,
  };

  const hourMultiplier = Math.sin((hour - 6) * Math.PI / 12) * 0.5 + 0.5;
  
  const baseViews = Math.floor(Math.random() * 50 + 10);
  const views = Math.floor(baseViews * sourceMultiplier[source] * (hourMultiplier + 0.3));
  
  const exposureRate = 0.1 + Math.random() * 0.2;
  const exposures = Math.floor(views * exposureRate);

  return {
    hour,
    views,
    exposures,
    source,
    cityId,
  };
}

export function generateDummyData(): HourlyMetric[] {
  const metrics: HourlyMetric[] = [];
  
  for (const city of cities) {
    for (let hour = 0; hour < 24; hour++) {
      for (const source of dataSources) {
        if (Math.random() > 0.2) {
          metrics.push(generateMetric(city.id, hour, source));
        }
      }
    }
  }
  
  return metrics;
}

export const dummyMetrics = generateDummyData();

export function getHourData(hour: number, metrics: HourlyMetric[] = dummyMetrics) {
  return metrics.filter(m => m.hour === hour);
}

export function aggregateByCityHour(
  hour: number,
  metrics: HourlyMetric[] = dummyMetrics,
  sourceFilter?: DataSource[],
  showViews = true,
  showExposures = true
) {
  const hourMetrics = metrics.filter(m => {
    if (m.hour !== hour) return false;
    if (sourceFilter && sourceFilter.length > 0 && !sourceFilter.includes(m.source)) return false;
    return true;
  });

  const cityMap = new Map<string, {
    views: number;
    exposures: number;
    bySource: Record<DataSource, { views: number; exposures: number }>;
  }>();

  for (const metric of hourMetrics) {
    if (!cityMap.has(metric.cityId)) {
      cityMap.set(metric.cityId, {
        views: 0,
        exposures: 0,
        bySource: {
          app: { views: 0, exposures: 0 },
          web: { views: 0, exposures: 0 },
          ga4: { views: 0, exposures: 0 },
          youtube: { views: 0, exposures: 0 },
          nextsteps: { views: 0, exposures: 0 },
        },
      });
    }
    
    const cityData = cityMap.get(metric.cityId)!;
    cityData.views += metric.views;
    cityData.exposures += metric.exposures;
    cityData.bySource[metric.source].views += metric.views;
    cityData.bySource[metric.source].exposures += metric.exposures;
  }

  return cities
    .filter(city => cityMap.has(city.id))
    .map(city => ({
      city,
      hour,
      views: showViews ? cityMap.get(city.id)!.views : 0,
      exposures: showExposures ? cityMap.get(city.id)!.exposures : 0,
      bySource: cityMap.get(city.id)!.bySource,
    }));
}

export function getHourlyTotals(
  metrics: HourlyMetric[] = dummyMetrics,
  sourceFilter?: DataSource[]
) {
  const totals: { hour: number; views: number; exposures: number }[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const hourMetrics = metrics.filter(m => {
      if (m.hour !== hour) return false;
      if (sourceFilter && sourceFilter.length > 0 && !sourceFilter.includes(m.source)) return false;
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