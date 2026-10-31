import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Rod, Turn } from '../kit';
import { GEAR, jumboMotion, TYRE_R } from './airframe';
import { JumboDriver, PhaseControls } from './controls';
import { Wheel } from './wheel';

/**
 * Landing gear legs. Local frame: the trunnion (retraction pivot) at the
 * origin, the leg hanging down −y to the axle line, −z inboard, +x forward.
 * Wing gear fold inboard about x; body and nose gear fold forward about z.
 * Metres. The port-side legs are drawn mirrored by their parent.
 */

export type GearKind = 'wing' | 'body' | 'nose';

/** Retraction about the trunnion as the gear comes up (0 down, 1 stowed). */
function Retracting({ kind, children }: { kind: GearKind; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const a = jumboMotion.gear * (Math.PI / 2) * 0.97;
    if (kind === 'wing') g.rotation.set(a, 0, 0);
    else g.rotation.set(0, 0, a);
  });
  return <group ref={ref}>{children}</group>;
}

/** Outer cylinder, chromed piston and torque links of an oleo strut `len` long. */
function Oleo({ len, r, foot }: { len: number; r: number; foot?: ReactNode }) {
  const split = len * 0.55;
  const knee = -split - (len - split) * 0.5;
  return (
    <>
      <Part id="cylinder">
        <Turn k={`lg-cyl-${len}`} profile={[[0, 0.12], [r, 0.12], [r, -split], [r * 0.8, -split - 0.06], [0, -split - 0.06]]} seg={28} />
        <Cyl c={[0, 0, 0]} r={r * 0.7} len={r * 5} axis="x" seg={20} />
        <Callout id="cylinder" p={[0, -split * 0.5, r]} />
      </Part>
      <Part id="piston">
        <Cyl c={[0, -(split + len) / 2 + 0.1, 0]} r={r * 0.68} len={len - split + 0.2} seg={24} />
        {foot}
        <Callout id="piston" p={[0, -split - 0.3, r * 0.7]} />
      </Part>
      <Part id="torque-links">
        <Rod a={[r * 1.1, -split + 0.05, 0]} b={[r * 2.6, knee, 0]} r={0.035} />
        <Rod a={[r * 2.6, knee, 0]} b={[r * 1.1, -len + 0.15, 0]} r={0.035} />
        <Cyl c={[r * 2.6, knee, 0]} r={0.05} len={0.12} axis="z" seg={12} />
        <Callout id="torque-links" p={[r * 2.6, knee, 0.06]} />
      </Part>
    </>
  );
}

/** Four-wheel main gear: wing gear (len 3.23) or body gear (len 2.48). */
export function MainGear({ kind = 'wing', len = GEAR.wing[0].at[1] - TYRE_R }: { kind?: 'wing' | 'body'; len?: number }) {
  const r = 0.17;
  const brace: [number, number, number] = kind === 'wing' ? [0, 0.35, -1.4] : [-1.4, 0.35, 0];
  return (
    <Retracting kind={kind}>
      <Oleo len={len} r={r} />
      <Part id="side-brace">
        <Rod a={[0, -len * 0.42, 0]} b={[brace[0] * 0.5, -len * 0.1, brace[2] * 0.5]} r={0.05} />
        <Rod a={[brace[0] * 0.5, -len * 0.1, brace[2] * 0.5]} b={brace} r={0.05} />
        <Callout id="side-brace" p={[brace[0] * 0.5, -len * 0.1, brace[2] * 0.5]} />
      </Part>
      <Part id="actuator">
        <Rod a={[0.25, -len * 0.25, 0]} b={[0.95, 0.35, 0]} r={0.075} />
        <Rod a={[0.95, 0.35, 0]} b={[0.55, 0.05, 0]} r={0.035} />
        <Callout id="actuator" p={[0.7, 0.1, 0.08]} />
      </Part>
      <Part id="bogie">
        <Box c={[0, -len, 0]} s={[1.9, 0.22, 0.2]} />
        {[-0.74, 0.74].map((x) => <Cyl key={x} c={[x, -len, 0]} r={0.08} len={1.42} axis="z" seg={16} />)}
        <Callout id="bogie" p={[-0.4, -len + 0.11, 0.1]} />
      </Part>
      {[[0.74, 0.56], [0.74, -0.56], [-0.74, 0.56], [-0.74, -0.56]].map(([x, z], i) => (
        <Part key={i} id={`wheel-${i + 1}`}>
          <group position={[x, -len, z]} rotation={[0, z < 0 ? Math.PI : 0, 0]}><Wheel /></group>
          <Callout id={`wheel-${i + 1}`} p={[x, -len + TYRE_R * 0.8, z + Math.sign(z) * 0.24]} />
        </Part>
      ))}
      <Part id="door">
        <Box c={[0.05, -len * 0.4, kind === 'wing' ? 0.28 : 0.28]} s={[0.9, len * 0.7, 0.03]} />
        <Callout id="door" p={[0.3, -len * 0.3, 0.3]} />
      </Part>
    </Retracting>
  );
}

