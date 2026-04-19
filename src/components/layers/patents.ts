import { ScatterplotLayer } from '@deck.gl/layers';
import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import type { PickingInfo } from '@deck.gl/core';
import type { PatentFeature } from '../../types';
import { withAlpha } from '../../utils/colors';
import type { TimeWindow } from '../../utils/temporal';

interface Options {
  features: PatentFeature[];
  selectedId: string | null;
  hoveredId: string | null;
  pulsePhase: number;
  timeWindow: TimeWindow;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

const filterExt = new DataFilterExtension({ filterSize: 1 });

// Lavender/violet to keep AI patents visually distinct from compute (green),
// fabs (amber), regulation (blue/red), and money (yellow).
const BASE_RGB: [number, number, number] = [180, 140, 255];

function radiusMeters(count: number): number {
  // sqrt(count) keeps SF Bay (10K+ patents/yr) visually adjacent to Toronto
  // (~hundreds/yr) without dwarfing it.
  return Math.sqrt(Math.max(count, 1)) * 1500;
}

export function buildPatentLayers(opts: Options) {
  const { features, selectedId, hoveredId, pulsePhase, timeWindow, onClick, onHover } = opts;
  const getPosition = (f: PatentFeature) => f.geometry.coordinates as [number, number];
  const getFilterValue = (f: PatentFeature) => [f.properties.year];

  const haloScale = 1 + 0.18 * Math.sin(pulsePhase * 1.5);

  const halo = new ScatterplotLayer<PatentFeature, DataFilterExtensionProps<PatentFeature>>({
    id: 'patents-halo',
    data: features,
    getPosition,
    getFillColor: withAlpha(BASE_RGB, 35),
    getRadius: (f) => radiusMeters(f.properties.count) * 1.7,
    radiusMinPixels: 4,
    radiusMaxPixels: 60,
    radiusScale: haloScale,
    stroked: false,
    filled: true,
    pickable: false,
    extensions: [filterExt],
    getFilterValue,
    filterRange: [timeWindow.t0, timeWindow.t1],
    parameters: { depthCompare: 'always' },
  });

  const core = new ScatterplotLayer<PatentFeature, DataFilterExtensionProps<PatentFeature>>({
    id: 'patents-core',
    data: features,
    getPosition,
    getFillColor: withAlpha(BASE_RGB, 230),
    getLineColor: (f) => {
      const id = f.properties.id;
      if (id === selectedId) return [255, 255, 255, 255];
      if (id === hoveredId) return [240, 240, 240, 220];
      return [240, 240, 240, 90];
    },
    getRadius: (f) => radiusMeters(f.properties.count),
    radiusMinPixels: 2,
    radiusMaxPixels: 32,
    lineWidthMinPixels: 0.6,
    stroked: true,
    filled: true,
    pickable: true,
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

  return [halo, core];
}
