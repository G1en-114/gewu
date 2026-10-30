import type { BoltSetDef, CameraDef, GuideDef, PartDef, StepDef, Vec3 } from '../types';
import { useEngine } from './motion';

/** Scene units are decimetres-ish; only proportions matter. */
export const ENGINE = {
  /** Height of the cylinder / crank axis above the plinth. */
  axisY: 1.3,
  /** Crank centre along the engine axis. */
  crankX: 1.6,
  crankRadius: 0.45,
  rodLength: 2.4,
  /** Distance from crosshead pin to piston centre. */
  pistonRodLength: 2.7,
  flywheelRadius: 1.92,
  flywheelZ: -1.35,
  governor: [-0.4, 0.35, -0.6] as Vec3,
};

const AX = ENGINE.axisY;
const CX = ENGINE.crankX;

export const PARTS: PartDef[] = [
  {
    id: 'plinth', index: 1, name: '石砌基础', en: 'Masonry Plinth', role: '承载整机 · 飞轮坑', material: '石材 · STONE',
    description: '分级砌筑的石基承受整机重量与往复惯性力，并为大飞轮留出下沉的轮坑。',
    explode: [0, -0.7, 0], stage: [0.86, 1.0],
  },
  {
    id: 'bed', index: 2, name: '铸铁机床', en: 'Cast-iron Bed', role: '机架 · 十字头导轨', material: '铸铁 · CAST IRON',
    description: '一体铸造的工字截面床身，把气缸、导轨与主轴承锁定在同一条中心线上。',
    explode: [0, -0.32, 0], stage: [0.84, 0.97],
  },
  {
    id: 'cylinder', index: 3, name: '气缸', en: 'Steam Cylinder', role: '蒸汽做功的腔体', material: '铸铁 · CAST IRON',
    description: '蒸汽交替进入活塞两侧，压力差推动活塞往复；双作用使每一转做功两次。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'cylinder-cover', index: 4, name: '后缸盖', en: 'Back Cover', role: '封闭缸体 · 可拆检修', material: '铸铁 · CAST IRON',
    description: '八颗螺栓压紧的端盖。拆下后即可抽出活塞，检查缸壁与活塞环。',
    explode: [-2.3, 0, 0], stage: [0.08, 0.24],
  },
  {
    id: 'piston', index: 5, name: '活塞与活塞杆', en: 'Piston & Rod', role: '把压力变成推力', material: '钢 · STEEL',
    description: '带两道活塞环的活塞在缸内滑动，活塞杆穿过填料函把推力传给十字头。',
    explode: [-1.35, 0, 0], stage: [0.18, 0.34],
  },
  {
    id: 'valve-chest', index: 6, name: '滑阀箱', en: 'Valve Chest', role: '分配蒸汽进出', material: '铸铁 · CAST IRON',
    description: '滑阀随偏心轮往复，轮流打开两端汽口；顶部节流阀受调速器控制。',
    explode: [0, 1.05, 0], stage: [0.3, 0.44],
  },
  {
    id: 'crosshead', index: 7, name: '十字头', en: 'Crosshead', role: '直线导向 · 承受侧推', material: '钢 · STEEL',
    description: '在上下导轨间滑动，吸收连杆斜置产生的侧向分力，让活塞杆只做直线运动。',
    explode: [0, 0, 1.15], stage: [0.7, 0.82],
  },
  {
    id: 'connecting-rod', index: 8, name: '连杆', en: 'Connecting Rod', role: '往复 → 旋转', material: '锻钢 · FORGED STEEL',
    description: '小头随十字头直线往复，大头绕曲柄销转圈，把直线推力化为曲轴扭矩。',
    explode: [0, 0.25, 2.0], stage: [0.64, 0.76],
  },
  {
    id: 'crankshaft', index: 9, name: '曲轴', en: 'Crankshaft', role: '输出旋转', material: '锻钢 · FORGED STEEL',
    description: '带平衡重的曲拐把连杆力转为扭矩，主轴贯穿两座轴承并驱动飞轮。',
    explode: [0, 0, 0.75], stage: [0.74, 0.86],
  },
  {
    id: 'main-bearing', index: 10, name: '主轴承盖', en: 'Bearing Caps', role: '支承主轴', material: '黄铜衬 · BRASS-LINED',
    description: '分体式轴承盖用双头螺栓压紧黄铜轴瓦，可调整间隙补偿磨损。',
    explode: [0, 0.75, 0], stage: [0.5, 0.62],
  },
  {
    id: 'flywheel', index: 11, name: '飞轮', en: 'Flywheel', role: '储能 · 平顺转速', material: '铸铁 · CAST IRON',
    description: '沉重的轮缘储存动能，填补两次做功之间的空档，使转速保持平稳。',
    explode: [0, 1.0, -1.15], stage: [0.58, 0.72],
  },
  {
    id: 'governor', index: 12, name: '离心调速器', en: 'Flyball Governor', role: '转速反馈控制', material: '钢 · 黄铜 · STEEL',
    description: '转速升高时飞球外张、套筒上移，经杠杆与拉杆关小节流阀；转速下降时反之。',
    explode: [0, 1.25, 0], stage: [0.38, 0.52],
  },
  {
    id: 'valve-gear', index: 13, name: '配汽机构', en: 'Valve Gear', role: '定时开关汽口', material: '钢 · STEEL',
    description: '曲轴上的偏心轮超前曲柄约 90°，经偏心杆、摇杆和阀杆推动滑阀，让蒸汽轮流进入活塞两侧。',
    explode: [0, 0.45, -0.75], stage: [0.78, 0.9],
  },
];

