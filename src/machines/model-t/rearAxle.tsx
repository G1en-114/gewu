import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { BoltSetDef, PartDef, StepDef, Vec3 } from '../types';
import { Box, Cyl, Fastener, level, Plate, Rod, Turn, YZ_X } from './kit';
import { Differential } from './differential';

/**
 * Rear axle: two housing halves split at the differential (z = 0), torque
 * tube forward along +x to the ball behind the transmission, radius rods,
 * and the transverse spring. Axle centre at the origin, inches.
 */

const HOUSING_L: Array<[number, number]> = [
  [1.2, -25.4], [3.1, -25.4], [3.1, -25.0], [1.4, -25.0], [1.4, -6], [4.65, -2.2], [4.65, -0.35],
  [5.4, -0.35], [5.4, 0], [4.5, 0], [4.5, -2.15], [1.25, -5.95],
];
const HOUSING_R = HOUSING_L.map(([r, h]): [number, number] => [r, -h]).reverse();
const HOUSING_BOLTS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + Math.PI / 8);

/** Leaves of a transverse spring: arched in (y, z), stacked downward, extruded along x. */
export function springLeaf(top: number, ends: number, half: number, i: number) {
  const sag = top - ends;
  const R = (half * half + sag * sag) / (2 * sag);
  const cy = top - R;
  const r1 = R - i * 0.27;
  const r0 = r1 - 0.24;
  const len = half - i * 2.6;
  return () => {
    const a1 = Math.asin(len / r1);
    const a0 = Math.asin(len / r0);
    const s = new THREE.Shape();
    const n = 24;
    for (let k = 0; k <= n; k += 1) {
      const a = -a1 + (2 * a1 * k) / n;
      const p: [number, number] = [cy + r1 * Math.cos(a), r1 * Math.sin(a)];
      if (k === 0) s.moveTo(...p);
      else s.lineTo(...p);
    }
    for (let k = n; k >= 0; k -= 1) {
      const a = -a0 + (2 * a0 * k) / n;
      s.lineTo(cy + r0 * Math.cos(a), r0 * Math.sin(a));
    }
    s.closePath();
    return s;
  };
}

function Axle({ side }: { side: 1 | -1 }) {
  return (
    <>
      <Cyl c={[0, 0, side * 14.5]} r={0.6} len={26} axis="z" seg={24} />
      <Cyl c={[0, 0, side * 27.8]} r={0.5} r2={0.62} len={0.8} axis={side > 0 ? 'z' : '-z'} seg={24} />
      {/* brake drum, which the rear wheel hub bolts to */}
      <Turn k="brake-drum" profile={[[0.62, 0], [4.0, 0], [4.0, 1.8], [3.85, 1.8], [3.85, 0.2], [0.62, 0.2]]} p={[0, 0, side * 27.2]} axis={side > 0 ? '-z' : 'z'} seg={56} />
    </>
  );
}

const SPRING = { top: 8, ends: 5.6, half: 22 };
const ROD_FRONT: Vec3 = [56, -1.4, 0];

