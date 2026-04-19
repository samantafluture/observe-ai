import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { _GlobeView as GlobeView } from '@deck.gl/core';
import type { PickingInfo, MapViewState, Layer } from '@deck.gl/core';

import { useGlobeStore } from '../store/globeStore';
import { useBasemapData } from '../hooks/useBasemapData';
import { useFacilityData } from '../hooks/useFacilityData';
import {
  useUrlViewState,
  useUrlLayers,
  useUrlSelected,
  useUrlTimeline,
  useUrlFocus,
  type GlobeVariant,
} from '../hooks/useUrlState';
import { buildBasemapLayers } from './layers/basemap';
import { buildFacilityLayers } from './layers/facilities';
import { buildRegulatoryLayer } from './layers/regulatory';
import { buildSupplyLayers } from './layers/supply';
import { buildMoneyLayers } from './layers/money';
import { buildTradeLayers } from './layers/trade';
import { buildPatentLayers } from './layers/patents';
import { buildExportControlLayers } from './layers/exportControls';
import { buildCoauthorshipLayers } from './layers/coauthorship';
import { buildEsgLayers } from './layers/esg';
import { buildAiJobLayers } from './layers/aiJobs';
import { buildCorrelationLayers } from './layers/correlation';
import { AUTO_ROTATE_DEG_PER_SEC, GLOBE_RESOLUTION, INITIAL_VIEW, LAYERS } from '../utils/constants';
import { buildCorrelationSet, type CorrelationSet } from '../utils/correlate';
import type {
  AnyFeature,
  CoauthorshipFeature,
  EsgFeature,
  ExportControlFeature,
  FacilityFeature,
  JobPostingFeature,
  LayerId,
  MoneyFlowFeature,
  PatentFeature,
  SupplyArcFeature,
  TradeArcFeature,
} from '../types';

interface Props {
  variant?: GlobeVariant;
}

const GLOBE_VIEW_PRIMARY = new GlobeView({
  id: 'globe',
  resolution: GLOBE_RESOLUTION,
  controller: { dragRotate: false },
});
const GLOBE_VIEW_COMPARE = new GlobeView({
  id: 'globe-compare',
  resolution: GLOBE_RESOLUTION,
  controller: { dragRotate: false },
});

