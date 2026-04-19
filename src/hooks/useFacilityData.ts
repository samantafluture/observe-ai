import { useEffect, useState } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { LayerId } from '../types';
import { LAYERS } from '../utils/constants';

export type LayerCollection = FeatureCollection<Geometry, Record<string, unknown>>;
export type FacilityDataByLayer = Record<LayerId, LayerCollection | null>;

const initial: FacilityDataByLayer = Object.fromEntries(
  LAYERS.map((l) => [l.id, null]),
) as FacilityDataByLayer;

export function useFacilityData(): {
  data: FacilityDataByLayer;
  loaded: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<FacilityDataByLayer>(initial);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
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
  }, []);

  return { data, loaded, error };
}
