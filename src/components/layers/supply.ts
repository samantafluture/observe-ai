import { ArcLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import type { PickingInfo } from '@deck.gl/core';
import type { SupplyArcFeature } from '../../types';
import { PHOSPHOR, withAlpha } from '../../utils/colors';
import { ALWAYS_YEAR, type TimeWindow } from '../../utils/temporal';

interface Options {
  features: SupplyArcFeature[];
  selectedId: string | null;
  pulsePhase: number;
  timeWindow: TimeWindow;
  // Per-frame trip head (0..1 along arc); only used when the timeline is
  // playing so chip shipments visibly move from fab → customer.
  tripHead: number | null;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

const filterExt = new DataFilterExtension({ filterSize: 1 });

const SOURCE_COLOR: [number, number, number] = [255, 200, 120]; // fab amber
const TARGET_COLOR: [number, number, number] = [120, 255, 180]; // compute green

const getSource = (f: SupplyArcFeature) =>
  f.geometry.coordinates[0] as [number, number];
const getTarget = (f: SupplyArcFeature) =>
  f.geometry.coordinates[1] as [number, number];

export function buildSupplyLayers(opts: Options) {
  const { features, selectedId, pulsePhase, timeWindow, tripHead, onClick, onHover } = opts;
  const getFilterValue = (f: SupplyArcFeature) => [f.properties.year ?? ALWAYS_YEAR];

  const baseAlpha = (weight?: number) => {
    const w = weight ?? 0.5;
    return Math.round(120 + 110 * Math.min(1, Math.max(0, w)));
  };

  const primary = new ArcLayer<SupplyArcFeature, DataFilterExtensionProps<SupplyArcFeature>>({
    id: 'supply-arcs',
    data: features,
    greatCircle: true,
    getSourcePosition: getSource,
    getTargetPosition: getTarget,
    getSourceColor: (f) => withAlpha(SOURCE_COLOR, baseAlpha(f.properties.weight)),
    getTargetColor: (f) => withAlpha(TARGET_COLOR, baseAlpha(f.properties.weight)),
    getWidth: (f) => 1 + 3 * (f.properties.weight ?? 0.5),
    widthMinPixels: 1,
    widthMaxPixels: 6,
    pickable: true,
    autoHighlight: false,
    onClick,
    onHover,
    extensions: [filterExt],
    getFilterValue,
    filterRange: [timeWindow.t0, timeWindow.t1],
    updateTriggers: {
      getSourceColor: [selectedId],
      getTargetColor: [selectedId],
    },
    parameters: { depthCompare: 'always' },
  });

  const selected =
    selectedId != null ? features.find((f) => f.properties.id === selectedId) : null;

  const overlay = selected
    ? new ArcLayer<SupplyArcFeature>({
        id: 'supply-arcs-selected',
        data: [selected],
        greatCircle: true,
        getSourcePosition: getSource,
        getTargetPosition: getTarget,
        getSourceColor: [255, 255, 255, 240],
        getTargetColor: withAlpha(PHOSPHOR.landStroke, 255),
        getWidth: 3 + 1.5 * Math.sin(pulsePhase * 2),
        widthMinPixels: 2.5,
        widthMaxPixels: 8,
        pickable: false,
        parameters: { depthCompare: 'always' },
      })
    : null;

  // While the scrubber is playing, animate chip-shipment heads along each
  // visible arc. We synthesize a 2-vertex "trip" with timestamps 0 and 1 and
  // step `currentTime` from 0..1 — the trail length is short (0.15) so the
  // dot reads as a comet head, not a paint stroke.
  const trips =
    tripHead != null
      ? new TripsLayer<SupplyArcFeature, DataFilterExtensionProps<SupplyArcFeature>>({
          id: 'supply-arcs-trips',
          data: features,
          getPath: (f) => [
            f.geometry.coordinates[0] as [number, number],
            f.geometry.coordinates[1] as [number, number],
          ],
          getTimestamps: () => [0, 1],
          getColor: [255, 255, 200, 230],
          getWidth: (f) => 2 + 4 * (f.properties.weight ?? 0.5),
          widthMinPixels: 1.5,
          widthMaxPixels: 7,
          jointRounded: true,
          capRounded: true,
          fadeTrail: true,
          trailLength: 0.18,
          currentTime: tripHead,
          extensions: [filterExt],
          getFilterValue,
          filterRange: [timeWindow.t0, timeWindow.t1],
          parameters: { depthCompare: 'always' },
          updateTriggers: { getColor: [tripHead] },
        })
      : null;

  return [primary, ...(overlay ? [overlay] : []), ...(trips ? [trips] : [])];
}
