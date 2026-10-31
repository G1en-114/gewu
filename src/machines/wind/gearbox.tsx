import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, Turn, YZ_X } from '../kit';

/**
 * Wind-turbine gearbox: one planetary stage then two parallel helical stages
 * (drawn as spur gears), about 1 : 99. Input (rotor side) at x = 0 along +x,
 * output at the back; all shafts in the plane z = 0. Metres.
 */

const MOD = 0.02;
const pr = (teeth: number) => (teeth * MOD) / 2;
const RING = 96;
const SUN = 24;
const PLANET = (RING - SUN) / 2;
const CARRIER_R = pr(SUN) + pr(PLANET);
const G1 = 90;
const P1 = 20;
const G2 = 88;
const P2 = 20;
const Y2 = pr(G1) + pr(P1);
const Y3 = Y2 - (pr(G2) + pr(P2));
export const GEAR_RATIO = (1 + RING / SUN) * (G1 / P1) * (G2 / P2);

/** Rotor angle, shared by every level of the wind turbine. */
export const windMotion = { rotor: 0 };
export function WindDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) windMotion.rotor += Math.min(dt, 0.05) * 0.5; }, -1);
  return null;
}

const angles = () => {
  const c = windMotion.rotor;
  const sun = c * (1 + RING / SUN);
  const shaft2 = -sun * (G1 / P1);
  return { carrier: c, planet: -c * (RING / PLANET), sun, shaft2, output: -shaft2 * (G2 / P2) };
};

function Spin({ k, at = [0, 0], children }: { k: keyof ReturnType<typeof angles>; at?: [number, number]; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = angles()[k]; });
  return <group position={[0, at[0], at[1]]}><group ref={ref}>{children}</group></group>;
}

function Gear({ k, x, teeth, w, bore = 0.05 }: { k: string; x: number; teeth: number; w: number; bore?: number }) {
  return <Plate k={`wg-${k}`} shape={() => gearShape(teeth, pr(teeth), MOD, bore)} depth={w} p={[x, 0, 0]} r={YZ_X} />;
}

/** Ring gear: internal teeth cut in a thick annulus. */
function ringShape() {
  const s = new THREE.Shape();
  s.absarc(0, 0, pr(RING) + 0.12, 0, Math.PI * 2, false);
  const teeth = gearShape(RING, pr(RING), -MOD, 0.01);
  s.holes.push(new THREE.Path(teeth.getPoints(2)));
  return s;
}

