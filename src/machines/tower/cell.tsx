import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { coil } from '../../scene/geometry';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, Turn, XZ_Y } from '../kit';
import { DIGITS } from './calc';
import { TowerControls } from './controls';
import { TowerDriver, tw } from './motion';
import { Geo, GearY, polarShape, rimFigures, Slide, SpinY, SpinZ } from './shared';

/**
 * 加法单元: one digit of one figure-wheel column — the smallest thing in the
 * tower that does arithmetic. A drum engraved 0–9 turns on the column's axle
 * with a 40-tooth gear under it and a snail cam over it. Each step of the
 * snail is one digit: the column to the left feels it to learn this digit.
 *
 * Local frame: the column's axle is the y axis, the cell runs y 0 … PITCH.
 * The figures read from the front (+z). Behind it: the adding shaft (back
 * right) with this digit's adding pinion and feeler, and the carry spiral
 * shaft (straight back) with this digit's carry arm. Metres.
 */

export const PITCH = 0.25;
export const SPACING = 0.38;
export const GEAR = { n: 40, m: 0.004, y: 0.02, t: 0.02 };
export const DRUM = { r: 0.072, y0: 0.046, y1: 0.124 };
export const SNAIL = { y: 0.132, t: 0.016, r0: 0.028, step: 0.004 };
/** Adding shaft (this column's, receiving from the column at +x) and carry spiral shaft. */
export const ADDER: [number, number] = [0.104, -0.06];
export const PINION = { n: 20, m: 0.004 };
export const CARRY: [number, number] = [0, -0.16];
const TAU = Math.PI * 2;
/** Azimuth from a column's axle toward the adding shaft of the column on its left (which feels its snail). */
export const FEEL_AZ = Math.atan2(ADDER[0] - SPACING, ADDER[1]);
/** Azimuth of the carry tab on the drum, and of the warning lever it trips when the wheel goes 9 → 0. */
const TAB_AZ = (205 * Math.PI) / 180;
export const LEVER = { x: -0.075, z: -0.085 };
/** Detent post (front left) and lock bar (front right) azimuths. */
export const DETENT_AZ = (-55 * Math.PI) / 180;
export const LOCK_AZ = (80 * Math.PI) / 180;

export const snailRadius = (d: number) => SNAIL.r0 + d * SNAIL.step;
/** Snail profile: the step for digit d faces the feeler when the wheel reads d. */
const snailAt = (psi: number) => {
  const d = Math.floor((((psi - FEEL_AZ) / TAU) * 10 + 0.5 + 100)) % 10;
  return snailRadius(d);
};

/** The feeler slides along the line from the adding shaft toward the giver column's axle. */
const FEEL_DIR = (() => {
  const dx = SPACING - ADDER[0];
  const dz = -ADDER[1];
  const len = Math.hypot(dx, dz);
  return { x: dx / len, z: dz / len, len, az: Math.atan2(dx, dz) };
})();

/** Phase of a digit's carry arm on the spiral: it points at its wheel in the middle of its slot. */
export const armPhase = (j: number) => -TAU * ((j + 0.5) / DIGITS);

const wheelAngle = (col: number, j: number) => () => (-tw.reading[col][j] * TAU) / 10;

