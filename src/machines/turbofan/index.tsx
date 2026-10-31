import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, cone, Cyl, level, Turn } from '../kit';

/**
 * A high-bypass two-spool turbofan of the 1.55 m fan class that powers
 * narrow-body airliners. Axis along +x (air flows from the inlet at x < 0
 * to the nozzles at x ≈ 3.4), metres. Generic proportions, not one model.
 */

export const fanMotion = { n1: 0, n2: 0 };

export function TurbofanDriver() {
  useFrame((_, dt) => {
    if (!useStudio.getState().running) return;
    const d = Math.min(dt, 0.05);
    fanMotion.n1 += d * 1.6;
    fanMotion.n2 += d * 4.6;
  }, -1);
  return null;
}

function Spool({ k, children }: { k: 'n1' | 'n2'; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = fanMotion[k]; });
  return <group ref={ref}>{children}</group>;
}

/** A ring of blades about x: n blades at axial station x, from hub radius to tip, twisted. */
function Blades({ n, x, hub, tip, chord, twist, t = 0.012, offset = 0 }: { n: number; x: number; hub: number; tip: number; chord: number; twist: number; t?: number; offset?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} rotation={[(i / n) * Math.PI * 2 + offset, 0, 0]}>
          <Box c={[x, (hub + tip) / 2, 0]} s={[chord, tip - hub, t]} r={[0, twist, 0]} />
        </group>
      ))}
    </>
  );
}

/** Compressor or turbine stages: [x, hub, tip] for each rotor. */
const BOOSTER: Array<[number, number, number]> = [[0.66, 0.3, 0.43], [0.8, 0.3, 0.42], [0.94, 0.3, 0.41]];
const HPC: Array<[number, number, number]> = Array.from({ length: 9 }, (_, i) => [1.12 + i * 0.075, 0.24 + i * 0.006, 0.38 - i * 0.012]);
const HPT: Array<[number, number, number]> = [[2.24, 0.27, 0.35]];
const LPT: Array<[number, number, number]> = [[2.42, 0.28, 0.37], [2.54, 0.28, 0.39], [2.66, 0.28, 0.41], [2.78, 0.28, 0.43]];

function Stages({ k, stages, n, chord, twist }: { k: string; stages: Array<[number, number, number]>; n: number; chord: number; twist: number }) {
  return (
    <>
      {stages.map(([x, hub, tip], i) => (
        <group key={i}>
          <Turn k={`${k}-disk-${i}`} profile={[[0.08, x - 0.02], [hub, x - 0.025], [hub, x + 0.025], [0.08, x + 0.02]]} axis="x" seg={40} />
          <Blades n={n} x={x} hub={hub} tip={tip} chord={chord} twist={twist * (i % 2 ? 1 : 1)} offset={i * 0.1} />
        </group>
      ))}
    </>
  );
}

/** Core casing (and core cowl outside it) following the gas path. */
const CORE_IN: Array<[number, number]> = [[0.44, 0.55], [0.44, 1.02], [0.39, 1.1], [0.29, 1.8], [0.42, 1.95], [0.42, 2.16], [0.36, 2.22], [0.37, 2.3], [0.45, 2.85]];
const CORE: Array<[number, number]> = [
  ...CORE_IN,
  ...[[0.5, 2.85], [0.56, 2.4], [0.56, 1.9], [0.52, 1.2], [0.5, 0.62]].map(([r, x]): [number, number] => [r, x]),
];

