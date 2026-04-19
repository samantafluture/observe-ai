import { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { FeatureCollection } from 'geojson';
import type { RegulatoryFeature } from '../../types';
import { REGIME_COLOR, withAlpha } from '../../utils/colors';
import type { TimeWindow } from '../../utils/temporal';

interface Options {
  data: FeatureCollection;
  selectedId: string | null;
  timeWindow: TimeWindow;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

export function buildRegulatoryLayer(opts: Options) {
  const { data, selectedId, timeWindow, onClick, onHover } = opts;

  // GeoJsonLayer + DataFilterExtension would force per-vertex filtering; for
  // a few-dozen polygons it's cleaner to gate via fill alpha. A regulation
  // that hasn't taken effect yet within the window dims to a faint outline.
  const inForce = (props: RegulatoryFeature['properties']) => {
    const eff = props.effective_year;
    if (eff == null) return true;
    return eff <= timeWindow.t1;
  };

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
      const active = inForce(props);
      const alpha = props.id === selectedId ? 90 : active ? 40 : 6;
      return withAlpha(base, alpha);
    },
    getLineColor: (f) => {
      const props = (f as RegulatoryFeature).properties;
      const active = inForce(props);
      return withAlpha(REGIME_COLOR[props.regime], active ? 180 : 50);
    },
    lineWidthMinPixels: 0.6,
    lineWidthMaxPixels: 1.4,
    onClick,
    onHover,
    updateTriggers: {
      getFillColor: [selectedId, timeWindow.t1],
      getLineColor: [timeWindow.t1],
    },
    parameters: { depthCompare: 'always' },
  });

  return [layer];
}
