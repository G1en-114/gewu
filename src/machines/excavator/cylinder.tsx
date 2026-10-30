import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Turn } from '../kit';

/**
 * Double-acting hydraulic cylinder, pin to pin along local +x from the cap
 * eye (x = 0) to the rod eye (x = L). Metres. The same model is drawn inside
 * the excavator, where its two pins are found from the linkage each frame.
 */

export interface CylinderSpec {
  /** Pin-to-pin length fully retracted and fully extended. */
  min: number;
  max: number;
  /** Bore radius and rod radius. */
  bore: number;
  rod: number;
}

type P = [number, number];

/** Draws one cylinder between two moving pins (in the parent's x–y plane at depth z). */
export function HydCylinder({ ends, z = 0, spec, k }: { ends: () => [P, P]; z?: number; spec: CylinderSpec; k: string }) {
  const frame = useRef<THREE.Group>(null);
  const rod = useRef<THREE.Group>(null);
  const { min, max, bore, rod: rr } = spec;
  const wall = bore * 0.18;
  const barrelEnd = min - 0.14;
  const rodLen = max - min + 0.28;
  useFrame(() => {
    const [a, b] = ends();
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (frame.current) {
      frame.current.position.set(a[0], a[1], z);
      frame.current.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
    }
    if (rod.current) rod.current.position.x = L - rodLen;
  });
  const eye = bore * 0.9;
  return (
    <group ref={frame}>
      <Part id="barrel">
        <Turn k={`${k}-barrel`} profile={[[bore, 0.1], [bore + wall, 0.1], [bore + wall, barrelEnd], [bore, barrelEnd]]} axis="x" seg={32} />
        <Turn k={`${k}-cap`} profile={[[0, 0.06], [bore + wall, 0.06], [bore + wall, 0.12], [0, 0.12]]} axis="x" seg={32} />
        <Box c={[0.03, 0, 0]} s={[0.12, eye * 1.6, eye * 1.4]} />
        <Cyl c={[0, 0, 0]} r={eye * 0.8} len={eye * 1.6} axis="z" seg={20} />
        <Callout id="barrel" p={[barrelEnd * 0.5, bore + wall, 0.05]} />
      </Part>
      <Part id="ports">
        {[0.22, barrelEnd - 0.12].map((x) => (
          <group key={x}>
            <Cyl c={[x, bore + wall + 0.04, 0]} r={bore * 0.28} len={0.1} seg={12} />
            <Cyl c={[x, bore + wall + 0.1, 0]} r={bore * 0.36} len={0.04} seg={6} />
          </group>
        ))}
        <Callout id="ports" p={[0.22, bore + wall + 0.12, 0]} />
      </Part>
      <Part id="gland">
        <Turn k={`${k}-gland`} profile={[[rr, barrelEnd - 0.1], [bore + wall + 0.012, barrelEnd - 0.01], [bore + wall + 0.012, barrelEnd + 0.12], [rr, barrelEnd + 0.12]]} axis="x" seg={32} />
        {[barrelEnd + 0.02, barrelEnd + 0.08].map((x) => <Turn key={x} k={`${k}-rod-seal`} profile={[[rr, 0], [rr + 0.012, 0], [rr + 0.012, 0.02], [rr, 0.02]]} p={[x, 0, 0]} axis="x" seg={24} />)}
        <Callout id="gland" p={[barrelEnd + 0.05, bore + 0.05, 0.05]} />
      </Part>
      <group ref={rod}>
        <Part id="piston">
          <Turn k={`${k}-piston`} profile={[[rr * 0.4, 0], [bore - 0.003, 0], [bore - 0.003, 0.12], [rr * 0.4, 0.12]]} axis="x" seg={32} />
          {[0.025, 0.08].map((x) => <Turn key={x} k={`${k}-piston-seal`} profile={[[bore - 0.012, 0], [bore, 0], [bore, 0.018], [bore - 0.012, 0.018]]} p={[x, 0, 0]} axis="x" seg={32} />)}
          <Callout id="piston" p={[0.06, bore * 0.6, 0.03]} />
        </Part>
        <Part id="rod">
          <Cyl c={[rodLen / 2 + 0.06, 0, 0]} r={rr} len={rodLen - 0.12} axis="x" seg={24} />
          <Box c={[rodLen - 0.04, 0, 0]} s={[0.12, eye * 1.6, eye * 1.4]} />
          <Cyl c={[rodLen, 0, 0]} r={eye * 0.8} len={eye * 1.6} axis="z" seg={20} />
          <Callout id="rod" p={[rodLen * 0.7, rr, 0.03]} />
        </Part>
      </group>
    </group>
  );
}

