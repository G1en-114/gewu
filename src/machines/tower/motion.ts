import { useFrame } from '@react-three/fiber';
import { create } from 'zustand';
import { useStudio } from '../../state';
import {
  CARDS, COLUMNS, DIGITS, ENGINE_RATIO, HALF, PRINT, digitsOf, halfStep, initialColumns, isReceiver, pulse, smooth,
  spiralTurn, type HalfStep, warningUp, wheelReading, within,
} from './calc';

/**
 * Everything that moves in the tower comes from one number: how many turns
 * the main vertical shaft has made (one turn = one calculation cycle = one
 * printed line). The driver advances it and, once per frame, works out the
 * state of every wheel, lever and arm into `tw`, which the models read.
 */

export type Pressure = 'low' | 'mid' | 'high';
/** Seconds per calculation cycle at each boiler pressure. */
export const CYCLE_SECONDS: Record<Pressure, number> = { low: 16, mid: 8, high: 4 };
export const PRESSURE_BAR: Record<Pressure, number> = { low: 4, mid: 6, high: 8 };

interface TowerState {
  card: string;
  pressure: Pressure;
  set: (patch: Partial<Omit<TowerState, 'set'>>) => void;
}

export const useTower = create<TowerState>((set) => ({ card: 'euler', pressure: 'mid', set: (patch) => set(patch) }));

export const towerMotion = {
  /** Main-shaft turns since the card was loaded. */
  cycle: 0,
  /** Engine speed (crank turns per second), eased toward the pressure setting. */
  crankRate: ENGINE_RATIO / CYCLE_SECONDS.mid,
  /** Crankshaft angle (rad), advanced with crankRate. */
  crank: 0,
  /** Card drum position (faces), eased toward the loaded card. */
  drum: 0,
  /** Seconds since start, for flicker and the like. */
  clock: 0,
};

// ── Engine state through the cycles (cached, advanced incrementally) ─────

let loadedCard = '';
let halves: number[][] = [];

/** The seven columns at the start of half-cycle h (h = 2 × cycle + half). */
export function columnsAtHalf(h: number): number[] {
  const card = useTower.getState().card;
  if (card !== loadedCard) {
    loadedCard = card;
    halves = [initialColumns(CARDS.find((c) => c.id === card) ?? CARDS[0])];
  }
  while (halves.length <= h) halves.push(halfStep(halves[halves.length - 1], ((halves.length - 1) % 2) as 0 | 1).after);
  return halves[h];
}

export const currentCard = () => CARDS.find((c) => c.id === useTower.getState().card) ?? CARDS[0];

/** Per-frame state of the calculating mechanism. */
export const tw = {
  n: 0,
  half: 0 as 0 | 1,
  /** 0–1 through the current half-cycle and the whole cycle. */
  u: 0,
  uc: 0,
  step: null as HalfStep | null,
  /** reading[col][digit]: the wheel's reading in digits (angle = −reading × 36°). */
  reading: Array.from({ length: COLUMNS }, () => new Array<number>(DIGITS).fill(0)),
  /** Adding wheel turn (digits) and feeler reach (0–1) for each receiving column's digits. */
  adder: Array.from({ length: COLUMNS }, () => new Array<number>(DIGITS).fill(0)),
  /** Adding wheel lifted out of mesh for its return (0–1). */
  adderLift: new Array<number>(COLUMNS).fill(0),
  feeler: new Array<number>(COLUMNS).fill(0),
  /** Giver digit the feeler is measuring (for its reach). */
  feelDigit: Array.from({ length: COLUMNS }, () => new Array<number>(DIGITS).fill(0)),
  warning: Array.from({ length: COLUMNS }, () => new Array<number>(DIGITS).fill(0)),
  /** Carry spiral shaft angle (turns) per column. */
  spiral: new Array<number>(COLUMNS).fill(0),
  /** Lock bar withdrawn (0–1) per column. */
  unlocked: new Array<number>(COLUMNS).fill(0),
  /** Printer: type wheel readings, hammer (0–1), paper advance (lines, continuous). */
  type: new Array<number>(DIGITS).fill(0),
  hammer: 0,
  paper: 0,
  /** Lines printed so far (values of f). */
  printed: [] as number[],
};

