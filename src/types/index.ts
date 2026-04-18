import type { Feature, FeatureCollection, Point } from 'geojson';

export type FacilityType = 'datacenter' | 'ai_facility';

export type LayerId = 'datacenters-google' | 'datacenters-aws' | 'datacenters-azure' | 'ai-facilities';

export interface FacilityProperties {
  id: string;
  name: string;
  operator: string;
  type: FacilityType;
  country?: string;
  city?: string;
  region?: string;
  role?: string;
  opened?: number;
}

export type FacilityFeature = Feature<Point, FacilityProperties>;
export type FacilityCollection = FeatureCollection<Point, FacilityProperties>;

export interface LayerMeta {
  id: LayerId;
  label: string;
  category: 'compute' | 'ai';
  url: string;
  color: [number, number, number];
}

export interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}