const SPEC: CylinderSpec = { min: 1.7, max: 2.7, bore: 0.1, rod: 0.06 };
export const cylMotion = { t: 0 };

export function CylinderDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) cylMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}

function Standalone() {
  const L = () => SPEC.min + (SPEC.max - SPEC.min) * (0.5 - 0.5 * Math.cos(cylMotion.t * 0.9));
  return (
    <group>
      <HydCylinder k="demo" spec={SPEC} ends={() => [[0, 0], [L(), 0]]} />
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'barrel', index: 1, name: '缸筒与缸底', en: 'Barrel & Cap', role: '承压 · 固定端', material: '无缝钢管', description: '内壁精磨得像镜子一样光滑。尾部焊着缸底和耳环，用销轴挂在机器上。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'gland', index: 2, name: '导向套（缸盖）', en: 'Gland', role: '导向 · 封住杆端', material: '铸铁 / 青铜', description: '拧在缸筒口上，给活塞杆导向；里面的杆密封和防尘圈挡住油往外漏、灰往里进。', explode: [1.2, 0, 0], stage: [0.12, 0.3] },
  { id: 'piston', index: 3, name: '活塞', en: 'Piston', role: '把缸分成两腔', material: '钢', description: '把缸筒分成无杆腔和有杆腔。油从哪边进，活塞就被推向另一边。', explode: [2.4, -0.35, 0], stage: [0.42, 0.62] },
  { id: 'rod', index: 4, name: '活塞杆', en: 'Rod', role: '输出推拉力', material: '镀硬铬钢', description: '表面镀硬铬，耐磨防锈。无杆腔面积大，所以“推”比“拉”力气大。', explode: [2.4, 0, 0], stage: [0.3, 0.5] },
  { id: 'ports', index: 5, name: '油口', en: 'Ports', role: '进油 · 回油', material: '钢', description: '两头各一个：一个进高压油，另一个同时回油到油箱。换一下方向，杆就从伸出变成缩回。', explode: [0, 0.5, 0], stage: [0, 0.12] },
];

const STEPS: StepDef[] = [
  {
    title: '液压缸', en: 'Hydraulic Cylinder',
    body: '挖掘机的“肌肉”。高压油（约 35 MPa）推着活塞走，力量很大：一个缸径 200 mm 的缸，推力就能超过 100 吨力。',
    state: { explode: 0, section: true, running: true, select: 'piston', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆下油口，拧出导向套，把活塞杆连同活塞一起从缸筒里抽出来。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const cylinderLevel: MachineDef = level({
  id: 'excavator/cylinder',
  parent: 'excavator',
  unit: 3.5,
  bounds: [[-0.12, -0.2, -0.13], [2.8, 0.25, 0.13]],
  name: '液压缸',
  en: 'Hydraulic Cylinder',
  subtitle: '子组件 · 双作用油缸',
  summary: '5 种零件：缸筒、导向套、活塞、活塞杆、油口',
  drawingNo: 'GW-WJ-11',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'rod', origin: [2.2, 0, 0] }],
  centreLines: [[[-0.3, 0, 0], [3.0, 0, 0], 0.14]],
  steps: STEPS,
  camera: { target: [1.3, 0, 0], offset: [2.4, 2.4, 5.8], orthoDistance: 9, exploded: { target: [2.2, 0, 0], scale: 1.6 } },
  Model: Standalone,
  Driver: CylinderDriver,
});
