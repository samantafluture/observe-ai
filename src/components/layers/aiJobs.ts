import { ScatterplotLayer } from '@deck.gl/layers';
import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import type { PickingInfo } from '@deck.gl/core';
import type { JobPostingFeature } from '../../types';
import { withAlpha } from '../../utils/colors';
import type { TimeWindow } from '../../utils/temporal';
import { dimIfNeeded, type CorrelationSet } from '../../utils/correlate';

interface Options {
  features: JobPostingFeature[];
  selectedId: string | null;
  hoveredId: string | null;
  pulsePhase: number;
  timeWindow: TimeWindow;
  correlation: CorrelationSet | null;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

const filterExt = new DataFilterExtension({ filterSize: 1 });

// Pastel-pink — GlobeView rules out HeatmapLayer, so we approximate a heat
// surface with two stacked Scatterplot layers at low alpha + additive blend,
// plus sqrt radius scaling to keep SF from dominating Beijing.
const BASE_RGB: [number, number, number] = [255, 180, 210];

function radiusMeters(postings: number): number {
  // sqrt(postings/1000) * 25k: 1K postings ≈ 25 km, 10K ≈ 80 km, 50K ≈ 180 km.
  return Math.sqrt(Math.max(postings, 1) / 1000) * 25_000;
}

export function buildAiJobLayers(opts: Options) {
  const { features, selectedId, hoveredId, pulsePhase, timeWindow, correlation, onClick, onHover } = opts;
  const getPosition = (f: JobPostingFeature) => f.geometry.coordinates as [number, number];
  const getFilterValue = (f: JobPostingFeature) => [f.properties.year];

  const haloScale = 1 + 0.14 * Math.sin(pulsePhase * 1.3);

  const halo = new ScatterplotLayer<JobPostingFeature, DataFilterExtensionProps<JobPostingFeature>>({
    id: 'ai-jobs-halo',
    data: features,
    getPosition,
    getFillColor: (f) => withAlpha(BASE_RGB, dimIfNeeded(30, f.properties.id, correlation)),
    getRadius: (f) => radiusMeters(f.properties.postings) * 1.9,
    radiusMinPixels: 6,
    radiusMaxPixels: 70,
    radiusScale: haloScale,
    stroked: false,
    filled: true,
    pickable: false,
    extensions: [filterExt],
    getFilterValue,
    filterRange: [timeWindow.t0, timeWindow.t1],
    updateTriggers: {
      getFillColor: [correlation?.key ?? null],
    },
    parameters: { depthCompare: 'always' },
  });

  const core = new ScatterplotLayer<JobPostingFeature, DataFilterExtensionProps<JobPostingFeature>>({
    id: 'ai-jobs-core',
    data: features,
    getPosition,
    getFillColor: (f) => withAlpha(BASE_RGB, dimIfNeeded(210, f.properties.id, correlation)),
    getLineColor: (f) => {
      const id = f.properties.id;
      if (id === selectedId) return [255, 255, 255, 255];
      if (id === hoveredId) return [240, 240, 240, 220];
      return [240, 240, 240, 80];
    },
    getRadius: (f) => radiusMeters(f.properties.postings),
    radiusMinPixels: 2,
    radiusMaxPixels: 38,
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
      getFillColor: [correlation?.key ?? null],
    },
    parameters: { depthCompare: 'always' },
  });

  return [halo, core];
}
