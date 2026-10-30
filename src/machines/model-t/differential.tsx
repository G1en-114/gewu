import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { create } from 'zustand';
import { Part } from '../../scene/Part';
import { useStudio } from '../../state';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import type { BoltSetDef, PartDef, StepDef } from '../types';
import { Box, Cyl, Fastener, level, Plate, Turn, XY_Z } from '../kit';

/**
 * Rear-axle differential. Axle axis along z, centre at the origin; the drive
 * pinion comes in along +x. Bevel faces share their apex at the origin
 * (ring gear face z = r / 3, pinion cone r = x / 3).
 */

/** Ring gear: a bevel annulus whose teeth face the pinion (toward −z). */
function RingGear() {
  return (
    <>
      <Turn k="ring-gear" profile={[[2.4, 0.8], [3.6, 1.2], [3.6, 1.6], [2.4, 1.6]]} axis="z" seg={72} />
      {Array.from({ length: 40 }, (_, i) => (
        <group key={i} rotation={[0, 0, (i / 40) * Math.PI * 2]}>
          <Box c={[3.0, 0, 0.94]} s={[1.25, 0.13, 0.14]} r={[0, -0.32, 0]} />
        </group>
      ))}
    </>
  );
}

function Pinion() {
  return (
    <>
      <Turn k="pinion" profile={[[0.35, 2.4], [0.8, 2.4], [1.2, 3.6], [0.35, 3.6]]} axis="x" seg={40} />
      {Array.from({ length: 11 }, (_, i) => (
        <group key={i} rotation={[(i / 11) * Math.PI * 2, 0, 0]}>
          <Box c={[3.0, 1.0, 0]} s={[1.25, 0.14, 0.16]} r={[0, 0, 0.32]} />
        </group>
      ))}
      <Cyl c={[6.6, 0, 0]} r={0.55} len={6} axis="x" seg={24} />
      <Turn k="pinion-bearing" profile={[[0.55, 0], [1.0, 0], [1.0, 0.8], [0.55, 0.8]]} p={[4.2, 0, 0]} axis="x" />
    </>
  );
}

const SPIDERS = [0, 1, 2].map((i) => Math.PI / 2 + (i * Math.PI * 2) / 3);

/** Case half (left, −z); the right half is its mirror with a flange for the ring gear. */
const CASE_L: Array<[number, number]> = [[0.7, -2.8], [1.1, -2.8], [1.1, -2.0], [2.3, -1.6], [2.3, 0], [2.1, 0], [2.1, -1.45], [0.7, -1.9]];
const CASE_R: Array<[number, number]> = [[0.7, 1.9], [2.1, 1.45], [2.1, 0], [2.5, 0], [2.5, 0.8], [2.3, 0.8], [2.3, 1.6], [1.1, 2.0], [1.1, 2.8], [0.7, 2.8]];
const CASE_BOLTS = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2 + Math.PI / 6);

export type DiffMode = 'straight' | 'left' | 'right' | 'slip';
export const useDiff = create<{ mode: DiffMode; set: (mode: DiffMode) => void }>((set) => ({ mode: 'straight', set: (mode) => set({ mode }) }));

/** Angles: case (with ring gear and spiders) about z, each side gear, spider spin, pinion. */
export const diffMotion = { case: 0, left: 0, right: 0, spin: 0, pinion: 0 };

/** Side-gear speeds relative to the case: the right one gains what the left one loses. */
const SPLIT: Record<DiffMode, number> = { straight: 0, left: 0.35, right: -0.35, slip: -1 };
const RING_TEETH = 40;
const PINION_TEETH = 11;
const SIDE_R = 1.15;
const SPIDER_R = 0.72;

export function DifferentialDriver() {
  useFrame((_, rawDt) => {
    if (!useStudio.getState().running) return;
    const dt = Math.min(rawDt, 0.05) * 1.2;
    const k = SPLIT[useDiff.getState().mode];
    const m = diffMotion;
    m.case += dt;
    m.left += dt * (1 - k);
    m.right += dt * (1 + k);
    // The spiders roll between the two side gears: they turn only when the sides differ.
    m.spin += dt * k * (SIDE_R / SPIDER_R);
    m.pinion += dt * (RING_TEETH / PINION_TEETH);
  }, -1);
  return null;
}

function useTurn(key: keyof typeof diffMotion, axis: 'x' | 'y' | 'z') {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation[axis] = diffMotion[key]; });
  return ref;
}

