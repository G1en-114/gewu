import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, roundRect, Rod, Turn, XZ_Y, YZ_X } from '../kit';
import { CARDS, COLUMNS, PRINT, smooth, within } from './calc';
import { CamDrum, CAM_X, ROD_TOP } from './cams';
import { TowerControls } from './controls';
import { colX } from './core';
import { mainShaft, TowerDriver, towerMotion, tw, useTower } from './motion';
import { axleFigures, Geo, sideShape, Slide, SpinX, SpinY, SpinZ } from './shared';

/**
 * 程序层: the floor under the calculating core. The cam drum runs the
 * programme; on the right a Jacquard-style card drum holds the punched
 * cards — one polynomial each — and a needle box reads the loaded card and
 * sets the columns through the setting rods; at the front a counter shows
 * which line of the table is being worked. Origin at the floor centre; metres.
 */

export const CAM_AXIS: [number, number] = [0.3, -0.15];
export const SHAFT_X = -1.62;
const DRUM = { x: 1.6, y: 0.42, z: -0.05, r: 0.13, len: 0.34 };
const APOTHEM = DRUM.r * Math.cos(Math.PI / 6);
const CARD = { w: 0.12, len: 0.3, t: 0.006 };
const COUNTER = { y: 0.42, z: 0.3, r: 0.045, gap: 0.06 };
const TAU = Math.PI * 2;

/** Punch pattern of a card: 3 rows × 8 holes, from the card's polynomial values. */
function holes(i: number): Array<[number, number, number]> {
  const card = CARDS[i % CARDS.length];
  const out: Array<[number, number, number]> = [];
  for (let row = 0; row < 3; row += 1) {
    const v = Math.abs(Math.round(card.f(row + 1)));
    for (let k = 0; k < 8; k += 1) if ((v >> k) & 1 || (row + k + i) % 5 === 0) out.push([-0.035 + row * 0.035, -0.12 + k * 0.034, 0.009]);
  }
  return out;
}

/** A card lying on a drum face (in the face's local xz plane). */
const cardOnFace = (i: number) => (
  <Plate k={`tw-card-face-${i}`} shape={roundRect(-CARD.w / 2, -CARD.len / 2, CARD.w / 2, CARD.len / 2, 0.01, holes(i))} depth={CARD.t} p={[0, APOTHEM, 0]} r={XZ_Y} />
);

/** Hanging cards, in a loop outside the tower wall (in the yz plane). */
const HANG = Array.from({ length: 12 }, (_, k) => {
  if (k < 6) return { x: 1.86, y: 0.32 - k * 0.13, tilt: 0 };
  return { x: 2.0, y: 0.32 - (11 - k) * 0.13 - 0.06, tilt: 0 };
});

/** Odometer readings of the line counter: units turn as the paper feeds, higher digits follow on 9 → 0. */
export function counterReading(place: number) {
  const value = tw.n + smooth(within(tw.uc, PRINT.feed));
  const whole = Math.floor(value);
  const frac = value - whole;
  let r = Math.floor(whole / 10 ** place) % 10;
  // A wheel moves only while every wheel below it is passing 9 → 0.
  const below = whole % 10 ** place;
  if (place === 0) r += frac;
  else if (below === 10 ** place - 1) r += frac;
  return r;
}

