import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Rod } from '../kit';
import { jumboMotion, UPPER_FLOOR } from './airframe';
import { JumboDriver, PhaseControls } from './controls';
import { boxes, type P3 } from './geo';
import { seat } from './seats';

/**
 * The 747-400 flight deck on the upper deck behind the nose: two pilots,
 * two observer seats, six-screen glass panel, overhead panel, centre
 * pedestal with four thrust levers. Aircraft coordinates; captain on the
 * left (−z). Metres.
 */

const F = UPPER_FLOOR;
/** Station of the instrument panel face. */
const PANEL_X = 32.95;
const PILOT_X = 32.05;

/** Pivots its children about a lateral axis (z) through p by angle(). */
function Pivot({ p, angle, children }: { p: P3; angle: () => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = angle(); });
  return <group position={p}><group ref={ref}><group position={[-p[0], -p[1], -p[2]]}>{children}</group></group></group>;
}

const displays = (): Array<{ c: P3; s: P3; r?: P3 }> => [-0.72, -0.45, -0.14, 0.14, 0.45, 0.72].map((z) => ({ c: [PANEL_X - 0.04, F + 0.95, z], s: [0.04, 0.2, 0.21], r: [0, 0, -0.18] }));
const switches = (): Array<{ c: P3; s: P3; r?: P3 }> => {
  const out: Array<{ c: P3; s: P3; r?: P3 }> = [];
  for (let i = 0; i < 6; i += 1) for (let j = 0; j < 9; j += 1) out.push({ c: [31.9 + i * 0.14, F + 1.55 + i * 0.045, -0.48 + j * 0.12], s: [0.05, 0.02, 0.05], r: [0, 0, 0.35] });
  return out;
};

