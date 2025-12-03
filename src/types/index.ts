export type DataSource = 'app' | 'web' | 'youtube' | 'nextsteps';

export interface RawMetric {
  date: string;
  hour: number;
  source: DataSource;
  lat: number;
  lng: number;
  country: string;
  views: number;
  journeyViews: number;
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
  journeyViews: number;
  bySource: Record<DataSource, { views: number; journeyViews: number }>;
}