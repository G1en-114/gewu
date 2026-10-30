import type { MachineDef } from '../types';
import { f1Level } from './f1';
import { rocketLevel } from './rocket';
import { sicLevel } from './sic';

/** Saturn V and the subassemblies its parts open into. */
export const saturnV = rocketLevel;

export const SATURN_V_LEVELS: MachineDef[] = [sicLevel, f1Level];
