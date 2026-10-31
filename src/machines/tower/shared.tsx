import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { M } from '../../scene/Part';
import { gearShape } from '../../scene/geometry';
import { boxes, memoGeo, type P3 } from '../b747/geo';
import { Plate, poly, XZ_Y, YZ_X, XY_Z } from '../kit';
import type { Vec3 } from '../types';

/**
 * Shared pieces for the tower's levels: animated groups, seven-segment
 * figures raised on wheel rims, horizontal gears, the snail cam, and a few
 * ornaments (rivets, flanges) that give the cast iron its steam-age look.
 * Metres; every level uses the same units and is placed by its parent.
 */

/** Rotates its children about the vertical axis through `at` by angle() (rad). */
export function SpinY({ at = [0, 0, 0], angle, children }: { at?: Vec3; angle: () => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y = angle(); });
  return <group position={at}><group ref={ref}>{children}</group></group>;
}

/** Rotates its children about an x-parallel axis through `at`. */
export function SpinX({ at = [0, 0, 0], angle, children }: { at?: Vec3; angle: () => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = angle(); });
  return <group position={at}><group ref={ref}>{children}</group></group>;
}

/** Rotates its children about a z-parallel axis through `at`. */
export function SpinZ({ at = [0, 0, 0], angle, children }: { at?: Vec3; angle: () => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = angle(); });
  return <group position={at}><group ref={ref}>{children}</group></group>;
}

/** Moves its children by offset() each frame. */
export function Slide({ at = [0, 0, 0], offset, children }: { at?: Vec3; offset: () => Vec3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const [x, y, z] = offset();
    ref.current.position.set(x, y, z);
  });
  return <group position={at}><group ref={ref}>{children}</group></group>;
}

// ── Seven-segment figures ─────────────────────────────────────

/** Segments a–g lit for each digit. */
const SEGMENTS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];

/** Segment boxes of one figure in its own plane: (u right, v up), size (w × h), stroke s. */
function glyph(d: number, w: number, h: number, s: number): Array<{ u: number; v: number; su: number; sv: number }> {
  const hw = w / 2;
  const hh = h / 2;
  const seg: Record<string, { u: number; v: number; su: number; sv: number }> = {
    a: { u: 0, v: hh - s / 2, su: w - s, sv: s },
    g: { u: 0, v: 0, su: w - s, sv: s },
    d: { u: 0, v: -hh + s / 2, su: w - s, sv: s },
    f: { u: -hw + s / 2, v: hh / 2, su: s, sv: hh - s / 2 },
    b: { u: hw - s / 2, v: hh / 2, su: s, sv: hh - s / 2 },
    e: { u: -hw + s / 2, v: -hh / 2, su: s, sv: hh - s / 2 },
    c: { u: hw - s / 2, v: -hh / 2, su: s, sv: hh - s / 2 },
  };
  return [...SEGMENTS[d]].map((k) => seg[k]);
}

/**
 * The ten figures 0–9 raised on a drum of radius r, figure d at azimuth
 * d × 36° (azimuth ψ: the point (r sinψ, y, r cosψ)), reading upright from
 * outside. Turning the drum by −v × 36° about y brings figure v to the front (+z).
 */
export function rimFigures(key: string, r: number, h: number, raise = 0.0025, y = 0) {
  return boxes(`tw-fig-${key}`, () => {
    const out: Array<{ c: P3; s: P3; r?: P3 }> = [];
    for (let d = 0; d < 10; d += 1) {
      const psi = (d * Math.PI * 2) / 10;
      for (const { u, v, su, sv } of glyph(d, h * 0.55, h, h * 0.13)) {
        const rr = r + raise / 2;
        out.push({ c: [u * Math.cos(psi) + rr * Math.sin(psi), y + v, -u * Math.sin(psi) + rr * Math.cos(psi)], s: [su, sv, raise], r: [0, psi, 0] });
      }
    }
    return out;
  });
}

/**
 * The ten figures on the rim of a wheel turning about x (radius r), upright
 * at the front: figure d sits turned −d × 36° about x, so turning the wheel
 * by +v × 36° about x brings figure v to the front (+z), reading upright.
 */
export function axleFigures(key: string, r: number, h: number, raise = 0.0025, x = 0, phase = 0) {
  return boxes(`tw-axfig-${key}`, () => {
    const out: Array<{ c: P3; s: P3; r?: P3 }> = [];
    for (let d = 0; d < 10; d += 1) {
      const a = (-d * Math.PI * 2) / 10 + phase;
      for (const { u, v, su, sv } of glyph(d, h * 0.55, h, h * 0.13)) {
        const z = r + raise / 2;
        out.push({ c: [x + u, v * Math.cos(a) - z * Math.sin(a), v * Math.sin(a) + z * Math.cos(a)], s: [su, sv, raise], r: [a, 0, 0] });
      }
    }
    return out;
  });
}

