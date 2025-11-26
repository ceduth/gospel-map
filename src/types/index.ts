export type DataSource = 'app' | 'web' | 'ga4' | 'youtube' | 'nextsteps';

export interface CityData {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export interface HourlyMetric {
  hour: number; // 0-23
  views: number;
  exposures: number;
  source: DataSource;
  cityId: string;
}

export interface CityHourlyData {
  city: CityData;
  metrics: HourlyMetric[];
}

export interface AggregatedCityHour {
  city: CityData;
  hour: number;
  views: number;
  exposures: number;
  bySource: Record<DataSource, { views: number; exposures: number }>;
}