export function Program() {
  return (
    <group>
      <Part id="bed">
        {[-0.3, 0.12].map((z) => <Box key={z} c={[0, 0.03, z]} s={[3.3, 0.06, 0.1]} />)}
        {[-1.4, 0, 1.3].map((x) => <Box key={x} c={[x, 0.03, -0.09]} s={[0.1, 0.06, 0.52]} />)}
        <Callout id="bed" p={[-1.2, 0.06, 0.15]} />
      </Part>

      <Part id="cams">
        <group position={[0, CAM_AXIS[0], CAM_AXIS[1]]}>
          <CamDrum shaftFrom={SHAFT_X} />
        </group>
        <Callout id="cams" p={[CAM_X(3), CAM_AXIS[0] + 0.1, CAM_AXIS[1] + 0.1]} />
      </Part>

      <Part id="bevel">
        <SpinY at={[SHAFT_X, CAM_AXIS[0] + 0.09, CAM_AXIS[1]]} angle={() => -mainShaft()}>
          <Turn k="tw-pg-bevel" profile={[[0.022, 0], [0.09, 0], [0.06, 0.05], [0.022, 0.05]]} p={[0, 0.05, 0]} axis="-y" seg={32} />
        </SpinY>
        <Box c={[SHAFT_X, CAM_AXIS[0] + 0.2, CAM_AXIS[1]]} s={[0.14, 0.06, 0.14]} />
        <Callout id="bevel" p={[SHAFT_X, CAM_AXIS[0] + 0.23, CAM_AXIS[1] + 0.07]} />
      </Part>

      <Part id="card-drum">
        <SpinZ at={[DRUM.x, DRUM.y, DRUM.z]} angle={() => -towerMotion.drum * (TAU / 6)}>
          <Turn k="tw-pg-drum" profile={[[0.02, -DRUM.len / 2], [DRUM.r, -DRUM.len / 2], [DRUM.r, DRUM.len / 2], [0.02, DRUM.len / 2]]} axis="z" seg={6} />
          {Array.from({ length: 6 }, (_, k) => (
            <group key={k} rotation={[0, 0, (k * TAU) / 6]}>
              {cardOnFace(k)}
            </group>
          ))}
        </SpinZ>
        <Cyl c={[DRUM.x, DRUM.y, DRUM.z]} r={0.018} len={DRUM.len + 0.12} axis="z" seg={12} />
        {[-1, 1].map((s) => <Box key={s} c={[DRUM.x, DRUM.y / 2, DRUM.z + s * (DRUM.len / 2 + 0.05)]} s={[0.08, DRUM.y, 0.03]} />)}
        <Callout id="card-drum" p={[DRUM.x, DRUM.y + DRUM.r, DRUM.z + 0.1]} />
      </Part>

      <Part id="card-chain">
        {HANG.map(({ x, y }, k) => (
          <Plate key={k} k={`tw-card-hang-${k}`} shape={sideShape([[-CARD.len / 2, -CARD.w / 2], [CARD.len / 2, -CARD.w / 2], [CARD.len / 2, CARD.w / 2], [-CARD.len / 2, CARD.w / 2]], holes(k + 1).map(([a, b, r]) => [b, a, r]))} depth={CARD.t} p={[x, y, DRUM.z]} r={YZ_X} />
        ))}
        <Rod a={[DRUM.x + DRUM.r, DRUM.y + 0.04, DRUM.z]} b={[1.86, 0.38, DRUM.z]} r={0.004} />
        <Callout id="card-chain" p={[2.0, -0.2, DRUM.z + 0.12]} />
      </Part>

      <Part id="needles">
        <Box c={[DRUM.x, DRUM.y + 0.26, DRUM.z]} s={[0.2, 0.1, DRUM.len + 0.02]} />
        <Slide offset={() => [0, 0.05 * Math.min(1, Math.abs(CARDS.findIndex((c) => c.id === useTower.getState().card) - towerMotion.drum) * 4), 0]}>
          {Array.from({ length: 8 }, (_, k) => (
            <Cyl key={k} c={[DRUM.x + (k % 2 ? 0.025 : -0.025), DRUM.y + APOTHEM + 0.06, DRUM.z - 0.12 + k * 0.034]} r={0.004} len={0.12} seg={8} />
          ))}
        </Slide>
        <Callout id="needles" p={[DRUM.x, DRUM.y + 0.31, DRUM.z + 0.15]} />
      </Part>

      <Part id="setting-rods">
        <Rod a={[DRUM.x - 0.1, DRUM.y + 0.3, DRUM.z]} b={[colX(0), DRUM.y + 0.3, DRUM.z]} r={0.012} />
        {Array.from({ length: COLUMNS }, (_, k) => (
          <Rod key={k} a={[colX(k) + 0.03, DRUM.y + 0.3, DRUM.z]} b={[colX(k) + 0.03, 0.86, DRUM.z]} r={0.008} />
        ))}
        <Callout id="setting-rods" p={[colX(2), DRUM.y + 0.32, DRUM.z + 0.02]} />
      </Part>

      <Part id="counter">
        <Box c={[0, COUNTER.y, COUNTER.z - 0.07]} s={[0.32, 0.14, 0.08]} />
        <Plate k="tw-pg-counter-face" shape={roundRect(-0.17, -0.08, 0.17, 0.08, 0.02, [[-0.09, 0, 0.0], [0.09, 0, 0.0]])} depth={0.008} p={[0, COUNTER.y, COUNTER.z + COUNTER.r + 0.004]} />
        {Array.from({ length: 4 }, (_, place) => (
          <group key={place} position={[(1.5 - place) * COUNTER.gap, COUNTER.y, COUNTER.z]}>
            <SpinX angle={() => (counterReading(place) * TAU) / 10}>
              <Turn k="tw-pg-count" profile={[[0.008, -0.022], [COUNTER.r, -0.022], [COUNTER.r, 0.022], [0.008, 0.022]]} axis="x" seg={30} />
              <Geo g={axleFigures('count', COUNTER.r, 0.03, 0.0025)} />
            </SpinX>
          </group>
        ))}
        <Cyl c={[0, COUNTER.y, COUNTER.z]} r={0.008} len={0.3} axis="x" seg={10} />
        <Callout id="counter" p={[0.12, COUNTER.y + 0.08, COUNTER.z + 0.05]} />
      </Part>

      <Part id="risers">
        {Array.from({ length: 8 }, (_, i) => (
          <Rod key={i} a={[CAM_X(i), CAM_AXIS[0] + ROD_TOP, CAM_AXIS[1]]} b={[CAM_X(i), 0.88, CAM_AXIS[1]]} r={0.008} />
        ))}
        <Box c={[-0.05, 0.8, CAM_AXIS[1]]} s={[2.3, 0.025, 0.05]} />
        <Callout id="risers" p={[CAM_X(6), 0.82, CAM_AXIS[1] + 0.03]} />
      </Part>

      <Part id="clutch">
        <group position={[-1.3, 0.06, 0.25]}>
          <Box c={[0, 0.04, 0]} s={[0.12, 0.08, 0.12]} />
          <group rotation={[0, 0, 0.2]}>
            <Rod a={[0, 0.06, 0]} b={[0, 0.6, 0]} r={0.012} />
            <Cyl c={[0, 0.64, 0]} r={0.022} len={0.08} seg={14} />
          </group>
          <Plate k="tw-pg-quadrant" shape={sideShape([[-0.02, 0.06], [0.02, 0.06], [0.02, 0.3], [-0.02, 0.3]])} depth={0.01} p={[-0.07, 0, 0]} r={YZ_X} />
        </group>
        <Callout id="clutch" p={[-1.2, 0.7, 0.28]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'bed', index: 1, name: '程序层机座', en: 'Floor Bed', role: '托凸轮鼓 · 读卡机', material: '铸铁', description: '铺在楼板上的铸铁轨道和横梁，凸轮鼓、读卡机、计行轮都装在上面。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'cams', index: 2, name: '时序凸轮鼓', en: 'Cam Drum', role: '整台机器的程序', material: '—', description: '八个凸轮装在一根轴上，每算一行转一圈：解锁、加法、进位、印字、进纸，什么时候动全由它决定。点“拆开此组件”进去看。', explode: [0, -0.1, 0.7], stage: [0.4, 0.6] },
  { id: 'bevel', index: 3, name: '主竖轴取力锥齿轮', en: 'Take-off Bevel', role: '从主竖轴取力', material: '钢', description: '主竖轴穿过这层楼，在这里用一对 1 : 1 锥齿轮带动凸轮轴。', explode: [-0.3, 0.2, 0], stage: [0.6, 0.72] },
  { id: 'card-drum', index: 4, name: '卡鼓', en: 'Card Drum', role: '挂着打孔卡', material: '铸铁 · 六棱', description: '六棱的卡鼓，每个面托一张打孔卡。换一种多项式，卡鼓就转到那张卡（左栏的五个按钮）。', explode: [0.5, 0.2, 0.3], stage: [0.2, 0.36] },
  { id: 'card-chain', index: 5, name: '打孔卡链', en: 'Card Chain', role: '一张卡一个多项式', material: '硬纸板 · 铰链', description: '卡片用铰链连成长链，从塔外挂下来。卡上的孔记着初值——多项式和它各阶差分的起始值。', explode: [0.7, 0, 0], stage: [0.1, 0.24] },
  { id: 'needles', index: 6, name: '探针箱', en: 'Needle Box', role: '读卡上的孔', material: '钢针 · 弹簧', description: '一排弹簧钢针压在卡上：有孔的针掉下去，没孔的被顶住。换卡时针全部抬起。读到的孔经置数拉杆把七列数字柱设成初值。', explode: [0.3, 0.45, 0], stage: [0.26, 0.4] },
  { id: 'setting-rods', index: 7, name: '置数拉杆', en: 'Setting Rods', role: '把初值送上去', material: '钢', description: '从探针箱伸到每一列数字柱底下的一组拉杆，只在换卡时动一次，把初值一次设好。', explode: [0, 0.5, 0.2], stage: [0.32, 0.46] },
  { id: 'counter', index: 8, name: '计行轮', en: 'Line Counter', role: '第几行', material: '黄铜', description: '四位计数轮，每印一行进一。像里程表一样，低位 9 → 0 时才带高位走一格。', explode: [0, 0.2, 0.6], stage: [0.06, 0.2] },
  { id: 'risers', index: 9, name: '升降拉杆', en: 'Risers', role: '推杆接到楼上', material: '钢', description: '接在八根推杆顶上，穿过楼板上去：通锁定摇轴、进位离合箱、印字层的压印锤和进纸棘轮。', explode: [0, 0.35, -0.2], stage: [0.5, 0.64] },
  { id: 'clutch', index: 10, name: '启停离合手柄', en: 'Clutch Lever', role: '开机 · 停机', material: '铸铁 · 黄铜', description: '操作员扳动它，让凸轮轴和主竖轴接上或脱开：脱开后蒸汽机照转，计算停在当前这一拍。', explode: [-0.3, 0.1, 0.4], stage: [0, 0.12] },
];

const STEPS: StepDef[] = [
  {
    title: '程序层', en: 'Program Floor',
    body: '计算核心下面的一层：凸轮鼓每行转一圈，安排每一拍谁动；右边的卡鼓挂着打孔卡，一张卡一个多项式，换卡时探针读出卡上的孔，把七列数字柱设成初值；前面的计行轮数着算到第几行。',
    state: { explode: 0, section: false, running: true, select: 'cams', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '扳下离合手柄，取下计行轮、打孔卡链和卡鼓，拆探针箱和置数拉杆，再把凸轮鼓整个抬出。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '选中凸轮鼓，点“拆开此组件”看八个凸轮。',
    state: { explode: 0, section: false, running: true, select: 'cams', focus: null },
  },
];

export const programLevel: MachineDef = level({
  id: 'tower/program',
  parent: 'tower',
  unit: 3.6,
  bounds: [[-1.7, 0, -0.45], [2.08, 0.9, 0.4]],
  name: '程序层',
  en: 'Program Floor',
  subtitle: '子组件 · 凸轮鼓 · 打孔卡 · 计行轮',
  summary: '10 种零件：凸轮鼓、卡鼓与打孔卡链、探针箱、置数拉杆、计行轮……',
  drawingNo: 'GW-TG-03',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { cams: 'tower/cams' },
  guides: [{ stage: 'cams', origin: [0, CAM_AXIS[0], CAM_AXIS[1]] }],
  centreLines: [[[-1.75, CAM_AXIS[0], CAM_AXIS[1]], [1.25, CAM_AXIS[0], CAM_AXIS[1]], 0.085]],
  steps: STEPS,
  camera: {
    target: [0.55, 0.15, 0],
    offset: [2.7, 2.5, 7.0],
    orthoDistance: 8,
    exploded: { target: [0.2, 0.4, 0.3], scale: 1.4 },
  },
  Model: Program,
  Driver: TowerDriver,
  Controls: TowerControls,
});
