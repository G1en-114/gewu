import { create } from 'zustand';

export type ViewMode = 'perspective' | 'elevation' | 'plan' | 'drawing';

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
  /** Drawing mode: dashed hidden outlines, and projection lines for the selected part. */
  hiddenLines: boolean;
  projection: boolean;
  /** Drag parts around instead of orbiting the view. */
  moveMode: boolean;
  /** Explode the whole tree: subassemblies come out beside the machine and come apart too. */
  deep: boolean;
  /** Bumped when a part's size or position is edited from the UI. */
  editNonce: number;
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
  hiddenLines: true,
  projection: true,
  moveMode: false,
  deep: false,
  editNonce: 0,
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
  /** 0–1 progress of the whole-tree explode. */
  deep: 0,
};

/**
 * The viewer's own edits to parts of the current assembly: where they have
 * been dragged (in model units, on top of the explode) and how big they are.
 */
export const partEdits = new Map<string, { offset: [number, number, number]; scale: number }>();

export function editOf(id: string) {
  let edit = partEdits.get(id);
  if (!edit) {
    edit = { offset: [0, 0, 0], scale: 1 };
    partEdits.set(id, edit);
  }
  return edit;
}

/** Forget one part's edits, or all of them. */
export function clearEdits(id?: string) {
  if (id) partEdits.delete(id);
  else partEdits.clear();
  useStudio.setState((s) => ({ editNonce: s.editNonce + 1 }));
}

/**
 * Put everything back as it was when the machine was opened: reassembled,
 * no edits, no section, default view and switches, first study step.
 */
export function restoreAll(first: { state: { running: boolean; select: string | null; focus: string | null }; apply?: () => void }) {
  partEdits.clear();
  motion.localPart = null;
  motion.local = 0;
  first.apply?.();
  useStudio.setState((s) => ({
    explode: 0, deep: false, section: false, running: first.state.running, view: 'perspective', focus: first.state.focus,
    viewNonce: s.viewNonce + 1, selected: first.state.select, hovered: null, localExplode: null, step: 0, moveMode: false,
    labels: typeof window === 'undefined' || window.innerWidth >= 700, hiddenLines: true, projection: true, editNonce: s.editNonce + 1,
  }));
  document.body.style.cursor = '';
}

/** Switch machine: reset the study state and let the new machine assemble itself. */
export function selectMachine(id: string) {
  const { viewNonce, machineId } = useStudio.getState();
  if (id === machineId) return;
  motion.explode = 1;
  motion.local = 0;
  motion.localPart = null;
  motion.deep = 0;
  partEdits.clear();
  useStudio.getState().set({
    machineId: id, explode: 0, section: false, running: true, view: 'perspective', focus: null,
    viewNonce: viewNonce + 1, selected: null, hovered: null, localExplode: null, step: 0, deep: false,
  });
}