function Spider({ a }: { a: number }) {
  const spin = useTurn('spin', 'y');
  return (
    <group rotation={[0, 0, a - Math.PI / 2]}>
      <group ref={spin}>
        <Plate k="spider" shape={() => gearShape(10, SPIDER_R, 0.08, 0.26)} depth={0.4} p={[0, 1.15, 0]} r={[-Math.PI / 2, 0, 0]} />
      </group>
      <Cyl c={[0, 1.2, 0]} r={0.25} len={1.9} seg={16} />
    </group>
  );
}

export function Differential() {
  const ring = useTurn('case', 'z');
  const caseL = useTurn('case', 'z');
  const caseR = useTurn('case', 'z');
  const carrier = useTurn('case', 'z');
  const left = useTurn('left', 'z');
  const right = useTurn('right', 'z');
  const pinion = useTurn('pinion', 'x');
  return (
    <group>
      <Part id="ring-gear">
        <group ref={ring}><RingGear /></group>
        <Callout id="ring-gear" p={[0, 3.6, 1.4]} />
      </Part>
      <Part id="pinion">
        <group ref={pinion}><Pinion /></group>
        <Callout id="pinion" p={[7, 0.6, 0]} />
      </Part>
      <Part id="case-l">
        <group ref={caseL}><Turn k="case-l" profile={CASE_L} axis="z" seg={56} /></group>
        <Callout id="case-l" p={[-1.5, 1.6, -2]} />
      </Part>
      <Part id="case-r">
        <group ref={caseR}>
          <Turn k="case-r" profile={CASE_R} axis="z" seg={56} />
          {CASE_BOLTS.map((a) => <Fastener key={a} p={[2.4 * Math.cos(a), 2.4 * Math.sin(a), 1.6]} dir="z" set="case-bolts" d={0.22} len={1.9} />)}
        </group>
        <Callout id="case-r" p={[-1.6, -2.2, 2.4]} />
      </Part>
      <Part id="side-gears">
        {[1, -1].map((s) => (
          <group key={s} ref={s > 0 ? right : left}>
            <Plate k="side-gear" shape={() => gearShape(16, SIDE_R, 0.09, 0.55)} depth={0.45} p={[0, 0, s > 0 ? 0.95 : -1.4]} r={XY_Z} />
            <Cyl c={[0, 0, s * 1.65]} r={0.62} len={0.6} axis="z" seg={24} />
          </group>
        ))}
        <Callout id="side-gears" p={[0.4, 0.6, 1.8]} />
      </Part>
      <Part id="spiders">
        <group ref={carrier}>
          {SPIDERS.map((a) => <Spider key={a} a={a} />)}
          <Cyl c={[0, 0, 0]} r={0.45} len={0.5} axis="z" seg={20} />
        </group>
        <Callout id="spiders" p={[-0.9, -1.4, 0.2]} />
      </Part>
      <Part id="washers">
        {[2.0, -2.0].map((z) => <Turn key={z} k="thrust" profile={[[0.62, 0], [1.4, 0], [1.4, 0.08], [0.62, 0.08]]} p={[0, 0, z - 0.04]} axis="z" />)}
        <Callout id="washers" p={[1, -0.9, 2.1]} />
      </Part>
    </group>
  );
}

const MODES: Array<[DiffMode, string, string]> = [
  ['straight', '直行', '两边车轮一样快：整个差速器跟着齿圈一起转，行星齿轮不自转。'],
  ['left', '左转', '左轮走内圈变慢，右轮走外圈变快：行星齿轮开始自转，把左边少转的补给右边。'],
  ['right', '右转', '反过来：右轮慢、左轮快，行星齿轮朝另一个方向自转。'],
  ['slip', '一侧打滑', '左轮悬空或打滑时阻力为零：右轮停住，左轮以两倍转速空转——这是普通差速器的缺点，所以后来有了限滑差速器。'],
];

