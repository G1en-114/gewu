import type { BoltSetDef, CameraDef, GuideDef, PartDef, StepDef, Vec3 } from '../types';

/**
 * Gear oil pump (齿轮油泵). Two 14-tooth gear shafts (module 0.1) mesh in a
 * figure-eight chamber; the shafts run along x, one above the other, so the
 * section plane z = 0 passes through both axes. Oil enters and leaves through
 * the ports on the back (z−) and front (z+).
 */
export const PUMP = {
  /** Driven (lower) and driving (upper) shaft heights. */
  lowerY: 1.1,
  upperY: 2.5,
  teeth: 14,
  pitchR: 0.7,
  module: 0.1,
  /** Chamber radius (tip circle) and body wall. */
  chamberR: 0.8,
  outerR: 1.05,
  /** Gear face width: the body runs x ∈ [−w/2, w/2]. */
  width: 0.8,
  shaftR: 0.2,
};

const { lowerY: Y1, upperY: Y2 } = PUMP;

export const PARTS: PartDef[] = [
  {
    id: 'body', index: 1, name: '泵体', en: 'Pump Body', role: '齿轮腔 · 进出油口', material: 'HT200 · 灰铸铁',
    description: '内腔是两个相交的圆，恰好容纳一对齿轮；前后两侧是出油口和进油口，底部有安装底板。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'left-cover', index: 2, name: '左端盖', en: 'Left Cover', role: '封闭泵腔 · 支承轴端', material: 'HT200 · 灰铸铁',
    description: '用螺钉固定在泵体左端，两个轴孔支承齿轮轴的左端。',
    explode: [-1.0, 0, -1.6], stage: [0.42, 0.56],
  },
  {
    id: 'right-cover', index: 3, name: '右端盖', en: 'Right Cover', role: '封闭泵腔 · 填料函', material: 'HT200 · 灰铸铁',
    description: '支承两根轴的右端；主动轴从凸台中伸出，凸台内腔就是填料函。',
    explode: [1.0, 0, 0], stage: [0.28, 0.42],
  },
  {
    id: 'drive-shaft', index: 4, name: '主动齿轮轴', en: 'Driving Gear Shaft', role: '输入转矩', material: '45 钢',
    description: '齿轮与轴做成一体，右端伸出泵外装传动齿轮，带动下方的从动齿轮反向旋转。',
    explode: [-3.0, 0, 0], stage: [0.54, 0.72],
  },
  {
    id: 'driven-shaft', index: 5, name: '从动齿轮轴', en: 'Driven Gear Shaft', role: '与主动齿轮啮合', material: '45 钢',
    description: '由主动齿轮带动，两齿轮转向相反，齿数相同，转速相同。',
    explode: [-2.2, 0, 0], stage: [0.64, 0.82],
  },
  {
    id: 'packing', index: 6, name: '填料', en: 'Packing', role: '轴伸出处密封', material: '石棉绳 / 聚四氟乙烯',
    description: '填在右端盖凸台内，被压紧螺母压紧后抱住主动轴，防止油沿轴漏出。',
    explode: [1.6, 0, 0], stage: [0.16, 0.3],
  },
  {
    id: 'gland', index: 7, name: '压紧螺母', en: 'Gland Nut', role: '压紧填料', material: '35 钢',
    description: '旋在凸台外螺纹上，拧紧时把填料压紧；填料磨损后可再拧紧补偿。',
    explode: [2.2, 0, 0], stage: [0.08, 0.22],
  },
  {
    id: 'drive-gear', index: 8, name: '传动齿轮 · 螺母', en: 'Drive Gear & Nut', role: '接受外部动力', material: '45 钢',
    description: '用键装在主动轴伸出端，由电动机经齿轮传动带动；端部螺母与垫圈作轴向固定。',
    explode: [3.2, 0, 0], stage: [0, 0.14],
  },
];

export const BOLT_SETS: Record<string, BoltSetDef> = {
  'right-screws': { owner: 'right-cover', distance: 0.7, stage: [0.22, 0.32] },
  'left-screws': { owner: 'left-cover', distance: 0.7, stage: [0.36, 0.46] },
};

