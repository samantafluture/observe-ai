import { ArcLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { SupplyArcFeature } from '../../types';
import { PHOSPHOR, withAlpha } from '../../utils/colors';

interface Options {
  features: SupplyArcFeature[];
  selectedId: string | null;
  pulsePhase: number;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

const SOURCE_COLOR: [number, number, number] = [255, 200, 120]; // fab amber
const TARGET_COLOR: [number, number, number] = [120, 255, 180]; // compute green

const getSource = (f: SupplyArcFeature) =>
  f.geometry.coordinates[0] as [number, number];
const getTarget = (f: SupplyArcFeature) =>
  f.geometry.coordinates[1] as [number, number];

export function buildSupplyLayers(opts: Options) {
  const { features, selectedId, pulsePhase, onClick, onHover } = opts;

  const baseAlpha = (weight?: number) => {
    const w = weight ?? 0.5;
    return Math.round(120 + 110 * Math.min(1, Math.max(0, w)));
  };

  const primary = new ArcLayer<SupplyArcFeature>({
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

  return [primary, ...(overlay ? [overlay] : [])];
}
