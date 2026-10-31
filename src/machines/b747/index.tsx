import type { ReactNode } from 'react';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { level } from '../kit';
import { ENGINES, GEAR, MAIN_FLOOR, NOSE_X, TAIL_X, useJumbo, WING } from './airframe';
import { Cabin, cabinLevel } from './cabin';
import { JumboDriver, PhaseControls } from './controls';
import { JumboEngine, jumboEngineLevel } from './engine';
import { openings, skin } from './fuselage';
import { MainGear, mainGearLevel, NoseGear, noseGearLevel } from './gear';
import { boxes, loft, type P3, type Ring, sectionRing } from './geo';
import { NOSE_FROM, NOSE_LEVELS, NoseSection } from './nose';
import { Tail, TAIL_LEVELS } from './tail';
import { noseWheelLevel, wheelLevel } from './wheel';
import { Wing, WING_LEVELS } from './wing';

/**
 * Boeing 747-400, the whole aircraft: 70.6 m long, 64.4 m span, 19.4 m
 * tall, from its published dimensions. Nose toward +x, +z starboard; metres.
 * Fourteen levels in all: every major part opens, and most open again.
 */

const CENTRE_FROM = -8;

function Mirror({ children }: { children: ReactNode }) {
  return <group scale={[1, 1, -1]}>{children}</group>;
}

/** Wing-to-body fairing: the long blister under the centre fuselage. */
function fairingRings(): Ring[] {
  const out: Ring[] = [];
  for (let x = -13; x <= 14.01; x += 1.5) {
    const s = Math.sin((Math.PI * (x + 13)) / 27) ** 0.6;
    const wz = 0.4 + 3.25 * s;
    const hy = 0.25 + 1.15 * s;
    out.push(Array.from({ length: 24 }, (_, i): P3 => {
      const a = (i / 24) * Math.PI * 2;
      return [x, 3.35 + hy * Math.sin(a), wz * Math.cos(a)];
    }));
  }
  return out;
}

/** Centre wing box: the wing's root section carried straight through the fuselage. */
function centreBoxRings(): Ring[] {
  return [-3.0, 3.0].map((z) => sectionRing({ ...WING[0], le: [WING[0].le[0], WING[0].le[1], z] }, 0.15, 0.65, 10));
}

/** LD-3 containers, two abreast, in the forward and aft holds. */
const containers = () => {
  const out: Array<{ c: P3; s: P3 }> = [];
  const holds: Array<[number, number]> = [[22.6, 11.2], [-10.4, -16.8]];
  for (const [x0, x1] of holds) for (let x = x0; x > x1; x -= 1.6) for (const z of [-0.8, 0.8]) out.push({ c: [x, 3.25, z], s: [1.5, 1.6, 1.52] });
  return out;
};