export const BOLT_SETS: Record<string, BoltSetDef> = {
  'cover-bolts': { owner: 'cylinder-cover', distance: 0.55, stage: [0.0, 0.12] },
  'chest-bolts': { owner: 'valve-chest', distance: 0.5, stage: [0.24, 0.34] },
  'cap-bolts': { owner: 'main-bearing', distance: 0.45, stage: [0.44, 0.54] },
};

export const NEIGHBOURS: Record<string, string[]> = {
  plinth: ['plinth'],
  bed: ['bed'],
  cylinder: ['cover-bolts', 'cylinder-cover', 'piston', 'chest-bolts', 'valve-chest'],
  'cylinder-cover': ['cover-bolts', 'cylinder-cover', 'piston'],
  piston: ['cover-bolts', 'cylinder-cover', 'piston'],
  'valve-chest': ['chest-bolts', 'valve-chest'],
  crosshead: ['crosshead', 'connecting-rod'],
  'connecting-rod': ['connecting-rod', 'crosshead'],
  crankshaft: ['cap-bolts', 'main-bearing', 'connecting-rod', 'crankshaft', 'flywheel'],
  'main-bearing': ['cap-bolts', 'main-bearing'],
  flywheel: ['cap-bolts', 'main-bearing', 'flywheel'],
  governor: ['governor'],
  'valve-gear': ['valve-gear'],
};

function guides(): GuideDef[] {
  const out: GuideDef[] = [];
  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    out.push({ stage: 'cover-bolts', origin: [-4.47, AX + Math.sin(a) * 0.75, Math.cos(a) * 0.75], axis: [-1, 0, 0] });
  }
  [-3.92, -3.5, -3.08].forEach((x) => [-0.3, 0.3].forEach((z) => out.push({ stage: 'chest-bolts', origin: [x, AX + 1.27, z], axis: [0, 1, 0] })));
  [-0.48, -2.0].forEach((z) => [-0.25, 0.25].forEach((dx) => out.push({ stage: 'cap-bolts', origin: [CX + dx, AX + 0.25, z], axis: [0, 1, 0] })));
  const part = (stage: string, origin: Vec3) => out.push({ stage, origin });
  part('cylinder-cover', [-4.64, AX, 0]);
  part('piston', [-3.7, AX, 0]);
  part('valve-chest', [-3.5, AX + 2.02, 0]);
  part('crosshead', [-0.8, AX, 0.21]);
  part('connecting-rod', [0.4, AX + 0.2, 0.1]);
  part('crankshaft', [CX, AX, 0.14]);
  [-0.48, -2.0].forEach((z) => part('main-bearing', [CX, AX + 0.18, z]));
  part('flywheel', [CX, AX, ENGINE.flywheelZ]);
  part('governor', [ENGINE.governor[0], 4.25, ENGINE.governor[2]]);
  part('valve-gear', [-1.9, 1.75, -0.42]);
  part('valve-gear', [CX, AX, -0.8]);
  return out;
}

export const GUIDES = guides();

export const CENTRE_LINES: Array<[Vec3, Vec3]> = [
  [[-6.9, AX, 0], [2.6, AX, 0]],
  [[CX, AX, 0.8], [CX, AX, -3.1]],
  [[ENGINE.governor[0], 0.2, ENGINE.governor[2]], [ENGINE.governor[0], 5.6, ENGINE.governor[2]]],
];

const setLoad = (load: number) => () => useEngine.getState().set({ load, governor: true });

export const STEPS: StepDef[] = [
  {
    title: '整机', en: 'Assembly',
    body: '一台卧式单缸蒸汽机：气缸、十字头、连杆与曲轴排在同一条中心线上，飞轮在轮坑中旋转。',
    state: { explode: 0, section: false, running: true, select: null, focus: null }, apply: setLoad(0.5),
  },
  {
    title: '剖视', en: 'Section',
    body: '沿中心面剖开气缸与阀箱：滑阀由偏心轮驱动来回移动，轮流打开两端汽口，蒸汽交替推动活塞两侧。',
    state: { explode: 0, section: true, running: true, select: 'piston', focus: 'cylinder' }, apply: setLoad(0.85),
  },
  {
    title: '传动', en: 'Linkage',
    body: '十字头把活塞杆约束为直线，连杆再把往复运动转成曲轴的旋转，这是整机的核心。',
    state: { explode: 0, section: false, running: true, select: 'connecting-rod', focus: 'linkage' }, apply: setLoad(0.5),
  },
  {
    title: '调速', en: 'Governing',
    body: '转速升高，飞球外张、套筒上升，经杠杆关小节流阀，转速随之回落。试着减小负载，再关掉调速器对比。',
    state: { explode: 0, section: false, running: true, select: 'governor', focus: 'governor' }, apply: setLoad(0.5),
  },
  {
    title: '拆解', en: 'Exploded',
    body: '按装配逆序拆开：先卸缸盖螺栓、抽出活塞，再提起阀箱、调速器与轴承盖，最后是飞轮、连杆与曲轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const CAMERA: CameraDef = {
  target: [-1.0, 1.35, -0.75],
  offset: [9.6, 7.4, 19.6],
  orthoDistance: 60,
  exploded: { target: [-1.0, 1.75, -0.75], scale: 1.08 },
  foci: {
    cylinder: { target: [-2.9, 1.6, 0], scale: 0.62 },
    linkage: { target: [0.2, 1.4, -0.2], scale: 0.64 },
    governor: { target: [ENGINE.governor[0], 2.9, ENGINE.governor[2]], scale: 0.58 },
  },
};
