import type { MachineDef } from '../types';
import { carLevel } from './car';
import { differentialLevel } from './differential';
import { engineLevel } from './engine';
import { frontAxleLevel } from './frontAxle';
import { pistonLevel } from './piston';
import { rearAxleLevel } from './rearAxle';
import { transmissionLevel } from './transmission';
import { wheelLevel } from './wheel';

/** Ford Model T: the car, and the subassemblies its parts open into. */
export const modelT = carLevel;

export const MODEL_T_LEVELS: MachineDef[] = [engineLevel, pistonLevel, transmissionLevel, frontAxleLevel, rearAxleLevel, differentialLevel, wheelLevel];