export function Cell({ col = 0, digit = 1, standalone = false }: { col?: number; digit?: number; standalone?: boolean }) {
  const hasAdder = col < 6;
  const angle = wheelAngle(col, digit);
  return (
    <group>
      <Part id="hub">
        <Turn k="tw-c-hub-lo" profile={[[0.0085, 0], [0.018, 0], [0.018, GEAR.y], [0.0085, GEAR.y]]} seg={24} />
        <Turn k="tw-c-hub-hi" profile={[[0.0085, SNAIL.y + SNAIL.t], [0.016, SNAIL.y + SNAIL.t], [0.016, PITCH], [0.0085, PITCH]]} seg={24} />
        <Callout id="hub" p={[0.016, 0.2, 0.012]} />
      </Part>

      <Part id="gear">
        <SpinY angle={angle}>
          <GearY k="c-figure" n={GEAR.n} m={GEAR.m} y={GEAR.y} t={GEAR.t} bore={0.0085} />
        </SpinY>
        <Callout id="gear" p={[0.06, GEAR.y + 0.02, 0.06]} />
      </Part>

      <Part id="figure">
        <SpinY angle={angle}>
          <Turn
            k="tw-c-drum"
            profile={[[0.0085, DRUM.y0 - 0.006], [0.026, DRUM.y0 - 0.006], [0.026, DRUM.y0], [DRUM.r, DRUM.y0], [DRUM.r, DRUM.y1], [0.026, DRUM.y1], [0.026, DRUM.y1 + 0.006], [0.0085, DRUM.y1 + 0.006]]}
            seg={60}
          />
          <Geo g={rimFigures('drum', DRUM.r, 0.05, 0.0028, (DRUM.y0 + DRUM.y1) / 2)} />
        </SpinY>
        <Callout id="figure" p={[0, DRUM.y1 - 0.01, DRUM.r + 0.004]} />
      </Part>

      <Part id="snail">
        <SpinY angle={angle}>
          <Plate k="tw-c-snail" shape={polarShape(snailAt, 200, 0.0085)} depth={SNAIL.t} p={[0, SNAIL.y, 0]} r={XZ_Y} />
        </SpinY>
        <Callout id="snail" p={[0.03, SNAIL.y + SNAIL.t, 0.03]} />
      </Part>

      <Part id="tab">
        <SpinY angle={angle}>
          <group rotation={[0, TAB_AZ, 0]}>
            <Box c={[0, DRUM.y1 + 0.004, DRUM.r - 0.008]} s={[0.012, 0.01, 0.016]} />
          </group>
        </SpinY>
        <Callout id="tab" p={[Math.sin(TAB_AZ) * DRUM.r, DRUM.y1 + 0.01, Math.cos(TAB_AZ) * DRUM.r]} />
      </Part>

      <Part id="warning">
        <group position={[LEVER.x, DRUM.y1 + 0.012, LEVER.z]}>
          <Cyl c={[0, 0, 0]} r={0.004} len={0.03} axis="z" seg={10} />
          <SpinZ angle={() => -0.55 * tw.warning[col][digit]}>
            <Box c={[0.03, 0, 0]} s={[0.06, 0.006, 0.008]} />
            <Box c={[-0.012, 0.006, 0]} s={[0.014, 0.018, 0.008]} />
          </SpinZ>
        </group>
        <Callout id="warning" p={[LEVER.x - 0.01, DRUM.y1 + 0.03, LEVER.z]} />
      </Part>

      <Part id="carry-arm">
        <SpinY at={[CARRY[0], 0, CARRY[1]]} angle={() => TAU * tw.spiral[col] + armPhase(digit)}>
          <Turn k="tw-c-armhub" profile={[[0.008, GEAR.y + GEAR.t + 0.002], [0.016, GEAR.y + GEAR.t + 0.002], [0.016, GEAR.y + GEAR.t + 0.016], [0.008, GEAR.y + GEAR.t + 0.016]]} seg={20} />
          <Box c={[0, GEAR.y + GEAR.t + 0.009, 0.042]} s={[0.012, 0.01, 0.06]} />
          <Box c={[0, GEAR.y + GEAR.t - 0.004, 0.073]} s={[0.008, 0.02, 0.008]} />
        </SpinY>
        <Callout id="carry-arm" p={[CARRY[0], GEAR.y + 0.05, CARRY[1] + 0.04]} />
      </Part>

      {hasAdder && (
        <Part id="adder">
          <Slide at={[ADDER[0], 0, ADDER[1]]} offset={() => [0, 0.008 * tw.adderLift[col], 0]}>
            <SpinY angle={() => (tw.adder[col][digit] * TAU * 2) / 10}>
              <GearY k="c-pinion" n={PINION.n} m={PINION.m} y={GEAR.y} t={GEAR.t} bore={0.0075} />
              <Turn k="tw-c-pinhub" profile={[[0.0075, GEAR.y + GEAR.t], [0.015, GEAR.y + GEAR.t], [0.015, GEAR.y + GEAR.t + 0.01], [0.0075, GEAR.y + GEAR.t + 0.01]]} seg={20} />
            </SpinY>
          </Slide>
          <Callout id="adder" p={[ADDER[0] + 0.03, GEAR.y + 0.02, ADDER[1] + 0.02]} />
        </Part>
      )}

      {hasAdder && (
        <Part id="feeler">
          <group position={[ADDER[0], SNAIL.y + SNAIL.t / 2, ADDER[1]]} rotation={[0, FEEL_DIR.az, 0]}>
            <Box c={[0, 0, 0.03]} s={[0.026, 0.024, 0.02]} />
            <Slide offset={() => {
              const rest = FEEL_DIR.len - snailRadius(9) - 0.012;
              const engaged = FEEL_DIR.len - snailRadius(tw.feelDigit[col][digit]) - 0.001;
              return [0, 0, rest + (engaged - rest) * tw.feeler[col]];
            }}>
              <Box c={[0, 0, -0.06]} s={[0.008, 0.008, 0.12]} />
              <Cyl c={[0, 0, -0.002]} r={0.004} len={0.008} seg={10} />
            </Slide>
          </group>
          <Callout id="feeler" p={[ADDER[0] + FEEL_DIR.x * 0.12, SNAIL.y + 0.02, ADDER[1] + FEEL_DIR.z * 0.12]} />
        </Part>
      )}

      <Part id="detent">
        <group rotation={[0, DETENT_AZ, 0]}>
          <Cyl c={[0, GEAR.y + GEAR.t / 2, 0.118]} r={0.0045} len={0.03} seg={10} />
          <Box c={[0.012, GEAR.y + GEAR.t / 2, 0.104]} s={[0.026, 0.008, 0.008]} r={[0, -0.6, 0]} />
          <Cyl c={[0.02, GEAR.y + GEAR.t / 2, 0.092]} r={0.005} len={0.012} seg={12} />
          <group position={[0.034, GEAR.y + GEAR.t / 2, 0.112]} rotation={[0, 0, Math.PI / 2]}>
            <Geo g={coil('tw-c-detent', 0.004, 0.0012, 0.028, 6)} />
          </group>
        </group>
        <Callout id="detent" p={[-0.09, GEAR.y + 0.02, 0.07]} />
      </Part>

      {standalone && (
        <Part id="shafts">
          <Cyl c={[0, PITCH / 2, 0]} r={0.008} len={PITCH + 0.06} seg={16} />
          {hasAdder && <Cyl c={[ADDER[0], PITCH / 2, ADDER[1]]} r={0.0075} len={PITCH + 0.06} seg={16} />}
          <SpinY at={[CARRY[0], 0, CARRY[1]]} angle={() => TAU * tw.spiral[col]}>
            <Cyl c={[0, PITCH / 2, 0]} r={0.008} len={PITCH + 0.06} seg={6} />
          </SpinY>
          <Callout id="shafts" p={[0, PITCH + 0.02, 0.01]} />
        </Part>
      )}

      {standalone && hasAdder && (
        <Part id="giver">
          <SpinY at={[SPACING, 0, 0]} angle={wheelAngle(col + 1, digit)}>
            <Plate k="tw-c-snail" shape={polarShape(snailAt, 200, 0.0085)} depth={SNAIL.t} p={[0, SNAIL.y, 0]} r={XZ_Y} />
            <Turn k="tw-c-giver-drum" profile={[[0.0085, DRUM.y0], [DRUM.r, DRUM.y0], [DRUM.r, DRUM.y1], [0.0085, DRUM.y1]]} seg={60} />
            <Geo g={rimFigures('drum', DRUM.r, 0.05, 0.0028, (DRUM.y0 + DRUM.y1) / 2)} />
          </SpinY>
          <Cyl c={[SPACING, PITCH / 2, 0]} r={0.008} len={PITCH + 0.06} seg={16} />
          <Callout id="giver" p={[SPACING, DRUM.y1, DRUM.r]} />
        </Part>
      )}
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'hub', index: 1, name: '轴套与隔环', en: 'Bushes & Spacers', role: '隔开上下两位', material: '青铜', description: '数字轮自己不固定在主轴上，而是套在青铜轴套里自由转；上下隔环把一位和一位隔开，每位 250 mm 高。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'gear', index: 2, name: '齿圈（40 齿）', en: 'Figure-Wheel Gear', role: '四齿一个数', material: '黄铜', description: '40 齿、模数 4。数字轮每走一个数转 36°，正好四个齿：加法小齿轮推它，定位爪卡它，进位臂也拨它。', explode: [0, -0.07, 0], stage: [0.55, 0.75] },
  { id: 'figure', index: 3, name: '数字轮', en: 'Figure Wheel', role: '存一位十进制数', material: '黄铜 · 刻字', description: '直径 144 mm 的鼓轮，圆周上凸刻 0–9 十个数字，每个相隔 36°。朝前（读数窗）的那个数字，就是这一位现在存着的数。', explode: [0, 0.12, 0.12], stage: [0.6, 0.82] },
  { id: 'snail', index: 4, name: '蜗形凸轮', en: 'Snail Cam', role: '把数字变成半径', material: '淬火钢', description: '十级台阶，半径从 28 mm 起每级加 4 mm。左边那列的探杆伸过来量它的半径，就知道这一位是几——数字被“读”出去靠的就是它。', explode: [0, 0.22, 0], stage: [0.45, 0.65] },
  { id: 'tab', index: 5, name: '进位凸耳', en: 'Carry Tab', role: '9 → 0 时碰一下', material: '钢', description: '鼓轮顶上的小凸块。数字轮从 9 转到 0 的那一刻，它正好扫过警示杆，把杆拨起来——这一位“满十了”。', explode: [0, 0.16, -0.06], stage: [0.35, 0.55] },
  { id: 'warning', index: 6, name: '警示杆', en: 'Warning Lever', role: '记住要进位', material: '钢', description: '被进位凸耳拨起后就一直立着，等螺旋上方那一位的进位臂转过来；进位臂看到它立着，就把上一位多拨一格，然后把它放倒复位。', explode: [-0.08, 0.1, -0.08], stage: [0.25, 0.45] },
  { id: 'carry-arm', index: 7, name: '进位臂', en: 'Carry Arm', role: '螺旋上的一节', material: '钢', description: '装在进位螺旋轴上，八位的进位臂各错开 45°，排成一圈螺旋。螺旋轴转一圈，八个臂从个位往上依次扫过——连续进位（如 9999 + 1）就这样一位传一位。', explode: [0, 0, -0.16], stage: [0.15, 0.35] },
  { id: 'adder', index: 8, name: '加法小齿轮', en: 'Adding Pinion', role: '把邻列的数加进来', material: '黄铜', description: '20 齿，和数字轮的 40 齿啮合。加法半拍里它转过“邻列这一位的数字 × 72°”，数字轮就前进同样多格；然后抬起 8 mm 脱开、空转回零。', explode: [0.14, -0.02, 0], stage: [0.08, 0.28] },
  { id: 'feeler', index: 9, name: '探杆', en: 'Feeler', role: '量出邻列的数', material: '钢', description: '每半拍开始时伸出去，顶到右边那一列（给数列）的蜗形凸轮上：台阶越高伸得越短。伸出多少，就决定了加法小齿轮这次转几格。', explode: [0.2, 0.06, 0.04], stage: [0, 0.2] },
  { id: 'detent', index: 10, name: '定位爪', en: 'Detent', role: '停在整数上', material: '钢 · 弹簧', description: '弹簧压着一个小滚轮卡在齿圈的齿槽里，让数字轮只能停在整格上，不会停在两个数中间。', explode: [-0.1, -0.04, 0.08], stage: [0.7, 0.9] },
  { id: 'shafts', index: 11, name: '三根轴（局部）', en: 'Shafts (part)', role: '主轴 · 加法轴 · 螺旋轴', material: '钢', description: '这一位穿在三根竖轴上：数字轮的主轴、后右的加法轴、正后方的进位螺旋轴。螺旋轴每半拍转一圈。', explode: [0, -0.2, 0], stage: [0.8, 1] },
  { id: 'giver', index: 12, name: '给数列（右邻一位）', en: 'Giving Column (one digit)', role: '被量的那一列', material: '黄铜', description: '右边那一列的同一位，只画出鼓轮和蜗形凸轮。本列收数的半拍里它不动，只被探杆量。', explode: [0.18, 0, 0], stage: [0.08, 0.2] },
];

const STEPS: StepDef[] = [
  {
    title: '加法单元', en: 'Adding Cell',
    body: '这是结果列 D0 的十位：一个数字轮存着 0–9 里的一个数，朝前的数字就是读数。前半拍它收数：探杆量出右边一列这一位是几，加法小齿轮就把数字轮拨过几格；越过 9 → 0 时进位凸耳拨起警示杆。',
    state: { explode: 0, section: false, running: true, select: 'figure', focus: null },
  },
  {
    title: '进位', en: 'Carry',
    body: '加完以后，后面的螺旋轴转一圈：下一位立着警示杆，这一位的进位臂就多拨一格。八位的进位臂错开 45° 排成螺旋，所以进位总是从个位往上一位一位传。',
    state: { explode: 0, section: false, running: true, select: 'carry-arm', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先抽出探杆和加法小齿轮，取下进位臂和警示杆，再把蜗形凸轮、数字轮、齿圈从轴套上依次取下。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const cellLevel: MachineDef = level({
  id: 'tower/cell',
  parent: 'tower/column',
  unit: 26,
  bounds: [[-0.12, -0.03, -0.2], [0.46, 0.28, 0.12]],
  name: '加法单元',
  en: 'Adding Cell',
  subtitle: '子组件 · 一位十进制数 · 蜗形凸轮 · 螺旋进位',
  summary: '12 种零件：数字轮、蜗形凸轮、加法小齿轮、探杆、警示杆、进位臂……',
  drawingNo: 'GW-TG-31',
  scale: '2 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'figure', origin: [0, DRUM.y1, 0] }],
  centreLines: [[[0, -0.04, 0], [0, 0.3, 0], DRUM.r], [[SPACING, -0.04, 0], [SPACING, 0.3, 0], DRUM.r]],
  steps: STEPS,
  camera: {
    target: [0.17, 0.11, -0.03],
    offset: [0.6, 0.55, 1.1],
    orthoDistance: 2.4,
    exploded: { target: [0.12, 0.13, -0.04], scale: 1.6 },
  },
  Model: () => <Cell col={0} digit={1} standalone />,
  Driver: TowerDriver,
  Controls: TowerControls,
});

