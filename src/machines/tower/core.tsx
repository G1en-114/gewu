import { M, Part } from '../../scene/Part';
import { squareThread } from '../../scene/geometry';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, roundRect, Rod, Turn, XZ_Y } from '../kit';
import { boxes, type P3 } from '../b747/geo';
import { COLUMNS, DIGITS } from './calc';
import { CARRY, GEAR, PITCH, SPACING } from './cell';
import { CELL0, Column, COLUMN_H, WORM_WHEEL } from './column';
import { TowerControls } from './controls';
import { TowerDriver, towerMotion, tw } from './motion';
import { Geo, rivetLine, SpinX, SpinY } from './shared';

/**
 * 计算核心: seven figure-wheel columns D0 (left, the result) … D6 (right,
 * the sixth difference) standing in a row between a cast-iron bed and a
 * crown plate. Over the columns run two carry drive shafts, one for the
 * even columns (turning in the first half of each cycle) and one for the
 * odd (second half); at the front a rocking shaft pulls the lock bars.
 * Origin at the centre of the bed's underside; metres.
 */

export const BED_H = 0.08;
export const colX = (k: number) => (k - (COLUMNS - 1) / 2) * SPACING;
export const CROWN_Y = BED_H + COLUMN_H + 0.2;
export const CORE_H = CROWN_Y + 0.06;
const W = 1.46;
const Z0 = -0.36;
const Z1 = 0.24;
const TAU = Math.PI * 2;
/**
 * Carry drive shafts (x-axis) over the columns, each with a worm per column
 * it serves: the even columns' shaft A runs in front of their worm wheels,
 * the odd columns' shaft B behind theirs and higher (their carry shafts are
 * taller), so neither touches the other set.
 */
const WHEEL_R = (WORM_WHEEL.n * WORM_WHEEL.m) / 2;
const WORM_R = 0.017;
const DRIVE_A = BED_H + COLUMN_H + 0.041;
const DRIVE_B = DRIVE_A + 0.07;
const DRIVE_Z = [CARRY[1] + WHEEL_R + WORM_R * 0.8, CARRY[1] - WHEEL_R - WORM_R * 0.8];
const driveY = (odd: 0 | 1) => (odd ? DRIVE_B : DRIVE_A);
/** A single-start worm turns its wheel one tooth per turn: 12 turns of the shaft per turn of a carry spiral. */
const driveTurns = (odd: 0 | 1) => () => TAU * tw.spiral[odd] * WORM_WHEEL.n * (odd ? -1 : 1);

const pillar = (x: number, z: number) => (
  <group key={`${x}:${z}`} position={[x, 0, z]}>
    <Turn k="tw-core-pillar" profile={[[0, BED_H], [0.07, BED_H], [0.07, BED_H + 0.05], [0.05, BED_H + 0.08], [0.042, BED_H + 0.12], [0.042, CROWN_Y - 0.14], [0.05, CROWN_Y - 0.1], [0.075, CROWN_Y - 0.04], [0.075, CROWN_Y], [0, CROWN_Y]]} seg={8} />
  </group>
);

/** Index marks either side of the reading line, one pair per digit, in front of every column. */
const indexMarks = boxes('tw-core-index', () => {
  const out: Array<{ c: P3; s: P3; r?: P3 }> = [];
  for (let k = 0; k < COLUMNS; k += 1) {
    for (let j = 0; j < DIGITS; j += 1) {
      const y = BED_H + CELL0 + j * PITCH + 0.085;
      for (const side of [-1, 1]) out.push({ c: [colX(k) + side * 0.05, y, 0.084], s: [0.014, 0.006, 0.006], r: [0, 0, side * 0.5] });
    }
  }
  return out;
});

