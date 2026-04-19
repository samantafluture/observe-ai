import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon, LineString, Geometry } from 'geojson';

export type FacilityType = 'datacenter' | 'ai_facility' | 'fab';

export type LayerId =
  | 'datacenters-google'
  | 'datacenters-aws'
  | 'datacenters-azure'
  | 'ai-facilities'
  | 'fabs'
  | 'regulatory-zones'
  | 'supply-arcs'
  | 'money-flow'
  | 'supply-trade';

export type LayerKind = 'facility' | 'regulatory' | 'supply' | 'money' | 'trade';

export type LayerCategory =
  | 'compute'
  | 'ai'
  | 'semiconductor'
  | 'regulatory'
  | 'supply'
  | 'money';

export interface Provenance {
  sources: string[];
  updated: string;
  confidence: number;
}

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
  provenance?: Provenance;
}

export type FacilityFeature = Feature<Point, FacilityProperties>;
export type FacilityCollection = FeatureCollection<Point, FacilityProperties>;

export interface RegulatoryProperties {
  id: string;
  country_iso: string;
  country_name: string;
  regime: Regime;
  key_policies?: string[];
  provenance?: Provenance;
}

export type RegulatoryFeature = Feature<Polygon | MultiPolygon, RegulatoryProperties>;
export type RegulatoryCollection = FeatureCollection<Polygon | MultiPolygon, RegulatoryProperties>;

export interface SupplyArcProperties {
  id: string;
  from_id: string;
  to_id: string;
  weight?: number;
  label?: string;
  provenance?: Provenance;
}

export type SupplyArcFeature = Feature<LineString, SupplyArcProperties>;
export type SupplyArcCollection = FeatureCollection<LineString, SupplyArcProperties>;

export interface MoneyFlowProperties {
  id: string;
  country_iso: string;
  country_name: string;
  year: number;
  amount_usd: number;
  provenance?: Provenance;
}

export type MoneyFlowFeature = Feature<Point, MoneyFlowProperties>;
export type MoneyFlowCollection = FeatureCollection<Point, MoneyFlowProperties>;

export interface TradeArcProperties {
  id: string;
  from_iso: string;
  to_iso: string;
  from_name: string;
  to_name: string;
  year: number;
  value_usd: number;
  hs_code: string;
  provenance?: Provenance;
}

export type TradeArcFeature = Feature<LineString, TradeArcProperties>;
export type TradeArcCollection = FeatureCollection<LineString, TradeArcProperties>;

export type AnyFeature =
  | FacilityFeature
  | RegulatoryFeature
  | SupplyArcFeature
  | MoneyFlowFeature
  | TradeArcFeature;

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

export interface MoneyLayerMeta extends LayerMetaBase {
  kind: 'money';
  color: [number, number, number];
}

export interface TradeLayerMeta extends LayerMetaBase {
  kind: 'trade';
  color: [number, number, number];
}

export type LayerMeta =
  | FacilityLayerMeta
  | RegulatoryLayerMeta
  | SupplyLayerMeta
  | MoneyLayerMeta
  | TradeLayerMeta;

export interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}
