import type { BoltSetDef, CameraDef, GuideDef, PartDef, StepDef, Vec3 } from '../types';

/**
 * Single-cylinder four-stroke petrol engine after Joe Webster's free
 * "Webster Engine Works 4 Cycle Gas Engine" plans (21 sheets, 2004; free for
 * non-profit use). Units are inches, as on the drawings: bore 0.875,
 * stroke 1.25, rod centres 3.0625.
 *
 * Axes: x along the cylinder (crank at 0, head toward +x), y up from the
 * underside of the base plate, z along the crankshaft (+z toward the viewer).
 * The section plane z = 0 is the cylinder's mid-plane.
 */
export const ICE = {
  /** Height of the crank and cylinder axes. */
  axisY: 2.375,
  crank: 0.625,
  rod: 3.0625,
  bore: 0.875,
  /** Cam shaft: half-speed, on the side frame below and ahead of the crank. */
  cam: [0.29, 1.288] as const,
  camZ: 1.12,
  /** Valve stack on the front of the head frame; both valves stand on this line. */
  valveX: 4.5,
  valveZ: 1.12,
  /** Rocker arm pivot (on its pedestal). */
  pivot: [2.3, 0.95] as const,
  /** Peak exhaust valve lift (drawn a little larger than life). */
  lift: 0.07,
};

const Y = ICE.axisY;

