import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Cyl, level, Turn } from '../kit';
import { GEAR_Y, Gear, HOUSING, layshaftAngle, LAYSHAFT, LAYSHAFT2, OrreryControls, OrreryDriver, planetAngle, Spin } from './layout';
import { moduleFor, PAIRS, SATURN_TRAIN } from './train';

/**
 * The orrery's gearbox: the crank turns a layshaft once per year through a
 * pair of bevel gears; five gear pairs on the layshaft drive the planets'
 * tubes, and a second layshaft takes Saturn off Jupiter's tube.
 */

const [J29, L72] = SATURN_TRAIN[0];
const [L40, S40] = SATURN_TRAIN[1];
const SATURN_Y2 = GEAR_Y.jupiter + 0.012;

/** One driving pair: gear a on the layshaft, gear b on the planet's tube at the centre. */
function Pair({ p }: { p: keyof typeof PAIRS }) {
  const [a, b] = PAIRS[p];
  const m = moduleFor(a, b);
  return (
    <>
      <Spin at={LAYSHAFT} angle={layshaftAngle}><Gear k={`${p}-a`} n={a} m={m} y={GEAR_Y[p]} /></Spin>
      <Spin angle={() => planetAngle(p)}><Gear k={`${p}-b`} n={b} m={m} y={GEAR_Y[p]} /></Spin>
    </>
  );
}

export function GearTrain() {
  return (
    <group>
      <Part id="housing">
        <Turn k="or-housing" profile={[[0.03, HOUSING.y1], [HOUSING.r, HOUSING.y1], [HOUSING.r, HOUSING.y0], [HOUSING.r - 0.01, HOUSING.y0], [HOUSING.r - 0.01, HOUSING.y1 - 0.006], [0.03, HOUSING.y1 - 0.006]]} seg={64} />
        <Turn k="or-sleeve" profile={[[0.023, HOUSING.y1], [0.028, HOUSING.y1], [0.028, 0.204], [0.023, 0.204]]} seg={32} />
        <Callout id="housing" p={[0.13, HOUSING.y1, 0.12]} />
      </Part>
      <Part id="drive">
        <group position={[LAYSHAFT[0], 0.068, LAYSHAFT[1]]}>
          <Cyl c={[0, 0, 0.2]} r={0.005} len={0.4} axis="z" seg={12} />
          <Turn k="or-bevel-h" profile={[[0.004, 0.0], [0.022, 0.0], [0.012, 0.012], [0.004, 0.012]]} p={[0, 0, 0.012]} axis="-z" seg={24} />
          <Turn k="or-bevel-v" profile={[[0.004, 0.0], [0.022, 0.0], [0.012, 0.012], [0.004, 0.012]]} p={[0, 0.012, 0]} axis="-y" seg={24} />
        </group>
        <Callout id="drive" p={[LAYSHAFT[0], 0.075, 0.15]} />
      </Part>
      <Part id="layshaft">
        <Spin at={LAYSHAFT} angle={layshaftAngle}><Cyl c={[0, 0.128, 0]} r={0.004} len={0.12} seg={12} /></Spin>
        <Callout id="layshaft" p={[LAYSHAFT[0], 0.16, 0.01]} />
      </Part>
      {(['mercury', 'venus', 'mars', 'jupiter', 'earth'] as const).map((p) => (
        <Part key={p} id={`${p}-pair`}>
          <Pair p={p} />
          <Callout id={`${p}-pair`} p={[0.06, GEAR_Y[p] + 0.004, 0.05]} />
        </Part>
      ))}
      <Part id="saturn-train">
        <Spin angle={() => planetAngle('jupiter')}><Gear k="j29" n={J29} m={moduleFor(J29, L72)} y={SATURN_Y2} /></Spin>
        <Spin at={LAYSHAFT2} angle={() => -planetAngle('jupiter') * (J29 / L72)}>
          <Cyl c={[0, 0.135, 0]} r={0.004} len={0.07} seg={12} />
          <Gear k="l72" n={L72} m={moduleFor(J29, L72)} y={SATURN_Y2} />
          <Gear k="l40" n={L40} m={moduleFor(L40, S40)} y={GEAR_Y.saturn} />
        </Spin>
        <Spin angle={() => planetAngle('saturn')}><Gear k="s40" n={S40} m={moduleFor(L40, S40)} y={GEAR_Y.saturn} /></Spin>
        <Callout id="saturn-train" p={[LAYSHAFT2[0], GEAR_Y.saturn + 0.004, 0.06]} />
      </Part>
    </group>
  );
}

const pairText = (a: number, b: number, period: string) => `中间轴上 ${a} 齿带动套管上 ${b} 齿：套管每年转 ${(a / b).toFixed(4)} 圈，周期 ${period}。`;

