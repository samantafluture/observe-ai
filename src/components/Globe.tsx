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
import { AUTO_ROTATE_DEG_PER_SEC, GLOBE_RESOLUTION, INITIAL_VIEW, LAYERS } from '../utils/constants';
import type {
  AnyFeature,
  CoauthorshipFeature,
  ExportControlFeature,
  FacilityFeature,
  LayerId,
  MoneyFlowFeature,
  PatentFeature,
  SupplyArcFeature,
  TradeArcFeature,
} from '../types';

const GLOBE_VIEW = new GlobeView({
  id: 'globe',
  resolution: GLOBE_RESOLUTION,
  controller: { dragRotate: false },
});

export function Globe() {
  const { countries, land } = useBasemapData();
  const { data: facilities } = useFacilityData();

  const {
    longitude: urlLng,
    latitude: urlLat,
    zoom: urlZoom,
    setLongitude,
    setLatitude,
    setZoom,
  } = useUrlViewState();

  const [viewState, setViewState] = useState<MapViewState>({
    longitude: urlLng,
    latitude: urlLat,
    zoom: urlZoom,
    minZoom: INITIAL_VIEW.minZoom,
    maxZoom: INITIAL_VIEW.maxZoom,
  });

  const [activeLayers] = useUrlLayers();
  const [urlSelected, setUrlSelected] = useUrlSelected();
  const { t0, t1, play } = useUrlTimeline();
  const timeWindow = useMemo(() => ({ t0, t1 }), [t0, t1]);

  const selectedId = useGlobeStore((s) => s.selectedId);
  const hoveredId = useGlobeStore((s) => s.hoveredId);
  const setSelected = useGlobeStore((s) => s.setSelected);
  const setHovered = useGlobeStore((s) => s.setHovered);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const setAutoRotate = useGlobeStore((s) => s.setAutoRotate);
  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Hydrate selection from URL once data has loaded. Walks every loaded
  // collection regardless of kind so polygons and arcs survive deep links.
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
        setSelected(found);
        hydratedRef.current = true;
        return;
      }
    }
  }, [urlSelected, facilities, setSelected]);

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
        // Head loops 0→1 once per ~1.4s so a chip "trip" reads at a glance.
        setTripHead((h) => (h + dt / 1.4) % 1);
      }
      if (autoRotateRef.current) {
        setViewState((vs) => ({
          ...vs,
          longitude: ((vs.longitude + AUTO_ROTATE_DEG_PER_SEC * dt + 540) % 360) - 180,
        }));
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

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
        if (autoRotateRef.current) setAutoRotate(false);
        void setLongitude(Number(next.longitude.toFixed(2)));
        void setLatitude(Number(next.latitude.toFixed(2)));
        void setZoom(Number(next.zoom.toFixed(2)));
      }
    },
    [setAutoRotate, setLongitude, setLatitude, setZoom],
  );

  const onClick = useCallback(
    (info: PickingInfo) => {
      const obj = info.object as AnyFeature | undefined;
      const id = (obj?.properties as { id?: string } | undefined)?.id;
      if (id) {
        setSelected(obj as AnyFeature);
        void setUrlSelected(id);
      } else {
        setSelected(null);
        void setUrlSelected(null);
      }
    },
    [setSelected, setUrlSelected],
  );

  const onHover = useCallback(
    (info: PickingInfo) => {
      const obj = info.object as AnyFeature | undefined;
      const id = (obj?.properties as { id?: string } | undefined)?.id;
      if (id) {
        setHovered(obj as AnyFeature, info.x, info.y);
      } else {
        setHovered(null, 0, 0);
      }
    },
    [setHovered],
  );

  const layers = useMemo(() => {
    const baseLayers = buildBasemapLayers(land, countries);
    const active = new Set(activeLayers as LayerId[]);

    // Render order: basemap → regulatory fills → coauthorship arcs →
    // trade arcs → supply arcs (narrative) → patent halos → facility halos
    // → export-control rings → money flow bubbles. Picking respects stack
    // order so foreground markers win overlaps.
    const regulatoryLayers: Layer[] = [];
    const facilityLayers: Layer[] = [];
    const supplyLayers: Layer[] = [];
    const tradeLayers: Layer[] = [];
    const moneyLayers: Layer[] = [];
    const patentLayers: Layer[] = [];
    const exportControlLayers: Layer[] = [];
    const coauthorshipLayers: Layer[] = [];

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
            onClick,
            onHover,
          }),
        );
      }
    }

    return [
      ...baseLayers,
      ...regulatoryLayers,
      ...coauthorshipLayers,
      ...tradeLayers,
      ...supplyLayers,
      ...patentLayers,
      ...facilityLayers,
      ...exportControlLayers,
      ...moneyLayers,
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
    onClick,
    onHover,
  ]);

  return (
    <div className="absolute inset-0">
      <DeckGL
        views={GLOBE_VIEW}
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