export function Globe({ variant = 'primary' }: Props) {
  const isPrimary = variant === 'primary';
  const { countries, land } = useBasemapData();
  const { data: facilities } = useFacilityData();

  const {
    longitude: urlLng,
    latitude: urlLat,
    zoom: urlZoom,
    setLongitude,
    setLatitude,
    setZoom,
  } = useUrlViewState(variant);

  const [viewState, setViewState] = useState<MapViewState>({
    longitude: urlLng,
    latitude: urlLat,
    zoom: urlZoom,
    minZoom: INITIAL_VIEW.minZoom,
    maxZoom: INITIAL_VIEW.maxZoom,
  });

  const [activeLayers] = useUrlLayers(variant);
  const [urlSelected, setUrlSelected] = useUrlSelected(variant);
  const { t0, t1, play } = useUrlTimeline(variant);
  const timeWindow = useMemo(() => ({ t0, t1 }), [t0, t1]);
  const [urlFocus, setUrlFocus] = useUrlFocus();

  // The shared Zustand store tracks the primary globe's selection + hover.
  // Compare-mode selection stays local to this component so tooltip and
  // DetailPanel continue to reflect only the primary globe.
  const sharedSelectedId = useGlobeStore((s) => s.selectedId);
  const sharedHoveredId = useGlobeStore((s) => s.hoveredId);
  const setSharedSelected = useGlobeStore((s) => s.setSelected);
  const setSharedHovered = useGlobeStore((s) => s.setHovered);
  const setSharedCorrelation = useGlobeStore((s) => s.setCorrelation);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const setAutoRotate = useGlobeStore((s) => s.setAutoRotate);

  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [localSelectedFeature, setLocalSelectedFeature] = useState<AnyFeature | null>(null);

  const selectedId = isPrimary ? sharedSelectedId : localSelectedId;
  const hoveredId = isPrimary ? sharedHoveredId : null;

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Hydrate selection from URL once data has loaded. Works for both variants.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!urlSelected) return;
    for (const layer of LAYERS) {
      const fc = facilities[layer.id];
      if (!fc) continue;
      const found = (fc.features as unknown as AnyFeature[]).find(
        (f) => (f.properties as { id?: string })?.id === urlSelected,
      );
      if (found) {
        if (isPrimary) {
          setSharedSelected(found);
        } else {
          setLocalSelectedId(urlSelected);
          setLocalSelectedFeature(found);
        }
        hydratedRef.current = true;
        return;
      }
    }
  }, [urlSelected, facilities, setSharedSelected, isPrimary]);

  // Phase 5 — `?focus=<id>` deep links to a specific entity and recenters
  // the camera on it. Primary only; runs once per URL change.
  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isPrimary) return;
    if (!urlFocus || urlFocus === focusedRef.current) return;
    for (const layer of LAYERS) {
      const fc = facilities[layer.id];
      if (!fc) continue;
      const found = (fc.features as unknown as AnyFeature[]).find(
        (f) => (f.properties as { id?: string })?.id === urlFocus,
      );
      if (!found) continue;
      // Compute a center for the feature so the camera snaps near it.
      const geom = found.geometry;
      let center: [number, number] | null = null;
      if (geom.type === 'Point') {
        center = geom.coordinates as [number, number];
      } else if (geom.type === 'LineString') {
        const c = geom.coordinates as [number, number][];
        if (c.length) {
          center = [(c[0][0] + c[1][0]) / 2, (c[0][1] + c[1][1]) / 2];
        }
      }
      if (center) {
        setViewState((vs) => ({ ...vs, longitude: center![0], latitude: center![1], zoom: 3 }));
        void setLongitude(Number(center[0].toFixed(2)));
        void setLatitude(Number(center[1].toFixed(2)));
        void setZoom(3);
        if (autoRotateRef.current) setAutoRotate(false);
      }
      setSharedSelected(found);
      void setUrlSelected(urlFocus);
      focusedRef.current = urlFocus;
      // Consume the focus param so future interactions don't keep snapping.
      void setUrlFocus(null);
      return;
    }
  }, [
    urlFocus,
    facilities,
    isPrimary,
    setSharedSelected,
    setUrlSelected,
    setUrlFocus,
    setLongitude,
    setLatitude,
    setZoom,
    setAutoRotate,
  ]);

  // rAF loop drives pulse, optional auto-rotation, and (when the timeline is
  // playing) the TripsLayer head along supply arcs.
  const [pulsePhase, setPulsePhase] = useState(0);
  const [tripHead, setTripHead] = useState(0);
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);
  useEffect(() => {
    let frameId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPulsePhase((p) => (p + dt * 2) % (Math.PI * 2));
      if (playRef.current) {
        setTripHead((h) => (h + dt / 1.4) % 1);
      }
      if (isPrimary && autoRotateRef.current) {
        setViewState((vs) => ({
          ...vs,
          longitude: ((vs.longitude + AUTO_ROTATE_DEG_PER_SEC * dt + 540) % 360) - 180,
        }));
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPrimary]);

  const onViewStateChange = useCallback(
    ({
      viewState: next,
      interactionState,
    }: {
      viewState: MapViewState;
      interactionState?: { isDragging?: boolean; isZooming?: boolean; isPanning?: boolean };
    }) => {
      setViewState(next);
      const userInteracting =
        !!interactionState?.isDragging ||
        !!interactionState?.isZooming ||
        !!interactionState?.isPanning;
      if (userInteracting) {
        if (isPrimary && autoRotateRef.current) setAutoRotate(false);
        void setLongitude(Number(next.longitude.toFixed(2)));
        void setLatitude(Number(next.latitude.toFixed(2)));
        void setZoom(Number(next.zoom.toFixed(2)));
      }
    },
    [setAutoRotate, setLongitude, setLatitude, setZoom, isPrimary],
  );

  const onClick = useCallback(
    (info: PickingInfo) => {
      const obj = info.object as AnyFeature | undefined;
      const id = (obj?.properties as { id?: string } | undefined)?.id;
      if (isPrimary) {
        if (id) {
          setSharedSelected(obj as AnyFeature);
          void setUrlSelected(id);
        } else {
          setSharedSelected(null);
          void setUrlSelected(null);
        }
      } else {
        if (id) {
          setLocalSelectedId(id);
          setLocalSelectedFeature(obj as AnyFeature);
          void setUrlSelected(id);
        } else {
          setLocalSelectedId(null);
          setLocalSelectedFeature(null);
          void setUrlSelected(null);
        }
      }
    },
    [setSharedSelected, setUrlSelected, isPrimary],
  );

  const onHover = useCallback(
    (info: PickingInfo) => {
      if (!isPrimary) return;
      const obj = info.object as AnyFeature | undefined;
      const id = (obj?.properties as { id?: string } | undefined)?.id;
      if (id) {
        setSharedHovered(obj as AnyFeature, info.x, info.y);
      } else {
        setSharedHovered(null, 0, 0);
      }
    },
    [setSharedHovered, isPrimary],
  );

  // Phase 5 — derive the correlation set. Recomputed whenever the selection
  // or the timeline window changes. Primary publishes to the store so
  // DetailPanel can render the "Related" block; compare keeps it local.
  const sharedSelectedFeature = useGlobeStore((s) => s.selectedFeature);
  const selectedFeature = isPrimary ? sharedSelectedFeature : localSelectedFeature;
  const correlation = useMemo<CorrelationSet | null>(() => {
    if (!selectedFeature) return null;
    return buildCorrelationSet(selectedFeature, facilities, t0, t1);
  }, [selectedFeature, facilities, t0, t1]);

  useEffect(() => {
    if (!isPrimary) return;
    setSharedCorrelation(correlation);
  }, [correlation, setSharedCorrelation, isPrimary]);

  const layers = useMemo(() => {
    const baseLayers = buildBasemapLayers(land, countries);
    const active = new Set(activeLayers as LayerId[]);

    const regulatoryLayers: Layer[] = [];
    const facilityLayers: Layer[] = [];
    const supplyLayers: Layer[] = [];
    const tradeLayers: Layer[] = [];
    const moneyLayers: Layer[] = [];
    const patentLayers: Layer[] = [];
    const exportControlLayers: Layer[] = [];
    const coauthorshipLayers: Layer[] = [];
    const esgLayers: Layer[] = [];
    const jobsLayers: Layer[] = [];

    for (const meta of LAYERS) {
      if (!active.has(meta.id)) continue;
      const fc = facilities[meta.id];
      if (!fc) continue;

      if (meta.kind === 'facility') {
        facilityLayers.push(
          ...buildFacilityLayers({
            layer: meta,
            features: fc.features as unknown as FacilityFeature[],
            selectedId,
            hoveredId,
            pulsePhase,
            timeWindow,
            correlation,
            onClick,
            onHover,
          }),
        );
      } else if (meta.kind === 'regulatory') {
        regulatoryLayers.push(
          ...buildRegulatoryLayer({
            data: fc,
            selectedId,
            timeWindow,
            correlation,
            onClick,
            onHover,
          }),
        );
      } else if (meta.kind === 'supply') {
        supplyLayers.push(
          ...buildSupplyLayers({
            features: fc.features as unknown as SupplyArcFeature[],
            selectedId,
            pulsePhase,
            timeWindow,
            correlation,
            tripHead: play ? tripHead : null,
            onClick,
            onHover,
          }),
        );
      } else if (meta.kind === 'trade') {
        tradeLayers.push(
          ...buildTradeLayers({
            features: fc.features as unknown as TradeArcFeature[],
            selectedId,
            pulsePhase,
            timeWindow,
            correlation,
            onClick,
            onHover,
          }),
        );
      } else if (meta.kind === 'money') {
        moneyLayers.push(
          ...buildMoneyLayers({
            features: fc.features as unknown as MoneyFlowFeature[],
            selectedId,
            hoveredId,
            pulsePhase,
            timeWindow,
            correlation,
            onClick,
            onHover,
          }),
        );
      } else if (meta.kind === 'patent') {
        patentLayers.push(
          ...buildPatentLayers({
            features: fc.features as unknown as PatentFeature[],
            selectedId,
            hoveredId,
            pulsePhase,
            timeWindow,
            correlation,
            onClick,
            onHover,
          }),
        );
      } else if (meta.kind === 'export-control') {
        exportControlLayers.push(
          ...buildExportControlLayers({
            features: fc.features as unknown as ExportControlFeature[],
            selectedId,
            hoveredId,
            pulsePhase,
            timeWindow,
            correlation,
            onClick,
            onHover,
          }),
        );
      } else if (meta.kind === 'coauthorship') {
        coauthorshipLayers.push(
          ...buildCoauthorshipLayers({
            features: fc.features as unknown as CoauthorshipFeature[],
            selectedId,
            pulsePhase,
            timeWindow,
            correlation,
            onClick,
            onHover,
          }),
        );
      } else if (meta.kind === 'esg') {
        esgLayers.push(
          ...buildEsgLayers({
            features: fc.features as unknown as EsgFeature[],
            selectedId,
            hoveredId,
            pulsePhase,
            timeWindow,
            correlation,
            onClick,
            onHover,
          }),
        );
      } else if (meta.kind === 'job-posting') {
        jobsLayers.push(
          ...buildAiJobLayers({
            features: fc.features as unknown as JobPostingFeature[],
            selectedId,
            hoveredId,
            pulsePhase,
            timeWindow,
            correlation,
            onClick,
            onHover,
          }),
        );
      }
    }

    // Correlation arcs sit above everything except money-flow bubbles so the
    // narrative lines read over the dimmed layer stack.
    const correlationLayers = buildCorrelationLayers({ correlation, pulsePhase });

    return [
      ...baseLayers,
      ...regulatoryLayers,
      ...coauthorshipLayers,
      ...tradeLayers,
      ...supplyLayers,
      ...patentLayers,
      ...jobsLayers,
      ...esgLayers,
      ...facilityLayers,
      ...exportControlLayers,
      ...moneyLayers,
      ...correlationLayers,
    ];
  }, [
    land,
    countries,
    facilities,
    activeLayers,
    selectedId,
    hoveredId,
    pulsePhase,
    timeWindow,
    play,
    tripHead,
    correlation,
    onClick,
    onHover,
  ]);

  return (
    <div className="absolute inset-0">
      <DeckGL
        views={isPrimary ? GLOBE_VIEW_PRIMARY : GLOBE_VIEW_COMPARE}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={{ dragRotate: false }}
        layers={layers}
        onClick={onClick}
        getCursor={({ isDragging, isHovering }) =>
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
        }
        style={{ background: '#000' }}
      />
    </div>
  );
}