export function WindGearbox() {
  return (
    <group>
      <Part id="housing">
        <Turn k="wg-front" profile={[[0.12, 0.02], [1.18, 0.02], [1.18, 0.66], [0.3, 0.7], [0.3, 0.62], [1.1, 0.6], [1.1, 0.1], [0.12, 0.1]]} axis="x" seg={64} />
        <Box c={[1.32, 0.3, 0]} s={[0.04, 2.7, 0.9]} />
        <Box c={[1.92, 0.3, 0]} s={[0.04, 2.7, 0.9]} />
        <Box c={[1.62, 1.63, 0]} s={[0.64, 0.04, 0.9]} />
        <Box c={[1.62, -1.03, 0]} s={[0.64, 0.04, 0.9]} />
        {[1, -1].map((s) => <Box key={s} c={[0.5, 0, s * 1.3]} s={[0.4, 0.3, 0.3]} />)}
        <Callout id="housing" p={[1.6, 1.5, 0.4]} />
      </Part>
      <Part id="ring">
        <Plate k="wg-ring" shape={ringShape} depth={0.26} p={[0.25, 0, 0]} r={YZ_X} />
        <Callout id="ring" p={[0.38, pr(RING) + 0.1, 0.3]} />
      </Part>
      <Part id="carrier">
        <Spin k="carrier">
          <Turn k="wg-carrier" profile={[[0.18, 0.12], [CARRIER_R + 0.18, 0.12], [CARRIER_R + 0.18, 0.2], [0.18, 0.2]]} axis="x" seg={48} />
          <Turn k="wg-carrier-b" profile={[[0.18, 0.54], [CARRIER_R + 0.18, 0.54], [CARRIER_R + 0.18, 0.6], [0.18, 0.6]]} axis="x" seg={48} />
          <Cyl c={[-0.2, 0, 0]} r={0.32} len={0.6} axis="x" seg={32} />
        </Spin>
        <Callout id="carrier" p={[-0.3, 0.35, 0.2]} />
      </Part>
      <Part id="planets">
        <Spin k="carrier">
          {[0, 1, 2].map((i) => {
            const a = (i * Math.PI * 2) / 3 + Math.PI / 2;
            return (
              <group key={i} position={[0, CARRIER_R * Math.cos(a), CARRIER_R * Math.sin(a)]}>
                <Spin k="planet">
                  <Gear k="planet" x={0.26} teeth={PLANET} w={0.24} bore={0.06} />
                  <Cyl c={[0.38, 0, 0]} r={0.06} len={0.5} axis="x" seg={16} />
                </Spin>
              </group>
            );
          })}
        </Spin>
        <Callout id="planets" p={[0.4, CARRIER_R + 0.3, 0.2]} />
      </Part>
      <Part id="sun">
        <Spin k="sun">
          <Gear k="sun" x={0.26} teeth={SUN} w={0.24} />
          <Cyl c={[0.8, 0, 0]} r={0.08} len={1.0} axis="x" seg={20} />
          <Gear k="g1" x={1.42} teeth={G1} w={0.14} />
        </Spin>
        <Callout id="sun" p={[0.9, 0.12, 0.1]} />
      </Part>
      <Part id="intermediate">
        <Spin k="shaft2" at={[Y2, 0]}>
          <Gear k="p1" x={1.42} teeth={P1} w={0.16} bore={0.04} />
          <Cyl c={[1.62, 0, 0]} r={0.06} len={0.6} axis="x" seg={16} />
          <Gear k="g2" x={1.68} teeth={G2} w={0.12} bore={0.04} />
        </Spin>
        <Callout id="intermediate" p={[1.6, Y2 + 0.3, 0.2]} />
      </Part>
      <Part id="output">
        <Spin k="output" at={[Y3, 0]}>
          <Gear k="p2" x={1.68} teeth={P2} w={0.14} bore={0.03} />
          <Cyl c={[2.15, 0, 0]} r={0.06} len={0.9} axis="x" seg={16} />
        </Spin>
        <Callout id="output" p={[2.5, Y3 + 0.1, 0.1]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'housing', index: 1, name: '箱体', en: 'Housing', role: '支承 · 油池', material: '球墨铸铁', description: '两侧的扭力臂把齿轮箱支在机舱底座上，承受叶轮传来的巨大扭矩。', explode: [0, 0, -2.0], stage: [0, 0.14] },
  { id: 'ring', index: 2, name: '内齿圈', en: 'Ring Gear', role: '固定不动', material: '渗碳钢', description: '96 个齿长在里面。它固定在箱体上，行星轮沿着它滚。', explode: [0, 1.6, 0], stage: [0.14, 0.28] },
  { id: 'carrier', index: 3, name: '行星架', en: 'Planet Carrier', role: '输入', material: '球墨铸铁', description: '前端直接接主轴，跟着叶轮慢慢转（每分钟十几转），带着三个行星轮绕太阳轮公转。', explode: [-1.3, 0, 0], stage: [0.42, 0.56] },
  { id: 'planets', index: 4, name: '行星轮 ×3', en: 'Planet Gears', role: '分担载荷', material: '渗碳钢', description: '三个行星轮同时传力，把巨大的扭矩分成三份。它们一边公转一边自转。', explode: [-0.8, 0, 1.2], stage: [0.3, 0.44] },
  { id: 'sun', index: 5, name: '太阳轮轴', en: 'Sun Shaft', role: '第一级输出', material: '渗碳钢', description: '齿圈固定、行星架输入、太阳轮输出：转速放大 1 + 96/24 = 5 倍。轴后端是第二级的大齿轮。', explode: [0, -0.8, 0.8], stage: [0.56, 0.7] },
  { id: 'intermediate', index: 6, name: '中间轴', en: 'Intermediate Shaft', role: '第二级', material: '渗碳钢', description: '90/20 一对，再放大 4.5 倍。', explode: [0, 1.0, 1.0], stage: [0.68, 0.82] },
  { id: 'output', index: 7, name: '高速输出轴', en: 'High-Speed Shaft', role: '第三级 · 接发电机', material: '渗碳钢', description: '88/20 再放大 4.4 倍。到这里转速约为叶轮的 99 倍，每分钟一千多转，正好带动发电机。', explode: [0.9, -0.6, 0.6], stage: [0.8, 0.94] },
];

const STEPS: StepDef[] = [
  {
    title: '增速齿轮箱', en: 'Step-Up Gearbox',
    body: `叶轮转得慢、扭矩大；发电机要转得快。齿轮箱把转速放大约 ${Math.round(GEAR_RATIO)} 倍：一级行星（×5）+ 两级平行轴（×4.5、×4.4）。`,
    state: { explode: 0, section: true, running: true, select: 'planets', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆箱体和内齿圈，取出行星轮和行星架，再抽出太阳轮轴、中间轴和高速轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const windGearboxLevel: MachineDef = level({
  id: 'wind/gearbox',
  parent: 'wind/nacelle',
  unit: 3.2,
  bounds: [[-0.5, -1.15, -1.45], [2.6, 1.65, 1.45]],
  name: '齿轮箱',
  en: 'Wind Turbine Gearbox',
  subtitle: `子组件 · 行星 + 两级平行轴 · 约 1 : ${Math.round(GEAR_RATIO)}`,
  summary: '7 种零件：内齿圈、行星架、行星轮、太阳轮、中间轴、高速轴',
  drawingNo: 'GW-FD-21',
  scale: '1 : 20',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'carrier', origin: [-0.5, 0, 0] }],
  centreLines: [[[-0.7, 0, 0], [2.8, 0, 0], 1.2]],
  steps: STEPS,
  camera: { target: [1.0, 0.3, 0], offset: [3.5, 3.2, 8.6], orthoDistance: 22, exploded: { target: [0.8, 0.4, 0.4], scale: 1.5 } },
  Model: WindGearbox,
  Driver: WindDriver,
});
