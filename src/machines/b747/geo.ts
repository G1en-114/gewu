import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Geometry for the 747 family of levels: lofted surfaces through cross-section
 * rings (fuselage, wings, nacelle fairings), airfoil sections, and many small
 * repeated pieces (seats, windows, ribs) merged into one mesh. Built once and
 * cached by key, like src/scene/geometry.ts.
 */

const cache = new Map<string, THREE.BufferGeometry>();

export function memoGeo(key: string, build: () => THREE.BufferGeometry) {
  let g = cache.get(key);
  if (!g) {
    g = build();
    cache.set(key, g);
  }
  return g;
}

export type P3 = [number, number, number];
export type Ring = P3[];

/**
 * Closed surface through rings of equal length (in order along the body).
 * With `shell`, a hollow skin of that thickness (inner rings pulled toward
 * each ring's centre) so a section shows the wall and what is inside.
 * Faces are turned to point out of the material whatever the ring order.
 */
export function loft(key: string, rings: () => Ring[], { shell = 0, crease = Math.PI / 5 } = {}) {
  return memoGeo(`loft:${key}`, () => {
    const outer = rings();
    const m = outer.length;
    const n = outer[0].length;
    const pos: number[] = [];
    const tri: number[] = [];
    const push = (p: P3) => { pos.push(p[0], p[1], p[2]); return pos.length / 3 - 1; };
    const centre = (ring: Ring): P3 => {
      const c: P3 = [0, 0, 0];
      ring.forEach((p) => { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; });
      return c;
    };
    const base = outer.flat().length ? outer.map((ring) => ring.map(push)) : [];
    const band = (rows: number[][], flip: boolean) => {
      for (let j = 0; j < rows.length - 1; j += 1) {
        for (let i = 0; i < n; i += 1) {
          const a = rows[j][i];
          const b = rows[j][(i + 1) % n];
          const c = rows[j + 1][(i + 1) % n];
          const d = rows[j + 1][i];
          if (flip) tri.push(a, c, b, a, d, c);
          else tri.push(a, b, c, a, c, d);
        }
      }
    };
    band(base, false);
    if (shell > 0) {
      const inner = outer.map((ring) => {
        const c = centre(ring);
        return ring.map((p) => {
          const d = Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]);
          const k = d > 1e-6 ? Math.min(shell, d * 0.4) / d : 0;
          return push([p[0] + (c[0] - p[0]) * k, p[1] + (c[1] - p[1]) * k, p[2] + (c[2] - p[2]) * k]);
        });
      });
      band(inner, true);
      // Annular caps joining skin and lining at both ends.
      for (const [o, i, flip] of [[base[0], inner[0], true], [base[m - 1], inner[m - 1], false]] as const) {
        for (let k = 0; k < n; k += 1) {
          const a = o[k];
          const b = o[(k + 1) % n];
          const c = i[(k + 1) % n];
          const d = i[k];
          if (flip) tri.push(a, c, b, a, d, c);
          else tri.push(a, b, c, a, c, d);
        }
      }
    } else {
      for (const [row, flip] of [[base[0], true], [base[m - 1], false]] as const) {
        const ring = row.map((idx) => [pos[idx * 3], pos[idx * 3 + 1], pos[idx * 3 + 2]] as P3);
        const c = push(centre(ring));
        for (let k = 0; k < n; k += 1) {
          if (flip) tri.push(c, row[(k + 1) % n], row[k]);
          else tri.push(c, row[k], row[(k + 1) % n]);
        }
      }
    }
    // Signed volume: negative means the faces point inward, so turn them all.
    let vol = 0;
    for (let t = 0; t < tri.length; t += 3) {
      const [a, b, c] = [tri[t], tri[t + 1], tri[t + 2]].map((i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
      vol += a.dot(b.cross(c));
    }
    if (vol < 0) for (let t = 0; t < tri.length; t += 3) [tri[t + 1], tri[t + 2]] = [tri[t + 2], tri[t + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(tri);
    return toCreasedNormals(g, crease);
  });
}

/** Many boxes (centre, size, optional Euler rotation) as one mesh. */
export function boxes(key: string, list: () => Array<{ c: P3; s: P3; r?: P3 }>) {
  return memoGeo(`boxes:${key}`, () => {
    const parts = list().map(({ c, s, r }) => {
      const g = new THREE.BoxGeometry(s[0], s[1], s[2]);
      if (r) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r)));
      g.translate(c[0], c[1], c[2]);
      return g;
    });
    return mergeGeometries(parts, false)!;
  });
}