/** Driving situations; the side gears (and wheels) share the ring gear's turning between them. */
export function DifferentialControls() {
  const { mode, set } = useDiff();
  const studio = useStudio((s) => s.set);
  const [, , note] = MODES.find((m) => m[0] === mode)!;
  const k = SPLIT[mode];
  return (
    <>
      <div className="strokes gears">
        {MODES.map(([m, label]) => (
          <button key={m} type="button" className={m === mode ? 'is-on' : ''} onClick={() => { set(m); studio({ running: true, selected: m === 'straight' ? 'ring-gear' : 'spiders', explode: 0 }); }}>{label}</button>
        ))}
      </div>
      <p className="gear-note">左 {(1 - k).toFixed(2)}× · 右 {(1 + k).toFixed(2)}× · {note}</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'ring-gear', index: 1, name: '齿圈', en: 'Ring Gear', role: '减速 · 转向 90°', material: '钢', description: '40 齿的锥齿轮，铆在右半差速器壳上。传动轴来的转动经小齿轮带动它，方向拐 90° 并减速约 3.6 倍。', explode: [0, 0, 7.5], stage: [0.34, 0.5] },
  { id: 'pinion', index: 2, name: '主动小齿轮', en: 'Drive Pinion', role: '输入', material: '钢', description: '装在传动轴后端的小锥齿轮，和齿圈啮合。', explode: [6, 0, 0], stage: [0, 0.14] },
  { id: 'case-l', index: 3, name: '差速器壳（左）', en: 'Case, Left', role: '装行星齿轮', material: '可锻铸铁', description: '两半壳体用螺栓合起来，夹住十字轴和三个行星齿轮。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'case-r', index: 4, name: '差速器壳（右）', en: 'Case, Right', role: '装齿圈', material: '可锻铸铁', description: '外缘有法兰，齿圈铆在上面；壳体随齿圈一起转。', explode: [0, 0, 4.5], stage: [0.3, 0.46] },
  { id: 'side-gears', index: 5, name: '半轴齿轮', en: 'Side Gears', role: '驱动两根半轴', material: '钢', description: '两个锥齿轮分别用花键套在左右半轴上。直线行驶时两边转速相同，转弯时可以一快一慢。', explode: [0, 4.5, 0], stage: [0.62, 0.78] },
  { id: 'spiders', index: 6, name: '行星齿轮', en: 'Differential Pinions', role: '允许左右差速', material: '钢', description: '三个小锥齿轮装在三叉十字轴上，夹在两个半轴齿轮之间。转弯时它们自转，让外侧车轮比内侧转得快。', explode: [0, -5, 0], stage: [0.5, 0.66] },
  { id: 'washers', index: 7, name: '止推垫圈', en: 'Thrust Washers', role: '承受轴向力', material: '青铜 / 巴氏合金', description: '垫在半轴齿轮背后，承受锥齿轮啮合时产生的轴向推力。', explode: [-4, 0, 0], stage: [0.76, 0.9] },
];

const BOLT_SETS: Record<string, BoltSetDef> = {
  'case-bolts': { owner: 'case-r', distance: 2.5, stage: [0.14, 0.3] },
};

const STEPS: StepDef[] = [
  {
    title: '差速器', en: 'Differential',
    body: '转弯时外侧车轮要比内侧走更长的路。差速器让两根半轴可以不同速转动，同时都能被驱动。',
    state: { explode: 0, section: false, running: true, select: 'spiders', focus: null },
    apply: () => useDiff.getState().set('straight'),
  },
  {
    title: '差速原理', en: 'How It Works',
    body: '用左栏切换直行、转弯和打滑。注意行星齿轮：直行时它们跟着壳体公转但不自转；转弯时开始自转，一边的半轴就比另一边快。两边转速之和始终是齿圈转速的两倍。',
    state: { explode: 0, section: true, running: true, select: 'spiders', focus: null },
    apply: () => useDiff.getState().set('left'),
  },
  {
    title: '剖视', en: 'Section',
    body: '剖开壳体：三个行星齿轮夹在左右两个半轴齿轮之间；齿圈的锥面和小齿轮的锥面指向同一个顶点。',
    state: { explode: 0, section: true, running: false, select: 'side-gears', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先抽出主动小齿轮，拆壳体螺栓分开两半壳，取下齿圈、行星齿轮、半轴齿轮和止推垫圈。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const differentialLevel = level({
  id: 'model-t/differential',
  parent: 'model-t/rear-axle',
  unit: 0.7,
  bounds: [[-3.6, -3.6, -2.8], [9.6, 3.6, 2.8]],
  name: '差速器',
  en: 'Differential',
  subtitle: '子组件 · 锥齿轮主减速 · 三行星齿轮',
  summary: '7 种零件：齿圈、主动小齿轮、壳体、行星齿轮…',
  drawingNo: 'GW-T-31',
  scale: '1 : 1',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: {},
  guides: [
    { stage: 'ring-gear', origin: [0, 3.6, 1.6] },
    { stage: 'pinion', origin: [9.6, 0, 0] },
    { stage: 'case-r', origin: [0, -2.5, 0.8] },
  ],
  centreLines: [[[0, 0, -4], [0, 0, 4], 3.8], [[-1, 0, 0], [10.5, 0, 0]]],
  steps: STEPS,
  camera: { target: [2, 0, 0], offset: [14, 11, 19], orthoDistance: 80, exploded: { target: [2.5, 0, 2], scale: 1.6 } },
  Model: Differential,
  Driver: DifferentialDriver,
  Controls: DifferentialControls,
});