export function Jumbo() {
  return (
    <group>
      <Part id="centre">
        <M clip geo={skin('centre', CENTRE_FROM, NOSE_FROM)} />
        <M clip geo={openings('centre', CENTRE_FROM, NOSE_FROM)} />
        <M clip geo={loft('jb-fairing', fairingRings)} />
        <M clip geo={loft('jb-centre-box', centreBoxRings)} />
        <Callout id="centre" p={[2, 2.2, 3]} />
      </Part>
      <Part id="nose">
        <NoseSection />
        <Callout id="nose" p={[26, 8.6, 1.8]} />
      </Part>
      <Part id="aft">
        <M clip geo={skin('aft', TAIL_X, CENTRE_FROM)} />
        <M clip geo={openings('aft', TAIL_X, CENTRE_FROM)} />
        <Callout id="aft" p={[-20, 5.2, 3.0]} />
      </Part>
      <Part id="wing-r">
        <Wing />
        <Callout id="wing-r" p={[-8, 6.5, 20]} />
      </Part>
      <Part id="wing-l">
        <Mirror><Wing /></Mirror>
        <Callout id="wing-l" p={[-8, 6.5, -20]} />
      </Part>
      <Part id="tail">
        <Tail />
        <Callout id="tail" p={[-27, 15, 0.4]} />
      </Part>
      {ENGINES.map((e) => (
        <Part key={e.id} id={e.id}>
          <group position={e.at} rotation={[0, Math.PI, 0]}><JumboEngine /></group>
          <Callout id={e.id} p={[e.at[0] + 1, e.at[1] + 1.4, e.at[2]]} />
        </Part>
      ))}
      <Part id="nose-gear">
        <group position={GEAR.nose.at}><NoseGear len={GEAR.nose.len} /></group>
        <Callout id="nose-gear" p={[GEAR.nose.at[0], 1.4, 0.3]} />
      </Part>
      <Part id="body-gear">
        <group position={GEAR.body[0].at}><MainGear kind="body" len={GEAR.body[0].at[1] - 0.62} /></group>
        <Mirror><group position={GEAR.body[0].at}><MainGear kind="body" len={GEAR.body[0].at[1] - 0.62} /></group></Mirror>
        <Callout id="body-gear" p={[GEAR.body[0].at[0], 1.6, 2.4]} />
      </Part>
      <Part id="wing-gear">
        <group position={GEAR.wing[0].at}><MainGear kind="wing" /></group>
        <Mirror><group position={GEAR.wing[0].at}><MainGear kind="wing" /></group></Mirror>
        <Callout id="wing-gear" p={[GEAR.wing[0].at[0], 1.8, 6.1]} />
      </Part>
      <Part id="cabin">
        <Cabin />
        <Callout id="cabin" p={[6, MAIN_FLOOR + 1.0, 2.6]} />
      </Part>
      <Part id="cargo">
        <M clip geo={boxes('jb-ulds', containers)} />
        <Callout id="cargo" p={[17, 3.6, 1.6]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'centre', index: 1, name: '中机身与翼身整流罩', en: 'Centre Fuselage', role: '连接机翼', material: '铝合金', description: '中央翼盒从这里穿过机身，把左右机翼连成一体；下面那个长长的“鼓包”是翼身整流罩，里面是空调组件和主起落架舱。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'nose', index: 2, name: '前机身', en: 'Forward Fuselage', role: '驾驶舱 · 上层舱', material: '—', description: '双层的机头：驼峰里是驾驶舱和上层舱。点“拆开此组件”进去看。', explode: [16, 0, 0], stage: [0.5, 0.64] },
  { id: 'aft', index: 3, name: '后机身与尾锥', en: 'Aft Fuselage', role: '承载尾翼', material: '铝合金', description: '向上收拢的尾段，尾部有后承压隔框；尾锥里装着 APU。', explode: [-14, 0, 0], stage: [0.56, 0.7] },
  { id: 'wing-r', index: 4, name: '右机翼', en: 'Right Wing', role: '升力', material: '—', description: '一侧机翼长约 30 米。点“拆开此组件”看翼盒、襟翼、扰流板……', explode: [0, 2, 14], stage: [0.32, 0.48] },
  { id: 'wing-l', index: 5, name: '左机翼', en: 'Left Wing', role: '升力', material: '—', description: '和右机翼互为镜像。', explode: [0, 2, -14], stage: [0.36, 0.52] },
  { id: 'tail', index: 6, name: '尾翼', en: 'Empennage', role: '稳定 · 操纵', material: '—', description: '垂尾、平尾、方向舵、升降舵和尾锥里的 APU。点“拆开此组件”进去看。', explode: [-10, 6, 0], stage: [0.22, 0.36] },
  { id: 'engine-1', index: 7, name: '1 号发动机', en: 'Engine 1 (left outboard)', role: '推力', material: '—', description: '发动机从左到右编号 1–4。每台推力约 25 吨。点“拆开此组件”看内部。', explode: [0, -5, -6], stage: [0, 0.12] },
  { id: 'engine-2', index: 8, name: '2 号发动机', en: 'Engine 2 (left inboard)', role: '推力', material: '—', description: '同 1 号发动机。', explode: [0, -5, -3], stage: [0.02, 0.14] },
  { id: 'engine-3', index: 9, name: '3 号发动机', en: 'Engine 3 (right inboard)', role: '推力', material: '—', description: '同 1 号发动机。', explode: [0, -5, 3], stage: [0.04, 0.16] },
  { id: 'engine-4', index: 10, name: '4 号发动机', en: 'Engine 4 (right outboard)', role: '推力', material: '—', description: '同 1 号发动机。', explode: [0, -5, 6], stage: [0.06, 0.18] },
  { id: 'nose-gear', index: 11, name: '前起落架', en: 'Nose Gear', role: '支撑 · 转向', material: '—', description: '双轮，液压转向。点“拆开此组件”进去看。', explode: [0, -4, 0], stage: [0.08, 0.2] },
  { id: 'body-gear', index: 12, name: '机身主起落架 ×2', en: 'Body Gear', role: '承重', material: '—', description: '747 有四组主起落架、16 个主轮，机身下这两组向前收起。', explode: [0, -4.5, 0], stage: [0.1, 0.22] },
  { id: 'wing-gear', index: 13, name: '机翼主起落架 ×2', en: 'Wing Gear', role: '承重', material: '—', description: '装在机翼根部，向内收进翼身整流罩。', explode: [0, -4.5, 0], stage: [0.12, 0.24] },
  { id: 'cabin', index: 14, name: '主舱客舱', en: 'Main Deck Cabin', role: '载客', material: '—', description: '三舱约 400 座。点“拆开此组件”进去看。', explode: [0, 12, 0], stage: [0.68, 0.84] },
  { id: 'cargo', index: 15, name: '货舱集装箱', en: 'Cargo Containers', role: '载货', material: '铝合金', description: '主舱地板下面的货舱装着一个个 LD-3 集装箱，前后货舱一共约 30 个。', explode: [0, -8, 0], stage: [0.8, 0.94] },
];

const STEPS: StepDef[] = [
  {
    title: '波音 747-400', en: 'Boeing 747-400',
    body: '“空中女王”：1969 年首飞的第一架宽体客机，四台发动机，最大起飞重量约 397 吨。用左栏切换停机、起飞、巡航、着陆，看襟翼、起落架和扰流板怎么动。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
    apply: () => useJumbo.getState().set('park'),
  },
  {
    title: '剖视', en: 'Section',
    body: '沿中线剖开：上层是驾驶舱和上层舱，中间是主舱客舱，下面是货舱集装箱，中间夹着中央翼盒。',
    state: { explode: 0, section: true, running: false, select: 'cabin', focus: null },
  },
  {
    title: '着陆', en: 'Landing',
    body: '前缘克鲁格襟翼翻下，后缘三缝襟翼放到 30°，起落架放下；接地后扰流板立起。',
    state: { explode: 0, section: false, running: true, select: 'wing-r', focus: null },
    apply: () => useJumbo.getState().set('landing'),
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先卸发动机和起落架，再拆尾翼和机翼，然后把机身分成前、中、后三段，吊出客舱和货舱集装箱。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '几乎每个零件都能再拆：机翼 → 翼盒 / 三缝襟翼；起落架 → 机轮与刹车；前机身 → 驾驶舱；尾翼 → APU；发动机、客舱……一共 14 级。选中后点“拆开此组件”。',
    state: { explode: 1, section: false, running: false, select: 'wing-r', focus: null },
  },
];

export const b747: MachineDef = level({
  id: 'b747',
  unit: 0.2,
  bounds: [[TAIL_X, 0, -32.2], [NOSE_X, 19.4, 32.2]],
  name: '波音 747',
  en: 'Boeing 747-400',
  subtitle: '整机 · 四发宽体客机 · 14 级可拆',
  summary: '15 个大件 · 机翼、发动机、起落架、驾驶舱……一路拆到刹车盘',
  drawingNo: 'GW-747-00',
  scale: '1 : 500',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: {
    nose: 'b747/nose', 'wing-r': 'b747/wing', 'wing-l': 'b747/wing', tail: 'b747/tail',
    'engine-1': 'b747/engine', 'engine-2': 'b747/engine', 'engine-3': 'b747/engine', 'engine-4': 'b747/engine',
    'nose-gear': 'b747/nose-gear', 'body-gear': 'b747/main-gear', 'wing-gear': 'b747/main-gear', cabin: 'b747/cabin',
  },
  guides: [{ stage: 'engine-3', origin: [2, 4.0, 11.9] }, { stage: 'nose', origin: [13, 6, 0] }],
  centreLines: [],
  steps: STEPS,
  camera: { target: [0, 6, 0], offset: [72, 62, 118], orthoDistance: 400, exploded: { target: [0, 5, 0], scale: 1.12 }, deep: { target: [0, 6, 0], scale: 1.6 } },
  Model: Jumbo,
  Driver: JumboDriver,
  Controls: PhaseControls,
});

export const B747_LEVELS: MachineDef[] = [
  ...NOSE_LEVELS, ...WING_LEVELS, ...TAIL_LEVELS, jumboEngineLevel, mainGearLevel, noseGearLevel, wheelLevel, noseWheelLevel, cabinLevel,
];
