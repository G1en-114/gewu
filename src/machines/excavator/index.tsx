import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, poly, roundFrame, Turn, XY_Z } from '../kit';
import { cylinderLevel, HydCylinder, type CylinderSpec } from './cylinder';

/**
 * A 20-tonne class hydraulic excavator: tracked undercarriage, slewing upper
 * structure, boom, stick and bucket worked by four cylinders. Facing +x,
 * metres; the working equipment moves in the upper's x–y plane.
 */

type P = [number, number];
const B0: P = [0.9, 1.9];
const BOOM = 5.6;
const STICK = 2.9;
const BOOM_CYL_BASE: P = [1.35, 1.3];

/** Key poses of the digging cycle: [time, boom, stick (relative), bucket (relative), swing]. */
const KEYS: Array<[number, number, number, number, number]> = [
  [0, 0.35, -1.3, 0.2, 0],
  [2, 0.05, -1.0, 0.3, 0],
  [4, 0.05, -2.1, -1.7, 0],
  [5.5, 0.55, -2.1, -1.7, 0],
  [7, 0.55, -2.0, -1.7, 1.3],
  [8, 0.55, -1.4, 0.4, 1.3],
  [10, 0.35, -1.3, 0.2, 0],
];
const PERIOD = 10;

const smooth = (x: number) => x * x * (3 - 2 * x);
export function pose(t: number) {
  const c = ((t % PERIOD) + PERIOD) % PERIOD;
  let i = 0;
  while (i < KEYS.length - 2 && c > KEYS[i + 1][0]) i += 1;
  const [t0, ...a] = KEYS[i];
  const [t1, ...b] = KEYS[i + 1];
  const k = smooth(Math.min(1, Math.max(0, (c - t0) / (t1 - t0))));
  const [boom, stick, bucket, swing] = a.map((v, j) => v + (b[j] - v) * k);
  return { boom, stick: boom + stick, bucket: boom + stick + bucket, swing };
}

const rot = (o: P, a: number, [x, y]: P): P => [o[0] + x * Math.cos(a) - y * Math.sin(a), o[1] + x * Math.sin(a) + y * Math.cos(a)];

/** Pin positions (upper frame) for a pose. */
export function linkage(t: number) {
  const p = pose(t);
  const tip = rot(B0, p.boom, [BOOM, 0]);
  const stickTip = rot(tip, p.stick, [STICK, 0]);
  return {
    ...p,
    tip,
    stickTip,
    boomCyl: [BOOM_CYL_BASE, rot(B0, p.boom, [2.2, 0.05])] as [P, P],
    stickCyl: [rot(B0, p.boom, [2.9, 0.85]), rot(tip, p.stick, [-0.55, 0.3])] as [P, P],
    bucketCyl: [rot(tip, p.stick, [0.5, 0.32]), rot(stickTip, p.bucket, [-0.25, 0.32])] as [P, P],
  };
}

export const excMotion = { t: 0 };
export function ExcavatorDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) excMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}

/** Cylinder ranges found by running the cycle once. */
function specFor(pick: (l: ReturnType<typeof linkage>) => [P, P], bore: number, rod: number): CylinderSpec {
  let min = Infinity;
  let max = 0;
  for (let t = 0; t < PERIOD; t += 0.05) {
    const [a, b] = pick(linkage(t));
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    min = Math.min(min, L);
    max = Math.max(max, L);
  }
  return { min: min - 0.04, max: max + 0.04, bore, rod };
}
const BOOM_SPEC = specFor((l) => l.boomCyl, 0.07, 0.045);
const STICK_SPEC = specFor((l) => l.stickCyl, 0.075, 0.05);
const BUCKET_SPEC = specFor((l) => l.bucketCyl, 0.065, 0.042);

/** A group placed at a moving pin and turned to a moving angle (upper frame). */
function Linked({ at, angle, children }: { at: (l: ReturnType<typeof linkage>) => P; angle: (l: ReturnType<typeof linkage>) => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const l = linkage(excMotion.t);
    const [x, y] = at(l);
    ref.current.position.set(x, y, 0);
    ref.current.rotation.z = angle(l);
  });
  return <group ref={ref}>{children}</group>;
}

function Swing({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y = pose(excMotion.t).swing; });
  return <group ref={ref}>{children}</group>;
}

