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
];

export const LAYER_IDS: LayerId[] = LAYERS.map((l) => l.id);

export const CATEGORIES: { id: LayerCategory; label: string }[] = [
  { id: 'compute', label: 'Compute' },
  { id: 'ai', label: 'AI labs' },
  { id: 'semiconductor', label: 'Semiconductors' },
  { id: 'regulatory', label: 'Regulation' },
  { id: 'supply', label: 'Supply chain' },
  { id: 'money', label: 'Money flow' },
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