/** Twin-wheel nose gear with its steering cylinders. */
export function NoseGear({ len = GEAR.nose.len }: { len?: number }) {
  const r = 0.14;
  return (
    <Retracting kind="nose">
      <Oleo len={len} r={r} foot={<Cyl c={[0, -len, 0]} r={0.07} len={0.75} axis="z" seg={16} />} />
      <Part id="steering">
        {[0.22, -0.22].map((z) => <Cyl key={z} c={[0.12, -0.35, z]} r={0.05} len={0.5} axis="x" seg={14} />)}
        <Turn k="ng-collar" profile={[[r, -0.3], [r + 0.07, -0.3], [r + 0.07, -0.42], [r, -0.42]]} seg={28} />
        <Callout id="steering" p={[0.3, -0.35, 0.25]} />
      </Part>
      <Part id="drag-brace">
        <Rod a={[0, -len * 0.45, 0]} b={[0.75, -len * 0.15, 0]} r={0.045} />
        <Rod a={[0.75, -len * 0.15, 0]} b={[1.5, 0.2, 0]} r={0.045} />
        <Callout id="drag-brace" p={[0.75, -len * 0.15, 0.05]} />
      </Part>
      <Part id="actuator">
        <Rod a={[-0.15, -len * 0.3, 0]} b={[-0.9, 0.3, 0]} r={0.06} />
        <Callout id="actuator" p={[-0.6, 0.05, 0.06]} />
      </Part>
      {[0.3, -0.3].map((z, i) => (
        <Part key={z} id={i ? 'wheel-l' : 'wheel-r'}>
          <group position={[0, -len, z]} rotation={[0, z < 0 ? Math.PI : 0, 0]}><Wheel brakes={false} /></group>
          <Callout id={i ? 'wheel-l' : 'wheel-r'} p={[0, -len + TYRE_R * 0.8, z + Math.sign(z) * 0.22]} />
        </Part>
      ))}
      <Part id="door">
        {[0.45, -0.45].map((z) => <Box key={z} c={[0.1, -0.5, z]} s={[1.3, 0.9, 0.03]} />)}
        <Callout id="door" p={[0.5, -0.4, 0.46]} />
      </Part>
    </Retracting>
  );
}

