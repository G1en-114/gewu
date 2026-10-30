import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ENGINE, partById } from '../data/machine';
import { motion, useStudio } from '../state';
import type { FocusId, MachinePartId, ScenePoint, ViewMode } from '../types/machine';
import { OVERLAY_LAYER } from './InkRenderer';
import { PALETTE } from './ink';
import { SECTION_PLANE } from './Part';

const AX = ENGINE.axisY;

/** Numbered balloon with a short curved leader, in the style of a drawing plate. */
export function Callout({ id, p }: { id: MachinePartId; p: ScenePoint }) {
  const part = partById(id);
  const selected = useStudio((s) => s.selected === id);
  const hovered = useStudio((s) => s.hovered === id);
  const labels = useStudio((s) => s.labels);
  const set = useStudio((s) => s.set);
  if (!labels && !selected && !hovered) return null;
  return (
    <Html position={p} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`callout${selected ? ' is-selected' : ''}${hovered ? ' is-hovered' : ''}`}>
        <svg className="callout-leader" width="44" height="30" viewBox="0 0 44 30" aria-hidden="true">
          <circle cx="3" cy="27" r="2.2" />
          <path d="M3 27 C 10 12, 22 5, 40 4" />
        </svg>
        <button
          type="button"
          className="callout-label"
          onClick={() => set({ selected: selected ? null : id })}
          onPointerEnter={() => set({ hovered: id })}
          onPointerLeave={() => set({ hovered: null })}
        >
          <span className="callout-num">{String(part.index).padStart(2, '0')}</span>
          <span className="callout-name">{part.name}</span>
        </button>
      </div>
    </Html>
  );
}

function overlayLine(points: THREE.Vector3[], { dashed = true, opacity = 0.55, color = PALETTE.rust, dash = 0.22, gap = 0.09 } = {}) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap, transparent: true, opacity, depthTest: false })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  line.layers.set(OVERLAY_LAYER);
  line.raycast = () => {};
  line.frustumCulled = false;
  return line;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Where dashed assembly guides start, per exploded part (assembled positions). */
function guideOrigins(): Array<[MachinePartId, THREE.Vector3]> {
  const out: Array<[MachinePartId, THREE.Vector3]> = [];
  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    out.push(['cylinder-cover', v(-4.4, AX + Math.sin(a) * 0.75, Math.cos(a) * 0.75)]);
  }
  out.push(['cylinder-cover', v(-4.64, AX, 0)]);
  out.push(['piston', v(-3.7, AX, 0)]);
  [-3.92, -3.08].forEach((x) => [-0.3, 0.3].forEach((z) => out.push(['valve-chest', v(x, AX + 1.2, z)])));
  out.push(['valve-chest', v(-3.5, AX + 2.02, 0)]);
  out.push(['crosshead', v(-0.8, AX, 0.21)]);
  out.push(['connecting-rod', v(0.4, AX + 0.2, 0.1)]);
  out.push(['crankshaft', v(ENGINE.crankX, AX, 0.14)]);
  [-0.48, -2.0].forEach((z) => [-0.25, 0.25].forEach((dx) => out.push(['main-bearing', v(ENGINE.crankX + dx, AX + 0.18, z)])));
  out.push(['flywheel', v(ENGINE.crankX, AX, ENGINE.flywheelZ)]);
  out.push(['governor', v(ENGINE.governor[0], 3.95 + 0.3, ENGINE.governor[2])]);
  return out;
}

export function Guides() {
  const { scene } = useThree();
  const objects = useMemo(() => {
    const centre = { opacity: 0.42, dash: 0.34, gap: 0.08 };
    const centreLines = [
      overlayLine([v(-6.9, AX, 0), v(2.6, AX, 0)], centre),
      overlayLine([v(ENGINE.crankX, AX, 0.8), v(ENGINE.crankX, AX, -3.1)], centre),
      overlayLine([v(ENGINE.governor[0], 0.2, ENGINE.governor[2]), v(ENGINE.governor[0], 5.6, ENGINE.governor[2])], centre),
    ];

    const origins = guideOrigins();
    const explodeGeometry = new THREE.BufferGeometry();
    explodeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(origins.length * 6), 3));
    const explodeLines = new THREE.LineSegments(
      explodeGeometry,
      new THREE.LineDashedMaterial({ color: PALETTE.ink, dashSize: 0.09, gapSize: 0.07, transparent: true, opacity: 0.5, depthTest: false }),
    );
    explodeLines.layers.set(OVERLAY_LAYER);
    explodeLines.frustumCulled = false;
    explodeLines.raycast = () => {};

    // Rotation arrow beside the flywheel rim.
    const R = ENGINE.flywheelRadius + 0.32;
    const arcPoints: THREE.Vector3[] = [];
    const a0 = 0.32;
    const a1 = 1.02;
    for (let i = 0; i <= 40; i += 1) {
      const a = a0 + ((a1 - a0) * i) / 40;
      arcPoints.push(v(Math.cos(a) * R, Math.sin(a) * R, 0));
    }
    const head = (a: number, dir: number) => {
      const tip = v(Math.cos(a) * R, Math.sin(a) * R, 0);
      const tangent = v(-Math.sin(a), Math.cos(a), 0).multiplyScalar(dir);
      const normal = v(Math.cos(a), Math.sin(a), 0);
      return [tip.clone().addScaledVector(tangent, -0.16).addScaledVector(normal, 0.07), tip, tip.clone().addScaledVector(tangent, -0.16).addScaledVector(normal, -0.07)];
    };
    const arrow = new THREE.Group();
    const solid = { dashed: false, opacity: 0.9 };
    arrow.add(overlayLine(arcPoints, solid), overlayLine(head(a1, 1), solid), overlayLine(head(a0, -1), solid));
    arrow.traverse((o) => o.layers.set(OVERLAY_LAYER));

    return { centreLines, explodeLines, origins, arrow };
  }, []);

  useEffect(() => {
    const { centreLines, explodeLines, arrow } = objects;
    scene.add(...centreLines, explodeLines, arrow);
    return () => {
      scene.remove(...centreLines, explodeLines, arrow);
    };
  }, [scene, objects]);

  useFrame(() => {
    const { explodeLines, origins, arrow } = objects;
    const attr = explodeLines.geometry.getAttribute('position') as THREE.BufferAttribute;
    origins.forEach(([id, origin], i) => {
      const [x, y, z] = partById(id).explode;
      const e = motion.explode;
      attr.setXYZ(i * 2, origin.x, origin.y, origin.z);
      attr.setXYZ(i * 2 + 1, origin.x + x * e, origin.y + y * e, origin.z + z * e);
    });
    attr.needsUpdate = true;
    explodeLines.computeLineDistances();
    explodeLines.visible = motion.explode > 0.02;
    (explodeLines.material as THREE.LineDashedMaterial).opacity = 0.5 * Math.min(1, motion.explode * 3);

    const [fx, fy, fz] = partById('flywheel').explode;
    arrow.position.set(ENGINE.crankX + fx * motion.explode, AX + fy * motion.explode, ENGINE.flywheelZ + fz * motion.explode);
  });

  return null;
}

