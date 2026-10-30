import type { MachinePartId } from '../types/machine';
import { motion } from '../state';

/**
 * Staged disassembly. Every part and every removable bolt set owns a window
 * of the 0–1 explode slider, in reverse assembly order, so dragging the
 * slider plays the teardown: bolts first, then the cover, then the piston…
 */

export type BoltSetId = 'cover-bolts' | 'chest-bolts' | 'cap-bolts';
export type StageId = MachinePartId | BoltSetId;

export const STAGES: Record<StageId, [number, number]> = {
  'cover-bolts': [0.0, 0.12],
  'cylinder-cover': [0.08, 0.24],
  piston: [0.18, 0.34],
  'chest-bolts': [0.24, 0.34],
  'valve-chest': [0.3, 0.44],
  governor: [0.38, 0.52],
  'cap-bolts': [0.44, 0.54],
  'main-bearing': [0.5, 0.62],
  flywheel: [0.58, 0.72],
  'connecting-rod': [0.64, 0.76],
  crosshead: [0.7, 0.82],
  crankshaft: [0.74, 0.86],
  'valve-gear': [0.78, 0.9],
  bed: [0.84, 0.97],
  plinth: [0.86, 1.0],
  cylinder: [1, 1],
};

/** Bolt sets fly out along each bolt's own axis, this far. */
export const BOLT_SETS: Record<BoltSetId, { owner: MachinePartId; distance: number }> = {
  'cover-bolts': { owner: 'cylinder-cover', distance: 0.55 },
  'chest-bolts': { owner: 'valve-chest', distance: 0.5 },
  'cap-bolts': { owner: 'main-bearing', distance: 0.45 },
};

/** What comes apart when one part is opened on its own (local explode). */
export const NEIGHBOURS: Record<MachinePartId, StageId[]> = {
  plinth: ['plinth'],
  bed: ['bed'],
  cylinder: ['cover-bolts', 'cylinder-cover', 'piston', 'chest-bolts', 'valve-chest'],
  'cylinder-cover': ['cover-bolts', 'cylinder-cover', 'piston'],
  piston: ['cover-bolts', 'cylinder-cover', 'piston'],
  'valve-chest': ['chest-bolts', 'valve-chest'],
  crosshead: ['crosshead', 'connecting-rod'],
  'connecting-rod': ['connecting-rod', 'crosshead'],
  crankshaft: ['cap-bolts', 'main-bearing', 'connecting-rod', 'crankshaft', 'flywheel'],
  'main-bearing': ['cap-bolts', 'main-bearing'],
  flywheel: ['cap-bolts', 'main-bearing', 'flywheel'],
  governor: ['governor'],
  'valve-gear': ['valve-gear'],
};

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** 0–1 progress of one stage, from the global slider or the local explode. */
export function stageProgress(id: StageId): number {
  const [a, b] = STAGES[id];
  const global = b > a ? smooth((motion.explode - a) / (b - a)) : 0;
  let local = 0;
  if (motion.localPart && motion.local > 0) {
    const group = NEIGHBOURS[motion.localPart];
    const index = group.indexOf(id);
    if (index >= 0) {
      // Within a local explode, keep the same order but spread over the group.
      const n = group.length;
      const start = (index / n) * 0.7;
      local = smooth((motion.local - start) / 0.3 / Math.max(1, 3 / n));
    }
  }
  return Math.max(global, local);
}
