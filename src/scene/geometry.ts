import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Geometry is static and shared; parts reference these by key. Normals are
 * creased so hard edges stay sharp in the normal buffer (and therefore get
 * an ink line) while round surfaces shade smoothly.
 */
const cache = new Map<string, THREE.BufferGeometry>();

function memo(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let geometry = cache.get(key);
  if (!geometry) {
    geometry = build();
    cache.set(key, geometry);
  }
  return geometry;
}

const crease = (geometry: THREE.BufferGeometry) => toCreasedNormals(geometry, Math.PI / 5);

export function box(x: number, y: number, z: number) {
  return memo(`box:${x}:${y}:${z}`, () => new THREE.BoxGeometry(x, y, z));
}

/** Cylinder along local Y. */
export function cyl(rTop: number, rBottom: number, h: number, segments = 40) {
  return memo(`cyl:${rTop}:${rBottom}:${h}:${segments}`, () => crease(new THREE.CylinderGeometry(rTop, rBottom, h, segments)));
}

export function sphere(r: number) {
  return memo(`sphere:${r}`, () => new THREE.SphereGeometry(r, 40, 24));
}

/**
 * Closed lathe profile of (radius, height) pairs, counter-clockwise in the
 * r/y plane so faces point out of the material (the renderer paints back
 * faces as cut section).
 */
export function lathe(key: string, profile: Array<[number, number]>, segments = 72) {
  return memo(`lathe:${key}`, () => {
    const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
    points.push(points[0].clone());
    return crease(new THREE.LatheGeometry(points, segments));
  });
}

export function extrude(key: string, shape: () => THREE.Shape, depth: number) {
  return memo(`extrude:${key}`, () => crease(new THREE.ExtrudeGeometry(shape(), { depth, bevelEnabled: false, curveSegments: 36 })));
}

/** Hexagon nut, axis along Y. */
export const hexNut = () => memo('hex', () => crease(new THREE.CylinderGeometry(0.052, 0.052, 0.07, 6)));
export const stud = () => memo('stud', () => crease(new THREE.CylinderGeometry(0.024, 0.024, 0.06, 12)));

/** Outline of two circles joined by their outer tangents (crank web). */
export function webShape(r1: number, r2: number, d: number) {
  const alpha = Math.acos((r1 - r2) / d);
  const shape = new THREE.Shape();
  shape.absarc(d, 0, r2, -alpha, alpha, false);
  shape.absarc(0, 0, r1, alpha, Math.PI * 2 - alpha, false);
  shape.closePath();
  return shape;
}

/** Machine-bed I-section in the (z, y) plane. */
export function bedSection() {
  const s = new THREE.Shape();
  const pts: Array<[number, number]> = [
    [-0.7, 0], [0.7, 0], [0.7, 0.08], [0.42, 0.11], [0.42, 0.27], [0.55, 0.27], [0.55, 0.35],
    [-0.55, 0.35], [-0.55, 0.27], [-0.42, 0.27], [-0.42, 0.11], [-0.7, 0.08],
  ];
  s.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => s.lineTo(...p));
  s.closePath();
  return s;
}
