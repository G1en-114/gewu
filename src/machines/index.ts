import { useStudio } from '../state';
import { engine } from './engine';
import { ice } from './ice';
import { aperture } from './aperture';
import { BICYCLE_LEVELS, bicycle } from './bicycle';
import { brake } from './brake';
import { centrifugal } from './centrifugal';
import { cistern } from './cistern';
import { drill } from './drill';
import { elevator } from './elevator';
import { EXCAVATOR_LEVELS, excavator } from './excavator';
import { gearbox } from './gearbox';
import { geneva } from './geneva';
import { gyro } from './gyro';
import { B747_LEVELS, b747 } from './b747';
import { ORRERY_LEVELS, orrery } from './orrery';
import { HELICOPTER_LEVELS, helicopter } from './helicopter';
import { iphone } from './iphone';
import { micrometer } from './micrometer';
import { motor } from './motor';
import { pen } from './pen';
import { piano } from './piano';
import { printer } from './printer';
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
  { name: '基础机构', machines: [jack, vise, valve, pump, centrifugal, geneva, micrometer, gyro, orrery] },
  { name: '机床', machines: [drill] },
  { name: '日常器物', machines: [lock, pen, cistern, aperture, iphone, watch, piano, printer, bicycle] },
  { name: '动力传动', machines: [motor, ice, stirling, engine, turbofan, gearbox, steering, brake, wind] },
  { name: '大型装备', machines: [helicopter, elevator, excavator, modelT, b747, saturnV] },
];

export const MACHINES: MachineDef[] = GROUPS.flatMap((g) => g.machines);

/** Every assembly, including subassemblies reached only by opening a part. */
const ALL: MachineDef[] = [...MACHINES, ...MODEL_T_LEVELS, ...SATURN_V_LEVELS, ...BICYCLE_LEVELS, ...EXCAVATOR_LEVELS, ...WIND_LEVELS, ...HELICOPTER_LEVELS, ...B747_LEVELS, ...ORRERY_LEVELS];

export const allMachines = () => ALL;

// For the scripts in scripts/: every assembly, as the app actually registers it.
if (typeof window !== 'undefined') {
  (window as unknown as { gewu: unknown }).gewu = { assemblies: () => ALL.map((m) => ({ id: m.id, parent: m.parent ?? null })) };
}
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
