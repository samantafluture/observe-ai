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

export type GlobeVariant = 'primary' | 'compare';

// Parameter name registry. Compare-mode mirrors the primary keys with a
// `cmp_` prefix so a deep link can encode both viewports independently.
const PARAMS = {
  primary: {
    lng: 'lng',
    lat: 'lat',
    z: 'z',
    layers: 'layers',
    sel: 'sel',
    t0: 't0',
    t1: 't1',
    play: 'play',
  },
  compare: {
    lng: 'cmp_lng',
    lat: 'cmp_lat',
    z: 'cmp_z',
    layers: 'cmp_layers',
    sel: 'cmp_sel',
    t0: 'cmp_t0',
    t1: 'cmp_t1',
    play: 'cmp_play',
  },
} as const;

export function useUrlViewState(variant: GlobeVariant = 'primary') {
  const k = PARAMS[variant];
  const [longitude, setLongitude] = useQueryState(
    k.lng,
    parseAsFloat.withDefault(INITIAL_VIEW.longitude),
  );
  const [latitude, setLatitude] = useQueryState(
    k.lat,
    parseAsFloat.withDefault(INITIAL_VIEW.latitude),
  );
  const [zoom, setZoom] = useQueryState(k.z, parseAsFloat.withDefault(INITIAL_VIEW.zoom));
  return { longitude, setLongitude, latitude, setLatitude, zoom, setZoom };
}

const layersParser = parseAsArrayOf(parseAsString).withDefault(LAYER_IDS as unknown as string[]);

export function useUrlLayers(
  variant: GlobeVariant = 'primary',
): [LayerId[], (next: LayerId[]) => void] {
  const k = PARAMS[variant];
  const [raw, setRaw] = useQueryState(k.layers, layersParser);
  const valid = raw.filter((v): v is LayerId => (LAYER_IDS as string[]).includes(v));
  return [
    valid,
    (next) => {
      void setRaw(next as unknown as string[]);
    },
  ];
}

export function useUrlSelected(
  variant: GlobeVariant = 'primary',
): [string | null, (id: string | null) => void] {
  const k = PARAMS[variant];
  const [sel, setSel] = useQueryState(k.sel);
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
export function useUrlTimeline(variant: GlobeVariant = 'primary'): {
  t0: number;
  t1: number;
  play: boolean;
  setT0: (n: number) => void;
  setT1: (n: number) => void;
  setPlay: (b: boolean) => void;
} {
  const k = PARAMS[variant];
  const [t0, setT0Raw] = useQueryState(
    k.t0,
    parseAsInteger.withDefault(TIMELINE_MIN_YEAR),
  );
  const [t1, setT1Raw] = useQueryState(
    k.t1,
    parseAsInteger.withDefault(TIMELINE_MAX_YEAR),
  );
  const [play, setPlayRaw] = useQueryState(k.play, parseAsBoolean.withDefault(false));
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

// Phase 5 — global UI mode flags.
//   cmp=1    side-by-side compare mode (second Globe hydrates from cmp_* params)
//   embed=1  strip chrome (sidebars, scrubber, autorotate toggle) for iframes
//   focus    feature id to auto-select and recenter on at mount
export function useUrlCompare(): [boolean, (v: boolean) => void] {
  const [cmp, setCmp] = useQueryState('cmp', parseAsBoolean.withDefault(false));
  return [
    cmp,
    (v) => {
      void setCmp(v);
    },
  ];
}

export function useUrlEmbed(): boolean {
  const [embed] = useQueryState('embed', parseAsBoolean.withDefault(false));
  return embed;
}

export function useUrlFocus(): [string | null, (id: string | null) => void] {
  const [focus, setFocus] = useQueryState('focus');
  return [
    focus,
    (id) => {
      void setFocus(id);
    },
  ];
}
