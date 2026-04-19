import type { LayerMeta, LayerId, LayerCategory } from '../types';
import { OPERATOR_COLOR, REGIME_COLOR } from './colors';

export const LAYERS: LayerMeta[] = [
  {
    kind: 'facility',
    id: 'datacenters-google',
    label: 'Google Cloud',
    category: 'compute',
    url: '/data/datacenters-google.geojson',
    color: OPERATOR_COLOR.Google,
  },
  {
    kind: 'facility',
    id: 'datacenters-aws',
    label: 'AWS',
    category: 'compute',
    url: '/data/datacenters-aws.geojson',
    color: OPERATOR_COLOR.AWS,
  },
  {
    kind: 'facility',
    id: 'datacenters-azure',
    label: 'Azure',
    category: 'compute',
    url: '/data/datacenters-azure.geojson',
    color: OPERATOR_COLOR.Azure,
  },
  {
    kind: 'facility',
    id: 'ai-facilities',
    label: 'AI Labs',
    category: 'ai',
    url: '/data/ai-facilities.geojson',
    color: [200, 255, 160],
  },
  {
    kind: 'facility',
    id: 'fabs',
    label: 'Semiconductor Fabs',
    category: 'semiconductor',
    url: '/data/fabs.geojson',
    color: [255, 200, 120],
  },
  {
    kind: 'regulatory',
    id: 'regulatory-zones',
    label: 'Regulatory Zones',
    category: 'regulatory',
    url: '/data/regulatory-zones.geojson',
    palette: REGIME_COLOR,
  },
  {
    kind: 'supply',
    id: 'supply-arcs',
    label: 'Supply Chain (curated)',
    category: 'supply',
    url: '/data/supply-arcs.geojson',
    color: [180, 220, 255],
  },
  {
    kind: 'trade',
    id: 'supply-trade',
    label: 'IC Trade (HS 8542)',
    category: 'supply',
    url: '/data/supply-trade.geojson',
    color: [150, 200, 240],
  },
  {
    kind: 'money',
    id: 'money-flow',
    label: 'Private AI Investment',
    category: 'money',
    url: '/data/money-flow.geojson',
    color: [255, 220, 120],
  },
  {
    kind: 'patent',
    id: 'patents',
    label: 'AI Patents (USPTO)',
    category: 'research',
    url: '/data/patents.geojson',
    color: [180, 140, 255],
  },
  {
    kind: 'export-control',
    id: 'export-controls',
    label: 'Export Controls (CSL)',
    category: 'regulatory',
    url: '/data/export-controls.geojson',
    color: [255, 110, 110],
  },
  {
    kind: 'coauthorship',
    id: 'coauthorship',
    label: 'Co-authorship (OpenAlex)',
    category: 'research',
    url: '/data/coauthorship.geojson',
    color: [120, 230, 220],
  },
  {
    kind: 'esg',
    id: 'esg',
    label: 'Energy + water (ESG)',
    category: 'environment',
    url: '/data/esg.geojson',
    color: [140, 220, 180],
  },
  {
    kind: 'job-posting',
    id: 'ai-jobs',
    label: 'AI job postings',
    category: 'labor',
    url: '/data/ai-jobs.geojson',
    color: [255, 180, 210],
  },
];

export const LAYER_IDS: LayerId[] = LAYERS.map((l) => l.id);

export const CATEGORIES: { id: LayerCategory; label: string }[] = [
  { id: 'compute', label: 'Compute' },
  { id: 'ai', label: 'AI labs' },
  { id: 'semiconductor', label: 'Semiconductors' },
  { id: 'regulatory', label: 'Regulation' },
  { id: 'supply', label: 'Supply chain' },
  { id: 'money', label: 'Money flow' },
  { id: 'research', label: 'Research' },
  { id: 'environment', label: 'Energy + water' },
  { id: 'labor', label: 'Labor' },
];

export const BASEMAP_COUNTRIES_URL = '/data/ne_110m_countries.geojson';
export const BASEMAP_LAND_URL = '/data/ne_110m_land.geojson';

export const INITIAL_VIEW = {
  longitude: -40,
  latitude: 20,
  zoom: 0.8,
  pitch: 0,
  bearing: 0,
  minZoom: 0,
  maxZoom: 8,
};

// Rotation speed in degrees per second when auto-rotate is on.
export const AUTO_ROTATE_DEG_PER_SEC = 4;

export const GLOBE_RESOLUTION = 5;

// Phase 4 timeline window (years). Spans from the earliest "opened" we know
// about (2005, GCP us-central1 era) through the current data year. The
// scrubber clamps within this band; default window is the full range.
export const TIMELINE_MIN_YEAR = 2005;
export const TIMELINE_MAX_YEAR = 2026;
// Speed of the play head when the timeline is animating, in years/second.
export const TIMELINE_PLAY_RATE = 1.2;
