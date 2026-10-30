import { useStudio } from '../state';
import { engine } from './engine';
import { ice } from './ice';
import { iphone } from './iphone';
import { MODEL_T_LEVELS, modelT } from './model-t';
import { SATURN_V_LEVELS, saturnV } from './saturn-v';
import { jack } from './jack';
import { pump } from './pump';
import { valve } from './valve';
import { vise } from './vise';
import type { MachineDef } from './types';

/** Machines in the order the switcher lists them. */
export const MACHINES: MachineDef[] = [jack, vise, valve, pump, ice, engine, iphone, modelT, saturnV];

/** Every assembly, including subassemblies reached only by opening a part. */
const ALL: MachineDef[] = [...MACHINES, ...MODEL_T_LEVELS, ...SATURN_V_LEVELS];

export const allMachines = () => ALL;

export function machineById(id: string): MachineDef {
  return ALL.find((m) => m.id === id) ?? MACHINES[0];
}

/** The chain of assemblies from the top level down to this one. */
export function lineage(machine: MachineDef): MachineDef[] {
  const chain = [machine];
  while (chain[0].parent) chain.unshift(machineById(chain[0].parent));
  return chain;
}

/** The machine on the plate right now (for non-React code: per-frame and exporters). */
export function currentMachine(): MachineDef {
  return machineById(useStudio.getState().machineId);
}

export function useMachine(): MachineDef {
  return machineById(useStudio((s) => s.machineId));
}