export function Cockpit() {
  return (
    <group>
      <Part id="floor">
        <Box c={[31.6, F - 0.04, 0]} s={[3.0, 0.08, 1.9]} />
        <Box c={[30.15, F + 0.95, 0]} s={[0.08, 1.9, 1.9]} />
        <Box c={[30.12, F + 0.9, 0.45]} s={[0.06, 1.8, 0.7]} />
        <Callout id="floor" p={[30.4, F + 0.02, 0.5]} />
      </Part>
      <Part id="captain-seat">
        <M clip geo={boxes('ck-cpt', () => seat('pilot', PILOT_X, -0.55, F))} />
        <Callout id="captain-seat" p={[PILOT_X, F + 0.6, -0.55]} />
      </Part>
      <Part id="fo-seat">
        <M clip geo={boxes('ck-fo', () => seat('pilot', PILOT_X, 0.55, F))} />
        <Callout id="fo-seat" p={[PILOT_X, F + 0.6, 0.55]} />
      </Part>
      <Part id="observer-seats">
        <M clip geo={boxes('ck-obs', () => [...seat('pilot', 31.05, -0.55, F), ...seat('pilot', 30.85, 0.55, F)])} />
        <Callout id="observer-seats" p={[31.0, F + 0.6, 0.55]} />
      </Part>
      <Part id="yokes">
        {[-0.55, 0.55].map((z) => (
          <Pivot key={z} p={[PANEL_X - 0.35, F + 0.05, z]} angle={() => jumboMotion.elevator * 0.6}>
            <Rod a={[PANEL_X - 0.35, F + 0.05, z]} b={[PANEL_X - 0.42, F + 0.75, z]} r={0.03} />
            <Box c={[PANEL_X - 0.43, F + 0.78, z]} s={[0.04, 0.06, 0.34]} />
            {[-0.16, 0.16].map((dz) => <Box key={dz} c={[PANEL_X - 0.43, F + 0.86, z + dz]} s={[0.04, 0.16, 0.04]} />)}
          </Pivot>
        ))}
        <Callout id="yokes" p={[PANEL_X - 0.42, F + 0.9, 0.55]} />
      </Part>
      <Part id="pedals">
        {[-0.55, 0.55].map((z) => [-0.11, 0.11].map((dz) => <Box key={`${z}${dz}`} c={[PANEL_X - 0.12, F + 0.15, z + dz]} s={[0.04, 0.22, 0.08]} r={[0, 0, -0.5]} />))}
        <Callout id="pedals" p={[PANEL_X - 0.1, F + 0.2, 0.66]} />
      </Part>
      <Part id="main-panel">
        <Box c={[PANEL_X, F + 0.85, 0]} s={[0.1, 0.55, 1.75]} r={[0, 0, -0.18]} />
        <M clip geo={boxes('ck-displays', displays)} />
        <Callout id="main-panel" p={[PANEL_X - 0.1, F + 0.95, 0.45]} />
      </Part>
      <Part id="glareshield">
        <Box c={[PANEL_X - 0.12, F + 1.2, 0]} s={[0.4, 0.08, 1.75]} />
        <Box c={[PANEL_X - 0.3, F + 1.15, 0]} s={[0.05, 0.1, 1.2]} />
        <Callout id="glareshield" p={[PANEL_X - 0.3, F + 1.25, 0.3]} />
      </Part>
      <Part id="overhead">
        <Box c={[32.25, F + 1.55, 0]} s={[0.95, 0.06, 1.15]} r={[0, 0, 0.35]} />
        <M clip geo={boxes('ck-switches', switches)} />
        <Callout id="overhead" p={[32.2, F + 1.6, 0.4]} />
      </Part>
      <Part id="pedestal">
        <Box c={[32.35, F + 0.4, 0]} s={[1.0, 0.8, 0.42]} />
        <Callout id="pedestal" p={[32.0, F + 0.8, 0.2]} />
      </Part>
      <Part id="levers">
        {[-0.12, -0.04, 0.04, 0.12].map((z) => (
          <Pivot key={z} p={[32.55, F + 0.8, z]} angle={() => -0.5 + jumboMotion.throttle * 0.9}>
            <Rod a={[32.55, F + 0.8, z]} b={[32.55, F + 1.02, z]} r={0.012} />
            <Cyl c={[32.55, F + 1.03, z]} r={0.022} len={0.05} axis="z" seg={10} />
          </Pivot>
        ))}
        <Pivot p={[32.2, F + 0.8, 0.17]} angle={() => -0.3 + jumboMotion.flap * 0.8}>
          <Rod a={[32.2, F + 0.8, 0.17]} b={[32.2, F + 0.98, 0.17]} r={0.012} />
          <Box c={[32.2, F + 0.99, 0.17]} s={[0.05, 0.03, 0.06]} />
        </Pivot>
        <Pivot p={[32.2, F + 0.8, -0.17]} angle={() => -0.3 + jumboMotion.spoiler * 0.8}>
          <Rod a={[32.2, F + 0.8, -0.17]} b={[32.2, F + 0.98, -0.17]} r={0.012} />
        </Pivot>
        <Callout id="levers" p={[32.55, F + 1.05, 0.15]} />
      </Part>
      <Part id="windshield">
        <M clip geo={boxes('ck-frames', () => [
          ...[-0.75, -0.3, 0.3, 0.75].map((z): { c: P3; s: P3; r?: P3 } => ({ c: [33.45, F + 1.25, z], s: [0.06, 0.55, 0.05], r: [0, 0, 0.55] })),
          { c: [33.3, F + 1.5, 0], s: [0.06, 0.05, 1.6] },
          { c: [33.6, F + 1.0, 0], s: [0.06, 0.05, 1.7] },
        ])} />
        <Callout id="windshield" p={[33.4, F + 1.4, 0.3]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'floor', index: 1, name: '驾驶舱地板与后隔板', en: 'Floor & Bulkhead', role: '结构', material: '铝合金 / 蜂窝板', description: '驾驶舱在上层舱最前面，后隔板上有加固的驾驶舱门。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'captain-seat', index: 2, name: '机长座椅', en: 'Captain Seat', role: '左座', material: '—', description: '机长坐左边。座椅能前后上下电动调节，让眼睛正好对准“设计眼位”。', explode: [-0.8, 0.8, -0.8], stage: [0.5, 0.62] },
  { id: 'fo-seat', index: 3, name: '副驾驶座椅', en: 'First Officer Seat', role: '右座', material: '—', description: '副驾驶坐右边，左右两套操纵完全一样，互为备份。', explode: [-0.8, 0.8, 0.8], stage: [0.54, 0.66] },
  { id: 'observer-seats', index: 4, name: '观察员座椅 ×2', en: 'Observer Seats', role: '加座', material: '—', description: '给检查员、教员或换班机组坐。747-400 取消了飞行工程师，三人制变成两人制。', explode: [-1.2, 0.6, 0], stage: [0.6, 0.72] },
  { id: 'yokes', index: 5, name: '驾驶盘与操纵柱 ×2', en: 'Control Columns', role: '俯仰 · 滚转', material: '—', description: '推拉操纵柱控制升降舵，转动驾驶盘控制副翼和扰流板。切到“起飞”可以看到它被拉向后方。', explode: [-0.6, 0.9, 0], stage: [0.28, 0.4] },
  { id: 'pedals', index: 6, name: '方向舵脚蹬', en: 'Rudder Pedals', role: '偏航 · 刹车', material: '—', description: '整块蹬是方向舵，踩脚尖是刹车。', explode: [0.2, 0.6, 0], stage: [0.34, 0.46] },
  { id: 'main-panel', index: 7, name: '主仪表板', en: 'Main Panel', role: '显示', material: '—', description: '六块显示屏：两侧各一块主飞行显示器和导航显示器，中间两块显示发动机和告警。747-400 是第一代“玻璃驾驶舱”大型客机。', explode: [0.9, 0.2, 0], stage: [0.72, 0.84] },
  { id: 'glareshield', index: 8, name: '遮光板与模式控制板', en: 'Glareshield & MCP', role: '自动驾驶', material: '—', description: '遮光板下沿那一条就是 MCP：选高度、速度、航向，交给自动驾驶。', explode: [0.7, 0.7, 0], stage: [0.62, 0.74] },
  { id: 'overhead', index: 9, name: '头顶板', en: 'Overhead Panel', role: '系统开关', material: '—', description: '燃油、液压、电源、空调、防冰、灯光……几百个开关都在头上。原来飞行工程师的活儿大部分搬到了这里。', explode: [-0.3, 1.0, 0], stage: [0.16, 0.3] },
  { id: 'pedestal', index: 10, name: '中央操纵台', en: 'Centre Pedestal', role: '油门 · 无线电', material: '—', description: '两座之间的台子，上面是油门杆、襟翼手柄、减速板手柄，后面是无线电和飞行管理计算机的键盘。', explode: [-0.8, -0.4, 0], stage: [0.84, 0.96] },
  { id: 'levers', index: 11, name: '油门杆与襟翼手柄', en: 'Thrust & Flap Levers', role: '推力 · 襟翼', material: '—', description: '四根油门杆对应四台发动机，旁边是襟翼手柄和减速板手柄。切换飞行阶段，三者跟着动。', explode: [-0.3, 0.7, 0.3], stage: [0.4, 0.52] },
  { id: 'windshield', index: 12, name: '风挡框', en: 'Windshield Frames', role: '视野 · 抗鸟撞', material: '钛合金 / 多层玻璃', description: '前风挡是好几层玻璃和夹层，通电加热防冰除雾，能挡住约 2 公斤的飞鸟高速撞击。', explode: [1.2, 0.6, 0], stage: [0, 0.14] },
];

const STEPS: StepDef[] = [
  {
    title: '驾驶舱', en: 'Flight Deck',
    body: '两人制玻璃驾驶舱：六块显示屏、头顶板、中央操纵台。切换飞行阶段，油门杆、襟翼手柄、操纵柱跟着动。',
    state: { explode: 0, section: false, running: true, select: 'levers', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆风挡框和头顶板，取出操纵柱、脚蹬、油门杆，再拆座椅、遮光板、主仪表板和中央操纵台。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const cockpitLevel: MachineDef = level({
  id: 'b747/cockpit',
  parent: 'b747/nose',
  unit: 4,
  bounds: [[30.1, F - 0.1, -1], [33.7, F + 1.8, 1]],
  name: '驾驶舱',
  en: 'Flight Deck',
  subtitle: '子组件 · 两人制玻璃驾驶舱',
  summary: '12 种零件：座椅、操纵柱、仪表板、头顶板、油门杆……',
  drawingNo: 'GW-747-51',
  scale: '1 : 20',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [],
  centreLines: [],
  steps: STEPS,
  camera: { target: [32.1, F + 0.8, 0], offset: [-3.6, 2.6, 3.4], orthoDistance: 20, exploded: { target: [31.9, F + 1.1, 0], scale: 2.1 } },
  Model: Cockpit,
  Driver: JumboDriver,
  Controls: PhaseControls,
});
