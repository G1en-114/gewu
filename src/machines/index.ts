import { useStudio } from '../state';
import { engine } from './engine';
import { jack } from './jack';
import type { MachineDef } from './types';

/** Machines in the order the switcher lists them. */
export const MACHINES: MachineDef[] = [jack, engine];

export function machineById(id: string): MachineDef {
  return MACHINES.find((m) => m.id === id) ?? MACHINES[0];
}

/** The machine on the plate right now (for non-React code: per-frame and exporters). */
export function currentMachine(): MachineDef {
  return machineById(useStudio.getState().machineId);
}

export function useMachine(): MachineDef {
  return machineById(useStudio((s) => s.machineId));
}
