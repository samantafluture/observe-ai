import { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { FeatureCollection } from 'geojson';
import type { RegulatoryFeature } from '../../types';
import { REGIME_COLOR, withAlpha } from '../../utils/colors';

interface Options {
  data: FeatureCollection;
  selectedId: string | null;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

export function buildRegulatoryLayer(opts: Options) {
  const { data, selectedId, onClick, onHover } = opts;

  const layer = new GeoJsonLayer<RegulatoryFeature['properties']>({
    id: 'regulatory-zones',
    data: data as FeatureCollection,
    pickable: true,
    stroked: true,
    filled: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 25],
    getFillColor: (f) => {
      const props = (f as RegulatoryFeature).properties;
      const base = REGIME_COLOR[props.regime];
      const alpha = props.id === selectedId ? 90 : 40;
      return withAlpha(base, alpha);
    },
    getLineColor: (f) => {
      const props = (f as RegulatoryFeature).properties;
      return withAlpha(REGIME_COLOR[props.regime], 180);
    },
    lineWidthMinPixels: 0.6,
    lineWidthMaxPixels: 1.4,
    onClick,
    onHover,
    updateTriggers: {
      getFillColor: [selectedId],
    },
    parameters: { depthCompare: 'always' },
  });

  return [layer];
}
