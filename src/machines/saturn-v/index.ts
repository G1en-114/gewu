import type { MachineDef } from '../types';
import { cmLevel, smLevel } from './csm';
import { f1Level } from './f1';
import { lmLevel } from './lm';
import { rocketLevel } from './rocket';
import { sicLevel } from './sic';

/** Saturn V and the subassemblies its parts open into. */
export const saturnV = rocketLevel;

export const SATURN_V_LEVELS: MachineDef[] = [sicLevel, f1Level, lmLevel, smLevel, cmLevel];
