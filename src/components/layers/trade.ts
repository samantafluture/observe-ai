import { ArcLayer } from '@deck.gl/layers';
import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import type { PickingInfo } from '@deck.gl/core';
import type { TradeArcFeature } from '../../types';
import { withAlpha } from '../../utils/colors';
import type { TimeWindow } from '../../utils/temporal';
import { dimIfNeeded, type CorrelationSet } from '../../utils/correlate';

interface Options {
  features: TradeArcFeature[];
  selectedId: string | null;
  pulsePhase: number;
  timeWindow: TimeWindow;
  correlation: CorrelationSet | null;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

const filterExt = new DataFilterExtension({ filterSize: 1 });

// Cooler, dimmer palette than the curated `supply-arcs` layer so the two
// visually coexist without fighting for attention.
const SOURCE: [number, number, number] = [150, 200, 240];
const TARGET: [number, number, number] = [210, 235, 255];

const getSource = (f: TradeArcFeature) =>
  f.geometry.coordinates[0] as [number, number];
const getTarget = (f: TradeArcFeature) =>
  f.geometry.coordinates[1] as [number, number];

// Normalize bilateral volume onto a 0-1 band so the widest flow
// (TW→CN ~$109B) doesn't swamp the rest. Log-scaled: a $1B flow still reads.
function normalize(valueUsd: number): number {
  const v = Math.max(valueUsd, 1);
  return Math.min(1, Math.log10(v / 1e9 + 1) / 2.2); // ~1.0 at ~$158B
}

export function buildTradeLayers(opts: Options) {
  const { features, selectedId, pulsePhase, timeWindow, correlation, onClick, onHover } = opts;
  const getFilterValue = (f: TradeArcFeature) => [f.properties.year];

  const colorAlpha = (f: TradeArcFeature) =>
    dimIfNeeded(80 + Math.round(140 * normalize(f.properties.value_usd)), f.properties.id, correlation);

  const primary = new ArcLayer<TradeArcFeature, DataFilterExtensionProps<TradeArcFeature>>({
    id: 'supply-trade',
    data: features,
    greatCircle: true,
    getSourcePosition: getSource,
    getTargetPosition: getTarget,
    getSourceColor: (f) => withAlpha(SOURCE, colorAlpha(f)),
    getTargetColor: (f) => withAlpha(TARGET, colorAlpha(f)),
    getWidth: (f) => 0.8 + 3.5 * normalize(f.properties.value_usd),
    widthMinPixels: 0.8,
    widthMaxPixels: 6,
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
    ? new ArcLayer<TradeArcFeature>({
        id: 'supply-trade-selected',
        data: [selected],
        greatCircle: true,
        getSourcePosition: getSource,
        getTargetPosition: getTarget,
        getSourceColor: [255, 255, 255, 240],
        getTargetColor: [210, 235, 255, 240],
        getWidth: 2.8 + 1.5 * Math.sin(pulsePhase * 2),
        widthMinPixels: 2,
        widthMaxPixels: 7,
        pickable: false,
        parameters: { depthCompare: 'always' },
      })
    : null;

  return [primary, ...(overlay ? [overlay] : [])];
}
