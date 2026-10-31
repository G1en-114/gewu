import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef, Vec3 } from '../types';
import { ArcTurn, Box, ccw, level, Pipe, Plate, poly, Rod, XY_Z, XZ_Y } from '../kit';
import { engineLevel, Turboshaft } from './engine';
import { HUB_Y, pitchOf, RotorControls, RotorHead, rotorLevel, rotorMotion, useRotor } from './rotor';
import { HeliDriver, tailLevel, TailRotor } from './tail';

/**
 * Light single-engine turbine helicopter (generic, five seats): 10 m main
 * rotor, about 13 m overall. +x forward, y up, ground at y = 0; metres. The
 * rotor head, engine and tail rotor are drawn by their own subassemblies.
 */

/** Cabin pod: a turned shell about the line y = POD_Y, outline as (radius, x). */
const POD_Y = 1.25;
const POD: Array<[number, number]> = [
  [0, 2.65], [0.22, 2.6], [0.45, 2.45], [0.63, 2.2], [0.76, 1.8], [0.82, 1.2], [0.83, 0.4], [0.8, -0.4], [0.66, -1.0], [0.42, -1.5],
];
/** Thin-walled profile of the part of the pod between x0 and x1. */
function pod(x0: number, x1: number, t = 0.03): Array<[number, number]> {
  const outer = POD.filter(([, x]) => x >= x0 - 1e-6 && x <= x1 + 1e-6);
  return ccw([...outer, ...[...outer].reverse().map(([r, x]): [number, number] => [Math.max(0, r - t), x])]);
}
/** The canopy is the upper front of the pod, down to about 30° above the waist. */
const CANOPY_X = 0.4;
const CANOPY_PHI = 0.5;

const DECK_Y = 2.02;
const ENGINE_AT: Vec3 = [-0.4, 2.3, 0];
const TAIL_AT: Vec3 = [-7.0, 2.42, 0.1];
const BLADE_R = 5;

/** Tail boom: centre line and radius along its length. */
const BOOM_A: Vec3 = [-1.3, 1.55, 0];
const BOOM_B: Vec3 = [-7.0, 2.2, 0];

function Rotating({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y = rotorMotion.psi; });
  return <group position={[0, DECK_Y + HUB_Y, 0]}><group ref={ref}>{children}</group></group>;
}

function MainBlade({ i }: { i: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = pitchOf(i); });
  return (
    <group rotation={[0, (i * Math.PI) / 2, 0]}>
      <group ref={ref}>
        <Box c={[(0.38 + BLADE_R) / 2, 0, 0]} s={[BLADE_R - 0.38, 0.05, 0.3]} />
        <Box c={[BLADE_R - 0.12, 0, 0]} s={[0.24, 0.052, 0.3]} />
      </group>
    </group>
  );
}