const PARTS: PartDef[] = [
  { id: 'housing', index: 1, name: '齿轮箱', en: 'Gearbox Housing', role: '支承所有轴', material: '黄铜', description: '圆形箱体，顶板中间伸出一圈固定套筒，地月仪的固定齿轮就装在这上面。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'drive', index: 2, name: '摇柄轴与锥齿轮', en: 'Crank Shaft & Bevels', role: '输入', material: '钢 / 黄铜', description: '一对 1:1 锥齿轮把摇柄的转动拐 90° 传给中间轴：摇一圈，就是一年。', explode: [0, -0.08, 0.2], stage: [0.84, 1] },
  { id: 'layshaft', index: 3, name: '中间轴', en: 'Layshaft', role: '一年转一圈', material: '钢', description: '所有行星的“时钟”：它每年转一圈，上面五个齿轮按各自的齿数比带动行星的套管。', explode: [0.18, 0, 0], stage: [0.7, 0.86] },
  { id: 'mercury-pair', index: 4, name: '水星齿轮对 83 / 20', en: 'Mercury Pair', role: '周期 0.2410 年', material: '黄铜', description: pairText(83, 20, '0.2410 年（真实 0.2408 年，88 天）'), explode: [0, -0.06, -0.16], stage: [0.6, 0.72] },
  { id: 'venus-pair', index: 5, name: '金星齿轮对 52 / 32', en: 'Venus Pair', role: '周期 0.6154 年', material: '黄铜', description: pairText(52, 32, '0.6154 年（真实 0.6152 年，225 天）'), explode: [0, -0.04, -0.2], stage: [0.5, 0.62] },
  { id: 'mars-pair', index: 6, name: '火星齿轮对 25 / 47', en: 'Mars Pair', role: '周期 1.880 年', material: '黄铜', description: pairText(25, 47, '1.880 年（真实 1.881 年）'), explode: [0, -0.02, -0.24], stage: [0.4, 0.52] },
  { id: 'jupiter-pair', index: 7, name: '木星齿轮对 7 / 83', en: 'Jupiter Pair', role: '周期 11.86 年', material: '黄铜', description: pairText(7, 83, '11.857 年（真实 11.862 年）'), explode: [0, 0.02, -0.28], stage: [0.3, 0.42] },
  { id: 'earth-pair', index: 8, name: '地球齿轮对 40 / 40', en: 'Earth Pair', role: '一年一圈', material: '黄铜', description: '1:1，地球臂和中间轴一样每年一圈。地球的套管在最外层、最短，所以它的齿轮在最上面。', explode: [0, 0.06, -0.32], stage: [0.1, 0.22] },
  { id: 'saturn-train', index: 9, name: '土星复式轮系', en: 'Saturn Compound Train', role: '周期 29.44 年', material: '黄铜', description: '土星 29.46 年才转一圈，单对齿轮做不出这么大的减速比，于是从木星套管再减一次：木星 29 齿 → 第二中间轴 72 齿，再 40 / 40 带动土星套管，周期 29.44 年。', explode: [-0.18, 0.04, 0], stage: [0.2, 0.32] },
];

const STEPS: StepDef[] = [
  {
    title: '齿轮系', en: 'Gear Train',
    body: '剖开齿轮箱：摇柄经锥齿轮带动中间轴，一年一圈；中间轴上的五个齿轮按齿数比带动五根套管，土星再从木星那里减一次速。每对齿轮的模数不同，好让中心距都相同。',
    state: { explode: 0, section: true, running: true, select: 'saturn-train', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '从上往下：地球、土星、木星、火星、金星、水星各对齿轮依次取出，再抽出中间轴和摇柄轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const gearsLevel: MachineDef = level({
  id: 'orrery/gears',
  parent: 'orrery',
  unit: 32,
  bounds: [[-0.19, 0.06, -0.19], [0.19, 0.205, 0.4]],
  name: '齿轮系',
  en: 'Gear Train',
  subtitle: '子组件 · 一年一圈的中间轴 · 复式轮系',
  summary: '9 种零件：中间轴、五对行星齿轮、土星复式轮系……',
  drawingNo: 'GW-TY-01',
  scale: '2 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'layshaft', origin: [0.12, 0.12, 0] }],
  centreLines: [[[0, 0.05, 0], [0, 0.22, 0], 0.03], [[LAYSHAFT[0], 0.05, 0], [LAYSHAFT[0], 0.2, 0], 0.01]],
  steps: STEPS,
  camera: { target: [0, 0.13, 0.02], offset: [0.36, 0.3, 0.62], orthoDistance: 3, exploded: { target: [0, 0.12, -0.04], scale: 1.6 } },
  Model: GearTrain,
  Driver: OrreryDriver,
  Controls: OrreryControls,
});
