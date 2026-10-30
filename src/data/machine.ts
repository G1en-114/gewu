import type { EngineGeometry, FocusId, MachinePartDescriptor, MachinePartId } from '../types/machine';

/** Scene units are decimetres-ish; only proportions matter. */
export const ENGINE: EngineGeometry = {
  axisY: 1.3,
  crankX: 1.6,
  crankRadius: 0.45,
  rodLength: 2.4,
  pistonRodLength: 2.7,
  flywheelRadius: 1.92,
  flywheelZ: -1.35,
  governor: [-0.4, 0.35, -0.6],
};

export const MACHINE_PARTS: readonly MachinePartDescriptor[] = [
  {
    id: 'plinth', index: 1, name: '石砌基础', en: 'Masonry Plinth', role: '承载整机 · 飞轮坑', material: '石材 · STONE',
    description: '分级砌筑的石基承受整机重量与往复惯性力，并为大飞轮留出下沉的轮坑。',
    explode: [0, -0.7, 0], anchor: [-4.6, -0.6, 1.0],
  },
  {
    id: 'bed', index: 2, name: '铸铁机床', en: 'Cast-iron Bed', role: '机架 · 十字头导轨', material: '铸铁 · CAST IRON',
    description: '一体铸造的工字截面床身，把气缸、导轨与主轴承锁定在同一条中心线上。',
    explode: [0, -0.32, 0], anchor: [-2.0, 0.3, 0.7],
  },
  {
    id: 'cylinder', index: 3, name: '气缸', en: 'Steam Cylinder', role: '蒸汽做功的腔体', material: '铸铁 · CAST IRON',
    description: '蒸汽交替进入活塞两侧，压力差推动活塞往复；双作用使每一转做功两次。',
    explode: [0, 0, 0], anchor: [-3.5, 1.3, 0.64],
  },
  {
    id: 'cylinder-cover', index: 4, name: '后缸盖', en: 'Back Cover', role: '封闭缸体 · 可拆检修', material: '铸铁 · CAST IRON',
    description: '八颗螺栓压紧的端盖。拆下后即可抽出活塞，检查缸壁与活塞环。',
    explode: [-2.3, 0, 0], anchor: [-4.42, 1.75, 0.3],
  },
  {
    id: 'piston', index: 5, name: '活塞与活塞杆', en: 'Piston & Rod', role: '把压力变成推力', material: '钢 · STEEL',
    description: '带两道活塞环的活塞在缸内滑动，活塞杆穿过填料函把推力传给十字头。',
    explode: [-1.35, 0, 0], anchor: [0, 0.56, 0],
  },
  {
    id: 'valve-chest', index: 6, name: '滑阀箱', en: 'Valve Chest', role: '分配蒸汽进出', material: '铸铁 · CAST IRON',
    description: '滑阀随偏心轮往复，轮流打开两端汽口；顶部节流阀受调速器控制。',
    explode: [0, 1.05, 0], anchor: [-3.5, 2.95, 0.15],
  },
  {
    id: 'crosshead', index: 7, name: '十字头', en: 'Crosshead', role: '直线导向 · 承受侧推', material: '钢 · STEEL',
    description: '在上下导轨间滑动，吸收连杆斜置产生的侧向分力，让活塞杆只做直线运动。',
    explode: [0, 0, 1.15], anchor: [0, 0.2, 0.15],
  },
  {
    id: 'connecting-rod', index: 8, name: '连杆', en: 'Connecting Rod', role: '往复 → 旋转', material: '锻钢 · FORGED STEEL',
    description: '小头随十字头直线往复，大头绕曲柄销转圈，把直线推力化为曲轴扭矩。',
    explode: [0, 0.25, 2.0], anchor: [1.2, 0.1, 0.12],
  },
  {
    id: 'crankshaft', index: 9, name: '曲轴', en: 'Crankshaft', role: '输出旋转', material: '锻钢 · FORGED STEEL',
    description: '带平衡重的曲拐把连杆力转为扭矩，主轴贯穿两座轴承并驱动飞轮。',
    explode: [0, 0, 0.75], anchor: [-0.3, 0.3, -0.2],
  },
  {
    id: 'main-bearing', index: 10, name: '主轴承盖', en: 'Bearing Caps', role: '支承主轴', material: '黄铜衬 · BRASS-LINED',
    description: '分体式轴承盖用双头螺栓压紧黄铜轴瓦，可调整间隙补偿磨损。',
    explode: [0, 0.75, 0], anchor: [0, 0.2, 0.17],
  },
  {
    id: 'flywheel', index: 11, name: '飞轮', en: 'Flywheel', role: '储能 · 平顺转速', material: '铸铁 · CAST IRON',
    description: '沉重的轮缘储存动能，填补两次做功之间的空档，使转速保持平稳。',
    explode: [0, 1.0, -1.15], anchor: [1.4, 1.2, 0.17],
  },
  {
    id: 'governor', index: 12, name: '离心调速器', en: 'Flyball Governor', role: '转速反馈控制', material: '钢 · 黄铜 · STEEL',
    description: '转速升高时飞球外张、套筒上移，经杠杆关小节流阀；转速下降时反之。',
    explode: [0, 1.25, 0], anchor: [0, 3.95, 0],
  },
] as const;

export function partById(id: MachinePartId): MachinePartDescriptor {
  return MACHINE_PARTS.find((part) => part.id === id)!;
}

export interface StudyStep {
  title: string;
  en: string;
  body: string;
  state: { explode: number; section: boolean; running: boolean; rpm: number; select: MachinePartId | null; focus: FocusId | null };
}

export const STUDY_STEPS: StudyStep[] = [
  {
    title: '整机', en: 'Assembly',
    body: '一台卧式单缸蒸汽机：气缸、十字头、连杆与曲轴排在同一条中心线上，飞轮在轮坑中旋转。',
    state: { explode: 0, section: false, running: true, rpm: 24, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '沿中心面剖开气缸与阀箱：蒸汽轮流推动活塞两侧，往复行程等于两倍曲柄半径。',
    state: { explode: 0, section: true, running: true, rpm: 18, select: 'piston', focus: 'cylinder' },
  },
  {
    title: '传动', en: 'Linkage',
    body: '十字头把活塞杆约束为直线，连杆再把往复运动转成曲轴的旋转，这是整机的核心。',
    state: { explode: 0, section: false, running: true, rpm: 20, select: 'connecting-rod', focus: 'linkage' },
  },
  {
    title: '调速', en: 'Governing',
    body: '提高转速，离心力使飞球外张、套筒上升，经杠杆关小节流阀，转速随之回落。',
    state: { explode: 0, section: false, running: true, rpm: 48, select: 'governor', focus: 'governor' },
  },
  {
    title: '拆解', en: 'Exploded',
    body: '沿装配方向拉开各零件：缸盖与活塞沿轴线抽出，阀箱、调速器与轴承盖向上提起。',
    state: { explode: 1, section: false, running: false, rpm: 24, select: null, focus: null },
  },
];
