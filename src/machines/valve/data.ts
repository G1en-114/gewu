import type { BoltSetDef, CameraDef, GuideDef, PartDef, StepDef, Vec3 } from '../types';

/**
 * Ball valve (球阀), a standard 工程制图 assembly exercise. Flow runs along
 * x, the stem stands on y; the section plane z = 0 passes through both, so
 * the full-section front view shows the flow passage, ball, seats and packing.
 */
export const VALVE = {
  /** Height of the flow axis. */
  axisY: 1.2,
  /** Ball centre along the flow axis, and its radius / bore. */
  ballX: 0,
  ballR: 0.72,
  bore: 0.45,
};

const AX = VALVE.axisY;

export const PARTS: PartDef[] = [
  {
    id: 'body', index: 1, name: '阀体', en: 'Body', role: '流道 · 阀颈 · 支承', material: 'ZG25 · 铸钢',
    description: '左端法兰接管路，右端法兰与阀盖相连；上部阀颈容纳阀杆与填料。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'bonnet', index: 2, name: '阀盖', en: 'Bonnet', role: '封闭阀体 · 压紧密封圈', material: 'ZG25 · 铸钢',
    description: '凸缘止口与阀体对中，四组螺柱螺母把它与阀体压紧，同时压住右侧密封圈。',
    explode: [2.4, 0, 0], stage: [0.1, 0.28],
  },
  {
    id: 'ball', index: 3, name: '阀芯', en: 'Ball', role: '转 90° 开关流道', material: '40Cr',
    description: '带通孔的球体。通孔与流道对正时全开，转过 90° 后球面挡住流道即关闭。',
    explode: [0, 0, 2.0], stage: [0.24, 0.44],
  },
  {
    id: 'seats', index: 4, name: '密封圈', en: 'Seat Rings', role: '球面密封', material: '聚四氟乙烯',
    description: '一对软质密封圈嵌在阀体与阀盖的凹槽里，紧贴球面形成密封。',
    explode: [0.55, 0, 0], stage: [0.4, 0.54],
  },
  {
    id: 'stem', index: 5, name: '阀杆', en: 'Stem', role: '传递转矩', material: '40Cr',
    description: '下端扁榫插入阀芯顶部的槽，上端方头装扳手；转动扳手即带动阀芯转动。',
    explode: [0, 0.95, 0], stage: [0.5, 0.68],
  },
  {
    id: 'packing', index: 6, name: '填料', en: 'Packing', role: '阀杆密封', material: '聚四氟乙烯',
    description: '填在阀颈的填料函中，被压紧套压紧后抱住阀杆，防止介质沿阀杆泄漏。',
    explode: [0, 1.75, 0], stage: [0.24, 0.4],
  },
  {
    id: 'gland', index: 7, name: '填料压紧套', en: 'Gland', role: '压紧填料', material: '35 钢',
    description: '旋入阀颈顶部，压紧下方的填料；磨损后再拧紧即可补偿。',
    explode: [0, 2.1, 0], stage: [0.12, 0.28],
  },
  {
    id: 'handle', index: 8, name: '扳手', en: 'Handle', role: '手动操作', material: 'ZG25',
    description: '方孔套在阀杆方头上。扳手与管路平行为开，垂直为关，一眼可辨开关状态。',
    explode: [0, 2.7, 0], stage: [0.0, 0.16],
  },
  {
    id: 'studs', index: 9, name: '螺柱 · 螺母', en: 'Studs & Nuts', role: '连接阀体与阀盖', material: '35 钢',
    description: '四组双头螺柱与螺母把阀盖紧固在阀体上，拆卸时最先卸下。',
    explode: [0, 0, 0], stage: [1, 1],
  },
];

export const BOLT_SETS: Record<string, BoltSetDef> = {
  'bonnet-nuts': { owner: 'studs', distance: 3.2, stage: [0.0, 0.14] },
};

export const NEIGHBOURS: Record<string, string[]> = {
  body: ['handle', 'gland', 'packing', 'bonnet-nuts', 'bonnet', 'ball', 'seats', 'stem'],
  bonnet: ['bonnet-nuts', 'bonnet'],
  ball: ['bonnet-nuts', 'bonnet', 'ball'],
  seats: ['bonnet-nuts', 'bonnet', 'ball', 'seats'],
  stem: ['handle', 'gland', 'packing', 'stem'],
  packing: ['gland', 'packing'],
  gland: ['handle', 'gland'],
  handle: ['handle'],
  studs: ['bonnet-nuts'],
};

/** Bolt circle of the body–bonnet flange joint (y, z offsets). */
export const FLANGE_BOLTS: Array<[number, number]> = [[0.69, 0.69], [-0.69, 0.69], [0.69, -0.69], [-0.69, -0.69]];

export const GUIDES: GuideDef[] = [
  ...FLANGE_BOLTS.map(([y, z]): GuideDef => ({ stage: 'bonnet-nuts', origin: [0.92, AX + y, z], axis: [1, 0, 0] })),
  { stage: 'bonnet', origin: [1.5, AX, 0] },
  { stage: 'ball', origin: [VALVE.ballX, AX, VALVE.ballR] },
  { stage: 'seats', origin: [0.62, AX - 0.6, 0] },
  { stage: 'stem', origin: [0, AX + 1.95, 0] },
  { stage: 'packing', origin: [0.28, AX + 1.42, 0] },
  { stage: 'gland', origin: [-0.4, AX + 1.55, 0] },
  { stage: 'handle', origin: [-1.9, AX + 1.86, 0] },
];

export const CENTRE_LINES: Array<[Vec3, Vec3, number?]> = [
  [[-2.0, AX, 0], [2.0, AX, 0], 1.15],
  [[0, AX - 1.4, 0], [0, AX + 2.6, 0], 0.5],
];

export const STEPS: StepDef[] = [
  {
    title: '装配体', en: 'Assembly',
    body: '球阀由 9 种零件组成：横向是流道（阀体、阀芯、阀盖），竖向是操纵部分（阀杆、填料、压紧套、扳手）。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '全剖', en: 'Full Section',
    body: '沿前后对称面剖开：可见流道、阀芯通孔、两侧密封圈和阀颈里的填料。阀杆为实心杆件，纵向剖切按不剖绘制。',
    state: { explode: 0, section: true, running: true, select: 'ball', focus: null },
  },
  {
    title: '开关原理', en: 'Quarter Turn',
    body: '扳手转 90°，阀杆带动阀芯同步转动：通孔对正流道为开，球面横挡流道为关。',
    state: { explode: 0, section: true, running: true, select: 'stem', focus: 'core' },
  },
  {
    title: '拆卸顺序', en: 'Disassembly',
    body: '先卸螺母与扳手，旋出压紧套、取出填料；再拆下阀盖，取出阀芯与密封圈，最后抽出阀杆。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const CAMERA: CameraDef = {
  target: [-0.2, 1.5, 0.2],
  offset: [6.2, 4.8, 10.6],
  orthoDistance: 46,
  exploded: { target: [0.6, 2.4, 0.6], scale: 1.6 },
  foci: {
    core: { target: [-0.2, 1.6, 0], scale: 0.62 },
  },
};
