import { create } from 'zustand';

export type ViewMode = 'perspective' | 'elevation' | 'plan';

export interface StudioState {
  machineId: string;
  explode: number;
  section: boolean;
  running: boolean;
  view: ViewMode;
  /** Optional close-up within the perspective view (a key of the machine's camera foci). */
  focus: string | null;
  /** Bumped to make the camera return to the current view preset. */
  viewNonce: number;
  selected: string | null;
  hovered: string | null;
  /** Part opened on its own (local explode), with its neighbours. */
  localExplode: string | null;
  step: number;
  /** Show numbered balloons for every part. */
  labels: boolean;
  set: (patch: Partial<Omit<StudioState, 'set'>>) => void;
}

export const useStudio = create<StudioState>((set) => ({
  machineId: 'jack',
  explode: 0,
  section: false,
  running: true,
  view: 'perspective',
  focus: null,
  viewNonce: 0,
  selected: null,
  hovered: null,
  localExplode: null,
  step: 0,
  labels: typeof window === 'undefined' || window.innerWidth >= 700,
  set: (patch) => set(patch),
}));

/**
 * Per-frame values eased toward the store's targets. Kept outside React so
 * the scene can animate without re-rendering. Machine-specific motion lives
 * with each machine.
 */
export const motion = {
  /** Starts apart so the machine assembles itself on load. */
  explode: 1,
  /** Slider units per second; slowed down while recording the teardown. */
  explodeRate: 0.55,
  /** Local explode: which part, and its 0–1 progress. */
  localPart: null as string | null,
  local: 0,
};

/** Switch machine: reset the study state and let the new machine assemble itself. */
export function selectMachine(id: string) {
  const { viewNonce, machineId } = useStudio.getState();
  if (id === machineId) return;
  motion.explode = 1;
  motion.local = 0;
  motion.localPart = null;
  useStudio.getState().set({
    machineId: id, explode: 0, section: false, running: true, view: 'perspective', focus: null,
    viewNonce: viewNonce + 1, selected: null, hovered: null, localExplode: null, step: 0,
  });
}