/** One flat figure (or a row of them) in the xy plane facing +z: for counters and the printed strip. */
export function flatFigures(key: string, digits: number[], h: number, gap: number, raise = 0.002) {
  return boxes(`tw-flat-${key}`, () => {
    const out: Array<{ c: P3; s: P3 }> = [];
    digits.forEach((d, i) => {
      const x = (i - (digits.length - 1) / 2) * gap;
      for (const { u, v, su, sv } of glyph(d, h * 0.55, h, h * 0.13)) out.push({ c: [x + u, v, raise / 2], s: [su, sv, raise] });
    });
    return out;
  });
}

// ── Gears and cams ────────────────────────────────────────────

/** Spur gear with a vertical axis at the group origin, its lower face at y. */
export function GearY({ k, n, m, y, t, bore = 0.006 }: { k: string; n: number; m: number; y: number; t: number; bore?: number }) {
  return <Plate k={`tw-gear-${k}`} shape={() => gearShape(n, (m * n) / 2, m * 0.9, bore)} depth={t} p={[0, y, 0]} r={XZ_Y} />;
}

/** Spur gear with an axis along x (gear plane yz), its near face at x. */
export function GearX({ k, n, m, x, t, bore = 0.006 }: { k: string; n: number; m: number; x: number; t: number; bore?: number }) {
  return <Plate k={`tw-gearx-${k}`} shape={() => gearShape(n, (m * n) / 2, m * 0.9, bore)} depth={t} p={[x, 0, 0]} r={YZ_X} />;
}

/** Spur gear with an axis along z (gear plane xy), its back face at z. */
export function GearZ({ k, n, m, z, t, bore = 0.006 }: { k: string; n: number; m: number; z: number; t: number; bore?: number }) {
  return <Plate k={`tw-gearz-${k}`} shape={() => gearShape(n, (m * n) / 2, m * 0.9, bore)} depth={t} p={[0, 0, z]} r={XY_Z} />;
}

/**
 * Plan shape of a horizontal disc whose radius at azimuth ψ is radius(ψ),
 * for Plate with XZ_Y (shape x → world x, shape y → world −z).
 */
export function polarShape(radius: (psi: number) => number, n = 120, bore = 0) {
  return () => {
    const s = new THREE.Shape();
    for (let i = 0; i < n; i += 1) {
      const psi = (i / n) * Math.PI * 2;
      const r = radius(psi);
      const x = r * Math.sin(psi);
      const y = -r * Math.cos(psi);
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    if (bore > 0) {
      const h = new THREE.Path();
      h.absarc(0, 0, bore, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    return s;
  };
}

/** Polar shape in a vertical plane (for cams on an x-axis shaft): angle θ measured from +y toward +z. */
export function camShape(radius: (theta: number) => number, n = 160, bore = 0.012) {
  return () => {
    const s = new THREE.Shape();
    for (let i = 0; i < n; i += 1) {
      const th = (i / n) * Math.PI * 2;
      const r = radius(th);
      // YZ_X: shape x → world y, shape y → world z.
      const x = r * Math.cos(th);
      const y = r * Math.sin(th);
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    const h = new THREE.Path();
    h.absarc(0, 0, bore, 0, Math.PI * 2, true);
    s.holes.push(h);
    return s;
  };
}

// ── Ornament ──────────────────────────────────────────────────

/** A ring of rivet heads around an axis (y) at radius r. */
export function rivetRing(key: string, r: number, y: number, n: number, size = 0.012) {
  return boxes(`tw-rivets-${key}`, () => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { c: [r * Math.sin(a), y, r * Math.cos(a)] as P3, s: [size, size * 0.6, size] as P3, r: [0, a, 0] as P3 };
  }));
}

/** Rivet heads along a straight line from a to b. */
export function rivetLine(key: string, a: P3, b: P3, n: number, size = 0.012) {
  return boxes(`tw-rivline-${key}`, () => Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return { c: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as P3, s: [size, size, size] as P3 };
  }));
}

/**
 * Outline in a side elevation, written as (z, y) points with optional round
 * holes (z, y, r), for Plate with YZ_X (whose shape axes are y, z).
 */
export function sideShape(points: Array<[number, number]>, holes: Array<[number, number, number]> = []) {
  return poly(points.map(([z, y]): [number, number] => [y, z]), holes.map(([z, y, r]): [number, number, number] => [y, z, r]));
}

/** A cached merged mesh drawn in the current part's ink. */
export function Geo({ g, p, r }: { g: THREE.BufferGeometry; p?: Vec3; r?: Vec3 }) {
  return <M clip geo={g} p={p} r={r} />;
}

export { memoGeo };

/**
 * A spandrel band (xy plane): a w × h rectangle with a segmental arch cut out
 * of its underside, leaving a rim t thick — the cast-iron arches between the
 * tower's columns.
 */
export function archShape(w: number, h: number, t: number) {
  return () => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(-w / 2, h);
    s.lineTo(w / 2, h);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2 - t, 0);
    s.absellipse(0, 0, w / 2 - t, h - t, 0, Math.PI, false);
    s.lineTo(-w / 2, 0);
    // Round piercings in the spandrels.
    for (const side of [-1, 1]) {
      const hole = new THREE.Path();
      hole.absarc(side * (w / 2 - t * 1.6), h - t * 1.1, t * 0.45, 0, Math.PI * 2, true);
      s.holes.push(hole);
    }
    return s;
  };
}
