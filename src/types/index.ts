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
  | 'supply-trade'
  | 'patents'
  | 'export-controls'
  | 'coauthorship'
  | 'esg'
  | 'ai-jobs';

export type LayerKind =
  | 'facility'
  | 'regulatory'
  | 'supply'
  | 'money'
  | 'trade'
  | 'patent'
  | 'export-control'
  | 'coauthorship'
  | 'esg'
  | 'job-posting';

export type LayerCategory =
  | 'compute'
  | 'ai'
  | 'semiconductor'
  | 'regulatory'
  | 'supply'
  | 'money'
  | 'research'
  | 'environment'
  | 'labor';

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
  effective_year?: number;
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
  year?: number;
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

export interface PatentProperties {
  id: string;
  city: string;
  country: string;
  year: number;
  count: number;
  top_assignee?: string;
  provenance?: Provenance;
}

export type PatentFeature = Feature<Point, PatentProperties>;
export type PatentCollection = FeatureCollection<Point, PatentProperties>;

export interface ExportControlProperties {
  id: string;
  name: string;
  list_name: string;
  country: string;
  listed_year: number;
  provenance?: Provenance;
}

export type ExportControlFeature = Feature<Point, ExportControlProperties>;
export type ExportControlCollection = FeatureCollection<Point, ExportControlProperties>;

export interface CoauthorshipProperties {
  id: string;
  from_id: string;
  to_id: string;
  from_name: string;
  to_name: string;
  year: number;
  weight: number;
  provenance?: Provenance;
}

export type CoauthorshipFeature = Feature<LineString, CoauthorshipProperties>;
export type CoauthorshipCollection = FeatureCollection<LineString, CoauthorshipProperties>;

// Phase 5 — ESG (energy + water) annotation for a facility, one record per
// facility/year. Joins to FacilityProperties.id via `facility_id`.
export interface EsgProperties {
  id: string;
  facility_id: string;
  operator: string;
  facility_name: string;
  country?: string;
  year: number;
  energy_mwh: number;  // electricity consumption, MWh/yr
  water_m3: number;    // freshwater withdrawal, m³/yr
  pue?: number;        // power usage effectiveness (fleet avg if facility-level unavailable)
  provenance?: Provenance;
}

export type EsgFeature = Feature<Point, EsgProperties>;
export type EsgCollection = FeatureCollection<Point, EsgProperties>;

// Phase 5 — AI job postings / concentrations at a city. Count of active
// postings in `year` matching AI-relevant SOC codes (15-1299.09 etc).
export interface JobPostingProperties {
  id: string;
  city: string;
  country: string;
  year: number;
  postings: number;
  source: string;  // e.g. "BLS OEWS", "Lightcast (sampled)"
  provenance?: Provenance;
}

export type JobPostingFeature = Feature<Point, JobPostingProperties>;
export type JobPostingCollection = FeatureCollection<Point, JobPostingProperties>;

export type AnyFeature =
  | FacilityFeature
  | RegulatoryFeature
  | SupplyArcFeature
  | MoneyFlowFeature
  | TradeArcFeature
  | PatentFeature
  | ExportControlFeature
  | CoauthorshipFeature
  | EsgFeature
  | JobPostingFeature;

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

export interface PatentLayerMeta extends LayerMetaBase {
  kind: 'patent';
  color: [number, number, number];
}

export interface ExportControlLayerMeta extends LayerMetaBase {
  kind: 'export-control';
  color: [number, number, number];
}

export interface CoauthorshipLayerMeta extends LayerMetaBase {
  kind: 'coauthorship';
  color: [number, number, number];
}

export interface EsgLayerMeta extends LayerMetaBase {
  kind: 'esg';
  color: [number, number, number];
}

export interface JobPostingLayerMeta extends LayerMetaBase {
  kind: 'job-posting';
  color: [number, number, number];
}

export type LayerMeta =
  | FacilityLayerMeta
  | RegulatoryLayerMeta
  | SupplyLayerMeta
  | MoneyLayerMeta
  | TradeLayerMeta
  | PatentLayerMeta
  | ExportControlLayerMeta
  | CoauthorshipLayerMeta
  | EsgLayerMeta
  | JobPostingLayerMeta;

export interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}
