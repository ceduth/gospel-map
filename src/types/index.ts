export type DataSource = 'app' | 'web';

export interface RawMetric {
  date: string;
  hour: number;
  source: DataSource;
  lat: number;
  lng: number;
  country: string;
  views: number;
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
  bySource: Record<DataSource, { views: number }>;
}