const BOOM_SHAPE = poly([[-0.3, -0.3], [0.35, 0.3], [2.6, 0.78], [3.2, 0.72], [5.75, 0.22], [5.85, -0.12], [5.6, -0.3], [2.8, 0.15], [0.3, -0.38]]);
const STICK_SHAPE = poly([[-0.7, 0.42], [0.25, 0.3], [2.95, 0.14], [3.05, -0.1], [2.9, -0.2], [0.1, -0.26], [-0.62, 0.05]]);
const BUCKET_SHAPE = poly([[-0.32, 0.4], [0.15, 0.32], [0.75, 0.0], [1.12, -0.48], [1.2, -0.88], [1.02, -0.96], [0.6, -0.78], [0.15, -0.38], [-0.22, -0.05]]);

function Track({ side }: { side: number }) {
  return (
    <group position={[0, 0, side * 1.15]}>
      <Plate k="exc-track" shape={roundFrame(-2.25, 0, 2.25, 0.9, 0.45, 0.12)} depth={0.6} p={[0, 0, -0.3]} r={XY_Z} />
      {Array.from({ length: 22 }, (_, i) => (
        <group key={i}>
          <Box c={[-1.8 + i * 0.172, 0.92, 0]} s={[0.05, 0.05, 0.6]} />
          <Box c={[-1.8 + i * 0.172, -0.02, 0]} s={[0.05, 0.05, 0.6]} />
        </group>
      ))}
    </group>
  );
}

function Running({ side }: { side: number }) {
  return (
    <group position={[0, 0, side * 1.15]}>
      <Plate k="exc-sprocket" shape={() => gearShape(21, 0.36, 0.05, 0.08)} depth={0.2} p={[-1.8, 0.45, -0.1]} r={XY_Z} />
      <Cyl c={[1.8, 0.45, 0]} r={0.33} len={0.36} axis="z" seg={28} />
      {[-1.1, -0.45, 0.2, 0.85].map((x) => <Cyl key={x} c={[x, 0.2, 0]} r={0.09} len={0.3} axis="z" seg={16} />)}
      {[-0.6, 0.6].map((x) => <Cyl key={x} c={[x, 0.78, 0]} r={0.07} len={0.2} axis="z" seg={14} />)}
    </group>
  );
}

