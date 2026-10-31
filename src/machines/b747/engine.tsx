import type { MachineDef, PartDef, StepDef } from '../types';
import { level } from '../kit';
import { Turbofan, TURBOFAN_PARTS } from '../turbofan';
import { ENGINE_SCALE } from './airframe';
import { JumboDriver, PhaseControls } from './controls';

/**
 * A 747-400 engine (CF6-80C2 class, 2.36 m fan): the studio's turbofan drawn
 * at 1.52× its narrow-body size. Air flows along +x here as on the turbofan
 * level; the aircraft turns it to face forward.
 */

export function JumboEngine() {
  return <group scale={ENGINE_SCALE}><Turbofan /></group>;
}

const S = ENGINE_SCALE;
const PARTS: PartDef[] = TURBOFAN_PARTS.map((p) => (
  p.id === 'fan' ? { ...p, description: '24 片宽弦钛合金叶片，直径约 2.36 米——比一些小飞机的机身还粗。起飞时转速约 3500 转 / 分，叶尖超过音速。' }
    : p.id === 'reverser' ? { ...p, description: '着陆接地后打开：外涵道后段的套筒向后滑开，格栅把风扇气流折向前方，一台就能产生十多吨反推力。' } : p
));

const STEPS: StepDef[] = [
  {
    title: '发动机', en: 'Engine',
    body: '747-400 的四台发动机每台推力约 25 吨。剖开看：前面是大风扇，后面细细的核心机——约 5/6 的空气从外涵道直接吹出去，产生大部分推力。',
    state: { explode: 0, section: true, running: true, select: 'fan', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆附件齿轮箱、风扇罩和反推，取下风扇，揭开机匣，一级级拆下压气机和涡轮。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const jumboEngineLevel: MachineDef = level({
  id: 'b747/engine',
  parent: 'b747',
  unit: 2,
  bounds: [[-0.56 * S, -1.06 * S, -0.96 * S], [3.55 * S, 0.96 * S, 0.96 * S]],
  name: '涡扇发动机（CF6-80C2 级）',
  en: 'Turbofan, CF6-80C2 class',
  subtitle: '子组件 · 双转子大涵道比 · 推力约 25 吨',
  summary: '13 种零件：风扇、增压级、高压压气机、燃烧室、两级涡轮……',
  drawingNo: 'GW-747-40',
  scale: '1 : 30',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'fan', origin: [0.3 * S, 0, 0] }, { stage: 'nacelle', origin: [0.5 * S, 0.96 * S, 0] }],
  centreLines: [[[-0.9 * S, 0, 0], [3.9 * S, 0, 0], 1.0 * S]],
  steps: STEPS,
  camera: { target: [1.4 * S, 0, 0], offset: [-8.2 * S, 3.4 * S, 5.4 * S], orthoDistance: 32 * S, exploded: { target: [1.4 * S, 0.6 * S, 0], scale: 1.75 } },
  Model: JumboEngine,
  Driver: JumboDriver,
  Controls: PhaseControls,
});
