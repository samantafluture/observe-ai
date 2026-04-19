import { create } from 'zustand';
import type { AnyFeature } from '../types';

interface GlobeState {
  selectedId: string | null;
  selectedFeature: AnyFeature | null;
  hoveredId: string | null;
  hoveredFeature: AnyFeature | null;
  hoverX: number;
  hoverY: number;
  autoRotate: boolean;
  setSelected: (feature: AnyFeature | null) => void;
  setHovered: (feature: AnyFeature | null, x: number, y: number) => void;
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