const MAIN_PARTS: PartDef[] = [
  { id: 'cylinder', index: 1, name: '减震支柱外筒', en: 'Shock Strut Cylinder', role: '承力 · 收放转轴', material: '高强度钢', description: '顶上横着的是耳轴，起落架绕它收放。外筒里是油和压缩氮气——“油气减震器”，着陆冲击被油液流过小孔时消耗掉。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'piston', index: 2, name: '活塞杆', en: 'Piston', role: '伸缩减震', material: '镀铬钢', description: '镀铬的部分插在外筒里上下滑动。停机时压缩一段，飞起来后完全伸出。', explode: [0, -1.4, 0], stage: [0.62, 0.76] },
  { id: 'torque-links', index: 3, name: '扭力臂', en: 'Torque Links', role: '防止活塞转动', material: '钢', description: '上下两节铰接成剪刀状，让活塞可以伸缩但不能在外筒里转动。', explode: [0.9, -0.3, 0], stage: [0.5, 0.62] },
  { id: 'side-brace', index: 4, name: '侧撑杆', en: 'Side Brace', role: '放下时锁住', material: '钢', description: '中间有铰链可以折起来；放下后被拉直锁死，承受侧向载荷。', explode: [0, 0.6, -0.9], stage: [0.4, 0.52] },
  { id: 'actuator', index: 5, name: '收放作动筒', en: 'Retraction Actuator', role: '收起 · 放下', material: '钢', description: '液压作动筒推着整个起落架绕耳轴转约 90° 收进舱里。液压失效时可以靠重力自由放下。', explode: [1.2, 0.6, 0], stage: [0.3, 0.42] },
  { id: 'bogie', index: 6, name: '车架梁与轮轴', en: 'Bogie Beam & Axles', role: '挂四个轮子', material: '高强度钢', description: '前后两根轮轴，四个机轮分摊重量；着陆时车架先后轮触地，再摆平。', explode: [0, -1.0, 0], stage: [0.76, 0.9] },
  { id: 'wheel-1', index: 7, name: '前外机轮', en: 'Wheel, Front Outer', role: '承重 · 刹车', material: '—', description: '每个主轮都带碳刹车。点“拆开此组件”看轮胎、轮毂和刹车盘组。', explode: [0.9, 0, 1.0], stage: [0, 0.14] },
  { id: 'wheel-2', index: 8, name: '前内机轮', en: 'Wheel, Front Inner', role: '承重 · 刹车', material: '—', description: '同前外机轮。', explode: [0.9, 0, -1.0], stage: [0.06, 0.2] },
  { id: 'wheel-3', index: 9, name: '后外机轮', en: 'Wheel, Rear Outer', role: '承重 · 刹车', material: '—', description: '同前外机轮。', explode: [-0.9, 0, 1.0], stage: [0.12, 0.26] },
  { id: 'wheel-4', index: 10, name: '后内机轮', en: 'Wheel, Rear Inner', role: '承重 · 刹车', material: '—', description: '同前外机轮。', explode: [-0.9, 0, -1.0], stage: [0.18, 0.32] },
  { id: 'door', index: 11, name: '起落架舱门', en: 'Gear Door', role: '收起后整流', material: '复合材料', description: '挂在支柱上，起落架收起后正好封住舱口的一部分，减小阻力。', explode: [0, 0, 1.2], stage: [0.26, 0.38] },
];

const NOSE_PARTS: PartDef[] = [
  { id: 'cylinder', index: 1, name: '减震支柱外筒', en: 'Shock Strut Cylinder', role: '承力 · 收放转轴', material: '高强度钢', description: '前起落架承受约 6% 的飞机重量，但刹车时会被“压头”，载荷大得多。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'piston', index: 2, name: '活塞杆', en: 'Piston', role: '伸缩减震', material: '镀铬钢', description: '下端带着轮轴，转向时整根活塞杆跟着转。', explode: [0, -1.2, 0], stage: [0.6, 0.76] },
  { id: 'torque-links', index: 3, name: '扭力臂', en: 'Torque Links', role: '传递转向', material: '钢', description: '前起落架的扭力臂还要把转向力矩传到活塞和机轮上。', explode: [0.8, -0.3, 0], stage: [0.48, 0.6] },
  { id: 'steering', index: 4, name: '转向作动筒', en: 'Steering Cylinders', role: '地面转弯', material: '钢', description: '一对液压缸推拉转向环，驾驶员用侧壁上的转向手轮控制，能偏转约 70°。', explode: [0.6, 0, 0.8], stage: [0.36, 0.5] },
  { id: 'drag-brace', index: 5, name: '阻力撑杆', en: 'Drag Brace', role: '放下时锁住', material: '钢', description: '向前斜撑，中间可折叠；放下后锁直，承受地面滑跑时的前后载荷。', explode: [0.8, 0.6, 0], stage: [0.24, 0.38] },
  { id: 'actuator', index: 6, name: '收放作动筒', en: 'Retraction Actuator', role: '收起 · 放下', material: '钢', description: '把前起落架向前收进机头下方的轮舱。', explode: [-0.9, 0.5, 0], stage: [0.12, 0.26] },
  { id: 'wheel-r', index: 7, name: '右前轮', en: 'Nose Wheel, Right', role: '承重 · 转向', material: '—', description: '前轮没有刹车。点“拆开此组件”看结构。', explode: [0, 0, 0.9], stage: [0, 0.14] },
  { id: 'wheel-l', index: 8, name: '左前轮', en: 'Nose Wheel, Left', role: '承重 · 转向', material: '—', description: '同右前轮。', explode: [0, 0, -0.9], stage: [0.04, 0.18] },
  { id: 'door', index: 9, name: '舱门', en: 'Gear Doors', role: '整流', material: '复合材料', description: '前轮舱两侧的门，起落架收放时打开、平时关闭。', explode: [0, 0.4, 1.2], stage: [0.76, 0.9] },
];

const gearSteps = (what: string): StepDef[] => [
  {
    title: what, en: 'Landing Gear',
    body: '油气减震支柱 + 收放机构。用左栏切换“巡航”看它绕耳轴收起，切回“停机”放下。',
    state: { explode: 0, section: false, running: true, select: 'actuator', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆机轮和舱门，再拆作动筒、撑杆和扭力臂，从外筒里抽出活塞杆。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const mainGearLevel: MachineDef = level({
  id: 'b747/main-gear',
  parent: 'b747',
  unit: 3,
  bounds: [[-1.4, -3.9, -1.5], [1.2, 0.5, 0.9]],
  name: '主起落架',
  en: 'Main Landing Gear',
  subtitle: '子组件 · 四轮车架 · 油气减震',
  summary: '11 种零件：减震支柱、扭力臂、撑杆、作动筒、车架、4 个机轮',
  drawingNo: 'GW-747-30',
  scale: '1 : 25',
  parts: MAIN_PARTS,
  boltSets: {},
  neighbours: {},
  children: { 'wheel-1': 'b747/wheel', 'wheel-2': 'b747/wheel', 'wheel-3': 'b747/wheel', 'wheel-4': 'b747/wheel' },
  guides: [{ stage: 'piston', origin: [0, -2.2, 0] }],
  centreLines: [[[0, 0.4, 0], [0, -3.4, 0], 0.17]],
  steps: gearSteps('主起落架'),
  camera: { target: [0, -1.7, -0.2], offset: [4.2, 1.4, 6.4], orthoDistance: 30, exploded: { target: [0, -1.6, -0.2], scale: 2.1 } },
  Model: MainGear,
  Driver: JumboDriver,
  Controls: PhaseControls,
});

export const noseGearLevel: MachineDef = level({
  id: 'b747/nose-gear',
  parent: 'b747',
  unit: 3.4,
  bounds: [[-1, -2.8, -0.6], [1.6, 0.4, 0.6]],
  name: '前起落架',
  en: 'Nose Landing Gear',
  subtitle: '子组件 · 双轮 · 液压转向',
  summary: '9 种零件：减震支柱、转向作动筒、阻力撑杆、2 个机轮……',
  drawingNo: 'GW-747-20',
  scale: '1 : 20',
  parts: NOSE_PARTS,
  boltSets: {},
  neighbours: {},
  children: { 'wheel-l': 'b747/nose-wheel', 'wheel-r': 'b747/nose-wheel' },
  guides: [{ stage: 'piston', origin: [0, -1.6, 0] }],
  centreLines: [[[0, 0.4, 0], [0, -2.5, 0], 0.14]],
  steps: gearSteps('前起落架'),
  camera: { target: [0.2, -1.2, 0], offset: [3.2, 1.2, 4.8], orthoDistance: 24, exploded: { target: [0.3, -1.0, 0], scale: 2.1 } },
  Model: NoseGear,
  Driver: JumboDriver,
  Controls: PhaseControls,
});