export const PARTS: PartDef[] = [
  {
    id: 'base', index: 1, name: '底板', en: 'Base Plate', role: '安装基准', material: '铝合金',
    description: 'L 形底板，侧机架、曲轴支架、缸头机架和摇臂支座都用螺钉固定在它上面。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'side-frame', index: 2, name: '侧机架', en: 'Side Frame', role: '支承曲轴 · 凸轮轴', material: '铝合金',
    description: '一端是曲轴主轴承孔和凸轮轴孔，另一端用螺钉连接缸头机架，把气缸和曲轴固定在同一条中心线上。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'support', index: 3, name: '曲轴支架', en: 'Crankshaft Support', role: '曲轴外侧支承', material: '铝合金',
    description: '在飞轮另一侧支承曲轴，与侧机架一起构成两点支承。',
    explode: [0, 0, -1.2], stage: [0.86, 1],
  },
  {
    id: 'head-frame', index: 4, name: '缸头机架', en: 'Cylinder Head-Frame', role: '气缸盖 · 安装座', material: '铝合金',
    description: '兼作气缸盖：背面孔容纳气缸止口，正面装火花塞，侧面有气道通向气门组。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'cylinder', index: 5, name: '气缸', en: 'Cylinder', role: '活塞导向 · 散热', material: '易切钢 / 铸铁',
    description: '缸径 22.2 mm，外圆车出 5 道散热片。顶部的注油器向缸壁滴油润滑。',
    explode: [-0.4, 2.6, 0], stage: [0.36, 0.5],
  },
  {
    id: 'piston', index: 6, name: '活塞 · 活塞销', en: 'Piston & Wrist Pin', role: '承受燃气压力', material: '6061 铝合金',
    description: '两道环槽装活塞环密封燃气；活塞销把活塞与连杆小头铰接。',
    explode: [0.4, 0, 2.4], stage: [0.46, 0.6],
  },
  {
    id: 'conrod', index: 7, name: '连杆', en: 'Connecting Rod', role: '往复 → 旋转', material: '6061 铝合金',
    description: '中心距 77.8 mm。小头随活塞往复，大头绕曲柄销转动，把直线运动变成旋转运动。',
    explode: [0, 0, 1.5], stage: [0.5, 0.64],
  },
  {
    id: 'crankshaft', index: 8, name: '曲轴', en: 'Crankshaft', role: '输出转矩', material: '冷拉钢',
    description: '悬臂式单拐曲轴，曲柄半径 15.9 mm（行程 31.75 mm）。曲柄销端装黄油杯，后端装皮带轮输出动力。',
    explode: [0, 0, 2.8], stage: [0.6, 0.74],
  },
  {
    id: 'flywheel', index: 9, name: '飞轮 · 主动齿轮', en: 'Flywheel & Drive Gear', role: '储能 · 驱动正时', material: '铸铁 / 钢',
    description: '四个冲程中只有做功冲程输出能量，飞轮靠惯性带动其余三个冲程。轮毂上压装 24 齿主动齿轮。',
    explode: [0, 2.9, 0], stage: [0.7, 0.84],
  },
  {
    id: 'camgear', index: 10, name: '凸轮轴组件', en: 'Cam Gear & Exhaust Cam', role: '2 : 1 正时', material: '黄铜 / 钢',
    description: '48 齿凸轮齿轮与 24 齿主动齿轮啮合，凸轮轴转速是曲轴的一半，曲轴每转两圈凸轮顶开一次排气门。',
    explode: [0, 0, -1.25], stage: [0.78, 0.92],
  },
  {
    id: 'rocker', index: 11, name: '摇臂', en: 'Rocker Arm', role: '传递凸轮升程', material: '冷拉钢',
    description: '一端由凸轮压下，绕支点摆动，另一端的挺杆螺钉把排气门顶起。下方弹簧使摇臂始终贴紧凸轮。',
    explode: [0, 0, 1.7], stage: [0.26, 0.4],
  },
  {
    id: 'valves', index: 12, name: '气门组', en: 'Valve Stack', role: '控制进气 · 排气', material: '铝合金 / 不锈钢',
    description: '三块阀体叠装：上为进气门（自动阀，靠吸气负压打开），下为排气门（由摇臂顶开），中间阀体经气道通向气缸。',
    explode: [0, 0, 2.2], stage: [0.18, 0.32],
  },
  {
    id: 'carb', index: 13, name: '化油器', en: 'Venturi & Needle Valve', role: '混合燃油与空气', material: '黄铜',
    description: '喉管处气流加速、压力降低，把燃油从针阀吸出并雾化；旋动针阀调节混合比。',
    explode: [1.5, 0.4, 0], stage: [0, 0.12],
  },
  {
    id: 'spark', index: 14, name: '火花塞', en: 'Spark Plug', role: '点燃混合气', material: 'NGK CM-6',
    description: '旋入缸头机架正面（M10×1）。压缩冲程末端跳火，点燃被压缩的混合气。',
    explode: [1.8, 0, 0], stage: [0.04, 0.16],
  },
  {
    id: 'exhaust', index: 15, name: '排气管', en: 'Exhaust Pipe', role: '排出废气', material: '铝 / 黄铜',
    description: '接在下阀体侧面，把排气冲程推出的废气引向机体后方。',
    explode: [-1.4, 0, 0.6], stage: [0.08, 0.2],
  },
];

export const BOLT_SETS: Record<string, BoltSetDef> = {
  'valve-screws': { owner: 'valves', distance: 0.9, stage: [0.12, 0.22] },
  'head-screws': { owner: 'head-frame', distance: 1.1, stage: [0.28, 0.38] },
};

export const NEIGHBOURS: Record<string, string[]> = {
  base: ['support', 'flywheel', 'camgear'],
  'side-frame': ['camgear', 'rocker'],
  support: ['support'],
  'head-frame': ['spark', 'head-screws', 'cylinder'],
  cylinder: ['head-screws', 'cylinder', 'piston'],
  piston: ['head-screws', 'cylinder', 'piston', 'conrod'],
  conrod: ['head-screws', 'cylinder', 'piston', 'conrod'],
  crankshaft: ['head-screws', 'cylinder', 'piston', 'conrod', 'crankshaft'],
  flywheel: ['crankshaft', 'flywheel'],
  camgear: ['rocker', 'flywheel', 'camgear'],
  rocker: ['rocker'],
  valves: ['carb', 'exhaust', 'valve-screws', 'valves'],
  carb: ['carb'],
  spark: ['spark'],
  exhaust: ['exhaust'],
};