export function Excavator() {
  return (
    <group>
      <Part id="undercarriage">
        <Box c={[0, 0.65, 0]} s={[1.6, 0.4, 1.7]} />
        {[1, -1].map((s) => <Box key={s} c={[0, 0.45, s * 1.15]} s={[3.6, 0.32, 0.36]} />)}
        <Callout id="undercarriage" p={[0.6, 0.7, 0.9]} />
      </Part>
      <Part id="tracks">
        {[1, -1].map((s) => <Track key={s} side={s} />)}
        <Callout id="tracks" p={[-0.6, 0.95, 1.45]} />
      </Part>
      <Part id="running">
        {[1, -1].map((s) => <Running key={s} side={s} />)}
        <Callout id="running" p={[-1.8, 0.45, 1.3]} />
      </Part>
      <Part id="slewing">
        <Turn k="exc-slew" profile={[[0.6, 0.85], [1.05, 0.85], [1.05, 1.12], [0.6, 1.12]]} seg={48} />
        <Plate k="exc-slew-gear" shape={() => gearShape(90, 0.62, 0.025, 0.5)} depth={0.12} p={[0, 0.9, 0]} r={[-Math.PI / 2, 0, 0]} />
        <Callout id="slewing" p={[0.9, 1.0, 0.5]} />
      </Part>
      <Swing>
        <Part id="upper">
          <Box c={[-0.4, 1.3, 0]} s={[3.6, 0.3, 2.5]} />
          <Box c={[0.9, 1.65, 0]} s={[0.7, 0.6, 0.6]} />
          <Callout id="upper" p={[-0.6, 1.45, 1.2]} />
        </Part>
        <Part id="cab">
          <Box c={[0.75, 2.2, -0.75]} s={[1.5, 1.6, 0.95]} />
          <Box c={[1.52, 2.35, -0.75]} s={[0.05, 1.0, 0.8]} r={[0, 0, -0.12]} />
          <Callout id="cab" p={[0.9, 3.0, -0.75]} />
        </Part>
        <Part id="hood">
          <Box c={[-1.0, 1.85, 0.35]} s={[1.7, 0.8, 1.9]} />
          <Cyl c={[-0.5, 2.45, 0.9]} r={0.07} len={0.5} seg={12} />
          <Callout id="hood" p={[-1.0, 2.25, 1.2]} />
        </Part>
        <Part id="counterweight">
          <Plate k="exc-cw" shape={poly([[-2.75, 1.15], [-1.85, 1.15], [-1.85, 2.35], [-2.55, 2.35], [-2.8, 2.0], [-2.85, 1.5]])} depth={2.5} p={[0, 0, -1.25]} r={XY_Z} />
          <Callout id="counterweight" p={[-2.4, 2.3, 1.2]} />
        </Part>
        <Part id="boom">
          <Linked at={() => B0} angle={(l) => l.boom}>
            <Plate k="exc-boom" shape={BOOM_SHAPE} depth={0.62} p={[0, 0, -0.31]} r={XY_Z} />
            <Cyl c={[0, 0, 0]} r={0.09} len={0.8} axis="z" seg={16} />
          </Linked>
          <Callout id="boom" p={[3.4, 3.6, 0.4]} />
        </Part>
        <Part id="stick">
          <Linked at={(l) => l.tip} angle={(l) => l.stick}>
            <Plate k="exc-stick" shape={STICK_SHAPE} depth={0.44} p={[0, 0, -0.22]} r={XY_Z} />
            <Cyl c={[0, 0, 0]} r={0.08} len={0.7} axis="z" seg={16} />
          </Linked>
          <Callout id="stick" p={[7, 2, 0.3]} />
        </Part>
        <Part id="bucket">
          <Linked at={(l) => l.stickTip} angle={(l) => l.bucket}>
            <Plate k="exc-bucket" shape={BUCKET_SHAPE} depth={1.0} p={[0, 0, -0.5]} r={XY_Z} />
            {[-0.38, -0.13, 0.13, 0.38].map((z) => <Box key={z} c={[1.17, -0.98, z]} s={[0.22, 0.1, 0.1]} r={[0, 0, -0.9]} />)}
            <Cyl c={[0, 0, 0]} r={0.07} len={0.6} axis="z" seg={16} />
          </Linked>
          <Callout id="bucket" p={[7.5, -0.6, 0.6]} />
        </Part>
        <Part id="boom-cyl">
          {[0.42, -0.42].map((z) => <HydCylinder key={z} k="boom-cyl" spec={BOOM_SPEC} z={z} ends={() => linkage(excMotion.t).boomCyl} />)}
          <Callout id="boom-cyl" p={[2.0, 2.0, 0.5]} />
        </Part>
        <Part id="stick-cyl">
          <HydCylinder k="stick-cyl" spec={STICK_SPEC} ends={() => linkage(excMotion.t).stickCyl} />
          <Callout id="stick-cyl" p={[4.8, 3.8, 0.2]} />
        </Part>
        <Part id="bucket-cyl">
          <HydCylinder k="bucket-cyl" spec={BUCKET_SPEC} ends={() => linkage(excMotion.t).bucketCyl} />
          <Callout id="bucket-cyl" p={[7.4, 1.3, 0.2]} />
        </Part>
      </Swing>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'undercarriage', index: 1, name: '底架', en: 'Undercarriage Frame', role: '承重 · 行走', material: '钢', description: '中间的车架加两侧的履带架，整机二十多吨都压在它上面。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'tracks', index: 2, name: '履带', en: 'Tracks', role: '着地 · 行走', material: '锰钢', description: '一节节履带板连成环，接地面积大，所以能在软地上走而不陷下去。', explode: [0, -1.0, 0], stage: [0.86, 0.96] },
  { id: 'running', index: 3, name: '驱动轮与支重轮', en: 'Sprockets, Idlers & Rollers', role: '驱动 · 支撑履带', material: '钢', description: '后面带齿的是驱动轮（由液压马达驱动），前面的是导向轮，下面一排支重轮把车重传给履带，上面的托链轮托住履带上段。', explode: [0, -1.6, 0], stage: [0.88, 1] },
  { id: 'slewing', index: 4, name: '回转支承', en: 'Slewing Ring', role: '让上车回转', material: '钢', description: '一个巨大的滚珠轴承加内齿圈：回转马达的小齿轮沿着它走，整个上车就能 360° 转。', explode: [0, 0.6, 0], stage: [0.78, 0.88] },
  { id: 'upper', index: 5, name: '转台', en: 'Upper Frame', role: '上车骨架', material: '钢', description: '驾驶室、发动机、液压泵、配重和工作装置都装在它上面。', explode: [0, 1.4, 0], stage: [0.7, 0.82] },
  { id: 'cab', index: 6, name: '驾驶室', en: 'Cab', role: '操纵', material: '钢 / 玻璃', description: '两根操纵手柄控制四个动作：动臂、斗杆、铲斗、回转；脚下踏板控制行走。', explode: [0, 1.8, -1.6], stage: [0.5, 0.6] },
  { id: 'hood', index: 7, name: '发动机与液压泵', en: 'Engine & Pumps', role: '动力源', material: '—', description: '柴油机带动液压泵，把油加压到约 35 MPa，再由主阀分配给各个油缸和马达。', explode: [0, 2.2, 0.8], stage: [0.54, 0.64] },
  { id: 'counterweight', index: 8, name: '配重', en: 'Counterweight', role: '平衡', material: '铸铁', description: '几吨重的铸铁块，平衡前面伸出去的工作装置和满斗的土，防止整机前倾。', explode: [-1.8, 0.4, 0], stage: [0.6, 0.7] },
  { id: 'boom', index: 9, name: '动臂', en: 'Boom', role: '大范围升降', material: '高强度钢板焊接', description: '弯成“香蕉”形的箱形梁，根部铰在转台上，由下面两个动臂油缸顶起放下。', explode: [0, 2.6, 0], stage: [0.38, 0.5] },
  { id: 'stick', index: 10, name: '斗杆', en: 'Stick (Arm)', role: '前伸后收', material: '高强度钢板焊接', description: '铰在动臂头上，尾部被斗杆油缸推拉，带着铲斗向内收——挖土主要靠这个动作。', explode: [1.2, 1.6, 0], stage: [0.24, 0.36] },
  { id: 'bucket', index: 11, name: '铲斗', en: 'Bucket', role: '挖 · 装', material: '耐磨钢', description: '前缘装着可更换的斗齿。铲斗油缸让它翻转，挖进去再兜起来。', explode: [1.6, -0.6, 0], stage: [0, 0.12] },
  { id: 'boom-cyl', index: 12, name: '动臂油缸 ×2', en: 'Boom Cylinders', role: '抬放动臂', material: '钢', description: '两根并排，推力最大。点“拆开此组件”看液压缸内部。', explode: [0, 0, 1.6], stage: [0.32, 0.42] },
  { id: 'stick-cyl', index: 13, name: '斗杆油缸', en: 'Stick Cylinder', role: '推拉斗杆', material: '钢', description: '装在动臂背上，伸出时斗杆向内收。', explode: [0, 2.0, 0.9], stage: [0.18, 0.28] },
  { id: 'bucket-cyl', index: 14, name: '铲斗油缸', en: 'Bucket Cylinder', role: '翻转铲斗', material: '钢', description: '装在斗杆背上，推拉铲斗翻转。', explode: [0, 1.2, 0.9], stage: [0.08, 0.18] },
];

const STEPS: StepDef[] = [
  {
    title: '液压挖掘机', en: 'Hydraulic Excavator',
    body: '一个工作循环：放臂伸斗 → 收斗杆、翻铲斗挖土 → 抬动臂 → 回转 → 卸土 → 转回。四个动作全由液压缸和液压马达完成，发动机只负责带动液压泵。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '液压缸', en: 'Cylinders',
    body: '注意四根油缸：动臂油缸伸出时动臂抬起；斗杆油缸伸出时斗杆往里收；铲斗油缸伸出时铲斗向里翻。它们的长度由两端铰点的位置决定，整套就是一组连杆机构。',
    state: { explode: 0, section: false, running: true, select: 'stick-cyl', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '从前往后：铲斗、铲斗油缸、斗杆油缸、斗杆、动臂油缸、动臂，再拆驾驶室、发动机罩、配重和转台，露出回转支承和底盘。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const excavator: MachineDef = level({
  id: 'excavator',
  unit: 1.15,
  bounds: [[-2.9, -0.4, -1.5], [8.4, 4.4, 1.5]],
  name: '液压挖掘机',
  en: 'Hydraulic Excavator',
  subtitle: '整机 · 20 吨级 · 液压缸可拆',
  summary: '14 个大件，挖掘循环会动，液压缸可再拆',
  drawingNo: 'GW-WJ-00',
  scale: '1 : 50',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { 'boom-cyl': 'excavator/cylinder', 'stick-cyl': 'excavator/cylinder', 'bucket-cyl': 'excavator/cylinder' },
  guides: [{ stage: 'upper', origin: [0, 1.15, 0] }],
  centreLines: [[[0, -0.2, 0], [0, 3.4, 0], 1.1]],
  steps: STEPS,
  camera: { target: [2.6, 1.6, 0], offset: [9, 8, 22], orthoDistance: 80, exploded: { target: [2.6, 2.4, 0], scale: 1.3 } },
  Model: Excavator,
  Driver: ExcavatorDriver,
});

export const EXCAVATOR_LEVELS: MachineDef[] = [cylinderLevel];