function compute() {
  const c = towerMotion.cycle;
  const n = Math.floor(c);
  const uc = c - n;
  const half = (uc < 0.5 ? 0 : 1) as 0 | 1;
  const u = half === 0 ? uc * 2 : uc * 2 - 1;
  const h = 2 * n + half;
  const step = halfStep(columnsAtHalf(h), half);
  tw.n = n;
  tw.half = half;
  tw.u = u;
  tw.uc = uc;
  tw.step = step;
  for (let col = 0; col < COLUMNS; col += 1) {
    const a = step.additions[col];
    const giver = col + 1 < COLUMNS ? digitsOf(step.before[col + 1]) : null;
    const resting = digitsOf(step.before[col]);
    const receives = isReceiver(half, col);
    for (let j = 0; j < DIGITS; j += 1) {
      tw.reading[col][j] = a ? wheelReading(a, j, u) : resting[j];
      tw.warning[col][j] = a ? warningUp(a, j, u) : 0;
      tw.adder[col][j] = a ? a.add[j] * smooth(within(u, HALF.add)) * (1 - smooth(within(u, [0.5, 0.86]))) : 0;
      tw.feelDigit[col][j] = giver ? giver[j] : 0;
    }
    tw.feeler[col] = receives ? pulse(u, HALF.unlock, [0.46, 0.5]) : 0;
    tw.adderLift[col] = receives ? pulse(u, [0.46, 0.5], [0.86, 0.92]) : 0;
    const p = col % 2;
    tw.spiral[col] = col < COLUMNS - 1 ? n + (half > p ? 1 : 0) + (half === p ? spiralTurn(u) : 0) : 0;
    tw.unlocked[col] = receives ? pulse(u, HALF.unlock, HALF.lock) : 0;
  }
  // Printer: f(n) is on the type wheels from the last cycle; set them to f(n + 1) once the first half is done.
  const from = digitsOf(columnsAtHalf(2 * n)[0]);
  const to = digitsOf(columnsAtHalf(2 * n + 1)[0]);
  const s = smooth(within(uc, PRINT.set));
  for (let j = 0; j < DIGITS; j += 1) tw.type[j] = from[j] + (((to[j] - from[j]) % 10) + 10) % 10 * s;
  tw.hammer = pulse(uc, [PRINT.strike[0], (PRINT.strike[0] + PRINT.strike[1]) / 2], [(PRINT.strike[0] + PRINT.strike[1]) / 2, PRINT.strike[1]]);
  tw.paper = n + smooth(within(uc, PRINT.feed));
  const lines = n + (uc >= PRINT.strike[0] + 0.03 ? 2 : 1);
  if (tw.printed.length !== lines) tw.printed = Array.from({ length: lines }, (_, i) => columnsAtHalf(2 * i)[0]);
}

/** Main-shaft angle (rad); the cam drum turns with it. */
export const mainShaft = () => towerMotion.cycle * Math.PI * 2;
/** Governor fly-ball spread (0–1) from engine speed. */
export const governorSpread = () => Math.min(1, Math.max(0, (towerMotion.crankRate * 60 - 15) / 90));

let lastCard = useTower.getState().card;

export function TowerDriver() {
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const { card, pressure } = useTower.getState();
    if (card !== lastCard) {
      lastCard = card;
      towerMotion.cycle = 0;
    }
    const target = ENGINE_RATIO / CYCLE_SECONDS[pressure];
    towerMotion.crankRate += (target - towerMotion.crankRate) * Math.min(1, dt * 1.5);
    if (useStudio.getState().running) {
      towerMotion.cycle += (towerMotion.crankRate / ENGINE_RATIO) * dt;
      towerMotion.crank += towerMotion.crankRate * Math.PI * 2 * dt;
      towerMotion.clock += dt;
    }
    const face = CARDS.findIndex((c) => c.id === card);
    towerMotion.drum += (face - towerMotion.drum) * Math.min(1, dt * 3);
    compute();
  }, -1);
  return null;
}

compute();