export function Core() {
  return (
    <group>
      <Part id="bed">
        <Plate k="tw-core-bed" shape={roundRect(-W, -Z1, W, -Z0, 0.04)} depth={BED_H} r={XZ_Y} />
        {[-1, 1].map((s) => <Box key={s} c={[s * (W - 0.1), -0.02, (Z0 + Z1) / 2]} s={[0.16, 0.04, Z1 - Z0 - 0.06]} />)}
        <Geo g={rivetLine('core-bed', [-W + 0.06, BED_H, Z1 - 0.03], [W - 0.06, BED_H, Z1 - 0.03], 24, 0.014)} />
        <Callout id="bed" p={[-W + 0.15, BED_H, Z1]} />
      </Part>

      <Part id="pillars">
        {[[-W + 0.08, Z0 + 0.08], [W - 0.08, Z0 + 0.08], [-W + 0.08, Z1 - 0.08], [W - 0.08, Z1 - 0.08]].map(([x, z]) => pillar(x, z))}
        <Callout id="pillars" p={[W - 0.08, CROWN_Y * 0.6, Z1 - 0.04]} />
      </Part>

      <Part id="crown">
        <Plate
          k="tw-core-crown"
          shape={roundRect(-W, -Z1, W, -Z0, 0.04, Array.from({ length: COLUMNS }, (_, k): [number, number, number] => [colX(k), 0.02, 0.06]))}
          depth={0.06}
          p={[0, CROWN_Y, 0]}
          r={XZ_Y}
        />
        <Geo g={rivetLine('core-crown', [-W + 0.06, CROWN_Y + 0.06, Z1 - 0.03], [W - 0.06, CROWN_Y + 0.06, Z1 - 0.03], 24, 0.014)} />
        <Callout id="crown" p={[-W + 0.2, CROWN_Y + 0.06, Z1 - 0.05]} />
      </Part>

      {Array.from({ length: COLUMNS }, (_, k) => (
        <Part key={k} id={`col${k}`}>
          <group position={[colX(k), BED_H, 0]}>
            <Column col={k} tall={k % 2 === 1} worm={k < COLUMNS - 1} />
          </group>
          <Callout id={`col${k}`} p={[colX(k), BED_H + COLUMN_H - 0.05, 0.1]} />
        </Part>
      ))}

      {([0, 1] as const).map((odd) => (
        <Part key={odd} id={odd ? 'carry-b' : 'carry-a'}>
          <SpinX at={[0, driveY(odd), DRIVE_Z[odd]]} angle={driveTurns(odd)}>
            <Cyl c={[0, 0, 0]} r={0.011} len={2 * W - 0.1} axis="x" seg={10} />
            {Array.from({ length: COLUMNS - 1 }, (_, k) => k).filter((k) => k % 2 === odd).map((k) => (
              <group key={k} position={[colX(k) - 0.05, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <M clip geo={squareThread('tw-core-worm', 0.011, WORM_R, 0.019, 0.1)} />
              </group>
            ))}
          </SpinX>
          {[-W + 0.15, colX(3) + (odd ? 0.19 : -0.19), W - 0.22].map((x) => (
            <group key={x}>
              <Box c={[x, (driveY(odd) + CROWN_Y) / 2, DRIVE_Z[odd]]} s={[0.035, CROWN_Y - driveY(odd), 0.04]} />
              <Turn k="tw-core-hanger" profile={[[0.011, -0.025], [0.026, -0.025], [0.026, 0.025], [0.011, 0.025]]} p={[x, driveY(odd), DRIVE_Z[odd]]} axis="x" seg={16} />
            </group>
          ))}
          <Callout id={odd ? 'carry-b' : 'carry-a'} p={[colX(odd ? 3 : 2) + 0.1, driveY(odd), DRIVE_Z[odd]]} />
        </Part>
      ))}

      <Part id="drive">
        <group position={[W - 0.12, 0, CARRY[1]]}>
          <Box c={[0, (DRIVE_A + DRIVE_B) / 2, 0]} s={[0.12, 0.2, 0.22]} />
          <SpinY angle={() => -TAU * towerMotion.cycle * 4}>
            <Cyl c={[0, DRIVE_A / 2, 0]} r={0.016} len={DRIVE_A} seg={12} />
          </SpinY>
          {([0, 1] as const).map((odd) => (
            <SpinX key={odd} at={[-0.06, driveY(odd), DRIVE_Z[odd] - CARRY[1]]} angle={driveTurns(odd)}>
              <Turn k="tw-core-clutch" profile={[[0.011, 0], [0.04, 0], [0.04, 0.025], [0.011, 0.025]]} p={[-0.03, 0, 0]} axis="-x" seg={6} />
            </SpinX>
          ))}
        </group>
        <Callout id="drive" p={[W - 0.12, DRIVE_B + 0.1, CARRY[1] + 0.1]} />
      </Part>

      <Part id="lock-shaft">
        <SpinX at={[0, BED_H + 0.04, 0.16]} angle={() => 0.25 * Math.max(...tw.unlocked)}>
          <Cyl c={[0, 0, 0]} r={0.012} len={2 * W - 0.2} axis="x" seg={14} />
          {Array.from({ length: COLUMNS }, (_, k) => <Box key={k} c={[colX(k) + 0.092, 0.02, -0.06]} s={[0.012, 0.03, 0.11]} />)}
        </SpinX>
        <Callout id="lock-shaft" p={[colX(5), BED_H + 0.06, 0.18]} />
      </Part>

      <Part id="index">
        <Geo g={indexMarks} />
        {Array.from({ length: COLUMNS }, (_, k) => (
          <Rod key={k} a={[colX(k) - 0.05, BED_H + 0.12, 0.09]} b={[colX(k) - 0.05, BED_H + COLUMN_H - 0.1, 0.09]} r={0.003} seg={6} />
        ))}
        <Callout id="index" p={[colX(0) - 0.05, BED_H + CELL0 + 7 * PITCH + 0.09, 0.09]} />
      </Part>

      <Part id="output">
        <Cyl c={[colX(0) - 0.14, (BED_H + CROWN_Y + 0.4) / 2, -0.1]} r={0.014} len={CROWN_Y + 0.32} seg={12} />
        {Array.from({ length: DIGITS }, (_, j) => (
          <Box key={j} c={[colX(0) - 0.12, BED_H + CELL0 + j * PITCH + GEAR.y + 0.03, -0.085]} s={[0.05, 0.012, 0.02]} />
        ))}
        <Callout id="output" p={[colX(0) - 0.14, CROWN_Y + 0.2, -0.1]} />
      </Part>
    </group>
  );
}

const DIFF = ['结果 f(n)', '一阶差分 Δf', '二阶差分 Δ²f', '三阶差分 Δ³f', '四阶差分 Δ⁴f', '五阶差分 Δ⁵f', '六阶差分 Δ⁶f'];

const colPart = (k: number): PartDef => ({
  id: `col${k}`,
  index: 4 + k,
  name: `D${k} 数字柱 · ${DIFF[k]}`,
  en: `Column D${k}`,
  role: k === 0 ? '每拍出一个结果' : k === 6 ? '常数 · 只给不收' : k % 2 === 0 ? '前半拍收数' : '后半拍收数',
  material: '—',
  description: k === 0
    ? '最左边一列存着表里的当前值。每拍前半它收进 D1，就从 f(n) 变成 f(n+1)，紧接着印字机把它印出来。点“拆开此组件”看一列里面。'
    : k === 6
      ? '六次多项式的六阶差分是常数，所以这一列从不收数，只把自己的数给 D5。它没有加法轴。'
      : `存${DIFF[k]}。${k % 2 === 0 ? '前' : '后'}半拍收进 D${k + 1}，${k % 2 === 0 ? '后' : '前'}半拍把自己给 D${k - 1}——相邻两列一收一给、轮流来，这就是流水线。`,
  explode: [0, 0.12 * (k % 2), 0.55 + 0.4 * (k % 2)],
  deep: undefined,
  stage: [0.6 - k * 0.06, 0.74 - k * 0.06],
});

const PARTS: PartDef[] = [
  { id: 'bed', index: 1, name: '底座铸床', en: 'Bed', role: '七列共同的地基', material: '铸铁', description: '2.9 m × 0.6 m 的铸铁床，七根主轴都从它上面立起来；下面就是程序层的凸轮鼓，拉杆从床上的孔里穿上来。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'pillars', index: 2, name: '四角立柱', en: 'Pillars', role: '撑起冠板', material: '铸铁', description: '八棱柱身、上下有托座的铸铁柱子，把冠板架在 2.5 m 高处，冠板再压住每一列的上轴承。', explode: [0, 0, 0], stage: [0.86, 0.98] },
  { id: 'crown', index: 3, name: '冠板', en: 'Crown Plate', role: '压住所有上轴承', material: '铸铁', description: '整块铸铁冠板，每列一个检修孔。拆机先吊走它。', explode: [0, 0.9, 0], stage: [0.06, 0.18] },
  ...Array.from({ length: COLUMNS }, (_, k) => colPart(k)),
  { id: 'carry-a', index: 11, name: '进位传动轴 A（偶数列）', en: 'Carry Drive A', role: '前半拍转', material: '钢', description: '低的那根横轴，每列一段蜗杆，带动 D0、D2、D4 进位螺旋轴顶上的蜗轮（12 : 1）：它们在前半拍收数，所以 A 轴在前半拍的后段转一圈。', explode: [0, 0.6, -0.3], stage: [0.12, 0.26] },
  { id: 'carry-b', index: 12, name: '进位传动轴 B（奇数列）', en: 'Carry Drive B', role: '后半拍转', material: '钢', description: '高的那根横轴，带动 D1、D3、D5 的螺旋轴，在后半拍转。B 轴走在蜗轮后面、高出一截，奇数列的螺旋轴也跟着高出 70 mm，两组互不相碰。', explode: [0, 0.75, -0.42], stage: [0.1, 0.24] },
  { id: 'drive', index: 13, name: '进位离合箱', en: 'Carry Clutch Box', role: '轮流接通 A / B', material: '铸铁 · 钢', description: '右端的竖轴从程序层取力，箱里两个牙嵌离合器由凸轮鼓控制：前半拍接通 A，后半拍接通 B。', explode: [0.5, 0.3, -0.2], stage: [0.2, 0.32] },
  { id: 'lock-shaft', index: 14, name: '锁定摇轴', en: 'Lock Rocking Shaft', role: '拉开锁定杆', material: '钢', description: '床前面的一根摇轴，每列一个拨叉。凸轮鼓在每半拍开头摇它一下，只把正在收数的那几列的锁定杆拉开。', explode: [0, -0.1, 0.5], stage: [0.24, 0.36] },
  { id: 'index', index: 15, name: '读数指针', en: 'Reading Index', role: '对准读数线', material: '黄铜', description: '每一位数字轮左右各一个小箭头，夹住正前方那一格：箭头之间的数字就是读数。从上往下读，就是这一列存的八位数。', explode: [0, 0, 0.3], stage: [0, 0.1] },
  { id: 'output', index: 16, name: '结果传送杆', en: 'Result Rods', role: '把 D0 送到印字层', material: '钢', description: 'D0 左边的一束竖杆，每位一根拨叉贴着齿圈：数字轮转几格，杆就转几格，一直通到顶上的印字机字轮。', explode: [-0.5, 0.35, 0], stage: [0.32, 0.44] },
];

const STEPS: StepDef[] = [
  {
    title: '计算核心', en: 'Calculating Core',
    body: '七列数字柱：最左 D0 是结果，往右依次是一阶到六阶差分。前半拍 D1、D3、D5 加进左边的 D0、D2、D4，后半拍 D2、D4、D6 加进 D1、D3、D5——两拍走完，D0 就从 f(n) 变成了 f(n+1)。左栏的表就是七列此刻的读数。',
    state: { explode: 0, section: false, running: true, select: 'col0', focus: null },
  },
  {
    title: '两根进位传动轴', en: 'Two Carry Drives',
    body: '顶上两根横轴轮流转：前半拍低的 A 轴带偶数列的螺旋，后半拍高的 B 轴带奇数列的。盯住某一列后面的螺旋轴，它只在本列刚加完数的时候转一圈。',
    state: { explode: 0, section: false, running: true, select: 'carry-a', focus: 'top' },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '吊走冠板，抽出两根进位传动轴和离合箱，拆下锁定摇轴和传送杆，再把七列数字柱一列一列抬出来。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '选中任意一列，点“拆开此组件”看数字柱；再选其中一位，看加法单元。',
    state: { explode: 0, section: false, running: true, select: 'col1', focus: null },
  },
];

export const coreLevel: MachineDef = level({
  id: 'tower/core',
  parent: 'tower',
  unit: 3.6,
  bounds: [[-W, -0.04, Z0], [W, CORE_H, Z1]],
  name: '计算核心',
  en: 'Calculating Core',
  subtitle: '子组件 · 七列 × 八位 · 两拍流水线',
  summary: '16 种零件：七列数字柱、两根进位传动轴、离合箱、锁定摇轴……',
  drawingNo: 'GW-TG-11',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: Object.fromEntries(Array.from({ length: COLUMNS }, (_, k) => [`col${k}`, 'tower/column'])),
  guides: [{ stage: 'crown', origin: [0, CROWN_Y, 0] }],
  centreLines: Array.from({ length: COLUMNS }, (_, k): [P3, P3, number] => [[colX(k), 0, 0], [colX(k), CORE_H + 0.05, 0], 0.072]),
  steps: STEPS,
  camera: {
    target: [0, CORE_H / 2, 0],
    offset: [2.3, 2.0, 5.8],
    orthoDistance: 8,
    exploded: { target: [0, CORE_H / 2 + 0.25, 0.4], scale: 1.5 },
    foci: { top: { target: [0, DRIVE_A, -0.1], scale: 0.55 } },
  },
  Model: Core,
  Driver: TowerDriver,
  Controls: TowerControls,
});
