import type { LayerMeta, LayerId } from '../types';
import { OPERATOR_COLOR } from './colors';

export const LAYERS: LayerMeta[] = [
  {
    id: 'datacenters-google',
    label: 'Google Cloud',
    category: 'compute',
    url: '/data/datacenters-google.geojson',
    color: OPERATOR_COLOR.Google,
  },
  {
    id: 'datacenters-aws',
    label: 'AWS',
    category: 'compute',
    url: '/data/datacenters-aws.geojson',
    color: OPERATOR_COLOR.AWS,
  },
  {
    id: 'datacenters-azure',
    label: 'Azure',
    category: 'compute',
    url: '/data/datacenters-azure.geojson',
    color: OPERATOR_COLOR.Azure,
  },
  {
    id: 'ai-facilities',
    label: 'AI Labs',
    category: 'ai',
    url: '/data/ai-facilities.geojson',
    color: [200, 255, 160],
  },
];

export const LAYER_IDS: LayerId[] = LAYERS.map((l) => l.id);

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
