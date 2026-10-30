import { useStudio } from '../state';
import { engine } from './engine';
import { ice } from './ice';
import { aperture } from './aperture';
import { BICYCLE_LEVELS, bicycle } from './bicycle';
import { cistern } from './cistern';
import { elevator } from './elevator';
import { EXCAVATOR_LEVELS, excavator } from './excavator';
import { gearbox } from './gearbox';
import { gyro } from './gyro';
import { iphone } from './iphone';
import { micrometer } from './micrometer';
import { motor } from './motor';
import { pen } from './pen';
import { piano } from './piano';
import { rotor } from './rotor';
import { steering } from './steering';
import { stirling } from './stirling';
import { lock } from './lock';
import { MODEL_T_LEVELS, modelT } from './model-t';
import { SATURN_V_LEVELS, saturnV } from './saturn-v';
import { turbofan } from './turbofan';
import { watch } from './watch';
import { WIND_LEVELS, wind } from './wind';
import { jack } from './jack';
import { pump } from './pump';
import { valve } from './valve';
import { vise } from './vise';
import type { MachineDef } from './types';

/** Machines in the order the switcher lists them. */
/** The switcher's shelves. */
export const GROUPS: Array<{ name: string; machines: MachineDef[] }> = [
  { name: '基础机构', machines: [jack, vise, valve, pump, micrometer, gyro] },
  { name: '日常器物', machines: [lock, pen, cistern, aperture, iphone, watch, piano, bicycle] },
  { name: '动力传动', machines: [motor, ice, stirling, engine, turbofan, gearbox, steering, wind] },
  { name: '大型装备', machines: [rotor, elevator, excavator, modelT, saturnV] },
];

export const MACHINES: MachineDef[] = GROUPS.flatMap((g) => g.machines);

/** Every assembly, including subassemblies reached only by opening a part. */
const ALL: MachineDef[] = [...MACHINES, ...MODEL_T_LEVELS, ...SATURN_V_LEVELS, ...BICYCLE_LEVELS, ...EXCAVATOR_LEVELS, ...WIND_LEVELS];

export const allMachines = () => ALL;
export const hasMachine = (id: string) => ALL.some((m) => m.id === id);

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
