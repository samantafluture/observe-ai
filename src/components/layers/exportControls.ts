import { ScatterplotLayer } from '@deck.gl/layers';
import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import type { PickingInfo } from '@deck.gl/core';
import type { ExportControlFeature } from '../../types';
import { withAlpha } from '../../utils/colors';
import type { TimeWindow } from '../../utils/temporal';

interface Options {
  features: ExportControlFeature[];
  selectedId: string | null;
  hoveredId: string | null;
  pulsePhase: number;
  timeWindow: TimeWindow;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

const filterExt = new DataFilterExtension({ filterSize: 1 });
// Hot red — read as "controls / sanctions" in the legend.
const BASE_RGB: [number, number, number] = [255, 110, 110];

export function buildExportControlLayers(opts: Options) {
  const { features, selectedId, hoveredId, pulsePhase, timeWindow, onClick, onHover } = opts;
  const getPosition = (f: ExportControlFeature) => f.geometry.coordinates as [number, number];
  const getFilterValue = (f: ExportControlFeature) => [f.properties.listed_year];

  // Pulse on the X mark so newly-listed entities pop while the play head is
  // moving past their year.
  const pulse = 1 + 0.3 * Math.sin(pulsePhase * 2);

  const ring = new ScatterplotLayer<ExportControlFeature, DataFilterExtensionProps<ExportControlFeature>>({
    id: 'export-controls-ring',
    data: features,
    getPosition,
    filled: false,
    stroked: true,
    getLineColor: withAlpha(BASE_RGB, 240),
    lineWidthMinPixels: 1.2,
    getRadius: 28000,
    radiusMinPixels: 5,
    radiusMaxPixels: 14,
    radiusScale: pulse,
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

  const dot = new ScatterplotLayer<ExportControlFeature, DataFilterExtensionProps<ExportControlFeature>>({
    id: 'export-controls-dot',
    data: features,
    getPosition,
    getFillColor: withAlpha(BASE_RGB, 240),
    getRadius: 4000,
    radiusMinPixels: 1.5,
    radiusMaxPixels: 4,
    stroked: false,
    filled: true,
    pickable: false,
    extensions: [filterExt],
    getFilterValue,
    filterRange: [timeWindow.t0, timeWindow.t1],
    parameters: { depthCompare: 'always' },
  });

  return [ring, dot];
}
