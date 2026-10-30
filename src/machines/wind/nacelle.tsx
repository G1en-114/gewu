import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, roundFrame, Turn, XZ_Y, YZ_X } from '../kit';
import { GEAR_RATIO, WindDriver, WindGearbox, windMotion } from './gearbox';

/**
 * Nacelle of a 2 MW-class turbine, on the tower top (yaw centre at the
 * origin). Rotor axis along +x (upwind) at y = 1.4; metres.
 */

export const AXIS_Y = 1.4;

function Rotating({ rate = 1, children }: { rate?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = windMotion.rotor * rate; });
  return <group position={[0, AXIS_Y, 0]}><group ref={ref}>{children}</group></group>;
}

/** Hub with its three pitch bearings and blade roots (the blades are the turbine's). */
export function Hub() {
  return (
    <Rotating>
      <Turn k="wn-spinner" profile={[[0, 7.6], [0.7, 7.4], [1.5, 6.6], [1.9, 5.6], [1.95, 4.4], [1.85, 4.4], [1.8, 5.6], [1.4, 6.5], [0, 7.4]]} axis="x" seg={48} />
      <Turn k="wn-hub" profile={[[0.3, 4.3], [1.2, 4.3], [1.4, 5.0], [1.2, 6.0], [0.3, 6.0]]} axis="x" seg={40} />
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[(i * Math.PI * 2) / 3, 0, 0]}>
          <Turn k="wn-pitch-bearing" profile={[[0.75, 1.2], [1.0, 1.2], [1.0, 1.45], [0.75, 1.45]]} p={[5.15, 0, 0]} seg={40} />
          <Cyl c={[5.15, 1.9, 0]} r={0.85} len={0.9} seg={32} />
          <Box c={[5.15, 1.05, 0.6]} s={[0.3, 0.4, 0.3]} />
        </group>
      ))}
    </Rotating>
  );
}

