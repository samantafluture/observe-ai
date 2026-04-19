import { ArcLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { TradeArcFeature } from '../../types';
import { withAlpha } from '../../utils/colors';

interface Options {
  features: TradeArcFeature[];
  selectedId: string | null;
  pulsePhase: number;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

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
  const { features, selectedId, pulsePhase, onClick, onHover } = opts;

  const primary = new ArcLayer<TradeArcFeature>({
    id: 'supply-trade',
    data: features,
    greatCircle: true,
    getSourcePosition: getSource,
    getTargetPosition: getTarget,
    getSourceColor: (f) => withAlpha(SOURCE, 80 + Math.round(140 * normalize(f.properties.value_usd))),
    getTargetColor: (f) => withAlpha(TARGET, 80 + Math.round(140 * normalize(f.properties.value_usd))),
    getWidth: (f) => 0.8 + 3.5 * normalize(f.properties.value_usd),
    widthMinPixels: 0.8,
    widthMaxPixels: 6,
    pickable: true,
    onClick,
    onHover,
    updateTriggers: {
      getSourceColor: [selectedId],
      getTargetColor: [selectedId],
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
