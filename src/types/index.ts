export type DataSource = 'app' | 'web' | 'me2' | 'youtube' | 'nextsteps';

export interface RawMetric {
  date: string;
  hour: number;
  source: DataSource;
  lat: number;
  lng: number;
  country: string;
  views: number;
  exposures: number;
}

export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  country: string;
}

export interface AggregatedLocation {
  location: LocationData;
  hour: number;
  views: number;
  exposures: number;
  bySource: Record<DataSource, { views: number; exposures: number }>;
}