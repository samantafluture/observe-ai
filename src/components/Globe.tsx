import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { _GlobeView as GlobeView } from '@deck.gl/core';
import type { PickingInfo, MapViewState } from '@deck.gl/core';

import { useGlobeStore } from '../store/globeStore';
import { useBasemapData } from '../hooks/useBasemapData';
import { useFacilityData } from '../hooks/useFacilityData';
import { useUrlViewState, useUrlLayers, useUrlSelected } from '../hooks/useUrlState';
import { buildBasemapLayers } from './layers/basemap';
import { buildFacilityLayers } from './layers/facilities';
import { AUTO_ROTATE_DEG_PER_SEC, GLOBE_RESOLUTION, INITIAL_VIEW, LAYERS } from '../utils/constants';
import type { FacilityFeature, LayerId } from '../types';

const GLOBE_VIEW = new GlobeView({
  id: 'globe',
  resolution: GLOBE_RESOLUTION,
  controller: { dragRotate: false },
});

export function Globe() {
  const { countries, land } = useBasemapData();
  const { data: facilities } = useFacilityData();

  // URL-seeded view state — then controlled locally to allow rAF updates
  // without thrashing the URL every frame.
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

  // Reconstruct the selected feature from URL (?sel=) once data has loaded.
  // After that, Zustand is the source of truth.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!urlSelected) return;
    for (const layer of LAYERS) {
      const fc = facilities[layer.id];
      if (!fc) continue;
      const found = (fc.features as FacilityFeature[]).find(
        (f) => f.properties.id === urlSelected,
      );
      if (found) {
        setSelected(found as FacilityFeature);
        hydratedRef.current = true;
        return;
      }
    }
  }, [urlSelected, facilities, setSelected]);

  // rAF loop drives both pulse and auto-rotation.
  const [pulsePhase, setPulsePhase] = useState(0);
  useEffect(() => {
    let frameId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPulsePhase((p) => (p + dt * 2) % (Math.PI * 2));
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
      const obj = info.object as FacilityFeature | undefined;
      if (obj?.properties?.id) {
        setSelected(obj);
        void setUrlSelected(obj.properties.id);
      } else {
        setSelected(null);
        void setUrlSelected(null);
      }
    },
    [setSelected, setUrlSelected],
  );

  const onHover = useCallback(
    (info: PickingInfo) => {
      const obj = info.object as FacilityFeature | undefined;
      if (obj?.properties?.id) {
        setHovered(obj, info.x, info.y);
      } else {
        setHovered(null, 0, 0);
      }
    },
    [setHovered],
  );

  const layers = useMemo(() => {
    const baseLayers = buildBasemapLayers(land, countries);
    const facilityLayers = LAYERS.filter((l) => (activeLayers as LayerId[]).includes(l.id)).flatMap(
      (l) => {
        const fc = facilities[l.id];
        if (!fc) return [];
        return buildFacilityLayers({
          layer: l,
          features: fc.features as FacilityFeature[],
          selectedId,
          hoveredId,
          pulsePhase,
          onClick,
          onHover,
        });
      },
    );
    return [...baseLayers, ...facilityLayers];
  }, [
    land,
    countries,
    facilities,
    activeLayers,
    selectedId,
    hoveredId,
    pulsePhase,
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
