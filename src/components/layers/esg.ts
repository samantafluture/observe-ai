import { ScatterplotLayer } from '@deck.gl/layers';
import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import type { PickingInfo } from '@deck.gl/core';
import type { EsgFeature } from '../../types';
import { withAlpha } from '../../utils/colors';
import type { TimeWindow } from '../../utils/temporal';
import { dimIfNeeded, type CorrelationSet } from '../../utils/correlate';

interface Options {
  features: EsgFeature[];
  selectedId: string | null;
  hoveredId: string | null;
  pulsePhase: number;
  timeWindow: TimeWindow;
  correlation: CorrelationSet | null;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

const filterExt = new DataFilterExtension({ filterSize: 1 });

// Water droplet cyan for the water halo, warm pale-yellow for the energy
// core. Together they read "this facility draws X and evaporates Y" at a
// glance without needing side-by-side layers.
const ENERGY_RGB: [number, number, number] = [255, 230, 150];
const WATER_RGB: [number, number, number] = [120, 220, 230];

function energyRadius(mwh: number): number {
  // sqrt(GWh) * 25k: a 1 TWh site is ~790 m radius, 10 TWh ~2500 m, so the
  // radiusMinPixels floor dominates at low zoom and the ratios dominate at high.
  const gwh = mwh / 1000;
  return Math.sqrt(Math.max(gwh, 1)) * 25_000;
}

function waterRadius(m3: number): number {
  // sqrt(million m³) * 25k.
  const mm3 = m3 / 1_000_000;
  return Math.sqrt(Math.max(mm3, 0.1)) * 40_000;
}

/**
 * Two-ring facility annotation: a water-cyan halo and an energy-yellow core.
 * Because the metric is two-dimensional (electricity + water) the visual is
 * two concentric disks rather than one sized marker.
 */
export function buildEsgLayers(opts: Options) {
  const { features, selectedId, hoveredId, pulsePhase, timeWindow, correlation, onClick, onHover } = opts;
  const getPosition = (f: EsgFeature) => f.geometry.coordinates as [number, number];
  const getFilterValue = (f: EsgFeature) => [f.properties.year];
  const haloScale = 1 + 0.12 * Math.sin(pulsePhase * 1.3);

  const water = new ScatterplotLayer<EsgFeature, DataFilterExtensionProps<EsgFeature>>({
    id: 'esg-water',
    data: features,
    getPosition,
    getFillColor: (f) =>
      withAlpha(WATER_RGB, dimIfNeeded(38, f.properties.id, correlation)),
    getRadius: (f) => waterRadius(f.properties.water_m3),
    radiusMinPixels: 6,
    radiusMaxPixels: 52,
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

  const energy = new ScatterplotLayer<EsgFeature, DataFilterExtensionProps<EsgFeature>>({
    id: 'esg-energy',
    data: features,
    getPosition,
    getFillColor: (f) =>
      withAlpha(ENERGY_RGB, dimIfNeeded(210, f.properties.id, correlation)),
    getLineColor: (f) => {
      const id = f.properties.id;
      if (id === selectedId) return [255, 255, 255, 255];
      if (id === hoveredId) return [240, 240, 240, 220];
      return [240, 240, 240, 90];
    },
    getRadius: (f) => energyRadius(f.properties.energy_mwh),
    radiusMinPixels: 2.5,
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
      getFillColor: [correlation?.key ?? null],
    },
    parameters: { depthCompare: 'always' },
  });

  return [water, energy];
}