/** Valve-stack screws (x, y) on its front face; head screws (y, z) round the cylinder axis. */
export const VALVE_SCREWS: Array<[number, number]> = [[-0.4, 0.07], [0.4, 0.07], [-0.4, -0.07], [0.4, -0.07]];
export const HEAD_SCREWS: Array<[number, number]> = [[0.4375, 0.4375], [-0.4375, 0.4375], [0.4375, -0.4375], [-0.4375, -0.4375]];

const VZ = ICE.valveZ + 0.32;

export const GUIDES: GuideDef[] = [
  { stage: 'carb', origin: [5.0, Y + 0.19, ICE.valveZ] },
  { stage: 'spark', origin: [4.75, Y, 0] },
  { stage: 'exhaust', origin: [4.0, Y - 0.19, ICE.valveZ] },
  ...VALVE_SCREWS.map(([x, y]): GuideDef => ({ stage: 'valve-screws', origin: [ICE.valveX + x, Y + y, VZ], axis: [0, 0, 1] })),
  { stage: 'valves', origin: [ICE.valveX, Y, 0.81] },
  { stage: 'rocker', origin: [ICE.pivot[0], ICE.pivot[1], ICE.valveZ] },
  ...HEAD_SCREWS.map(([y, z]): GuideDef => ({ stage: 'head-screws', origin: [4.75, Y + y, z], axis: [1, 0, 0] })),
  { stage: 'cylinder', origin: [4.0, Y + 0.56, 0] },
  { stage: 'piston', origin: [3.2, Y, 0.44] },
  { stage: 'crankshaft', origin: [0, Y, 0.3] },
  { stage: 'flywheel', origin: [0, Y + 1.875, -1.94] },
  { stage: 'camgear', origin: [ICE.cam[0], ICE.cam[1], -1.25] },
  { stage: 'support', origin: [0.2, 2.875, -2.9] },
];

export const CENTRE_LINES: Array<[Vec3, Vec3, number?]> = [
  [[-0.6, Y, 0], [5.5, Y, 0], 0.75],
  [[0, Y, 0.9], [0, Y, -3.95], 1.9],
  [[ICE.cam[0], ICE.cam[1], 1.45], [ICE.cam[0], ICE.cam[1], -1.45], 0.78],
  [[ICE.valveX, Y - 1.25, ICE.valveZ], [ICE.valveX, Y + 0.85, ICE.valveZ]],
];

export const STEPS: StepDef[] = [
  {
    title: '装配体', en: 'Assembly',
    body: '卧式单缸四冲程汽油机，15 种零件。曲柄连杆把活塞的往复运动变成曲轴旋转；飞轮储存能量；正时齿轮按 2 : 1 带动凸轮，按时顶开排气门。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '四冲程', en: 'Four Strokes',
    body: '曲轴转两圈完成一个循环：进气 — 压缩 — 做功 — 排气。剖开气缸可以看到活塞、燃烧室和火花塞，左栏显示当前冲程。',
    state: { explode: 0, section: true, running: true, select: 'piston', focus: 'core' },
  },
  {
    title: '配气机构', en: 'Valve Gear',
    body: '24 齿主动齿轮带动 48 齿凸轮齿轮，凸轮每两圈压一次摇臂，摇臂另一端顶开排气门。进气门是自动阀，进气冲程被负压吸开。',
    state: { explode: 0, section: false, running: true, select: 'rocker', focus: 'valvegear' },
  },
  {
    title: '拆卸顺序', en: 'Disassembly',
    body: '先卸化油器、火花塞和排气管，拆下气门组与摇臂；再卸缸头螺钉取下气缸，取出活塞连杆；最后抽出曲轴，取下飞轮和凸轮轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const CAMERA: CameraDef = {
  target: [1.7, 1.9, -0.8],
  offset: [8.2, 6.4, 15.2],
  orthoDistance: 52,
  exploded: { target: [1.8, 2.6, -0.4], scale: 1.32 },
  foci: {
    core: { target: [2.4, 2.2, 0], scale: 0.7 },
    valvegear: { target: [2.5, 1.8, 0.6], scale: 0.74 },
  },
};
