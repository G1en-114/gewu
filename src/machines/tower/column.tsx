import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, poly, Turn, XZ_Y } from '../kit';
import { DIGITS } from './calc';
import { ADDER, CARRY, Cell, DETENT_AZ, GEAR, LEVER, LOCK_AZ, PITCH } from './cell';
import { TowerControls } from './controls';
import { TowerDriver, tw } from './motion';
import { flatFigures, GearY, Geo, Slide, SpinY } from './shared';

/**
 * 数字柱: one figure-wheel column — eight adding cells stacked on one axle,
 * units at the bottom. Behind them run the column's adding shaft (its
 * pinions take the digits of the column to the right) and the carry spiral
 * shaft; at the front right a lock bar holds every wheel still except while
 * the column is adding. Axle on the y axis, bottom of the column at y = 0; metres.
 */

export const CELL0 = 0.1;
export const COLUMN_H = CELL0 + DIGITS * PITCH + 0.1;
const TAU = Math.PI * 2;
const DETENT_POST: [number, number] = [Math.sin(DETENT_AZ) * 0.118, Math.cos(DETENT_AZ) * 0.118];
const LOCK_R = 0.093;
const LOCK: [number, number] = [Math.sin(LOCK_AZ) * LOCK_R, Math.cos(LOCK_AZ) * LOCK_R];

/** Plan of the column's bearing brackets (x, z): round the axle, adding shaft, carry shaft and the two posts. */
const BRACKET: Array<[number, number]> = [
  [-0.125, 0.07], [-0.07, 0.11], [0.02, 0.06], [0.115, 0.04], [0.135, -0.05], [0.12, -0.09], [0.03, -0.19], [-0.03, -0.19], [-0.1, -0.12],
];
const bracketShape = poly(BRACKET.map(([x, z]) => [x, -z]), [[0, 0, 0.009], [ADDER[0], -ADDER[1], 0.0085], [CARRY[0], -CARRY[1], 0.009]]);

const cellExplode = (j: number): [number, number, number] => [j % 2 ? 0.34 : -0.34, 0.03 * j, 0.32];

/** Worm wheel at the top of the carry shaft: the carry drive's worm turns it once per sweep. */
export const WORM_WHEEL = { n: 12, m: 0.006 };

export function Column({ col = 0, tall = false, worm = true }: { col?: number; tall?: boolean; worm?: boolean }) {
  const lift = tall ? 0.07 : 0;
  const hasAdder = col < 6;
  return (
    <group>
      <Part id="frame">
        {[0.02, COLUMN_H - 0.08].map((y) => (
          <Plate key={y} k="tw-col-bracket" shape={bracketShape} depth={0.05} p={[0, y, 0]} r={XZ_Y} />
        ))}
        {[LEVER, { x: DETENT_POST[0], z: DETENT_POST[1] }].map((p) => (
          <Cyl key={p.x} c={[p.x, COLUMN_H / 2, p.z]} r={0.006} len={COLUMN_H - 0.1} seg={10} />
        ))}
        <Callout id="frame" p={[-0.11, COLUMN_H - 0.03, 0.07]} />
      </Part>

      <Part id="axle">
        <Cyl c={[0, COLUMN_H / 2, 0]} r={0.0085} len={COLUMN_H + 0.06} seg={16} />
        <Turn k="tw-col-nut" profile={[[0.0085, COLUMN_H - 0.03], [0.02, COLUMN_H - 0.03], [0.02, COLUMN_H - 0.01], [0.0085, COLUMN_H - 0.01]]} seg={6} />
        <Callout id="axle" p={[0, COLUMN_H + 0.03, 0]} />
      </Part>

      {Array.from({ length: DIGITS }, (_, j) => (
        <Part key={j} id={`d${j}`}>
          <group position={[0, CELL0 + j * PITCH, 0]}>
            <Cell col={col} digit={j} />
          </group>
          <Callout id={`d${j}`} p={[0.05, CELL0 + j * PITCH + 0.1, 0.06]} />
        </Part>
      ))}

      {hasAdder && (
        <Part id="adder-shaft">
          <Cyl c={[ADDER[0], COLUMN_H / 2, ADDER[1]]} r={0.0075} len={COLUMN_H + 0.04} seg={14} />
          <Callout id="adder-shaft" p={[ADDER[0], COLUMN_H + 0.02, ADDER[1]]} />
        </Part>
      )}

      <Part id="carry-shaft">
        <SpinY at={[CARRY[0], 0, CARRY[1]]} angle={() => TAU * tw.spiral[col]}>
          <Cyl c={[0, (COLUMN_H + 0.08 + lift) / 2, 0]} r={0.008} len={COLUMN_H + 0.08 + lift} seg={6} />
          {worm && <GearY k="col-wormwheel" n={WORM_WHEEL.n} m={WORM_WHEEL.m} y={COLUMN_H + 0.03 + lift} t={0.022} bore={0.008} />}
        </SpinY>
        <Callout id="carry-shaft" p={[CARRY[0], COLUMN_H + 0.07, CARRY[1]]} />
      </Part>

      <Part id="lock-bar">
        <group rotation={[0, LOCK_AZ, 0]}>
          <Slide offset={() => [0, 0, 0.014 * tw.unlocked[col]]}>
            <Box c={[0, COLUMN_H / 2, LOCK_R]} s={[0.014, COLUMN_H - 0.16, 0.01]} />
            {Array.from({ length: DIGITS }, (_, j) => (
              <Box key={j} c={[0, CELL0 + j * PITCH + GEAR.y + GEAR.t / 2, LOCK_R - 0.008]} s={[0.006, GEAR.t * 0.8, 0.012]} />
            ))}
          </Slide>
        </group>
        <Box c={[LOCK[0], 0.012, LOCK[1] + 0.03]} s={[0.012, 0.024, 0.07]} />
        <Callout id="lock-bar" p={[LOCK[0], COLUMN_H * 0.62, LOCK[1]]} />
      </Part>

      <Part id="label">
        <Box c={[0, COLUMN_H - 0.025, 0.105]} s={[0.07, 0.07, 0.008]} />
        <Geo g={flatFigures(`col-${col}`, [col], 0.045, 0.03)} p={[0, COLUMN_H - 0.025, 0.109]} />
        <Callout id="label" p={[0.03, COLUMN_H, 0.11]} />
      </Part>

    </group>
  );
}

