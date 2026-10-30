import type { CameraDef, GuideDef, PartDef, StepDef, Vec3 } from '../types';

/**
 * Screw jack (螺旋千斤顶), the classic 工程制图 assembly exercise.
 * Everything is a solid of revolution about the Y axis, so the section
 * plane through the axis shows every fit and the square thread.
 */
export const JACK = {
  /** Square thread on the lifting screw. */
  pitch: 0.16,
  threadMinor: 0.29,
  threadMajor: 0.35,
  threadLength: 1.9,
  /** Screw position (thread start) above the base floor when fully lowered. */
  screwY: 0.75,
  /** Lift travel of the screw. */
  stroke: 0.7,
};

export const PARTS: PartDef[] = [
  {
    id: 'base', index: 1, name: '底座', en: 'Base', role: '支承 · 安装螺套', material: 'HT200 · 灰铸铁',
    description: '空心铸件，底面宽大以稳定承载；上部孔与螺套过盈配合，内腔供螺旋杆下行。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'nut', index: 2, name: '螺套', en: 'Nut Bushing', role: '内方牙螺纹 · 承受轴向力', material: 'ZCuAl10Fe3 · 铝青铜',
    description: '青铜螺套压入底座并用紧定螺钉防转；内方牙螺纹与螺旋杆旋合，承受全部顶举力。',
    explode: [0, 0.9, 0], stage: [0.62, 0.84],
  },
  {
    id: 'screw', index: 3, name: '螺旋杆', en: 'Lifting Screw', role: '旋转 → 升降', material: '45 钢',
    description: '方牙螺纹传力效率高。转动杆头，螺旋杆在螺套中边转边升，每转升高一个导程。',
    explode: [0, 2.9, 0], stage: [0.4, 0.66],
  },
  {
    id: 'bar', index: 4, name: '绞杠', en: 'Tommy Bar', role: '施加转矩', material: 'Q215',
    description: '插入杆头的横孔中，用手扳动产生转矩；杠杆越长越省力。',
    explode: [2.0, 0, 0], stage: [0.2, 0.42],
  },
  {
    id: 'top-cap', index: 5, name: '顶垫', en: 'Top Cap', role: '承载重物 · 不随杆转动', material: 'Q275',
    description: '以球面坐在螺旋杆顶端，可随重物自动调心；螺旋杆转动时顶垫不随之转动。',
    explode: [0, 3.8, 0], stage: [0.1, 0.3],
  },
  {
    id: 'set-screw', index: 6, name: '螺钉 M10×12', en: 'Set Screw', role: '固定螺套', material: '性能等级 8.8',
    description: '骑缝装在螺套与底座的结合面上，防止螺套在螺纹力矩作用下转动。',
    explode: [0, 1.0, 0], stage: [0.3, 0.46],
  },
  {
    id: 'cap-screw', index: 7, name: '螺钉 M8×12', en: 'Cap Screw', role: '防止顶垫脱出', material: '性能等级 8.8',
    description: '旋入顶垫侧面，端部伸入螺旋杆颈部的环槽，使顶垫既能转动又不会脱落。',
    explode: [0, 0, 0.7], stage: [0.0, 0.14],
  },
];

export const NEIGHBOURS: Record<string, string[]> = {
  base: ['set-screw', 'nut'],
  nut: ['set-screw', 'screw', 'nut'],
  screw: ['cap-screw', 'top-cap', 'bar', 'screw'],
  bar: ['bar'],
  'top-cap': ['cap-screw', 'top-cap'],
  'set-screw': ['set-screw'],
  'cap-screw': ['cap-screw'],
};

const Y = JACK.screwY;

export const GUIDES: GuideDef[] = [
  { stage: 'cap-screw', origin: [0, Y + 2.6, 0.56] },
  { stage: 'top-cap', origin: [0, Y + 2.88, 0] },
  { stage: 'bar', origin: [1.3, Y + 2.22, 0] },
  { stage: 'set-screw', origin: [0.475, 2.42, 0] },
  { stage: 'screw', origin: [0, Y + 2.45, 0] },
  { stage: 'nut', origin: [-0.6, 2.42, 0] },
  { stage: 'nut', origin: [0.6, 2.42, 0] },
];

export const CENTRE_LINES: Array<[Vec3, Vec3]> = [
  [[0, -0.35, 0], [0, 7.2, 0]],
];

export const STEPS: StepDef[] = [
  {
    title: '装配体', en: 'Assembly',
    body: '螺旋千斤顶由 7 个零件组成，全部是回转体，共用一条竖直轴线。转动绞杠，螺旋杆便在螺套中边转边升。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '全剖', en: 'Full Section',
    body: '沿轴线剖开：螺套外圆与底座孔配合、内方牙螺纹与螺旋杆旋合；两个螺钉分别锁住螺套与顶垫。',
    state: { explode: 0, section: true, running: true, select: 'nut', focus: null },
  },
  {
    title: '螺旋传动', en: 'Screw Drive',
    body: '绞杠带动螺旋杆转动，螺旋杆每转一圈上升一个导程；顶垫以球面支承在杆顶，只升降不转动。',
    state: { explode: 0, section: false, running: true, select: 'screw', focus: 'head' },
  },
  {
    title: '拆卸顺序', en: 'Disassembly',
    body: '先拧下 M8 螺钉取下顶垫，抽出绞杠，再拧下 M10 螺钉，旋出螺旋杆，最后压出螺套。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const CAMERA: CameraDef = {
  target: [0, 2.0, 0],
  offset: [6.4, 4.6, 10.4],
  orthoDistance: 42,
  exploded: { target: [0, 3.9, 0], scale: 1.72 },
  foci: {
    head: { target: [0, 3.4, 0], scale: 0.62 },
  },
};
