import { useEffect, useState } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { LayerId, LayerMeta } from '../types';
import { LAYERS } from '../utils/constants';
import type { FacilityDataByLayer, LayerCollection } from './useFacilityData';

// Layers read from Parquet. Regulatory is polygon-heavy and small enough that
// the GeoJSON path remains the right choice for it, so we skip it here and
// fall back to fetching regulatory-zones.geojson directly.
const POINT_LAYERS = new Set<LayerId>([
  'datacenters-google',
  'datacenters-aws',
  'datacenters-azure',
  'ai-facilities',
  'fabs',
  'money-flow',
  'patents',
  'export-controls',
]);
const ARC_LAYERS = new Set<LayerId>(['supply-trade', 'coauthorship']);
const GEOJSON_ONLY = new Set<LayerId>(['regulatory-zones', 'supply-arcs']);

function parquetUrl(id: LayerId): string {
  return `/data/parquet/${id}.parquet`;
}

async function loadPointLayerFromParquet(meta: LayerMeta): Promise<LayerCollection> {
  const { registerParquet, queryRows } = await import('../utils/duckdb');
  await registerParquet(meta.id, parquetUrl(meta.id));
  const rows = await queryRows<Record<string, unknown>>(
    `SELECT * FROM read_parquet('${meta.id}.parquet')`,
  );
  const features = rows.map((row) => {
    const { lng, lat, ...rest } = row as { lng: number; lat: number } & Record<string, unknown>;
    return {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [Number(lng), Number(lat)] },
      properties: rest,
    };
  });
  return {
    type: 'FeatureCollection',
    features,
  } as unknown as FeatureCollection<Geometry, Record<string, unknown>>;
}

async function loadArcLayerFromParquet(meta: LayerMeta): Promise<LayerCollection> {
  const { registerParquet, queryRows } = await import('../utils/duckdb');
  await registerParquet(meta.id, parquetUrl(meta.id));
  const rows = await queryRows<Record<string, unknown>>(
    `SELECT * FROM read_parquet('${meta.id}.parquet')`,
  );
  const features = rows.map((row) => {
    const r = row as {
      from_lng: number;
      from_lat: number;
      to_lng: number;
      to_lat: number;
    } & Record<string, unknown>;
    const { from_lng, from_lat, to_lng, to_lat, ...rest } = r;
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [Number(from_lng), Number(from_lat)],
          [Number(to_lng), Number(to_lat)],
        ],
      },
      properties: rest,
    };
  });
  return {
    type: 'FeatureCollection',
    features,
  } as unknown as FeatureCollection<Geometry, Record<string, unknown>>;
}

async function loadGeoJsonFallback(meta: LayerMeta): Promise<LayerCollection> {
  const res = await fetch(meta.url);
  if (!res.ok) throw new Error(`Failed to load ${meta.url}: ${res.status}`);
  return (await res.json()) as LayerCollection;
}

export function useFacilityDataParquet(enabled: boolean = true): {
  data: FacilityDataByLayer;
  loaded: boolean;
  error: Error | null;
} {
  const initial = Object.fromEntries(LAYERS.map((l) => [l.id, null])) as FacilityDataByLayer;
  const [data, setData] = useState<FacilityDataByLayer>(initial);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          LAYERS.map(async (layer) => {
            let fc: LayerCollection;
            if (GEOJSON_ONLY.has(layer.id)) {
              fc = await loadGeoJsonFallback(layer);
            } else if (POINT_LAYERS.has(layer.id)) {
              fc = await loadPointLayerFromParquet(layer);
            } else if (ARC_LAYERS.has(layer.id)) {
              fc = await loadArcLayerFromParquet(layer);
            } else {
              fc = await loadGeoJsonFallback(layer);
            }
            return [layer.id, fc] as const;
          }),
        );
        if (cancelled) return;
        const next = { ...initial };
        for (const [id, fc] of entries) next[id] = fc;
        setData(next);
        setLoaded(true);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data, loaded, error };
}