export function Nacelle() {
  return (
    <group>
      <Part id="cover">
        <Plate k="wn-cover" shape={roundFrame(-0.6, -1.9, 3.3, 1.9, 0.9, 0.08)} depth={8.2} p={[-4.6, 0, 0]} r={YZ_X} />
        <Callout id="cover" p={[-2, 3.3, 1]} />
      </Part>
      <Part id="hub">
        <Hub />
        <Callout id="hub" p={[6, 2.6, 1]} />
      </Part>
      <Part id="main-shaft">
        <Rotating>
          <Cyl c={[2.7, 0, 0]} r={0.32} len={3.2} axis="x" seg={32} />
          <Turn k="wn-flange" profile={[[0.3, 0], [0.9, 0], [0.9, 0.15], [0.3, 0.15]]} p={[4.15, 0, 0]} axis="x" seg={40} />
        </Rotating>
        <Turn k="wn-main-bearing" profile={[[0.33, 3.2], [0.75, 3.2], [0.75, 3.8], [0.33, 3.8]]} p={[0, AXIS_Y, 0]} axis="x" seg={40} />
        <Box c={[3.5, 0.6, 0]} s={[0.7, 1.3, 1.4]} />
        <Callout id="main-shaft" p={[2.8, 1.9, 0.5]} />
      </Part>
      <Part id="gearbox">
        <group position={[1.15, AXIS_Y, 0]} rotation={[0, Math.PI, 0]}><WindGearbox /></group>
        <Callout id="gearbox" p={[0.4, 2.8, 0.6]} />
      </Part>
      <Part id="brake">
        <Rotating rate={GEAR_RATIO}>
          <Turn k="wn-disc" profile={[[0.08, -1.95], [0.55, -1.95], [0.55, -1.89], [0.08, -1.89]]} axis="x" seg={40} />
          <Cyl c={[-2.05, 0, 0]} r={0.08} len={0.3} axis="x" seg={16} />
        </Rotating>
        <Box c={[-1.92, AXIS_Y + 0.55, 0]} s={[0.2, 0.2, 0.25]} />
        <Callout id="brake" p={[-1.92, AXIS_Y + 0.8, 0.4]} />
      </Part>
      <Part id="generator">
        <Turn k="wn-generator" profile={[[0.12, -2.2], [0.85, -2.2], [0.85, -4.1], [0.12, -4.1]]} p={[0, AXIS_Y, 0]} axis="x" seg={48} />
        {Array.from({ length: 12 }, (_, i) => (
          <group key={i} position={[0, AXIS_Y, 0]} rotation={[(i / 12) * Math.PI * 2, 0, 0]}>
            <Box c={[-3.15, 0.88, 0]} s={[1.7, 0.06, 0.1]} />
          </group>
        ))}
        <Callout id="generator" p={[-3.2, AXIS_Y + 1.1, 0.6]} />
      </Part>
      <Part id="bedplate">
        <Box c={[0.6, 0.05, 0]} s={[6.2, 0.3, 2.4]} />
        <Box c={[-2.6, 0.3, 0]} s={[3.2, 0.2, 1.8]} />
        <Callout id="bedplate" p={[-1, 0.2, 1.2]} />
      </Part>
      <Part id="yaw">
        <Turn k="wn-yaw-ring" profile={[[1.6, -0.35], [1.95, -0.35], [1.95, -0.1], [1.6, -0.1]]} seg={64} />
        <Plate k="wn-yaw-gear" shape={() => gearShape(100, 1.6, 0.04, 1.45)} depth={0.12} p={[0, -0.3, 0]} r={XZ_Y} />
        {[0.6, 1.4, 2.2, 3.8].map((a) => (
          <Cyl key={a} c={[1.2 * Math.cos(a), 0.35, 1.2 * Math.sin(a)]} r={0.16} len={0.7} seg={16} />
        ))}
        <Callout id="yaw" p={[1.8, -0.2, 1.4]} />
      </Part>
      <Part id="met">
        <Cyl c={[-3.6, 3.7, 0]} r={0.04} len={1.6} seg={8} />
        {[0, 1, 2].map((i) => {
          const a = (i * Math.PI * 2) / 3;
          return <Cyl key={i} c={[-3.6 + 0.2 * Math.cos(a), 4.5, 0.2 * Math.sin(a)]} r={0.06} len={0.08} seg={10} />;
        })}
        <Box c={[-3.6, 4.4, 0.4]} s={[0.4, 0.08, 0.04]} />
        <Callout id="met" p={[-3.6, 4.6, 0.2]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'cover', index: 1, name: '机舱罩', en: 'Nacelle Cover', role: '防护', material: '玻璃钢', description: '玻璃钢外壳，挡风雨也隔音。维护人员从塔筒里爬上来，在里面直立行走。', explode: [0, 4.2, 0], stage: [0, 0.14] },
  { id: 'hub', index: 2, name: '轮毂与变桨', en: 'Hub & Pitch System', role: '装叶片 · 调桨角', material: '球墨铸铁', description: '三个叶片根部各有一个大轴承和变桨电机，可以把叶片绕自身轴线转动，调节吃风大小；大风时顺桨让叶轮慢下来。', explode: [5, 0, 0], stage: [0.12, 0.26] },
  { id: 'main-shaft', index: 3, name: '主轴与主轴承', en: 'Main Shaft & Bearing', role: '传递扭矩', material: '锻钢', description: '叶轮每分钟只转十几圈，但扭矩超过 1000 kN·m。主轴承同时承受几十吨的叶轮重量和风推力。', explode: [2.4, -1.4, 0], stage: [0.4, 0.54] },
  { id: 'gearbox', index: 4, name: '齿轮箱', en: 'Gearbox', role: '增速', material: '铸铁 / 钢', description: `把叶轮的慢转放大约 ${Math.round(GEAR_RATIO)} 倍送给发电机。点“拆开此组件”看行星轮系。`, explode: [0, 2.6, 2.4], stage: [0.52, 0.68] },
  { id: 'brake', index: 5, name: '联轴器与刹车', en: 'Coupling & Brake', role: '连接 · 停机', material: '钢', description: '高速轴上的刹车盘，检修时把叶轮刹住；弹性联轴器补偿齿轮箱和发电机之间的偏差。', explode: [-0.6, 1.6, 0], stage: [0.26, 0.36] },
  { id: 'generator', index: 6, name: '发电机', en: 'Generator', role: '机械能 → 电能', material: '硅钢 / 铜', description: '双馈异步发电机，每分钟一千多转，额定功率约 2 MW。电从塔筒里的电缆送下去。', explode: [-2.6, 0, 0], stage: [0.34, 0.46] },
  { id: 'bedplate', index: 7, name: '底座', en: 'Bedplate', role: '承载', material: '铸钢 / 焊接', description: '所有设备都装在它上面，它再坐在偏航轴承上。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'yaw', index: 8, name: '偏航系统', en: 'Yaw System', role: '对准风向', material: '钢', description: '大齿圈装在塔筒顶上，几台偏航电机的小齿轮沿着它走，让整个机舱转向，始终正对来风。', explode: [0, -1.8, 0], stage: [0.72, 0.86] },
  { id: 'met', index: 9, name: '风速风向仪', en: 'Anemometer & Vane', role: '测风', material: '—', description: '机舱尾部的风杯和风向标，控制系统据此偏航对风、调节桨角。', explode: [0, 2.4, 0], stage: [0.02, 0.12] },
];

const STEPS: StepDef[] = [
  {
    title: '机舱', en: 'Nacelle',
    body: '叶轮 → 主轴 → 齿轮箱增速 → 刹车盘与联轴器 → 发电机，全部装在底座上，底座坐在塔顶的偏航轴承上。',
    state: { explode: 0, section: true, running: true, select: 'gearbox', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '揭开机舱罩，卸下轮毂，依次拆刹车、发电机、主轴、齿轮箱，最后是偏航系统。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const nacelleLevel: MachineDef = level({
  id: 'wind/nacelle',
  parent: 'wind',
  unit: 1.1,
  bounds: [[-4.6, -0.6, -1.95], [7.6, 4.6, 1.95]],
  name: '机舱',
  en: 'Nacelle',
  subtitle: '子组件 · 传动链 · 偏航',
  summary: '9 种零件：轮毂、主轴、齿轮箱、发电机、偏航…',
  drawingNo: 'GW-FD-20',
  scale: '1 : 50',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { gearbox: 'wind/gearbox' },
  guides: [{ stage: 'hub', origin: [4.3, AXIS_Y, 0] }],
  centreLines: [[[-5, AXIS_Y, 0], [8.2, AXIS_Y, 0], 2.0], [[0, -1, 0], [0, 4, 0]]],
  steps: STEPS,
  camera: { target: [1.4, 1.4, 0], offset: [7, 8, 22], orthoDistance: 80, exploded: { target: [1.6, 2.0, 0.6], scale: 1.4 } },
  Model: Nacelle,
  Driver: WindDriver,
});
