import { useQueryState, parseAsFloat, parseAsArrayOf, parseAsString } from 'nuqs';
import { LAYER_IDS, INITIAL_VIEW } from '../utils/constants';
import type { LayerId } from '../types';

export function useUrlViewState() {
  const [longitude, setLongitude] = useQueryState(
    'lng',
    parseAsFloat.withDefault(INITIAL_VIEW.longitude),
  );
  const [latitude, setLatitude] = useQueryState(
    'lat',
    parseAsFloat.withDefault(INITIAL_VIEW.latitude),
  );
  const [zoom, setZoom] = useQueryState('z', parseAsFloat.withDefault(INITIAL_VIEW.zoom));
  return { longitude, setLongitude, latitude, setLatitude, zoom, setZoom };
}

const layersParser = parseAsArrayOf(parseAsString).withDefault(LAYER_IDS as unknown as string[]);

export function useUrlLayers(): [LayerId[], (next: LayerId[]) => void] {
  const [raw, setRaw] = useQueryState('layers', layersParser);
  const valid = raw.filter((v): v is LayerId => (LAYER_IDS as string[]).includes(v));
  return [
    valid,
    (next) => {
      void setRaw(next as unknown as string[]);
    },
  ];
}

export function useUrlSelected(): [string | null, (id: string | null) => void] {
  const [sel, setSel] = useQueryState('sel');
  return [
    sel,
    (id) => {
      void setSel(id);
    },
  ];
}
