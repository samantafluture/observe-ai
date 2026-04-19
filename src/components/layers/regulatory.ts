import { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { FeatureCollection } from 'geojson';
import type { RegulatoryFeature } from '../../types';
import { REGIME_COLOR, withAlpha } from '../../utils/colors';
import type { TimeWindow } from '../../utils/temporal';
import { dimIfNeeded, type CorrelationSet } from '../../utils/correlate';

interface Options {
  data: FeatureCollection;
  selectedId: string | null;
  timeWindow: TimeWindow;
  correlation: CorrelationSet | null;
  onClick: (info: PickingInfo) => void;
  onHover: (info: PickingInfo) => void;
}

export function buildRegulatoryLayer(opts: Options) {
  const { data, selectedId, timeWindow, correlation, onClick, onHover } = opts;

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
      const rawAlpha = props.id === selectedId ? 90 : active ? 40 : 6;
      return withAlpha(base, dimIfNeeded(rawAlpha, props.id, correlation));
    },
    getLineColor: (f) => {
      const props = (f as RegulatoryFeature).properties;
      const active = inForce(props);
      const rawAlpha = active ? 180 : 50;
      return withAlpha(REGIME_COLOR[props.regime], dimIfNeeded(rawAlpha, props.id, correlation));
    },
    lineWidthMinPixels: 0.6,
    lineWidthMaxPixels: 1.4,
    onClick,
    onHover,
    updateTriggers: {
      getFillColor: [selectedId, timeWindow.t1, correlation?.key ?? null],
      getLineColor: [timeWindow.t1, correlation?.key ?? null],
    },
    parameters: { depthCompare: 'always' },
  });

  return [layer];
}
