import type { BoltSetDef, CameraDef, GuideDef, PartDef, StepDef, Vec3 } from '../types';

/**
 * Machine vise (机用虎钳), the classic 工程制图 assembly. The lead screw runs
 * along x below the jaws; the square nut rides on it in the slot between the
 * body's two rails and carries the movable jaw. The section plane z = 0
 * contains the screw axis.
 */
export const VISE = {
  /** Height of the screw axis. */
  axisY: 0.45,
  pitch: 0.16,
  threadMinor: 0.12,
  threadMajor: 0.16,
  /** Thread runs between the end wall and the fixed jaw. */
  threadFrom: -1.9,
  threadTo: 1.6,
  /** Movable jaw centre: mid position and half travel. */
  jawMid: -0.25,
  jawTravel: 0.7,
};

const Y = VISE.axisY;

export const PARTS: PartDef[] = [
  {
    id: 'body', index: 1, name: '固定钳身', en: 'Body', role: '导轨 · 固定钳口', material: 'HT200 · 灰铸铁',
    description: '底座两侧有安装耳；中间两条导轨夹出槽，方块螺母在槽中移动；右端是固定钳口，左端壁支承螺杆。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'plates', index: 2, name: '钳口板', en: 'Jaw Plates', role: '夹紧工件 · 可更换', material: '45 钢 · 淬火',
    description: '两块淬硬的钳口板分别用螺钉装在固定钳口和活动钳身上，磨损后可以单独更换。',
    explode: [0, 1.5, 0], stage: [0.18, 0.32],
  },
  {
    id: 'jaw', index: 3, name: '活动钳身', en: 'Movable Jaw', role: '沿导轨移动', material: 'HT200 · 灰铸铁',
    description: '骑在导轨上，由螺钉与下方的方块螺母连成一体，螺母移动时带着它夹紧或松开工件。',
    explode: [0, 2.0, 0], stage: [0.26, 0.42],
  },
  {
    id: 'nut', index: 4, name: '方块螺母', en: 'Square Nut', role: '旋转 → 直线移动', material: 'Q235',
    description: '内方牙螺纹与螺杆旋合，方形外廓卡在导轨槽中不能转动，螺杆一转它就移动一个导程。',
    explode: [0, 1.4, 0], stage: [0.68, 0.84],
  },
  {
    id: 'screw', index: 5, name: '螺杆', en: 'Lead Screw', role: '传递转矩', material: '45 钢',
    description: '两端支承在钳身的孔中，左端方头装手柄；右端用环和销轴向定位，只能转动不能移动。',
    explode: [-3.4, 0, 0], stage: [0.48, 0.66],
  },
  {
    id: 'jaw-screw', index: 6, name: '螺钉', en: 'Jaw Screw', role: '连接活动钳身与螺母', material: '35 钢',
    description: '特制大头螺钉，顶面两个小孔供专用扳手拧动；旋入方块螺母，把活动钳身压在导轨上。',
    explode: [0, 3.2, 0], stage: [0, 0.14],
  },
  {
    id: 'ring', index: 7, name: '环 · 销', en: 'Ring & Pin', role: '螺杆轴向定位', material: 'Q235 / 35 钢',
    description: '环套在螺杆右端，用圆锥销与螺杆固定，和左端的台肩一起把螺杆限制在钳身上。',
    explode: [1.2, 0, 0], stage: [0.36, 0.48],
  },
  {
    id: 'washers', index: 8, name: '垫圈', en: 'Washers', role: '减小摩擦', material: 'Q235',
    description: '装在螺杆台肩、环与钳身端面之间，减小转动时的摩擦与磨损。',
    explode: [0, 0, 1.3], stage: [0.6, 0.72],
  },
];

export const BOLT_SETS: Record<string, BoltSetDef> = {
  'plate-screws': { owner: 'plates', distance: 0.6, stage: [0.1, 0.22] },
};

export const NEIGHBOURS: Record<string, string[]> = {
  body: ['plate-screws', 'plates'],
  plates: ['plate-screws', 'plates'],
  jaw: ['jaw-screw', 'jaw'],
  nut: ['jaw-screw', 'jaw', 'ring', 'screw', 'nut'],
  screw: ['ring', 'screw', 'washers'],
  'jaw-screw': ['jaw-screw'],
  ring: ['ring'],
  washers: ['ring', 'screw', 'washers'],
};

/** Jaw-plate screws (y, z) relative to the plate centre. */
export const PLATE_SCREWS: Array<[number, number]> = [[0, 0.5], [0, -0.5]];

export const GUIDES: GuideDef[] = [
  { stage: 'jaw-screw', origin: [VISE.jawMid, 1.62, 0] },
  ...PLATE_SCREWS.map(([y, z]): GuideDef => ({ stage: 'plate-screws', origin: [1.52, 1.175 + y, z], axis: [-1, 0, 0] })),
  { stage: 'plates', origin: [1.56, 1.4, 0.8] },
  { stage: 'jaw', origin: [VISE.jawMid, 1.5, 0.9] },
  { stage: 'ring', origin: [2.4, Y, 0] },
  { stage: 'screw', origin: [-2.75, Y, 0] },
  { stage: 'nut', origin: [VISE.jawMid, 0.73, 0.22] },
];

export const CENTRE_LINES: Array<[Vec3, Vec3, number?]> = [
  [[-3.0, Y, 0], [2.7, Y, 0], 0.3],
  [[0, 0, 1.6], [0, 0, -1.6]],
];

export const STEPS: StepDef[] = [
  {
    title: '装配体', en: 'Assembly',
    body: '机用虎钳由 8 种零件组成，装在机床工作台上夹持工件。转动螺杆，活动钳身沿导轨移动，夹紧或松开工件。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '全剖', en: 'Full Section',
    body: '沿螺杆轴线剖开：螺杆两端支承在钳身孔中，方块螺母在导轨槽内与螺杆旋合，螺钉把活动钳身与螺母连成一体。螺杆、螺钉为实心杆件，纵剖不剖。',
    state: { explode: 0, section: true, running: true, select: 'nut', focus: null },
  },
  {
    title: '螺旋传动', en: 'Screw Drive',
    body: '螺杆只转不移（左靠台肩、右靠环和销），方块螺母不能转只能移，于是螺杆的转动变成钳身的直线移动，每转一圈移动一个导程。',
    state: { explode: 0, section: false, running: true, select: 'screw', focus: 'drive' },
  },
  {
    title: '拆卸顺序', en: 'Disassembly',
    body: '先拧下螺钉取下活动钳身，卸下钳口板；拔出销、取下环，从左端旋出螺杆，最后取出方块螺母。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const CAMERA: CameraDef = {
  target: [0, 0.8, 0],
  offset: [5.6, 4.6, 9.4],
  orthoDistance: 40,
  exploded: { target: [0, 1.8, 0.2], scale: 1.4 },
  foci: {
    drive: { target: [0, 0.6, 0], scale: 0.68 },
  },
};