export const NEIGHBOURS: Record<string, string[]> = {
  body: ['left-screws', 'left-cover'],
  'left-cover': ['left-screws', 'left-cover'],
  'right-cover': ['drive-gear', 'gland', 'packing', 'right-screws', 'right-cover'],
  'drive-shaft': ['left-screws', 'left-cover', 'drive-gear', 'drive-shaft'],
  'driven-shaft': ['left-screws', 'left-cover', 'driven-shaft'],
  packing: ['drive-gear', 'gland', 'packing'],
  gland: ['drive-gear', 'gland'],
  'drive-gear': ['drive-gear'],
};

/** Cover screws (z, y): three round each bore, in the body wall. */
export const COVER_SCREWS: Array<[number, number]> = [
  ...[200, 270, 340].map((a): [number, number] => [-Math.cos((a * Math.PI) / 180) * 0.93, Y1 + Math.sin((a * Math.PI) / 180) * 0.93]),
  ...[20, 90, 160].map((a): [number, number] => [-Math.cos((a * Math.PI) / 180) * 0.93, Y2 + Math.sin((a * Math.PI) / 180) * 0.93]),
];

export const GUIDES: GuideDef[] = [
  { stage: 'drive-gear', origin: [1.6, Y2, 0] },
  { stage: 'gland', origin: [1.0, Y2 + 0.55, 0] },
  { stage: 'packing', origin: [0.85, Y2 + 0.3, 0] },
  ...COVER_SCREWS.map(([z, y]): GuideDef => ({ stage: 'right-screws', origin: [0.7, y, z], axis: [1, 0, 0] })),
  { stage: 'right-cover', origin: [0.7, Y1 - 0.9, 0] },
  ...COVER_SCREWS.map(([z, y]): GuideDef => ({ stage: 'left-screws', origin: [-0.7, y, z], axis: [-1, 0, 0] })),
  { stage: 'left-cover', origin: [-0.7, Y1 - 0.9, 0] },
  { stage: 'drive-shaft', origin: [-0.65, Y2, 0] },
  { stage: 'driven-shaft', origin: [-0.65, Y1, 0] },
];

export const CENTRE_LINES: Array<[Vec3, Vec3, number?]> = [
  [[-1.0, Y2, 0], [2.5, Y2, 0], 1.1],
  [[-1.0, Y1, 0], [1.0, Y1, 0], 1.1],
  [[0, 1.8, 1.6], [0, 1.8, -1.6], 0.4],
];

export const STEPS: StepDef[] = [
  {
    title: '装配体', en: 'Assembly',
    body: '齿轮油泵由 8 种零件组成：泵体两端用螺钉装上左、右端盖，腔内一对齿轮轴相互啮合，主动轴从右端伸出接受动力。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '全剖', en: 'Full Section',
    body: '沿两轴线剖开：两齿轮轴支承在两端盖的孔中；主动轴伸出处用填料和压紧螺母密封。齿轮轴为实心件，纵剖按不剖绘制。',
    state: { explode: 0, section: true, running: true, select: 'body', focus: null },
  },
  {
    title: '工作原理', en: 'How It Pumps',
    body: '两齿轮反向旋转：进油侧轮齿退出啮合，齿间容积增大形成负压吸油；齿间的油沿泵腔内壁被带到出油侧，轮齿重新啮合把油挤出。',
    state: { explode: 0, section: false, running: true, select: 'drive-shaft', focus: 'gears' },
  },
  {
    title: '拆卸顺序', en: 'Disassembly',
    body: '先卸传动齿轮和压紧螺母，取出填料；再拧下螺钉拆下两端盖，最后抽出两根齿轮轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const CAMERA: CameraDef = {
  target: [0.5, 1.7, 0],
  offset: [5.4, 4.0, 9.0],
  orthoDistance: 40,
  exploded: { target: [0.4, 1.8, -0.3], scale: 1.55 },
  foci: {
    gears: { target: [0, 1.8, 0], scale: 0.62 },
  },
};
