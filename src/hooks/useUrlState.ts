import {
  useQueryState,
  parseAsFloat,
  parseAsArrayOf,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
} from 'nuqs';
import {
  LAYER_IDS,
  INITIAL_VIEW,
  TIMELINE_MIN_YEAR,
  TIMELINE_MAX_YEAR,
} from '../utils/constants';
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

// Phase 4 timeline. URL params:
//   t0 — window start year (inclusive)
//   t1 — window end year   (inclusive)
//   play — 1 / 0 — animate the window's right edge forward at TIMELINE_PLAY_RATE
// Defaults are the full range (every layer visible) and not playing.
export function useUrlTimeline(): {
  t0: number;
  t1: number;
  play: boolean;
  setT0: (n: number) => void;
  setT1: (n: number) => void;
  setPlay: (b: boolean) => void;
} {
  const [t0, setT0Raw] = useQueryState(
    't0',
    parseAsInteger.withDefault(TIMELINE_MIN_YEAR),
  );
  const [t1, setT1Raw] = useQueryState(
    't1',
    parseAsInteger.withDefault(TIMELINE_MAX_YEAR),
  );
  const [play, setPlayRaw] = useQueryState('play', parseAsBoolean.withDefault(false));
  return {
    t0,
    t1,
    play,
    setT0: (n) => {
      void setT0Raw(n);
    },
    setT1: (n) => {
      void setT1Raw(n);
    },
    setPlay: (b) => {
      void setPlayRaw(b);
    },
  };
}
