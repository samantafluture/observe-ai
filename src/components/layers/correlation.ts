import { ArcLayer } from '@deck.gl/layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import {
  CORRELATION_COLOR,
  type CorrelationEdge,
  type CorrelationSet,
} from '../../utils/correlate';
import { withAlpha } from '../../utils/colors';

interface Options {
  correlation: CorrelationSet | null;
  /** Pulse phase so correlation halos breathe on the selection. */
  pulsePhase: number;
}

/**
 * Overlay drawn on top of every other layer when a correlation is active.
 *
 *   - `correlation-arcs` — one great-circle arc per CorrelationEdge, colored
 *     by relation kind. These read as narrative links from the selection.
 *   - `correlation-anchor` — a bright white pulsing ring on the selection
 *     coordinate itself so the user always sees where the correlation
 *     originates, even if the selected feature's layer is toggled off.
 */
export function buildCorrelationLayers(opts: Options) {
  const { correlation, pulsePhase } = opts;
  if (!correlation || correlation.edges.length === 0) return [];

  const arcs = new ArcLayer<CorrelationEdge>({
    id: 'correlation-arcs',
    data: correlation.edges,
    greatCircle: true,
    getSourcePosition: (e) => e.from,
    getTargetPosition: (e) => e.to,
    getSourceColor: (e) => withAlpha(CORRELATION_COLOR[e.kind], 235),
    getTargetColor: (e) => withAlpha(CORRELATION_COLOR[e.kind], 180),
    getWidth: 2.2,
    widthMinPixels: 1.4,
    widthMaxPixels: 3.5,
    pickable: false,
    parameters: { depthCompare: 'always' },
  });

  // Anchor ring on the first edge's source (the selection). If there are no
  // edges we bail out above, so `edges[0]` is safe here.
  const anchorPos = correlation.edges[0].from;
  const anchor = new ScatterplotLayer<{ pos: [number, number] }>({
    id: 'correlation-anchor',
    data: [{ pos: anchorPos }],
    getPosition: (d) => d.pos,
    filled: false,
    stroked: true,
    getLineColor: [255, 255, 255, 230],
    getRadius: 45_000,
    radiusScale: 1 + 0.25 * Math.sin(pulsePhase * 2),
    radiusMinPixels: 12,
    radiusMaxPixels: 36,
    lineWidthMinPixels: 1.3,
    pickable: false,
    parameters: { depthCompare: 'always' },
  });

  return [arcs, anchor];
}