export function RearAxle() {
  return (
    <group>
      <Part id="housing-l">
        <Turn k="housing-l" profile={HOUSING_L} axis="z" seg={64} />
        {[-1, 1].map((x) => <Box key={x} c={[x * 0.7, 1.9, -22]} s={[0.6, 1.2, 1.6]} />)}
        <Callout id="housing-l" p={[0, 1.6, -14]} />
      </Part>
      <Part id="housing-r">
        <Turn k="housing-r" profile={HOUSING_R} axis="z" seg={64} />
        {[-1, 1].map((x) => <Box key={x} c={[x * 0.7, 1.9, 22]} s={[0.6, 1.2, 1.6]} />)}
        {HOUSING_BOLTS.map((a) => <Fastener key={a} p={[5.0 * Math.cos(a), 5.0 * Math.sin(a), 0.35]} dir="z" set="housing-bolts" d={0.3} len={0.9} />)}
        <Callout id="housing-r" p={[0, 1.6, 14]} />
      </Part>
      <Part id="differential">
        <Differential />
        <Callout id="differential" p={[0, 3.2, 1]} />
      </Part>
      <Part id="axle-l">
        <Axle side={-1} />
        <Callout id="axle-l" p={[0, 4.2, -27]} />
      </Part>
      <Part id="axle-r">
        <Axle side={1} />
        <Callout id="axle-r" p={[0, 4.2, 27]} />
      </Part>
      <Part id="torque-tube">
        <Turn k="tube-neck" profile={[[0.6, 0], [2.3, 0], [2.3, 0.4], [1.3, 0.9], [0.6, 0.9]]} p={[4.5, 0, 0]} axis="x" />
        <Cyl c={[32.5, 0, 0]} r={1.15} len={54} axis="x" />
        <Turn k="tube-ball" profile={[[0.6, 0], [1.4, 0], [2.6, 1.2], [2.6, 2.4], [1.9, 3.2], [0.6, 3.2]]} p={[59.4, 0, 0]} axis="x" />
        {/* drive shaft inside the tube, universal joint at the front */}
        <Cyl c={[34, 0, 0]} r={0.55} len={51} axis="x" seg={20} />
        <Box c={[61.6, 0, 0]} s={[0.7, 2.2, 0.5]} />
        <Box c={[62.4, 0, 0]} s={[0.7, 0.5, 2.2]} />
        <Callout id="torque-tube" p={[36, 1.6, 0]} />
      </Part>
      <Part id="radius-rods">
        {[-1, 1].map((s) => (
          <group key={s}>
            <Rod a={[0.3, -1.4, s * 22.5]} b={[ROD_FRONT[0], ROD_FRONT[1], s * 1.4]} r={0.42} />
            <Box c={[0.3, -1.1, s * 22.5]} s={[1.8, 1.2, 1.4]} />
          </group>
        ))}
        <Box c={[ROD_FRONT[0], -1.3, 0]} s={[1.4, 1.0, 3.6]} />
        <Callout id="radius-rods" p={[28, -1.2, 12]} />
      </Part>
      <Part id="spring">
        {Array.from({ length: 7 }, (_, i) => (
          <Plate key={i} k={`rear-leaf-${i}`} shape={springLeaf(SPRING.top, SPRING.ends, SPRING.half, i)} depth={2.0} p={[-1, 0, 0]} r={YZ_X} />
        ))}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Rod a={[0.65, 5.7, s * 22]} b={[0.65, 2.4, s * 22]} r={0.22} />
            <Rod a={[-0.65, 5.7, s * 22]} b={[-0.65, 2.4, s * 22]} r={0.22} />
          </group>
        ))}
        <Box c={[0, 8.6, 0]} s={[2.6, 0.6, 3.2]} />
        <Callout id="spring" p={[0, 8.6, 9]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'housing-l', index: 1, name: '后桥壳（左）', en: 'Axle Housing, Left', role: '支承 · 封装', material: '铸钢 + 钢管', description: 'T 型车后桥壳在正中纵向剖分成左右两半，中间合成差速器的“碗”，两边是装半轴的管子。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'housing-r', index: 2, name: '后桥壳（右）', en: 'Axle Housing, Right', role: '支承 · 封装', material: '铸钢 + 钢管', description: '和左半壳用一圈螺栓合在一起。要修差速器，就得把整个后桥拆下来、分开两半。', explode: [0, 0, 7], stage: [0.5, 0.62] },
  { id: 'differential', index: 3, name: '差速器', en: 'Differential', role: '减速 · 差速', material: '钢', description: '锥齿轮主减速器和差速器装在一起，位于后桥中央。双击或点“拆开此组件”看里面。', explode: [0, 10, 2], stage: [0.62, 0.76] },
  { id: 'axle-l', index: 4, name: '半轴（左）', en: 'Axle Shaft, Left', role: '驱动左轮', material: '钢', description: '内端插进差速器的半轴齿轮，外端锥面上装制动鼓和车轮。', explode: [0, 0, -16], stage: [0.36, 0.48] },
  { id: 'axle-r', index: 5, name: '半轴（右）', en: 'Axle Shaft, Right', role: '驱动右轮', material: '钢', description: '同左半轴。外端的制动鼓配手刹：拉手刹时蹄片在鼓里撑开。', explode: [0, 0, 16], stage: [0.32, 0.44] },
  { id: 'torque-tube', index: 6, name: '扭力管与传动轴', en: 'Torque Tube & Drive Shaft', role: '传动 · 推车前进', material: '钢管', description: '传动轴装在扭力管里，前端万向节接变速器，管子前端的球头座在变速器后面——后桥推车前进的力就经这根管子传给车架。', explode: [16, 0, 0], stage: [0.18, 0.32] },
  { id: 'radius-rods', index: 7, name: '半径杆', en: 'Radius Rods', role: '定位后桥', material: '钢', description: '从后桥两端斜向前汇到扭力管前部，和扭力管组成三角形，保持后桥不前后歪斜。', explode: [0, -5, 0], stage: [0.1, 0.22] },
  { id: 'spring', index: 8, name: '后钢板弹簧', en: 'Rear Spring', role: '悬架', material: '弹簧钢', description: '一副横置的半椭圆钢板弹簧，中间固定在车架后横梁下，两端经吊耳挂在后桥上。', explode: [0, 9, 0], stage: [0, 0.12] },
];

const BOLT_SETS: Record<string, BoltSetDef> = {
  'housing-bolts': { owner: 'housing-r', distance: 3, stage: [0.44, 0.52] },
};

const STEPS: StepDef[] = [
  {
    title: '后桥总成', en: 'Rear Axle',
    body: '动力从变速器经扭力管里的传动轴到后桥中间的差速器，拐 90° 后分到左右半轴。横置钢板弹簧把车架后部托在后桥上。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '后桥壳的剖分面就在中线上：剖开可以看到差速器、半轴和扭力管里的传动轴。',
    state: { explode: 0, section: true, running: false, select: 'differential', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '卸弹簧和半径杆，拆下扭力管，抽出半轴，拆壳体螺栓分开两半，取出差速器。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const rearAxleLevel = level({
  id: 'model-t/rear-axle',
  parent: 'model-t',
  unit: 0.15,
  bounds: [[-4.7, -4.7, -28.2], [62.8, 8.6, 28.2]],
  name: '后桥',
  en: 'Rear Axle',
  subtitle: '子组件 · 扭力管驱动 · 横置钢板弹簧',
  summary: '8 种零件：左右桥壳、差速器、半轴、扭力管…',
  drawingNo: 'GW-T-30',
  scale: '1 : 8',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: {},
  children: { differential: 'model-t/differential' },
  guides: [
    { stage: 'torque-tube', origin: [4.5, 0, 0] },
    { stage: 'axle-l', origin: [0, 0, -28.2] },
    { stage: 'axle-r', origin: [0, 0, 28.2] },
    { stage: 'differential', origin: [0, 3.6, 0] },
  ],
  centreLines: [[[0, 0, -31], [0, 0, 31], 4.2], [[-2, 0, 0], [66, 0, 0]]],
  steps: STEPS,
  camera: { target: [24, 1, 0], offset: [70, 70, 120], orthoDistance: 420, exploded: { target: [26, 3, 0], scale: 1.3 } },
  Model: RearAxle,
});
