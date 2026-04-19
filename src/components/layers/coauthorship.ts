import { ArcLayer } from '@deck.gl/layers';
import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import type { PickingInfo } from '@deck.gl/core';
import type { CoauthorshipFeature } from '../../types';
import { withAlpha } from '../../utils/colors';
import type { TimeWindow } from '../../utils/temporal';
import { dimIfNeeded, type CorrelationSet } from '../../utils/correlate';

interface Options {
  features: CoauthorshipFeature[];
  selectedId: string | null;
  pulsePhase: number;
  timeWindow: TimeWindow;
  correlation: CorrelationSet | null;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

const filterExt = new DataFilterExtension({ filterSize: 1 });

// Cool teal — a research-flow color distinct from supply (warm amber→green)
// and IC trade (cool blue). Reads as "knowledge moving" rather than "goods".
const SOURCE: [number, number, number] = [120, 230, 220];
const TARGET: [number, number, number] = [200, 240, 255];

const getSource = (f: CoauthorshipFeature) =>
  f.geometry.coordinates[0] as [number, number];
const getTarget = (f: CoauthorshipFeature) =>
  f.geometry.coordinates[1] as [number, number];

// Top tracked pair sits around 312 papers/yr in 2024 (Stanford-MIT). Log
// scaling so a 20-paper edge still reads at ~0.4.
function normalize(weight: number): number {
  return Math.min(1, Math.log10(Math.max(weight, 1) + 1) / 2.5);
}

export function buildCoauthorshipLayers(opts: Options) {
  const { features, selectedId, pulsePhase, timeWindow, correlation, onClick, onHover } = opts;
  const getFilterValue = (f: CoauthorshipFeature) => [f.properties.year];

  const alpha = (f: CoauthorshipFeature) =>
    dimIfNeeded(80 + Math.round(140 * normalize(f.properties.weight)), f.properties.id, correlation);

  const primary = new ArcLayer<CoauthorshipFeature, DataFilterExtensionProps<CoauthorshipFeature>>({
    id: 'coauthorship',
    data: features,
    greatCircle: true,
    getSourcePosition: getSource,
    getTargetPosition: getTarget,
    getSourceColor: (f) => withAlpha(SOURCE, alpha(f)),
    getTargetColor: (f) => withAlpha(TARGET, alpha(f)),
    getWidth: (f) => 0.6 + 3 * normalize(f.properties.weight),
    widthMinPixels: 0.5,
    widthMaxPixels: 5,
    pickable: true,
    onClick,
    onHover,
    extensions: [filterExt],
    getFilterValue,
    filterRange: [timeWindow.t0, timeWindow.t1],
    updateTriggers: {
      getSourceColor: [selectedId, correlation?.key ?? null],
      getTargetColor: [selectedId, correlation?.key ?? null],
    },
    parameters: { depthCompare: 'always' },
  });

  const selected =
    selectedId != null ? features.find((f) => f.properties.id === selectedId) : null;

  const overlay = selected
    ? new ArcLayer<CoauthorshipFeature>({
        id: 'coauthorship-selected',
        data: [selected],
        greatCircle: true,
        getSourcePosition: getSource,
        getTargetPosition: getTarget,
        getSourceColor: [255, 255, 255, 240],
        getTargetColor: withAlpha(TARGET, 255),
        getWidth: 2.4 + 1.5 * Math.sin(pulsePhase * 2),
        widthMinPixels: 2,
        widthMaxPixels: 7,
        pickable: false,
        parameters: { depthCompare: 'always' },
      })
    : null;

  return [primary, ...(overlay ? [overlay] : [])];
}