export function Turbofan() {
  return (
    <group>
      <Part id="nacelle">
        <Turn k="inlet" profile={[[0.8, 1.3], [0.8, -0.35], [0.82, -0.5], [0.86, -0.56], [0.9, -0.55], [0.93, -0.48], [0.95, -0.3], [0.96, 1.3]]} axis="x" seg={72} />
        <Callout id="nacelle" p={[-0.2, 0.95, 0.2]} />
      </Part>

      <Part id="fan">
        <Spool k="n1">
          <Turn k="spinner" profile={[[0, -0.14], [0.08, -0.1], [0.2, 0.05], [0.28, 0.22], [0.29, 0.34], [0, 0.34]]} axis="x" seg={48} />
          <Blades n={24} x={0.3} hub={0.28} tip={0.775} chord={0.24} twist={-0.85} t={0.02} />
        </Spool>
        <Callout id="fan" p={[0.3, 0.6, 0.3]} />
      </Part>

      <Part id="fan-case">
        <Turn k="splitter" profile={[[0.45, 0.6], [0.47, 0.55], [0.5, 0.58], [0.5, 0.95], [0.45, 0.95]]} axis="x" seg={56} />
        <Blades n={40} x={0.82} hub={0.5} tip={0.8} chord={0.1} twist={0.3} t={0.01} />
        <Callout id="fan-case" p={[0.85, 0.7, 0.3]} />
      </Part>

      <Part id="booster">
        <Spool k="n1"><Stages k="booster" stages={BOOSTER} n={36} chord={0.06} twist={-0.6} /></Spool>
        <Callout id="booster" p={[0.8, 0.36, 0.1]} />
      </Part>

      <Part id="hpc">
        <Spool k="n2">
          <Stages k="hpc" stages={HPC} n={28} chord={0.04} twist={0.6} />
          <Turn k="hp-shaft" profile={tube(0.12, 1.05, 2.3)} axis="x" seg={32} />
        </Spool>
        <Callout id="hpc" p={[1.45, 0.34, 0.1]} />
      </Part>

      <Part id="combustor">
        <Turn k="liner" profile={[[0.3, 1.9], [0.34, 1.86], [0.39, 1.9], [0.4, 2.12], [0.37, 2.18], [0.31, 2.18], [0.29, 2.12]]} axis="x" seg={48} />
        {Array.from({ length: 20 }, (_, i) => (
          <group key={i} rotation={[(i / 20) * Math.PI * 2, 0, 0]}>
            <Cyl c={[1.86, 0.345, 0]} r={0.012} len={0.08} axis="x" seg={8} />
          </group>
        ))}
        <Callout id="combustor" p={[2.0, 0.42, 0.2]} />
      </Part>

      <Part id="hpt">
        <Spool k="n2"><Stages k="hpt" stages={HPT} n={40} chord={0.05} twist={-0.7} /></Spool>
        <Callout id="hpt" p={[2.24, 0.38, 0.1]} />
      </Part>

      <Part id="lpt">
        <Spool k="n1"><Stages k="lpt" stages={LPT} n={48} chord={0.05} twist={0.7} /></Spool>
        <Callout id="lpt" p={[2.6, 0.44, 0.1]} />
      </Part>

      <Part id="lp-shaft">
        <Spool k="n1"><Cyl c={[1.55, 0, 0]} r={0.06} len={2.6} axis="x" seg={20} /></Spool>
        <Callout id="lp-shaft" p={[1.4, 0.05, 0.08]} />
      </Part>

      <Part id="casing">
        <Turn k="core-casing" profile={CORE} axis="x" seg={72} />
        <Callout id="casing" p={[1.5, 0.52, 0.2]} />
      </Part>

      <Part id="exhaust">
        <Turn k="core-nozzle" profile={cone(0.46, 0.38, 2.85, 3.25, 0.02)} axis="x" seg={56} />
        <Turn k="plug" profile={[[0, 3.55], [0.08, 3.45], [0.2, 3.2], [0.26, 2.95], [0.27, 2.82], [0.18, 2.82], [0, 2.82]]} axis="x" seg={48} />
        <Callout id="exhaust" p={[3.2, 0.3, 0.1]} />
      </Part>

      <Part id="reverser">
        <Turn k="reverser" profile={[[0.79, 1.3], [0.95, 1.3], [0.88, 2.1], [0.74, 2.45], [0.71, 2.45], [0.72, 2.1]]} axis="x" seg={72} />
        <Callout id="reverser" p={[2.0, 0.9, 0.2]} />
      </Part>

      <Part id="gearbox">
        <Box c={[0.95, -0.98, 0]} s={[0.7, 0.16, 0.42]} />
        <Cyl c={[0.6, -1.0, 0.12]} r={0.07} len={0.18} axis="x" seg={16} />
        <Cyl c={[1.32, -1.0, -0.1]} r={0.09} len={0.14} axis="x" seg={16} />
        <Box c={[0.75, -0.62, 0]} s={[0.08, 0.6, 0.08]} />
        <Callout id="gearbox" p={[0.95, -1.08, 0.2]} />
      </Part>
    </group>
  );
}

function tube(r: number, x0: number, x1: number): Array<[number, number]> {
  return [[r - 0.03, x0], [r, x0], [r, x1], [r - 0.03, x1]];
}

