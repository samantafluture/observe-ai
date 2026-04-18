import { create } from 'zustand';
import type { FacilityFeature } from '../types';

interface GlobeState {
  selectedId: string | null;
  selectedFeature: FacilityFeature | null;
  hoveredId: string | null;
  hoveredFeature: FacilityFeature | null;
  hoverX: number;
  hoverY: number;
  autoRotate: boolean;
  setSelected: (feature: FacilityFeature | null) => void;
  setHovered: (feature: FacilityFeature | null, x: number, y: number) => void;
  setAutoRotate: (value: boolean) => void;
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
  clearSelection: () => set({ selectedId: null, selectedFeature: null }),
}));
