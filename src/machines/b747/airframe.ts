import { create } from 'zustand';
import type { P3, Ring, Station } from './geo';

/**
 * Shared numbers for the Boeing 747-400 levels, from its published
 * dimensions: 70.6 m long, 64.4 m span, 19.4 m tall, 6.5 m fuselage, 37.5°
 * sweep. Metres; nose toward +x, y up, ground at y = 0, +z starboard (right).
 * Shapes between the published figures are generic.
 */

export const NOSE_X = 36;
export const TAIL_X = -34.6;
/** Main-deck fuselage radius and centre height. */
const R = 3.25;
const YC = 5.4;
/** Upper-deck hump: extra height over the main fuselage top. */
const HUMP = 1.75;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Fuselage cross-section at station x: centre height, radius, hump height. */
export function fuselageAt(x: number) {
  let yc = YC;
  let r = R;
  if (x > 24) {
    const u = Math.min(1, (x - 24) / (NOSE_X - 24));
    r = R * Math.sqrt(Math.max(0, 1 - u ** 2.6));
    yc = YC - 0.55 * u * u;
  } else if (x < -16) {
    const u = Math.min(1, (-16 - x) / (-16 - TAIL_X));
    yc = YC + 1.9 * u ** 1.6;
    r = R * (1 - 0.8 * u ** 1.25);
  }
  let hump = HUMP * smooth(6, 13.5, x);
  if (x > 28.5) hump *= Math.sqrt(Math.max(0, 1 - ((x - 28.5) / 7.6) ** 2));
  return { yc, r, hump };
}

/** Ring of N points around the fuselage at x (θ from the starboard waist, counter-clockwise seen from the nose). */
export function fuselageRing(x: number, N = 48): Ring {
  const { yc, r, hump } = fuselageAt(x);
  return Array.from({ length: N }, (_, i) => {
    const th = (i / N) * Math.PI * 2;
    const s = Math.sin(th);
    // The hump narrows toward the crown, like the 747's upper-deck walls.
    const up = s > 0 ? hump * s ** 3 : 0;
    return [x, yc + r * s + up, r * Math.cos(th) * (1 - 0.12 * (up / (HUMP + 1e-6)))];
  });
}

/** Stations along a fuselage section, denser where the shape changes fast. */
export function fuselageStations(x0: number, x1: number) {
  const xs: number[] = [];
  for (let x = x0; x < x1; x += x > 24 || x < -16 ? 0.6 : 1.5) xs.push(x);
  xs.push(x1);
  return xs;
}

/** Starboard hull half-width at station x and height y (where a window or door sits). */
export function hullZ(x: number, y: number): number {
  const ring = fuselageRing(x, 240).filter((p) => p[2] > 0);
  let best = ring[0];
  for (const p of ring) if (Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p;
  return best[2];
}

/** Main deck and upper deck floor heights. */
export const MAIN_FLOOR = 4.55;
export const UPPER_FLOOR = 7.55;

// ── Lifting surfaces (starboard; the port side is the mirror image) ──

export const WING: Station[] = [
  { le: [7.5, 3.6, 3.0], chord: 15.0, t: 0.135, twist: 0.035 },
  { le: [0.2, 4.65, 11.5], chord: 9.6, t: 0.105, twist: 0.02 },
  { le: [-15.1, 6.85, 29.5], chord: 4.0, t: 0.08, twist: -0.02 },
];
export const WING_TIP_Z = 29.5;

export const STABILIZER: Station[] = [
  { le: [-25.3, 6.9, 1.2], chord: 8.0, t: 0.1 },
  { le: [-32.6, 8.1, 11.1], chord: 2.7, t: 0.08 },
];

/** The fin is vertical: stations along y, thickness along z. */
export const FIN: Station[] = [
  { le: [-21.5, 8.2, 0], chord: 12.6, t: 0.1 },
  { le: [-31.6, 19.4, 0], chord: 4.4, t: 0.09 },
];

/** Engine mounts: where each engine's group goes (the turbofan's own origin), z starboard positive. */
export const ENGINE_SCALE = 1.52;
export const ENGINES: Array<{ id: string; at: P3 }> = [
  { id: 'engine-1', at: [-5.7, 3.7, -21.3] },
  { id: 'engine-2', at: [2.6, 2.55, -11.9] },
  { id: 'engine-3', at: [2.6, 2.55, 11.9] },
  { id: 'engine-4', at: [-5.7, 3.7, 21.3] },
];

/** Landing gear trunnions (pivot points) and leg lengths to the axle line. */
export const GEAR = {
  nose: { at: [27.4, 3.05, 0] as P3, len: 3.05 - 0.62 },
  body: [{ at: [-6.6, 3.1, 1.85] as P3 }, { at: [-6.6, 3.1, -1.85] as P3 }],
  wing: [{ at: [-3.9, 3.85, 5.5] as P3 }, { at: [-3.9, 3.85, -5.5] as P3 }],
};
/** Tyre radius (H49×19 main tyres, about 1.25 m across). */
export const TYRE_R = 0.62;

// ── Flight phase: drives flaps, slats, gear, spoilers on every level ──

export type Phase = 'park' | 'takeoff' | 'cruise' | 'landing';
/** Elevator in radians, trailing edge up negative (takeoff rotation, landing flare). */
const TARGET: Record<Phase, { flap: number; krueger: number; gear: number; spoiler: number; throttle: number; elevator: number }> = {
  park: { flap: 0, krueger: 0, gear: 0, spoiler: 0, throttle: 0, elevator: 0 },
  takeoff: { flap: 0.35, krueger: 1, gear: 0, spoiler: 0, throttle: 1, elevator: -0.28 },
  cruise: { flap: 0, krueger: 0, gear: 1, spoiler: 0, throttle: 0.75, elevator: 0 },
  landing: { flap: 1, krueger: 1, gear: 0, spoiler: 1, throttle: 0.1, elevator: -0.12 },
};
export const PHASES: Array<[Phase, string, string]> = [
  ['park', '停机', '襟翼收起，起落架放下，发动机慢车。'],
  ['takeoff', '起飞', '襟翼放到 10°–20°，前缘克鲁格襟翼放下，增加低速升力；推力最大。'],
  ['cruise', '巡航', '起落架收进机身和机翼根部，襟翼全部收起，约 0.85 马赫、万米高空。'],
  ['landing', '着陆', '三缝襟翼放到 30°，沿滑轨后移下偏、拉开三道缝；接地后扰流板全部立起泄掉升力。'],
];

export const useJumbo = create<{ phase: Phase; set: (p: Phase) => void }>((set) => ({ phase: 'park', set: (phase) => set({ phase }) }));
/** Control positions eased toward the phase, plus `roll`: wheel rotation (rad) while rolling on the runway. */
export const jumboMotion = { flap: 0, krueger: 0, gear: 0, spoiler: 0, throttle: 0, elevator: 0, roll: 0, t: 0 };

/** Ease every control surface toward the current phase (gear and flaps take a few seconds, as on the real thing). */
export function stepJumbo(dt: number) {
  const target = TARGET[useJumbo.getState().phase];
  const k = 1 - Math.exp(-dt * 0.9);
  for (const key of Object.keys(target) as Array<keyof typeof target>) jumboMotion[key] += (target[key] - jumboMotion[key]) * k;
}

/** Running time (for small live motions like the yaw damper), and the wheels turn while rolling on the runway. */
export function rollWheels(dt: number) {
  jumboMotion.t += dt;
  const phase = useJumbo.getState().phase;
  if (phase === 'takeoff' || phase === 'landing') jumboMotion.roll += dt * 3;
}
