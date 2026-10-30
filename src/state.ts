import { create } from 'zustand';
import type { FocusId, MachinePartId, ViewMode } from './types/machine';

export interface StudioState {
  explode: number;
  section: boolean;
  running: boolean;
  /** Load on the engine, 0–1. Speed follows from steam, load and the governor. */
  load: number;
  /** Whether the governor is linked to the throttle. */
  governor: boolean;
  view: ViewMode;
  /** Optional close-up within the perspective view. */
  focus: FocusId | null;
  /** Bumped to make the camera return to the current view preset. */
  viewNonce: number;
  selected: MachinePartId | null;
  /** Part opened on its own (local explode), with its neighbours. */
  localExplode: MachinePartId | null;
  hovered: MachinePartId | null;
  step: number;
  /** Show numbered balloons for every part. */
  labels: boolean;
  set: (patch: Partial<Omit<StudioState, 'set'>>) => void;
}

export const useStudio = create<StudioState>((set) => ({
  explode: 0,
  section: false,
  running: true,
  load: 0.5,
  governor: true,
  view: 'perspective',
  focus: null,
  viewNonce: 0,
  selected: null,
  localExplode: null,
  hovered: null,
  step: 0,
  labels: typeof window === 'undefined' || window.innerWidth >= 700,
  set: (patch) => set(patch),
}));

/**
 * Per-frame values eased toward the store's targets. Kept outside React so
 * the scene can animate without re-rendering.
 */
export const motion = {
  /** Starts apart so the machine assembles itself on load. */
  explode: 1,
  /** Slider units per second; slowed down while recording the teardown. */
  explodeRate: 0.55,
  /** Local explode: which part, and its 0–1 progress. */
  localPart: null as MachinePartId | null,
  local: 0,
  theta: 0.6,
  /** Governor arm angle from vertical, radians. */
  phi: 0.26,
  /** Shaft speed and throttle opening produced by the simple engine model. */
  rpm: 0,
  throttle: 1,
  spin: 0,
};
