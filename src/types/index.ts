import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon, LineString, Geometry } from 'geojson';

export type FacilityType = 'datacenter' | 'ai_facility' | 'fab';

export type LayerId =
  | 'datacenters-google'
  | 'datacenters-aws'
  | 'datacenters-azure'
  | 'ai-facilities'
  | 'fabs'
  | 'regulatory-zones'
  | 'supply-arcs';

export type LayerKind = 'facility' | 'regulatory' | 'supply';

export type LayerCategory = 'compute' | 'ai' | 'semiconductor' | 'regulatory' | 'supply';

export type Regime =
  | 'strict'
  | 'executive-order'
  | 'state-directed'
  | 'emerging'
  | 'minimal';

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
  // Fab-specific (optional)
  node_nm?: number;
  wafer_size_mm?: number;
}

export type FacilityFeature = Feature<Point, FacilityProperties>;
export type FacilityCollection = FeatureCollection<Point, FacilityProperties>;

export interface RegulatoryProperties {
  id: string;
  country_iso: string;
  country_name: string;
  regime: Regime;
  key_policies?: string[];
}

export type RegulatoryFeature = Feature<Polygon | MultiPolygon, RegulatoryProperties>;
export type RegulatoryCollection = FeatureCollection<Polygon | MultiPolygon, RegulatoryProperties>;

export interface SupplyArcProperties {
  id: string;
  from_id: string;
  to_id: string;
  weight?: number;
  label?: string;
}

export type SupplyArcFeature = Feature<LineString, SupplyArcProperties>;
export type SupplyArcCollection = FeatureCollection<LineString, SupplyArcProperties>;

export type AnyFeature = FacilityFeature | RegulatoryFeature | SupplyArcFeature;

export type AnyCollection = FeatureCollection<Geometry, Record<string, unknown>>;

interface LayerMetaBase {
  id: LayerId;
  label: string;
  category: LayerCategory;
  url: string;
}

export interface FacilityLayerMeta extends LayerMetaBase {
  kind: 'facility';
  color: [number, number, number];
}

export interface RegulatoryLayerMeta extends LayerMetaBase {
  kind: 'regulatory';
  palette: Record<Regime, [number, number, number]>;
}

export interface SupplyLayerMeta extends LayerMetaBase {
  kind: 'supply';
  color: [number, number, number];
}

export type LayerMeta = FacilityLayerMeta | RegulatoryLayerMeta | SupplyLayerMeta;

export interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}
