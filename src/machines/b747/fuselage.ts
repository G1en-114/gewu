import { fuselageAt, fuselageRing, fuselageStations, hullZ, MAIN_FLOOR, UPPER_FLOOR } from './airframe';
import { boxes, loft, type P3 } from './geo';

/**
 * Fuselage sections as hollow skins, and the windows and door outlines on
 * them. Every section is cut from the same cross-section function, so they
 * meet exactly when assembled.
 */

const SKIN = 0.08;

export const skin = (k: string, x0: number, x1: number) =>
  loft(`fs-${k}`, () => fuselageStations(x0, x1).map((x) => fuselageRing(x)), { shell: SKIN });

/** Main-deck doors L1–L5 (and R1–R5): station x of each door's centre. */
export const DOORS = [30.0, 22.3, 10.6, -2.6, -15.6];
const WINDOW_PITCH = 0.508;
const MAIN_WINDOW_Y = MAIN_FLOOR + 1.45;
const UPPER_WINDOW_Y = UPPER_FLOOR + 0.8;

/** A thin box lying on the hull at (x, y) on one side, its thin axis along the surface normal. */
function onHull(x: number, y: number, side: 1 | -1, s: P3, lift = 0): { c: P3; s: P3; r: P3 } {
  const z = hullZ(x, y);
  const phi = Math.atan2(y - fuselageAt(x).yc, z);
  const n: P3 = [0, Math.sin(phi), Math.cos(phi) * side];
  return {
    c: [x, y + n[1] * lift, side * z + n[2] * lift],
    s,
    r: [side > 0 ? -phi : Math.PI + phi, 0, 0],
  };
}

/** Windows and door outlines between stations x0 and x1, both sides. */
export const openings = (k: string, x0: number, x1: number) => boxes(`fw-${k}`, () => {
  const out: Array<{ c: P3; s: P3; r?: P3 }> = [];
  for (const side of [1, -1] as const) {
    for (let x = x1 - 0.3; x > x0 + 0.2; x -= WINDOW_PITCH) {
      if (x > 30.6 || DOORS.some((d) => Math.abs(d - x) < 0.85)) continue;
      out.push(onHull(x, MAIN_WINDOW_Y, side, [0.24, 0.34, 0.03], 0.005));
    }
    for (let x = Math.min(x1, 27.8); x > Math.max(x0, 14.2); x -= WINDOW_PITCH * 1.1) out.push(onHull(x, UPPER_WINDOW_Y, side, [0.22, 0.3, 0.03], 0.005));
    for (const d of DOORS.filter((dx) => dx > x0 && dx < x1)) {
      const y = MAIN_FLOOR + 1.0;
      for (const [dx, dy, w, h] of [[-0.55, 0, 0.05, 1.95], [0.55, 0, 0.05, 1.95], [0, 0.97, 1.15, 0.05], [0, -0.97, 1.15, 0.05]]) {
        out.push(onHull(d + dx, y + dy, side, [w, h, 0.03], 0.008));
      }
      out.push(onHull(d, y + 0.55, side, [0.22, 0.3, 0.03], 0.01));
    }
  }
  return out;
});
