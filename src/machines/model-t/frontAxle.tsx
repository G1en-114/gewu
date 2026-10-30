import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { PartDef, StepDef, Vec3 } from '../types';
import { Box, Cyl, level, Plate, Rod, YZ_X } from '../kit';
import { springLeaf } from './rearAxle';

/**
 * Front axle: forged I-beam, spindles on spindle bolts (king pins), tie rod
 * behind the axle, the wishbone of radius rods back to a ball under the
 * engine, and the transverse spring. Wheel centres at y = 0, z = ±28.
 */

const KING = 25.5;
export const BALL: Vec3 = [-18, -3.5, 0];

function Spindle({ side }: { side: 1 | -1 }) {
  return (
    <>
      <Box c={[0, 0, side * (KING + 0.15)]} s={[1.0, 4.4, 1.3]} />
      <Cyl c={[0, 0, side * 28.2]} r={0.55} r2={0.8} len={5.2} axis={side > 0 ? '-z' : 'z'} seg={24} />
      <Rod a={[0, -1.2, side * KING]} b={[-6, -1.2, side * 23.5]} r={0.38} />
    </>
  );
}

export function FrontAxle() {
  return (
    <group>
      <Part id="beam">
        <Box c={[0, -0.2, 0]} s={[0.35, 2.2, 48.6]} />
        <Box c={[0, 0.85, 0]} s={[1.5, 0.3, 48.6]} />
        <Box c={[0, -1.25, 0]} s={[1.5, 0.3, 48.6]} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Cyl c={[0, 0, s * KING]} r={0.85} len={2.4} seg={24} />
            <Box c={[0, 2.4, s * 21]} s={[1.6, 3.4, 1.2]} />
          </group>
        ))}
        <Callout id="beam" p={[0, 1.2, -8]} />
      </Part>
      <Part id="spindle-l">
        <Spindle side={-1} />
        <Callout id="spindle-l" p={[0, 2.4, -28]} />
      </Part>
      <Part id="spindle-r">
        <Spindle side={1} />
        <Callout id="spindle-r" p={[0, 2.4, 28]} />
      </Part>
      <Part id="king-pins">
        {[-1, 1].map((s) => (
          <group key={s}>
            <Cyl c={[0, 0, s * KING]} r={0.3} len={5.2} seg={16} />
            <Cyl c={[0, 2.7, s * KING]} r={0.5} len={0.4} seg={6} />
          </group>
        ))}
        <Callout id="king-pins" p={[0, 3, KING]} />
      </Part>
      <Part id="tie-rod">
        <Rod a={[-6, -1.2, -23.5]} b={[-6, -1.2, 23.5]} r={0.4} />
        {[-1, 1].map((s) => <Box key={s} c={[-6, -1.2, s * 23.5]} s={[1.0, 0.9, 1.2]} />)}
        <Callout id="tie-rod" p={[-6, -1, 12]} />
      </Part>
      <Part id="radius-rods">
        {[-1, 1].map((s) => (
          <group key={s}>
            <Rod a={[0, -1.6, s * 19.5]} b={[BALL[0], BALL[1], s * 0.9]} r={0.42} />
            <Box c={[0, -1.6, s * 19.5]} s={[1.6, 0.8, 1.6]} />
          </group>
        ))}
        <Cyl c={BALL} r={1.0} len={1.6} axis="z" />
        <Callout id="radius-rods" p={[-10, -2.6, 8]} />
      </Part>
      <Part id="spring">
        {Array.from({ length: 6 }, (_, i) => (
          <Plate key={i} k={`front-leaf-${i}`} shape={springLeaf(7, 4.6, 21, i)} depth={2.0} p={[-1, 0, 0]} r={YZ_X} />
        ))}
        {[-1, 1].map((s) => <Rod key={s} a={[0.7, 4.7, s * 21]} b={[0.7, 3.9, s * 21]} r={0.25} />)}
        <Callout id="spring" p={[0, 7.6, 6]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'beam', index: 1, name: '前轴', en: 'Axle Beam', role: '承重', material: '钒钢锻件', description: '工字形截面的锻钢梁。T 型车率先大量使用钒钢，强度高、重量轻。两端是装主销的竖孔。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'spindle-l', index: 2, name: '转向节（左）', en: 'Spindle, Left', role: '转向 · 装车轮', material: '钒钢', description: '绕主销转动，外侧轴颈装车轮。向后伸出的转向臂接横拉杆；左边这个还接转向直拉杆，方向盘就是通过它转动车轮。', explode: [0, 0, -8], stage: [0.42, 0.6] },
  { id: 'spindle-r', index: 3, name: '转向节（右）', en: 'Spindle, Right', role: '转向 · 装车轮', material: '钒钢', description: '由横拉杆带着和左转向节一起转。', explode: [0, 0, 8], stage: [0.4, 0.56] },
  { id: 'king-pins', index: 4, name: '主销', en: 'Spindle Bolts', role: '转向轴线', material: '钢', description: '竖穿前轴端部和转向节的螺栓，车轮转向时就绕它转。', explode: [0, 7, 0], stage: [0.26, 0.42] },
  { id: 'tie-rod', index: 5, name: '横拉杆', en: 'Tie Rod', role: '联动两轮', material: '钢', description: '在前轴后面连着左右两个转向臂，让两个前轮一起转。', explode: [-6, -3, 0], stage: [0.12, 0.28] },
  { id: 'radius-rods', index: 6, name: '径向杆', en: 'Radius Rods (Wishbone)', role: '定位前轴', material: '钢', description: '两根杆从前轴两端斜向后汇成一个球头，顶在发动机油底壳下，前轴推车架就靠它。', explode: [-4, -6, 0], stage: [0.56, 0.72] },
  { id: 'spring', index: 7, name: '前钢板弹簧', en: 'Front Spring', role: '悬架', material: '弹簧钢', description: '横置钢板弹簧，中间固定在车架前横梁下，两端经吊耳挂在前轴上——和后面一样。', explode: [0, 8, 0], stage: [0, 0.14] },
];

const STEPS: StepDef[] = [
  {
    title: '前桥总成', en: 'Front Axle',
    body: 'T 型车前后都是一根整体式车桥加一副横置钢板弹簧。转向是转向节绕主销转动，横拉杆让两边同步。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '卸下弹簧和横拉杆，敲出主销，取下两个转向节，最后拆径向杆。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const frontAxleLevel = level({
  id: 'model-t/front-axle',
  parent: 'model-t',
  unit: 0.15,
  bounds: [[-19, -4.5, -30.8], [0.9, 7.3, 30.8]],
  name: '前桥',
  en: 'Front Axle',
  subtitle: '子组件 · 工字梁 · 主销转向',
  summary: '7 种零件：前轴、转向节、主销、横拉杆、径向杆…',
  drawingNo: 'GW-T-20',
  scale: '1 : 8',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [
    { stage: 'king-pins', origin: [0, 2.9, -KING] },
    { stage: 'king-pins', origin: [0, 2.9, KING] },
    { stage: 'spring', origin: [0, 7, 0] },
  ],
  centreLines: [
    [[0, -4, -KING], [0, 4, -KING], 1.1],
    [[0, -4, KING], [0, 4, KING], 1.1],
  ],
  steps: STEPS,
  camera: { target: [-6, 1, 0], offset: [95, 55, 65], orthoDistance: 400, exploded: { target: [-6, 2, 0], scale: 1.25 } },
  Model: FrontAxle,
});
