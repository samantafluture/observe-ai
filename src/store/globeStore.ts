import { create } from 'zustand';
import type { AnyFeature } from '../types';
import type { CorrelationSet } from '../utils/correlate';

interface GlobeState {
  selectedId: string | null;
  selectedFeature: AnyFeature | null;
  hoveredId: string | null;
  hoveredFeature: AnyFeature | null;
  hoverX: number;
  hoverY: number;
  autoRotate: boolean;
  /** Phase 5 — cross-layer correlation set for the current selection. */
  correlation: CorrelationSet | null;
  setSelected: (feature: AnyFeature | null) => void;
  setHovered: (feature: AnyFeature | null, x: number, y: number) => void;
  setAutoRotate: (value: boolean) => void;
  setCorrelation: (c: CorrelationSet | null) => void;
  clearSelection: () => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  selectedId: null,
  selectedFeature: null,
  hoveredId: null,
  hoveredFeature: null,
  hoverX: 0,
  hoverY: 0,
  autoRotate: true,
  correlation: null,
  setSelected: (feature) =>
    set({
      selectedId: feature?.properties.id ?? null,
      selectedFeature: feature,
    }),
  setHovered: (feature, x, y) =>
    set({
      hoveredId: feature?.properties.id ?? null,
      hoveredFeature: feature,
      hoverX: x,
      hoverY: y,
    }),
  setAutoRotate: (value) => set({ autoRotate: value }),
  setCorrelation: (c) => set({ correlation: c }),
  clearSelection: () =>
    set({ selectedId: null, selectedFeature: null, correlation: null }),
}));
