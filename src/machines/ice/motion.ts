import { create } from 'zustand';
import { ICE } from './data';

/** Shaft speed in revolutions per second (slowed right down so the cycle can be followed). */
export const useIce = create<{ speed: number; set: (p: Partial<{ speed: number }>) => void }>((set) => ({
  speed: 0.45,
  set: (patch) => set(patch),
}));

/** Crank angle, advanced by the Driver. 0 = top dead centre (piston furthest toward the head). */
export const iceMotion = { theta: 0 };

const TAU = Math.PI * 2;
const { crank: R, rod: L } = ICE;

/** Position in the 720° cycle, 0–4π: intake, compression, power, exhaust. */
export const cycle = (theta: number) => ((theta % (2 * TAU)) + 2 * TAU) % (2 * TAU);
export const STROKES = ['进气', '压缩', '做功', '排气'] as const;
export const strokeIndex = (theta: number) => Math.min(3, Math.floor(cycle(theta) / Math.PI));

/** Crank pin and wrist pin, relative to the crank axis. */
export function crankPin(theta: number): [number, number] {
  return [R * Math.cos(theta), R * Math.sin(theta)];
}

export function wristPinX(theta: number) {
  const s = R * Math.sin(theta);
  return R * Math.cos(theta) + Math.sqrt(L * L - s * s);
}

/** Smooth 0→1→0 bump of an angle about a centre, wrapping over the 720° cycle. */
function bump(theta: number, centre: number, half: number) {
  const d = ((cycle(theta) - centre + 3 * TAU) % (2 * TAU)) - TAU;
  if (Math.abs(d) >= half) return 0;
  const c = Math.cos((d / half) * (Math.PI / 2));
  return c * c;
}

/** Exhaust opens 15° before bottom dead centre and closes just after top dead centre. */
const EXHAUST_MID = 3.5 * Math.PI;
const EXHAUST_HALF = 0.6 * Math.PI;
export const exhaustLift = (theta: number) => ICE.lift * bump(theta, EXHAUST_MID, EXHAUST_HALF);

/** The automatic intake valve is drawn open by suction on the intake stroke. */
export const intakeLift = (theta: number) => 0.045 * bump(theta, 0.5 * Math.PI, 0.46 * Math.PI);

/** The cam gear turns the other way at half speed; its lobe points at the rocker mid-exhaust. */
export const camAngle = (theta: number) => -theta / 2 + (-Math.PI / 2 + EXHAUST_MID / 2);

/** Rocker tilt: the valve end rises by the exhaust lift. */
export const rockerAngle = (theta: number) => Math.atan(exhaustLift(theta) / (ICE.valveX - ICE.pivot[0]));