export function Helicopter() {
  return (
    <group>
      <Part id="fuselage">
        <group position={[0, POD_Y, 0]}>
          <ArcTurn k="hc-pod-front" profile={pod(CANOPY_X, 2.65)} axis="x" phi0={-CANOPY_PHI} phiLen={Math.PI + 2 * CANOPY_PHI} seg={40} />
          <ArcTurn k="hc-pod-rear" profile={pod(-1.5, CANOPY_X)} axis="x" phi0={0} phiLen={Math.PI * 2} seg={48} />
        </group>
        <Box c={[-0.75, 1.95, 0]} s={[2.4, 0.12, 0.8]} />
        <Box c={[-1.55, 1.75, 0]} s={[0.7, 0.3, 0.55]} />
        <Box c={[1.75, 1.12, 0]} s={[0.1, 0.32, 1.0]} />
        <Box c={[0.6, 0.5, 0]} s={[3.2, 0.03, 1.0]} />
        <Callout id="fuselage" p={[0.4, 0.6, 0.78]} />
      </Part>
      <Part id="canopy">
        <group position={[0, POD_Y, 0]}>
          <ArcTurn k="hc-canopy" profile={pod(CANOPY_X, 2.65, 0.02)} axis="x" phi0={Math.PI + CANOPY_PHI} phiLen={Math.PI - 2 * CANOPY_PHI} seg={40} />
        </group>
        <Callout id="canopy" p={[1.9, 1.85, 0.3]} />
      </Part>
      <Part id="seats">
        {[0.33, -0.33].map((z) => (
          <group key={z}>
            <Box c={[1.15, 0.76, z]} s={[0.45, 0.08, 0.42]} />
            <Box c={[0.93, 1.05, z]} s={[0.07, 0.6, 0.42]} />
          </group>
        ))}
        <Box c={[-0.05, 0.76, 0]} s={[0.45, 0.08, 1.05]} />
        <Box c={[-0.28, 1.05, 0]} s={[0.07, 0.6, 1.05]} />
        <Callout id="seats" p={[1.1, 0.85, 0.33]} />
      </Part>
      <Part id="fuel">
        <Box c={[-0.1, 0.6, 0]} s={[0.6, 0.18, 0.7]} />
        <Callout id="fuel" p={[-0.2, 0.62, 0.3]} />
      </Part>
      <Part id="skids">
        {[0.85, -0.85].map((z) => (
          <Pipe key={z} k={`hc-skid-${z}`} pts={[[-1.3, 0.06, z], [1.5, 0.06, z], [1.9, 0.12, z], [2.15, 0.32, z]]} r={0.045} />
        ))}
        {[1.0, -0.55].map((x) => (
          <Pipe key={x} k={`hc-cross-${x}`} pts={[[x, 0.06, -0.85], [x, 0.4, -0.7], [x, 0.5, -0.3], [x, 0.52, 0], [x, 0.5, 0.3], [x, 0.4, 0.7], [x, 0.06, 0.85]]} r={0.04} />
        ))}
        <Callout id="skids" p={[1.6, 0.08, 0.85]} />
      </Part>
      <Part id="rotor">
        <group position={[0, DECK_Y, 0]}><RotorHead blades={false} /></group>
        <Callout id="rotor" p={[0.3, DECK_Y + 0.3, 0.28]} />
      </Part>
      <Part id="blades">
        <Rotating>{[0, 1, 2, 3].map((i) => <MainBlade key={i} i={i} />)}</Rotating>
        <Callout id="blades" p={[3.2, DECK_Y + HUB_Y, 0.2]} />
      </Part>
      <Part id="engine">
        <group position={ENGINE_AT}><Turboshaft /></group>
        <Callout id="engine" p={[-0.9, 2.5, 0.2]} />
      </Part>
      <Part id="cowling">
        <group position={[0, 2.03, 0]}>
          <ArcTurn
            k="hc-cowl"
            profile={ccw([[0.2, -1.95], [0.5, -1.75], [0.6, -1.3], [0.6, 0.25], [0.48, 0.5], [0.2, 0.62], [0.18, 0.62], [0.46, 0.5], [0.58, 0.25], [0.58, -1.3], [0.48, -1.75], [0.18, -1.95]])}
            axis="x"
            phi0={Math.PI}
            phiLen={Math.PI}
            seg={32}
          />
        </group>
        <Callout id="cowling" p={[-1.2, 2.6, 0.2]} />
      </Part>
      <Part id="boom">
        <Rod a={BOOM_A} b={BOOM_B} r={0.36} r2={0.13} seg={32} />
        <Callout id="boom" p={[-4.2, 1.95, 0.25]} />
      </Part>
      <Part id="shaft">
        <Rod a={[-1.7, 2.0, 0]} b={[-6.95, 2.4, 0]} r={0.028} seg={12} />
        {[-2.6, -3.8, -5.0, -6.2].map((x) => <Box key={x} c={[x, 2.0 + ((-1.7 - x) / 5.25) * 0.4 - 0.04, 0]} s={[0.06, 0.08, 0.1]} />)}
        <Callout id="shaft" p={[-3.2, 2.12, 0.05]} />
      </Part>
      <Part id="stabilizers">
        <Plate k="hc-fin-top" shape={poly([[-6.5, 2.25], [-7.45, 3.3], [-7.75, 3.3], [-7.3, 2.15]])} depth={0.05} p={[0, 0, -0.025]} r={XY_Z} />
        <Plate k="hc-fin-low" shape={poly([[-6.85, 2.05], [-7.25, 1.55], [-7.45, 1.55], [-7.25, 2.1]])} depth={0.05} p={[0, 0, -0.025]} r={XY_Z} />
        <Plate k="hc-stab" shape={poly([[-5.15, -0.9], [-5.6, -0.95], [-5.6, 0.95], [-5.15, 0.9]])} depth={0.04} p={[0, 2.0, 0]} r={XZ_Y} />
        {[0.95, -0.95].map((z) => (
          <Plate key={z} k="hc-endplate" shape={poly([[-5.3, 1.85], [-5.7, 1.85], [-5.75, 2.25], [-5.45, 2.2]])} depth={0.03} p={[0, 0, z - 0.015]} r={XY_Z} />
        ))}
        <Callout id="stabilizers" p={[-7.5, 3.1, 0]} />
      </Part>
      <Part id="tail">
        <group position={TAIL_AT}><TailRotor /></group>
        <Callout id="tail" p={[-7.0, 2.6, 0.3]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'fuselage', index: 1, name: '机身', en: 'Fuselage', role: '载人 · 承力', material: '铝合金 / 复合材料', description: '前面是座舱，顶上是发动机和主减速器的安装平台，底下装油箱。整个机身其实是“吊”在主减速器下面的。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'canopy', index: 2, name: '座舱罩', en: 'Canopy', role: '视野 · 挡风', material: '亚克力', description: '大面积透明罩，前下方也开着窗，驾驶员能看到脚下的着陆点。', explode: [1.2, 1.0, 0], stage: [0.62, 0.72] },
  { id: 'seats', index: 3, name: '座椅', en: 'Seats', role: '乘员', material: '铝合金 / 吸能结构', description: '前排两个（驾驶员在右），后排三人长椅。座椅下面有吸能结构，硬着陆时保护乘员。', explode: [0.6, 1.4, -1.9], stage: [0.7, 0.8] },
  { id: 'fuel', index: 4, name: '油箱', en: 'Fuel Tank', role: '储油', material: '抗坠毁软油箱', description: '藏在后排座椅下、机身最低处，约 400 升航空煤油，可飞 3 小时左右。', explode: [0, -0.4, 2.0], stage: [0.78, 0.88] },
  { id: 'skids', index: 5, name: '起落橇', en: 'Skids', role: '着陆', material: '铝合金管', description: '两根滑橇加两根弯成拱形的横管。横管本身就是弹簧，着陆时弯曲吸收冲击。', explode: [0, -1.0, 0], stage: [0.86, 0.98] },
  { id: 'rotor', index: 6, name: '旋翼头与主减速器', en: 'Rotor Head & Gearbox', role: '升力 · 操纵', material: '—', description: '主减速器把发动机的转速降到旋翼的约 400 转 / 分；上面的倾斜盘把驾驶员的操纵传给旋转的桨叶。点“拆开此组件”进去看。', explode: [0, 2.2, 0], stage: [0.3, 0.44] },
  { id: 'blades', index: 7, name: '主桨叶 ×4', en: 'Main Rotor Blades', role: '产生升力', material: '复合材料', description: '每片约 4.6 米长，旋翼直径 10 米，桨尖速度约每秒 200 米。用左栏切换悬停、爬升、前飞，看桨距怎么变。', explode: [0, 3.0, 0], stage: [0, 0.12] },
  { id: 'engine', index: 8, name: '涡轴发动机', en: 'Turboshaft Engine', role: '动力', material: '—', description: '约 500 千瓦的涡轴发动机，横躺在主减速器后面，从前端输出动力。点“拆开此组件”看压气机和两级涡轮。', explode: [-0.6, 1.6, -1.7], stage: [0.22, 0.34] },
  { id: 'cowling', index: 9, name: '整流罩', en: 'Cowling', role: '整流 · 保护', material: '复合材料', description: '罩住发动机和主减速器，减小阻力；检修时整块掀开。', explode: [0, 1.2, 1.7], stage: [0.12, 0.22] },
  { id: 'boom', index: 10, name: '尾梁', en: 'Tail Boom', role: '把尾桨伸远', material: '铝合金', description: '锥形长梁。尾桨离旋翼轴越远，抵消反扭矩需要的推力就越小。', explode: [-1.8, 0, 0], stage: [0.52, 0.64] },
  { id: 'shaft', index: 11, name: '尾传动轴', en: 'Tail Drive Shaft', role: '把动力送到尾部', material: '铝合金管', description: '沿尾梁顶上一节节连起来，由几个轴承座托着，转得比主旋翼快得多。', explode: [-0.8, 1.0, 0], stage: [0.44, 0.52] },
  { id: 'stabilizers', index: 12, name: '平尾与垂尾', en: 'Stabilizers', role: '稳定', material: '复合材料', description: '前飞时平尾压住机尾，让机身保持水平；垂尾在前飞时帮尾桨分担一部分侧力。', explode: [-1.4, 0.4, 0], stage: [0.4, 0.5] },
  { id: 'tail', index: 13, name: '尾桨与尾减速器', en: 'Tail Rotor', role: '抵消反扭矩 · 转向', material: '—', description: '侧着吹的小旋翼，抵消主旋翼的反扭矩；改它的桨距就能让机头转向。点“拆开此组件”看变距机构。', explode: [-0.8, 0.3, 1.5], stage: [0.06, 0.18] },
];

const STEPS: StepDef[] = [
  {
    title: '轻型直升机', en: 'Light Helicopter',
    body: '一台五座的单发轻型直升机：10 米的主旋翼产生升力，也负责操纵；尾桨抵消反扭矩。用左栏切换飞行状态，看倾斜盘和桨叶怎么变。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
    apply: () => useRotor.getState().set('hover'),
  },
  {
    title: '剖视', en: 'Section',
    body: '沿中线剖开：前面是座舱，后排座椅下是油箱；顶上，主减速器在旋翼轴正下方，涡轴发动机横躺在它后面。',
    state: { explode: 0, section: true, running: true, select: 'engine', focus: null },
  },
  {
    title: '动力传递', en: 'Drivetrain',
    body: '发动机前端输出 → 主减速器，一路向上带动旋翼，一路经尾传动轴沿尾梁送到尾减速器，带动尾桨。尾桨约是主旋翼转速的 6 倍。',
    state: { explode: 0, section: false, running: true, select: 'shaft', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆桨叶和尾桨，掀开整流罩，吊出发动机和旋翼头，再拆尾部、座舱罩、座椅、油箱和起落橇。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '旋翼头、发动机、尾桨都能再拆开：选中后点“拆开此组件”。或者打开“全部展开”，三者被拉到旁边一起拆开。',
    state: { explode: 1, section: false, running: false, select: 'rotor', focus: null },
  },
];

export const helicopter: MachineDef = level({
  id: 'helicopter',
  unit: 1,
  bounds: [[-7.8, 0, -5], [5, 3.4, 5]],
  name: '直升机',
  en: 'Light Helicopter',
  subtitle: '整机 · 单发涡轴 · 可拆到发动机与尾桨',
  summary: '13 个大件 · 旋翼头、涡轴发动机、尾桨都能再拆开，会转',
  drawingNo: 'GW-ZS-00',
  scale: '1 : 50',
  parts: PARTS.map((p) => (
    p.id === 'rotor' ? { ...p, deep: [3.6, 0.4, 0] }
      : p.id === 'engine' ? { ...p, deep: [-1.6, 0.2, -3.0] }
        : p.id === 'tail' ? { ...p, deep: [-1.4, 0, 2.6] } : p
  )),
  boltSets: {},
  neighbours: {},
  children: { rotor: 'helicopter/rotor', engine: 'helicopter/engine', tail: 'helicopter/tail' },
  guides: [{ stage: 'engine', origin: [-0.9, 2.3, 0] }, { stage: 'rotor', origin: [0, 2.4, 0] }],
  centreLines: [[[0, 1.9, 0], [0, 3.7, 0], 0.3], [[TAIL_AT[0], TAIL_AT[1], -0.3], [TAIL_AT[0], TAIL_AT[1], 0.45], 0.15]],
  steps: STEPS,
  camera: { target: [-1.3, 1.9, 0], offset: [8, 5.4, 16.5], orthoDistance: 80, exploded: { target: [-1.4, 2.6, 0], scale: 1.35 }, deep: { target: [-1.2, 2.4, 0.4], scale: 1.7 } },
  Model: Helicopter,
  Driver: HeliDriver,
  Controls: RotorControls,
});

export const HELICOPTER_LEVELS: MachineDef[] = [rotorLevel, engineLevel, tailLevel];
