import { ScatterplotLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { MoneyFlowFeature } from '../../types';
import { withAlpha } from '../../utils/colors';

interface Options {
  features: MoneyFlowFeature[];
  selectedId: string | null;
  hoveredId: string | null;
  pulsePhase: number;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

// Dot radius encodes investment magnitude on a sqrt scale so the US (~$109B)
// doesn't visually dwarf Israel (~$2.8B) past readability. radiusMinPixels
// keeps small countries pickable at low zooms.
const BASE_RGB: [number, number, number] = [255, 220, 120];

function radiusMeters(amountUsd: number): number {
  // sqrt of billions; scaled so $1B ≈ 14 px at mid-zoom, $100B ≈ 140 px.
  const billions = amountUsd / 1e9;
  return Math.sqrt(Math.max(billions, 0.1)) * 40_000;
}

export function buildMoneyLayers(opts: Options) {
  const { features, selectedId, hoveredId, pulsePhase, onClick, onHover } = opts;
  const getPosition = (f: MoneyFlowFeature) => f.geometry.coordinates as [number, number];

  const haloScale = 1 + 0.15 * Math.sin(pulsePhase);

  const halo = new ScatterplotLayer<MoneyFlowFeature>({
    id: 'money-flow-halo',
    data: features,
    getPosition,
    getFillColor: withAlpha(BASE_RGB, 40),
    getRadius: (f) => radiusMeters(f.properties.amount_usd) * 1.6,
    radiusMinPixels: 8,
    radiusMaxPixels: 64,
    radiusScale: haloScale,
    stroked: false,
    filled: true,
    pickable: false,
    parameters: { depthCompare: 'always' },
  });

  const core = new ScatterplotLayer<MoneyFlowFeature>({
    id: 'money-flow-core',
    data: features,
    getPosition,
    getFillColor: withAlpha(BASE_RGB, 220),
    getLineColor: (f) => {
      const id = f.properties.id;
      if (id === selectedId) return [255, 255, 255, 255];
      if (id === hoveredId) return [245, 245, 245, 220];
      return [240, 240, 240, 110];
    },
    getRadius: (f) => radiusMeters(f.properties.amount_usd),
    radiusMinPixels: 3,
    radiusMaxPixels: 36,
    lineWidthMinPixels: 0.8,
    stroked: true,
    filled: true,
    pickable: true,
    onClick,
    onHover,
    updateTriggers: {
      getLineColor: [selectedId, hoveredId],
    },
    parameters: { depthCompare: 'always' },
  });

  return [halo, core];
}
