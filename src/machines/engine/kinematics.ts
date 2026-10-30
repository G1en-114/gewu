import * as THREE from 'three';
import { ENGINE } from './data';

/**
 * Pure geometry of the engine's moving linkages. Everything here is a
 * function of the crank angle (theta) or the governor arm angle (phi), so the
 * meshes, the guides and the physics all agree on where things are.
 */

const AX = ENGINE.axisY;
const CX = ENGINE.crankX;

/** Crosshead pin x for a crank angle (slider-crank, cylinder on the -x side). */
export function crossheadX(theta: number) {
  const { crankRadius: r, rodLength: l } = ENGINE;
  const s = r * Math.sin(theta);
  return CX + r * Math.cos(theta) - Math.sqrt(l * l - s * s);
}

// ── Valve gear ──────────────────────────────────────────────

export const VALVE_GEAR = {
  /** Eccentric throw and its lead over the crank. */
  throw: 0.12,
  lead: Math.PI / 2 + 0.35,
  /** Plane of the eccentric, eccentric rod and lower rocker arm. */
  z: -0.8,
  /** Rocking shaft centre. */
  pivot: new THREE.Vector2(-1.9, 1.75),
  lowerArm: 0.45,
  upperArm: AX + 0.92 - 1.75,
  rodLength: 3.5,
  /** Valve rod from the upper rocker arm to the slide valve's centre. */
  valveRod: 1.6,
};

export function eccentricCentre(theta: number) {
  const a = theta + VALVE_GEAR.lead;
  return new THREE.Vector2(CX + VALVE_GEAR.throw * Math.cos(a), AX + VALVE_GEAR.throw * Math.sin(a));
}

export interface RockerPose {
  /** Rocker angle; positive swings the lower arm toward +x. */
  psi: number;
  eccentric: THREE.Vector2;
  lower: THREE.Vector2;
  upper: THREE.Vector2;
  /** Slide valve centre x. */
  valveX: number;
}

export function rockerPose(theta: number): RockerPose {
  const { pivot, lowerArm, upperArm, rodLength, valveRod } = VALVE_GEAR;
  const e = eccentricCentre(theta);
  let psi = 0;
  let ly = pivot.y - lowerArm;
  for (let i = 0; i < 3; i += 1) {
    const lx = e.x - Math.sqrt(rodLength * rodLength - (e.y - ly) ** 2);
    psi = Math.asin(THREE.MathUtils.clamp((lx - pivot.x) / lowerArm, -1, 1));
    ly = pivot.y - lowerArm * Math.cos(psi);
  }
  const lower = new THREE.Vector2(pivot.x + lowerArm * Math.sin(psi), ly);
  const upper = new THREE.Vector2(pivot.x - upperArm * Math.sin(psi), pivot.y + upperArm * Math.cos(psi));
  return { psi, eccentric: e, lower, upper, valveX: upper.x - valveRod };
}

// ── Governor ────────────────────────────────────────────────

export const GOVERNOR = {
  /** Arm pivot height above the governor base. */
  top: 3.7,
  arm: 0.95,
  ball: 0.2,
  /** Where the links attach along each arm, and their length. */
  linkAt: 0.6,
  link: 0.75,
  /** Links meet the sleeve this far off the spindle axis. */
  sleeveOffset: 0.07,
  phiMin: 0.26,
  phiMax: 0.88,
  /** Lever pivot, along the lever's direction from the spindle, and its outer arm. */
  leverPivot: 0.62,
  leverOuter: 0.33,
};

/** Height (governor-local) where the links meet the sleeve. */
export function sleeveY(phi: number) {
  const { top, linkAt, link, sleeveOffset } = GOVERNOR;
  const ax = 0.05 + linkAt * Math.sin(phi) - sleeveOffset;
  return top - linkAt * Math.cos(phi) - Math.sqrt(link * link - ax * ax);
}

const SLEEVE_LOW = sleeveY(GOVERNOR.phiMin);
const SLEEVE_HIGH = sleeveY(GOVERNOR.phiMax);
/** The lever pivots level with the middle of the sleeve's travel. */
export const LEVER_PIVOT_Y = (SLEEVE_LOW + SLEEVE_HIGH) / 2 - 0.06;

/** Direction (in plan) from the governor spindle toward the throttle valve. */
export const THROTTLE_POS = new THREE.Vector3(-3.5, AX + 1.6, 0);
const toThrottle = new THREE.Vector2(THROTTLE_POS.x - ENGINE.governor[0], THROTTLE_POS.z - ENGINE.governor[2]).normalize();
export const LEVER_DIR = toThrottle;
/** Rotation about Y that turns local +x toward the throttle. */
export const LEVER_YAW = Math.atan2(-toThrottle.y, toThrottle.x);

/** Lever angle: positive lifts the inner (sleeve) end. */
export function leverAngle(phi: number) {
  const groove = sleeveY(phi) - 0.06;
  return Math.asin(THREE.MathUtils.clamp((groove - LEVER_PIVOT_Y) / GOVERNOR.leverPivot, -1, 1));
}

/** World position of the lever's outer end, where the throttle rod hooks on. */
export function leverOuterEnd(phi: number) {
  const g = ENGINE.governor;
  const a = leverAngle(phi);
  const u = GOVERNOR.leverPivot + GOVERNOR.leverOuter * Math.cos(a);
  const y = LEVER_PIVOT_Y - GOVERNOR.leverOuter * Math.sin(a);
  return new THREE.Vector3(g[0] + LEVER_DIR.x * u, g[1] + y, g[2] + LEVER_DIR.y * u);
}

/** Throttle crank: a horizontal arm on a spindle behind the valve body. */
export const THROTTLE_ARM = { z: -0.3, length: 0.3 };

/** Throttle arm angle chosen so its tip follows the lever's outer end. */
export function throttleArmAngle(phi: number) {
  const rest = leverOuterEnd((GOVERNOR.phiMin + GOVERNOR.phiMax) / 2).y;
  const dy = leverOuterEnd(phi).y - rest;
  return Math.asin(THREE.MathUtils.clamp(dy / THROTTLE_ARM.length, -1, 1));
}

export function throttleArmTip(phi: number) {
  const a = throttleArmAngle(phi);
  return new THREE.Vector3(
    THROTTLE_POS.x + THROTTLE_ARM.length * Math.cos(a),
    THROTTLE_POS.y + THROTTLE_ARM.length * Math.sin(a),
    THROTTLE_ARM.z,
  );
}

/** Throttle opening (0–1) set by the governor: wide open with the balls low, shut as they fly out. */
export function governedOpening(phi: number) {
  return THREE.MathUtils.clamp((0.85 - phi) / 0.35, 0.04, 1);
}

/** Equilibrium arm angle for a shaft speed: the balls rise with the square of speed. */
export function phiForRpm(rpm: number) {
  const s = Math.min(1, Math.max(0, rpm) / 36);
  return GOVERNOR.phiMin + (GOVERNOR.phiMax - GOVERNOR.phiMin) * s * s;
}
