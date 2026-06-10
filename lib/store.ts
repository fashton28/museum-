import { create } from 'zustand';

export type Phase = 'idle' | 'diving' | 'open' | 'closing';

export interface DiveTarget {
  position: [number, number, number];
  normal: [number, number, number];
  height: number;
}

interface AppState {
  // virtual scroll + drag orbit
  targetDepth: number;
  depth: number;
  orbitTarget: number; // accumulated drag rotation, rad
  orbit: number; // damped
  velocity: number; // damped |motion|, drives the liquid warp + audio
  boost: number; // click-dive warp spike, 0..1
  suppressClick: boolean; // true while/just after dragging
  // tile modal flow
  phase: Phase;
  selectedTileId: string | null;
  preDiveDepth: number;
  /** world-space tile pose captured at click time (rings rotate, so it moves) */
  diveTarget: DiveTarget | null;
  // audio
  soundOn: boolean;
  openTile: (id: string, target: DiveTarget) => void;
  closeTile: () => void;
  setPhase: (phase: Phase) => void;
}

export const MAX_DEPTH = 14;

export const useStore = create<AppState>((set, get) => ({
  targetDepth: 0,
  depth: 0,
  orbitTarget: 0,
  orbit: 0,
  velocity: 0,
  boost: 0,
  suppressClick: false,
  phase: 'idle',
  selectedTileId: null,
  preDiveDepth: 0,
  diveTarget: null,
  soundOn: false,
  openTile: (id, target) => {
    if (get().phase !== 'idle') return;
    set({ phase: 'diving', selectedTileId: id, preDiveDepth: get().depth, diveTarget: target });
  },
  closeTile: () => {
    if (get().phase !== 'open') return;
    set({ phase: 'closing' });
  },
  setPhase: (phase) => set({ phase }),
}));
