import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, level, Turn } from '../kit';
import { jumboMotion, WING } from './airframe';
import { JumboDriver, PhaseControls } from './controls';
import { loft, onSection, type P3, sectionRing, stationAt } from './geo';

/**
 * Triple-slotted trailing-edge flap, the 747's signature: fore flap, main
 * flap and aft flap ride aft and down on tracks, opening three slots that
 * keep the air attached at large deflections. Drawn in the wing's own
 * coordinates (starboard), between span stations z0 and z1.
 */

/** Chord fractions where each element starts: fore, main, aft, trailing edge. */
export const FLAP_F = [0.66, 0.735, 0.92, 1] as const;

/** Extension e (0 stowed, 1 landing 30°): aft travel and droop of each element, as fractions of the flap chord and radians. */
export function flapPose(e: number) {
  return {
    fore: { aft: 0.32 * e, down: 0.1 * e, rot: 0.32 * e },
    main: { aft: 0.62 * e, down: 0.2 * e, rot: 0.42 * e },
    /** Relative to the main flap. */
    aft: { aft: 0.08 * e, down: 0.02 * e, rot: 0.38 * e },
  };
}

const v = (p: P3) => new THREE.Vector3(...p);

/** Moves its children like one flap element: aft and down along the track, then droops about its leading edge line a0→a1. */
function Element({ a0, a1, chord, pose, children }: { a0: P3; a1: P3; chord: number; pose: (e: number) => { aft: number; down: number; rot: number }; children: ReactNode }) {
  const outer = useRef<THREE.Group>(null);
  const axis = useMemo(() => v(a1).sub(v(a0)).normalize(), [a0, a1]);
  useFrame(() => {
    const g = outer.current;
    if (!g) return;
    const { aft, down, rot } = pose(jumboMotion.flap);
    g.position.set(a0[0] - aft * chord, a0[1] - down * chord, a0[2]);
    g.quaternion.setFromAxisAngle(axis, rot);
  });
  return <group ref={outer}><group position={[-a0[0], -a0[1], -a0[2]]}>{children}</group></group>;
}

/** One flap panel between span stations z0 and z1. */
export function Flap({ z0, z1, k, tracks = 3 }: { z0: number; z1: number; k: string; tracks?: number }) {
  const s0 = stationAt(WING, z0);
  const s1 = stationAt(WING, z1);
  const mid = stationAt(WING, (z0 + z1) / 2);
  const cf = (1 - FLAP_F[0]) * mid.chord;
  const piece = (i: number) => loft(`${k}-el${i}`, () => [s0, s1].map((s) => sectionRing(s, FLAP_F[i] + 0.004, FLAP_F[i + 1], 10)));
  const lineAt = (f: number): [P3, P3] => [onSection(s0, f, -1), onSection(s1, f, -1)];
  const [m0, m1] = lineAt(FLAP_F[1]);
  const [f0, f1] = lineAt(FLAP_F[0]);
  const [t0, t1] = lineAt(FLAP_F[2]);
  const spans = Array.from({ length: tracks }, (_, i) => z0 + ((z1 - z0) * (i + 0.5)) / tracks);
  return (
    <group>
      <Part id="fore">
        <Element a0={f0} a1={f1} chord={cf} pose={(e) => flapPose(e).fore}><M clip geo={piece(0)} /></Element>
        <Callout id="fore" p={onSection(mid, 0.7, 1)} />
      </Part>
      <Part id="main">
        <Element a0={m0} a1={m1} chord={cf} pose={(e) => flapPose(e).main}><M clip geo={piece(1)} /></Element>
        <Callout id="main" p={onSection(mid, 0.82, 1)} />
      </Part>
      <Part id="aft">
        <Element a0={m0} a1={m1} chord={cf} pose={(e) => flapPose(e).main}>
          <Element a0={t0} a1={t1} chord={cf} pose={(e) => flapPose(e).aft}><M clip geo={piece(2)} /></Element>
        </Element>
        <Callout id="aft" p={onSection(mid, 0.96, 1)} />
      </Part>
      <Part id="tracks">
        {spans.map((z) => {
          const s = stationAt(WING, z);
          const a = onSection(s, 0.6, -1);
          const len = (1 - 0.6) * s.chord * 1.05;
          return <Box key={z} c={[a[0] - len / 2, a[1] - 0.18, z]} s={[len, 0.16, 0.07]} r={[0, 0, 0.06]} />;
        })}
        <Callout id="tracks" p={[onSection(stationAt(WING, spans[0]), 0.8, -1)[0], onSection(stationAt(WING, spans[0]), 0.8, -1)[1] - 0.25, spans[0]]} />
      </Part>
      <Part id="carriages">
        <Element a0={m0} a1={m1} chord={cf} pose={(e) => ({ ...flapPose(e).main, rot: 0 })}>
          {spans.map((z) => {
            const a = onSection(stationAt(WING, z), FLAP_F[1] + 0.03, -1);
            return <Box key={z} c={[a[0], a[1] - 0.14, z]} s={[0.36, 0.14, 0.16]} />;
          })}
        </Element>
        <Callout id="carriages" p={[...onSection(stationAt(WING, spans[tracks - 1]), FLAP_F[1] + 0.03, -1).slice(0, 2), spans[tracks - 1]] as P3} />
      </Part>
      <Part id="actuators">
        {spans.map((z) => {
          const a = onSection(stationAt(WING, z), 0.57, -1);
          return <Turn key={z} k="fl-screw" profile={[[0, 0], [0.04, 0], [0.04, 1.3], [0, 1.3]]} p={[a[0], a[1] - 0.08, z + 0.1]} axis="-x" seg={12} />;
        })}
        <Callout id="actuators" p={[...onSection(stationAt(WING, spans[0]), 0.62, -1).slice(0, 2), spans[0] + 0.1] as P3} />
      </Part>
      <Part id="fairings">
        {spans.map((z) => {
          const s = stationAt(WING, z);
          const a = onSection(s, 0.5, -1);
          const len = s.chord * 0.62;
          return (
            <group key={z} position={[a[0], a[1] - 0.12, z]} scale={[1, 1, 0.42]}>
              <Turn k={`fl-canoe-${len.toFixed(2)}`} profile={[[0, 0], [0.18, -0.08 * len], [0.3, -0.35 * len], [0.24, -0.8 * len], [0, -len]]} axis="x" seg={20} />
            </group>
          );
        })}
        <Callout id="fairings" p={[...onSection(stationAt(WING, spans[1] ?? spans[0]), 0.7, -1).slice(0, 2).map((c, i) => (i ? c - 0.35 : c)), spans[1] ?? spans[0]] as P3} />
      </Part>
    </group>
  );
}