const PARTS: PartDef[] = [
  { id: 'nacelle', index: 1, name: '进气道与风扇罩', en: 'Inlet & Fan Cowl', role: '整流 · 包容', material: '铝合金 / 复合材料', description: '圆润的唇口把空气平顺地引向风扇。内壁贴着吸声衬垫降低噪声；风扇罩可以向两侧掀开维护。', explode: [0, 2.7, 0], stage: [0.05, 0.15] },
  { id: 'fan', index: 2, name: '风扇', en: 'Fan', role: '产生大部分推力', material: '钛合金 / 复合材料', description: '24 片宽弦叶片，直径约 1.55 米。吸进的空气约 5/6 不进核心机，直接从外涵道吹出去——大涵道比发动机约八成推力来自风扇。', explode: [-1.4, 0, 0], stage: [0.22, 0.32] },
  { id: 'fan-case', index: 3, name: '分流环与出口导叶', en: 'Splitter & Outlet Guide Vanes', role: '分流 · 消除旋流', material: '复合材料', description: '分流环把气流分成内外两路；外涵道里的一圈导叶把风扇甩出的旋转气流拉直，变成直推。', explode: [-1.0, 0, 0], stage: [0.28, 0.38] },
  { id: 'booster', index: 4, name: '低压压气机', en: 'Booster', role: '初步增压', material: '钛合金', description: '三级，和风扇同轴同速，给核心机进口的空气先加一点压。', explode: [-0.9, 0, 0], stage: [0.4, 0.5] },
  { id: 'hpc', index: 5, name: '高压压气机', en: 'High-Pressure Compressor', role: '把空气压缩约 30 倍', material: '钛 / 镍基合金', description: '九级，越往后叶片越短、流道越窄，空气被压到原来的约 1/30 体积、升温到 500℃ 以上。和高压涡轮装在同一根空心轴上，转速比风扇快得多。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'combustor', index: 6, name: '燃烧室', en: 'Combustor', role: '喷油燃烧', material: '镍基高温合金', description: '环形燃烧室，一圈 20 个喷嘴喷入航空煤油持续燃烧，燃气温度超过 1400℃——比涡轮叶片材料的熔点还高，全靠冷却气膜保护。', explode: [0, 0.9, 0], stage: [0.62, 0.72] },
  { id: 'hpt', index: 7, name: '高压涡轮', en: 'High-Pressure Turbine', role: '带动高压压气机', material: '单晶镍基合金', description: '一级，直接承受最热的燃气。叶片是单晶铸造，内部有细小的冷却通道，表面打满气膜孔。', explode: [0.75, 0, 0], stage: [0.56, 0.64] },
  { id: 'lpt', index: 8, name: '低压涡轮', en: 'Low-Pressure Turbine', role: '带动风扇', material: '镍基合金', description: '四级，从燃气里再取出能量，经细长的低压轴向前带动风扇和增压级。', explode: [1.2, 0, 0], stage: [0.48, 0.58] },
  { id: 'lp-shaft', index: 9, name: '低压轴', en: 'Low-Pressure Shaft', role: '连接风扇与低压涡轮', material: '高强度钢', description: '从高压轴中间穿过去：两根轴套在一起、各转各的，这就是“双转子”。', explode: [0, -0.9, 0], stage: [0.7, 0.8] },
  { id: 'casing', index: 10, name: '核心机匣', en: 'Core Casing & Cowl', role: '包住核心机', material: '钛 / 镍基合金', description: '压气机、燃烧室、涡轮外面的机匣，同时是外涵道的内壁。', explode: [0, 1.2, 0], stage: [0.34, 0.44] },
  { id: 'exhaust', index: 11, name: '尾喷管与尾锥', en: 'Core Nozzle & Plug', role: '加速排气', material: '钛 / 镍基合金', description: '核心机的燃气从这里高速喷出，中间的尾锥整理流道。', explode: [1.6, 0, 0], stage: [0.16, 0.26] },
  { id: 'reverser', index: 12, name: '反推装置', en: 'Thrust Reverser', role: '着陆减速', material: '复合材料', description: '外涵道后段的套筒：着陆时向后滑开，内侧格栅把外涵气流折向前方，帮助飞机减速。', explode: [2.4, 0, 0], stage: [0.1, 0.2] },
  { id: 'gearbox', index: 13, name: '附件齿轮箱', en: 'Accessory Gearbox', role: '带动附件', material: '铝合金', description: '挂在风扇机匣下方，由高压轴经一根竖轴带动，驱动燃油泵、滑油泵、发电机和液压泵；起动机也装在这里。', explode: [0, -1.4, 0], stage: [0, 0.08] },
];

const STEPS: StepDef[] = [
  {
    title: '涡扇发动机', en: 'Turbofan',
    body: '吸入 → 压缩 → 燃烧 → 膨胀 → 排出。双转子：外面慢转的是风扇和低压涡轮，里面快转的是高压压气机和高压涡轮。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '沿轴线剖开就是教科书上的那张图：风扇 — 增压级 — 高压压气机（流道越来越窄）— 燃烧室 — 高压涡轮 — 低压涡轮（流道越来越宽）— 尾喷管。外涵道包在核心机外面。',
    state: { explode: 0, section: true, running: true, select: 'hpc', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '依次拆附件齿轮箱、风扇罩、反推、尾喷管，取下风扇和导叶，揭开核心机匣，再拆增压级、低压涡轮、高压涡轮、燃烧室，抽出低压轴，剩下高压转子。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const turbofan: MachineDef = level({
  id: 'turbofan',
  unit: 3,
  bounds: [[-0.56, -1.06, -0.96], [3.55, 0.96, 0.96]],
  name: '涡扇发动机',
  en: 'High-Bypass Turbofan',
  subtitle: '装配体 · 双转子大涵道比',
  summary: '13 种零件 · 风扇、压气机、燃烧室、涡轮，会转，剖开看流道',
  drawingNo: 'GW-WS-00',
  scale: '1 : 20',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [
    { stage: 'fan', origin: [0.3, 0, 0] },
    { stage: 'nacelle', origin: [0.5, 0.96, 0] },
    { stage: 'exhaust', origin: [3.55, 0, 0] },
  ],
  centreLines: [[[-0.9, 0, 0], [3.9, 0, 0], 1.0]],
  steps: STEPS,
  camera: { target: [1.4, 0, 0], offset: [-8.2, 3.4, 5.4], orthoDistance: 32, exploded: { target: [1.4, 0.6, 0], scale: 1.75 } },
  Model: Turbofan,
  Driver: TurbofanDriver,
});