/** Eases explode / section / governor toward the store and advances the crank. */
export function MotionDriver() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { explode, running, rpm, section } = useStudio.getState();
    const k = 1 - Math.exp(-dt * 3.2);
    motion.explode += (explode - motion.explode) * k;

    const omega = running ? (rpm / 60) * Math.PI * 2 : 0;
    motion.theta = (motion.theta + omega * dt) % (Math.PI * 2);
    motion.spin = (motion.spin + omega * 1.6 * dt) % (Math.PI * 2);
    const speed = running ? Math.min(1, rpm / 60) : 0;
    const phiTarget = 0.26 + 0.62 * speed * speed;
    motion.phi += (phiTarget - motion.phi) * (1 - Math.exp(-dt * 1.6));

    const cutTarget = section ? 0 : 1.1;
    const current = SECTION_PLANE.constant > 50 ? 1.1 : SECTION_PLANE.constant;
    const next = current + (cutTarget - current) * (1 - Math.exp(-dt * 3));
    SECTION_PLANE.constant = !section && next > 1.08 ? 100 : next;
  }, -1);
  return null;
}

const TARGET = new THREE.Vector3(-1.0, 1.35, -0.75);
const PRESETS: Record<ViewMode, { offset: THREE.Vector3; fov: number }> = {
  perspective: { offset: new THREE.Vector3(9.6, 7.4, 19.6), fov: 30 },
  elevation: { offset: new THREE.Vector3(0, 0.25, 60), fov: 13 },
  plan: { offset: new THREE.Vector3(0, 60, 0.02), fov: 13 },
};

const FOCI: Record<FocusId, { target: THREE.Vector3; scale: number }> = {
  cylinder: { target: new THREE.Vector3(-2.9, 1.6, 0), scale: 0.62 },
  linkage: { target: new THREE.Vector3(0.2, 1.4, -0.2), scale: 0.64 },
  governor: { target: new THREE.Vector3(ENGINE.governor[0], 2.9, ENGINE.governor[2]), scale: 0.58 },
};

/**
 * Smoothly moves the camera to the active view preset and shifts the
 * projection centre so the machine sits beside, not under, the text column.
 */
export function CameraRig({ shift }: { shift: number }) {
  const { camera, controls, size } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
    size: { width: number; height: number };
  };
  const view = useStudio((s) => s.view);
  const nonce = useStudio((s) => s.viewNonce);
  const focus = useStudio((s) => s.focus);
  const tween = useRef<{ t: number; fromPos: THREE.Vector3; fromTarget: THREE.Vector3; fromFov: number } | null>(null);

  useEffect(() => {
    tween.current = {
      t: 0,
      fromPos: camera.position.clone(),
      fromTarget: controls ? controls.target.clone() : TARGET.clone(),
      fromFov: camera.fov,
    };
  }, [view, nonce, focus, camera, controls]);

  useEffect(() => {
    if (shift) camera.setViewOffset(size.width, size.height, -shift, 0, size.width, size.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }, [camera, shift, size.width, size.height]);

  useFrame((_, dt) => {
    const tw = tween.current;
    if (!tw) return;
    tw.t = Math.min(1, tw.t + dt / 1.1);
    const e = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2;
    const preset = PRESETS[view];
    // Fit the machine to narrow (portrait) viewports.
    const visibleWidth = Math.max(0.5, (size.width - shift * 2) / size.height);
    const fit = Math.max(1, 0.95 / visibleWidth);
    const close = view === 'perspective' && focus ? FOCI[focus] : null;
    const toTarget = close ? close.target : TARGET;
    const toPos = toTarget.clone().addScaledVector(preset.offset, fit * (close ? close.scale : 1));
    camera.position.lerpVectors(tw.fromPos, toPos, e);
    camera.fov = THREE.MathUtils.lerp(tw.fromFov, preset.fov, e);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.lerpVectors(tw.fromTarget, toTarget, e);
      controls.update();
    } else {
      camera.lookAt(toTarget);
    }
    if (tw.t >= 1) tween.current = null;
  });
  return null;
}