const cellPart = (j: number): PartDef => ({
  id: `d${j}`,
  index: 3 + j,
  name: j === 0 ? '个位（第 1 位）' : `第 ${j + 1} 位（10^${j}）`,
  en: `Digit ${j + 1}`,
  role: j === 0 ? '最先加 · 不收进位' : '收下一位的进位',
  material: '—',
  description: j === 0
    ? '最下面一位是个位。进位螺旋从这里开始往上扫，它自己从不收进位。点“拆开此组件”看一个加法单元里面。'
    : `从下往上第 ${j + 1} 位。螺旋上它的进位臂比下一位晚 45° 转到，所以下一位满十时，进位总是先到它，再往上传。点“拆开此组件”看里面。`,
  explode: cellExplode(j),
  stage: [0.62 - j * 0.055, 0.74 - j * 0.055],
});

const PARTS: PartDef[] = [
  { id: 'frame', index: 1, name: '轴承架与立柱', en: 'Brackets & Posts', role: '上下定位三根轴', material: '铸铁', description: '上下两块铸铁轴承架把主轴、加法轴和进位螺旋轴定在一起；两根细立柱挂着每一位的警示杆和定位爪。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'axle', index: 2, name: '主轴', en: 'Axle', role: '八个数字轮的芯', material: '钢', description: 'Ø17 mm 的钢轴，不转：八个数字轮各自套在轴套里，在它上面各转各的。', explode: [0, 0, -0.45], stage: [0.84, 0.98] },
  ...Array.from({ length: DIGITS }, (_, j) => cellPart(j)),
  { id: 'adder-shaft', index: 11, name: '加法轴', en: 'Adding Shaft', role: '八个加法小齿轮', material: '钢', description: '在主轴右后方，串着八个加法小齿轮和八根探杆，伸向右边的给数列。本列收数的那半拍里它们一起动。', explode: [0.3, 0.25, -0.1], stage: [0.12, 0.26] },
  { id: 'carry-shaft', index: 12, name: '进位螺旋轴', en: 'Carry Spiral Shaft', role: '每半拍转一圈', material: '钢', description: '六角钢轴，顶上的蜗轮（12 齿）被顶部传动轴上的蜗杆带动。轴上八个进位臂各差 45°，从下往上排成螺旋——巴贝奇差分机最有名的结构。', explode: [0, 0.4, -0.25], stage: [0.04, 0.18] },
  { id: 'lock-bar', index: 13, name: '锁定杆', en: 'Lock Bar', role: '不加数时锁死', material: '钢', description: '一根竖杆，八个齿插在八个齿圈里。只有本列收数时，凸轮鼓才把它拉开 14 mm；其余时间整列数字一格也转不动，免得被震乱。', explode: [0.25, 0, 0.25], stage: [0, 0.14] },
  { id: 'label', index: 14, name: '列号牌', en: 'Column Plate', role: '第几阶差分', material: '黄铜', description: '0 是结果列 f(n)，1 是一阶差分 Δf，一直到 6 是六阶差分。', explode: [0, 0.2, 0.1], stage: [0, 0.1] },
];

const STEPS: StepDef[] = [
  {
    title: '数字柱', en: 'Figure-Wheel Column',
    body: '一列八位，个位在最下面，存一个八位十进制数——这里是结果列 D0，存的就是 f(n)。前半拍锁定杆拉开，加法轴上的八个小齿轮同时把右边一列的八位数加进来，然后螺旋轴转一圈，从下往上进位。',
    state: { explode: 0, section: false, running: true, select: 'carry-shaft', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拔出锁定杆和列号牌，抽出螺旋轴和加法轴，再从上往下一位一位取下加法单元，最后抽出主轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '每一位都是一个加法单元：选中任意一位，点“拆开此组件”。',
    state: { explode: 0, section: false, running: true, select: 'd1', focus: null },
  },
];

export const columnLevel: MachineDef = level({
  id: 'tower/column',
  parent: 'tower/core',
  unit: 4.6,
  bounds: [[-0.14, 0, -0.2], [0.15, COLUMN_H + 0.07, 0.12]],
  name: '数字柱',
  en: 'Figure-Wheel Column',
  subtitle: '子组件 · 八位 · 锁定杆 · 进位螺旋',
  summary: '14 种零件：八个加法单元、加法轴、进位螺旋轴、锁定杆……',
  drawingNo: 'GW-TG-21',
  scale: '1 : 4',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: Object.fromEntries(Array.from({ length: DIGITS }, (_, j) => [`d${j}`, 'tower/cell'])),
  guides: [{ stage: 'carry-shaft', origin: [CARRY[0], COLUMN_H, CARRY[1]] }],
  centreLines: [[[0, -0.05, 0], [0, COLUMN_H + 0.1, 0], 0.072]],
  steps: STEPS,
  camera: {
    target: [0, COLUMN_H / 2, 0],
    offset: [2.2, 1.6, 4.9],
    orthoDistance: 7,
    exploded: { target: [0, COLUMN_H / 2 + 0.1, 0.1], scale: 1.35 },
  },
  Model: () => <Column col={0} />,
  Driver: TowerDriver,
  Controls: TowerControls,
});