/** Several cached geometries placed and merged (each a geometry plus a matrix). */
export function merged(key: string, list: () => Array<{ g: THREE.BufferGeometry; c?: P3; r?: P3; s?: P3 }>) {
  return memoGeo(`merged:${key}`, () => mergeGeometries(list().map(({ g, c = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] }) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...c), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
    const copy = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
    copy.deleteAttribute('uv');
    return copy;
  }), false)!);
}

// ── Airfoils and wing stations ─────────────────────────────

/** Half-thickness of a NACA 4-digit section at chord fraction x, for thickness ratio t. */
const naca = (x: number, t: number) => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
/** Mean line with 2% camber at 40% chord. */
const camber = (x: number) => (x < 0.4 ? (0.02 / 0.16) * (0.8 * x - x * x) : (0.02 / 0.36) * (0.2 + 0.8 * x - x * x));

/** Upper or lower surface height (fraction of chord) at chord fraction f. */
export function surface(f: number, t: number, side: 1 | -1, cambered = true) {
  return (cambered ? camber(f) : 0) + side * Math.max(naca(f, t), 0.0015);
}

/** A section of a lifting surface: leading edge point, chord, thickness ratio, and which way the chord runs. */
export interface Station {
  /** Leading edge (x, y, z). */
  le: P3;
  chord: number;
  t: number;
  /** Twist (rad), nose down positive. */
  twist?: number;
}

/** Point at chord fraction f on one side (offset inward by `inset` metres). Chord runs toward −x; thickness along `up`. */
export function onSection(s: Station, f: number, side: 1 | -1, { inset = 0, vertical = false, cambered = true } = {}): P3 {
  const h = surface(f, s.t, side, cambered) * s.chord - side * inset;
  const tw = s.twist ?? 0;
  const x = s.le[0] - f * s.chord * Math.cos(tw) + h * Math.sin(tw);
  const y = h * Math.cos(tw) + f * s.chord * Math.sin(tw);
  return vertical ? [x, s.le[1], s.le[2] + y] : [x, s.le[1] + y, s.le[2]];
}

/** Closed ring of the section between chord fractions f0 and f1 (upper f0→f1, lower f1→f0). */
export function sectionRing(s: Station, f0: number, f1: number, n = 12, opts: { vertical?: boolean; cambered?: boolean } = {}): Ring {
  const fs = Array.from({ length: n + 1 }, (_, i) => {
    // Cluster points toward the leading edge, where the curve is tight.
    const u = i / n;
    return f0 + (f1 - f0) * (f0 < 0.05 ? u * u : u);
  });
  return [...fs.map((f) => onSection(s, f, 1, opts)), ...[...fs].reverse().map((f) => onSection(s, f, -1, opts))];
}

/** A thin skin panel between f0 and f1 on one side, `t` thick. */
export function skinRing(s: Station, f0: number, f1: number, side: 1 | -1, t: number, n = 10, opts: { vertical?: boolean; cambered?: boolean } = {}): Ring {
  const fs = Array.from({ length: n + 1 }, (_, i) => f0 + ((f1 - f0) * i) / n);
  return [...fs.map((f) => onSection(s, f, side, opts)), ...[...fs].reverse().map((f) => onSection(s, f, side, { ...opts, inset: t }))];
}

/** Linear interpolation between stations by span coordinate. */
export function stationAt(stations: Station[], z: number, axis: 0 | 1 | 2 = 2): Station {
  for (let i = 0; i < stations.length - 1; i += 1) {
    const a = stations[i];
    const b = stations[i + 1];
    const za = a.le[axis];
    const zb = b.le[axis];
    if ((z >= za && z <= zb) || i === stations.length - 2) {
      const k = (z - za) / (zb - za);
      const mix = (p: number, q: number) => p + (q - p) * k;
      return {
        le: [mix(a.le[0], b.le[0]), mix(a.le[1], b.le[1]), mix(a.le[2], b.le[2])],
        chord: mix(a.chord, b.chord),
        t: mix(a.t, b.t),
        twist: mix(a.twist ?? 0, b.twist ?? 0),
      };
    }
  }
  return stations[0];
}

/** Span positions from z0 to z1 that include every station break in between. */
export function spanSteps(stations: Station[], z0: number, z1: number, step: number, axis: 0 | 1 | 2 = 2) {
  const breaks = stations.map((s) => s.le[axis]).filter((z) => z > z0 + 1e-6 && z < z1 - 1e-6);
  const n = Math.max(1, Math.ceil((z1 - z0) / step));
  const zs = Array.from({ length: n + 1 }, (_, i) => z0 + ((z1 - z0) * i) / n);
  return [...new Set([...zs, ...breaks])].sort((a, b) => a - b);
}
