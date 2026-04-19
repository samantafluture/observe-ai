import { ScatterplotLayer } from '@deck.gl/layers';
import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import type { PickingInfo } from '@deck.gl/core';
import type { FacilityFeature, LayerMeta } from '../../types';
import { operatorColor, withAlpha } from '../../utils/colors';
import { ALWAYS_YEAR, type TimeWindow } from '../../utils/temporal';

interface Options {
  layer: LayerMeta;
  features: FacilityFeature[];
  selectedId: string | null;
  hoveredId: string | null;
  pulsePhase: number;
  timeWindow: TimeWindow;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

const filterExt = new DataFilterExtension({ filterSize: 1 });

/**
 * Build a pair of ScatterplotLayers for one facility category:
 *   - halo: large, transparent disc, not pickable
 *   - core: small bright dot, pickable; carries selection + hover styling
 *
 * Plus a third selection-ring layer that renders only when something is selected.
 */
export function buildFacilityLayers(opts: Options) {
  const {
    layer,
    features,
    selectedId,
    hoveredId,
    pulsePhase,
    timeWindow,
    onClick,
    onHover,
  } = opts;

  const getPosition = (f: FacilityFeature) => f.geometry.coordinates as [number, number];
  // Features without an `opened` year stay visible at every window position
  // (we have nothing to filter on). Anchoring at TIMELINE_MIN_YEAR keeps them
  // on for the standard window range.
  const getFilterValue = (f: FacilityFeature) => [f.properties.opened ?? ALWAYS_YEAR];

  // Halo pulses slightly — single uniform via radiusScale (GPU-cheap).
  const haloScale = 1 + 0.15 * Math.sin(pulsePhase);

  const halo = new ScatterplotLayer<FacilityFeature, DataFilterExtensionProps<FacilityFeature>>({
    id: `${layer.id}-halo`,
    data: features,
    getPosition,
    getFillColor: (f) => withAlpha(operatorColor(f.properties.operator), 50),
    getRadius: 40000,
    radiusMinPixels: 6,
    radiusMaxPixels: 24,
    radiusScale: haloScale,
    stroked: false,
    filled: true,
    pickable: false,
    extensions: [filterExt],
    getFilterValue,
    filterRange: [timeWindow.t0, timeWindow.t1],
    parameters: { depthCompare: 'always' },
  });

  const core = new ScatterplotLayer<FacilityFeature, DataFilterExtensionProps<FacilityFeature>>({
    id: `${layer.id}-core`,
    data: features,
    getPosition,
    getFillColor: (f) => withAlpha(operatorColor(f.properties.operator), 240),
    getLineColor: (f) => {
      const id = f.properties.id;
      if (id === selectedId) return [255, 255, 255, 255];
      if (id === hoveredId) return [240, 240, 240, 230];
      return [240, 240, 240, 120];
    },
    getRadius: 12000,
    radiusMinPixels: 2.5,
    radiusMaxPixels: 8,
    lineWidthMinPixels: 0.8,
    stroked: true,
    filled: true,
    pickable: true,
    autoHighlight: false,
    onClick,
    onHover,
    extensions: [filterExt],
    getFilterValue,
    filterRange: [timeWindow.t0, timeWindow.t1],
    updateTriggers: {
      getLineColor: [selectedId, hoveredId],
    },
    parameters: { depthCompare: 'always' },
  });

  const selected =
    selectedId != null ? features.find((f) => f.properties.id === selectedId) : null;
  const ring = selected
    ? new ScatterplotLayer<FacilityFeature>({
        id: `${layer.id}-ring`,
        data: [selected],
        getPosition,
        filled: false,
        stroked: true,
        getLineColor: [255, 255, 255, 230],
        getRadius: 30000,
        radiusMinPixels: 10,
        radiusMaxPixels: 28,
        radiusScale: 1 + 0.25 * Math.sin(pulsePhase * 2),
        lineWidthMinPixels: 1.2,
        pickable: false,
        parameters: { depthCompare: 'always' },
      })
    : null;

  return [halo, core, ...(ring ? [ring] : [])];
}