/** The inboard flap, the one shown on its own. */
export const INBOARD_FLAP = { z0: 3.6, z1: 11.2 };
export const OUTBOARD_FLAP = { z0: 13.7, z1: 21.4 };

function InboardFlap() {
  return <Flap k="flap-in" {...INBOARD_FLAP} />;
}

const PARTS: PartDef[] = [
  { id: 'tracks', index: 1, name: '襟翼滑轨 ×3', en: 'Flap Tracks', role: '导向', material: '钛合金 / 钢', description: '从后梁伸出的弯曲导轨，决定襟翼伸出时走的路线：先往后、再往下。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'fore', index: 2, name: '前段襟翼', en: 'Fore Flap', role: '第一道缝', material: '铝合金', description: '最前面的一小段，和主襟翼之间留出第一道缝，把机翼下面的高压气流引到上表面。', explode: [0.9, 1.0, 0], stage: [0.5, 0.64] },
  { id: 'main', index: 3, name: '主襟翼', en: 'Main Flap', role: '增大弯度和面积', material: '铝合金 / 复合材料', description: '三段里最大的一段。伸出后机翼面积增大约两成、弯度大增，低速时也能产生足够升力。', explode: [0, 1.6, 0], stage: [0.36, 0.52] },
  { id: 'aft', index: 4, name: '后段襟翼', en: 'Aft Flap', role: '第三道缝 · 偏角最大', material: '复合材料', description: '挂在主襟翼后面，偏得比主襟翼还多。三段之间的缝让气流一次次“补充能量”，到 30° 也不会分离。', explode: [-1.2, 1.2, 0], stage: [0.22, 0.38] },
  { id: 'carriages', index: 5, name: '滑架', en: 'Carriages', role: '在滑轨上走', material: '钢 / 滚轮', description: '带滚轮的小车，挂着主襟翼在滑轨上前后移动。', explode: [-0.5, -0.6, 0], stage: [0.64, 0.78] },
  { id: 'actuators', index: 6, name: '滚珠丝杠作动器', en: 'Ballscrew Actuators', role: '推动襟翼', material: '钢', description: '由一根贯穿翼展的扭力轴带动，所有丝杠同步转，左右襟翼永远对称。', explode: [0.6, -0.6, 0.4], stage: [0.76, 0.9] },
  { id: 'fairings', index: 7, name: '滑轨整流罩', en: 'Track Fairings', role: '整流', material: '复合材料', description: '机翼下面那一排“小船”（canoe），罩住滑轨和作动器，减小阻力。', explode: [0, -1.2, 0], stage: [0, 0.2] },
];

const STEPS: StepDef[] = [
  {
    title: '三缝襟翼', en: 'Triple-Slotted Flap',
    body: '用左栏切换“起飞”“着陆”：三段襟翼沿滑轨往后滑、往下偏，之间拉开三道缝。着陆时偏到 30°，机翼面积和弯度大增，让 300 多吨的飞机能以约 270 km/h 落地。',
    state: { explode: 0, section: false, running: true, select: 'main', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆下整流罩和后段襟翼，取下主襟翼和前段襟翼，再拆滑架和丝杠，剩下滑轨。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const flapLevel: MachineDef = level({
  id: 'b747/flap',
  parent: 'b747/wing',
  unit: 1.2,
  bounds: [[-9.5, 3.2, 3.6], [-4.0, 5.0, 11.2]],
  name: '三缝襟翼',
  en: 'Triple-Slotted Flap',
  subtitle: '子组件 · 内侧后缘襟翼 · 沿滑轨伸出',
  summary: '7 种零件：前段、主、后段襟翼，滑轨、滑架、丝杠、整流罩',
  drawingNo: 'GW-747-12',
  scale: '1 : 50',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'main', origin: [-6.5, 4.0, 7.4] }],
  centreLines: [],
  steps: STEPS,
  camera: { target: [-6.8, 3.8, 7.4], offset: [-13, 12, 23], orthoDistance: 60, exploded: { target: [-6.8, 4.2, 7.4], scale: 1.6 } },
  Model: InboardFlap,
  Driver: JumboDriver,
  Controls: PhaseControls,
});
