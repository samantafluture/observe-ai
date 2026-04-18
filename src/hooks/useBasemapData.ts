import { useEffect, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { BASEMAP_COUNTRIES_URL, BASEMAP_LAND_URL } from '../utils/constants';

export function useBasemapData(): {
  countries: FeatureCollection | null;
  land: FeatureCollection | null;
  loaded: boolean;
} {
  const [countries, setCountries] = useState<FeatureCollection | null>(null);
  const [land, setLand] = useState<FeatureCollection | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, l] = await Promise.all([
        fetch(BASEMAP_COUNTRIES_URL).then((r) => r.json() as Promise<FeatureCollection>),
        fetch(BASEMAP_LAND_URL).then((r) => r.json() as Promise<FeatureCollection>),
      ]);
      if (cancelled) return;
      setCountries(c);
      setLand(l);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { countries, land, loaded };
}
