import { useEffect, useState } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { LayerId } from '../types';
import { LAYERS } from '../utils/constants';
import { useDataSource } from './useDataSource';
import { useFacilityDataParquet } from './useFacilityDataParquet';

export type LayerCollection = FeatureCollection<Geometry, Record<string, unknown>>;
export type FacilityDataByLayer = Record<LayerId, LayerCollection | null>;

const initial: FacilityDataByLayer = Object.fromEntries(
  LAYERS.map((l) => [l.id, null]),
) as FacilityDataByLayer;

/**
 * Loads every registered layer's FeatureCollection, picking the loader based
 * on the `?source=` URL flag.
 *
 *  - `geojson` (default) — fetch `/data/<id>.geojson` directly. Zero runtime
 *    cost. This is the Phase 1/2 path and stays the public default.
 *  - `parquet`            — bootstrap DuckDB-WASM and query Parquet mirrors
 *    written by the Phase 3 pipeline. Opt-in for analytical demos.
 */
export function useFacilityData(): {
  data: FacilityDataByLayer;
  loaded: boolean;
  error: Error | null;
} {
  const source = useDataSource();
  const parquet = useFacilityDataParquet(source === 'parquet');
  const geojson = useFacilityDataGeoJSON(source === 'geojson');
  return source === 'parquet' ? parquet : geojson;
}

function useFacilityDataGeoJSON(enabled: boolean) {
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
            const res = await fetch(layer.url);
            if (!res.ok) throw new Error(`Failed to load ${layer.url}: ${res.status}`);
            const json = (await res.json()) as LayerCollection;
            return [layer.id, json] as const;
          }),
        );
        if (cancelled) return;
        const next = { ...initial };
        for (const [id, json] of entries) next[id] = json;
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
