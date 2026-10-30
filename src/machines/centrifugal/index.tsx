import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, Turn, XY_Z } from '../kit';

/**
 * End-suction centrifugal pump. Shaft along z (motor behind, −z), suction
 * inlet toward +z, the volute in the plane z = 0 discharging upward (+y).
 * Millimetres; the section plane z = 0 cuts through the impeller.
 */

const R_IMP = 90;
const R_EYE = 34;
const VANES = 6;

export const pumpMotion = { a: 0 };
export function PumpDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) pumpMotion.a += Math.min(dt, 0.05) * 3; }, -1);
  return null;
}

/** Volute radius grows with angle from the cutwater, so the passage widens toward the outlet. */
const voluteR = (t: number) => R_IMP + 8 + 46 * (t / (Math.PI * 2));

function voluteShape() {
  const s = new THREE.Shape();
  const n = 72;
  const wall = 10;
  // Outer wall: spiral, then out along the discharge throat.
  for (let i = 0; i <= n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    const r = voluteR(t) + wall;
    const p: [number, number] = [r * Math.cos(t - Math.PI / 2 + 0.2), r * Math.sin(t - Math.PI / 2 + 0.2)];
    if (i === 0) s.moveTo(...p); else s.lineTo(...p);
  }
  s.lineTo(-40, 230);
  s.lineTo(28, 230);
  s.lineTo(28, R_IMP + 10);
  s.closePath();
  const hole = new THREE.Path();
  for (let i = 0; i <= n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    const r = voluteR(t);
    const p: [number, number] = [r * Math.cos(t - Math.PI / 2 + 0.2), r * Math.sin(t - Math.PI / 2 + 0.2)];
    if (i === 0) hole.moveTo(...p); else hole.lineTo(...p);
  }
  hole.lineTo(-30, 230);
  hole.lineTo(18, 230);
  hole.lineTo(18, R_IMP + 10);
  hole.closePath();
  s.holes.push(hole);
  return s;
}

/** Backward-curved vane in the impeller plane. */
function vaneShape() {
  const s = new THREE.Shape();
  const n = 16;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i += 1) {
    const u = i / n;
    const r = R_EYE + (R_IMP - R_EYE) * u;
    const t = -1.1 * u;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  s.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => s.lineTo(...p));
  pts.reverse().forEach(([x, y]) => { const k = 1 + 5 / Math.hypot(x, y); s.lineTo(x * k - y * 0.04, y * k + x * 0.04); });
  s.closePath();
  return s;
}

function Spin({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = -pumpMotion.a; });
  return <group ref={ref}>{children}</group>;
}

/** Water: dots spiralling out through the impeller, round the volute and up the outlet. */
function Flow() {
  const N = 36;
  const refs = useRef<Array<THREE.Group | null>>([]);
  useFrame(() => {
    refs.current.forEach((g, i) => {
      if (!g) return;
      const u = (((pumpMotion.a * 0.12 + i / N) % 1) + 1) % 1;
      let x: number;
      let y: number;
      if (u < 0.3) {
        const k = u / 0.3;
        const r = R_EYE * 0.5 + (R_IMP - R_EYE * 0.5) * k;
        const t = -pumpMotion.a * 0.3 - k * 1.8 + i * 1.3;
        x = r * Math.cos(t); y = r * Math.sin(t);
      } else if (u < 0.8) {
        const k = (u - 0.3) / 0.5;
        const t = ((i * 1.3) % (Math.PI * 2)) * (1 - k) + Math.PI * 2 * k;
        const r = (R_IMP + voluteR(t)) / 2;
        x = r * Math.cos(t - Math.PI / 2 + 0.2); y = r * Math.sin(t - Math.PI / 2 + 0.2);
      } else {
        const k = (u - 0.8) / 0.2;
        x = -6; y = R_IMP + 20 + k * 200;
      }
      g.position.set(x, y, -2);
    });
  });
  return (
    <>
      {Array.from({ length: N }, (_, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }}><Cyl c={[0, 0, 0]} r={4} len={4} axis="z" seg={8} /></group>
      ))}
    </>
  );
}

export function CentrifugalPump() {
  return (
    <group>
      <Part id="casing">
        <Plate k="cp-volute" shape={voluteShape} depth={60} p={[0, 0, -40]} r={XY_Z} />
        <Turn k="cp-back" profile={[[22, -46], [R_IMP + 60, -46], [R_IMP + 60, -40], [22, -40]]} axis="z" seg={64} />
        <Turn k="cp-front" profile={[[R_EYE + 6, 20], [R_IMP + 60, 20], [R_IMP + 60, 26], [R_EYE + 6, 26]]} axis="z" seg={64} />
        <Turn k="cp-outlet-flange" profile={[[28, 0], [52, 0], [52, 12], [28, 12]]} p={[-6, 230, -10]} seg={32} />
        <Box c={[0, -175, -10]} s={[200, 12, 120]} />
        <Callout id="casing" p={[-140, 40, 10]} />
      </Part>
      <Part id="suction">
        <Turn k="cp-suction" profile={[[R_EYE - 4, 26], [R_EYE + 6, 26], [R_EYE + 6, 140], [R_EYE + 22, 140], [R_EYE + 22, 152], [R_EYE - 4, 152]]} axis="z" seg={40} />
        <Callout id="suction" p={[0, R_EYE + 10, 120]} />
      </Part>
      <Part id="impeller">
        <Spin>
          <Turn k="cp-hub" profile={[[14, -30], [R_IMP, -30], [R_IMP, -24], [30, -20], [30, 6], [14, 6]]} axis="z" seg={56} />
          <Turn k="cp-shroud" profile={[[R_EYE, 12], [R_IMP, 4], [R_IMP, 10], [R_EYE, 18]]} axis="z" seg={56} />
          {Array.from({ length: VANES }, (_, i) => (
            <group key={i} rotation={[0, 0, (i / VANES) * Math.PI * 2]}>
              <Plate k="cp-vane" shape={vaneShape} depth={30} p={[0, 0, -24]} r={XY_Z} />
            </group>
          ))}
        </Spin>
        <Callout id="impeller" p={[60, 40, 20]} />
      </Part>
      <Part id="water">
        <Flow />
        <Callout id="water" p={[-10, 180, 4]} />
      </Part>
      <Part id="seal">
        <Turn k="cp-seal" profile={[[14, -70], [30, -70], [30, -50], [14, -50]]} axis="z" seg={32} />
        <Callout id="seal" p={[30, 20, -60]} />
      </Part>
      <Part id="shaft">
        <Spin><Cyl c={[0, 0, -120]} r={14} len={200} axis="z" seg={24} /></Spin>
        <Callout id="shaft" p={[0, 16, -150]} />
      </Part>
      <Part id="bearing">
        <Turn k="cp-bracket" profile={[[30, -200], [70, -200], [70, -90], [30, -90]]} axis="z" seg={40} />
        {[-180, -110].map((z) => <Turn key={z} k="cp-bearing" profile={[[14, -8], [30, -8], [30, 8], [14, 8]]} p={[0, 0, z]} axis="z" seg={28} />)}
        <Box c={[0, -120, -145]} s={[60, 110, 80]} />
        <Callout id="bearing" p={[60, 50, -150]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'casing', index: 1, name: '蜗壳', en: 'Volute Casing', role: '收集 · 增压', material: '铸铁', description: '像蜗牛壳一样越往出口越宽：叶轮甩出来的高速水流在这里减速，速度变成压力，再从顶上的出水口送出去。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'suction', index: 2, name: '进水口', en: 'Suction Nozzle', role: '吸入', material: '铸铁', description: '水从正对叶轮中心的“叶轮眼”进来。泵本身不能把水“吸”上来很高：吸程最多七八米。', explode: [0, 0, 120], stage: [0, 0.14] },
  { id: 'impeller', index: 3, name: '叶轮', en: 'Impeller', role: '甩水', material: '铸铁 / 不锈钢', description: '6 片向后弯的叶片。叶轮转起来，叶片之间的水被离心力甩向外圈，中心变成低压，新的水就源源不断地流进来。', explode: [0, 0, 80], stage: [0.2, 0.36] },
  { id: 'water', index: 4, name: '水流', en: 'Water', role: '工作介质', material: '—', description: '小点画出水的路线：从中心进、沿叶片甩出、绕蜗壳一圈、向上流出。', explode: [0, 0, 160], stage: [0.08, 0.2] },
  { id: 'seal', index: 5, name: '机械密封', en: 'Mechanical Seal', role: '防漏', material: '碳 / 碳化硅', description: '一对紧贴着的耐磨环，一个跟轴转、一个不转，把水挡在泵壳里。', explode: [0, 60, -40], stage: [0.36, 0.5] },
  { id: 'shaft', index: 6, name: '泵轴', en: 'Shaft', role: '传动', material: '不锈钢', description: '一头装叶轮，另一头接电机。', explode: [0, 0, -160], stage: [0.5, 0.64] },
  { id: 'bearing', index: 7, name: '轴承架', en: 'Bearing Bracket', role: '支承', material: '铸铁', description: '两个滚动轴承托住泵轴，承受叶轮的重量和不平衡的水压。', explode: [0, 0, -280], stage: [0.64, 0.8] },
];

const STEPS: StepDef[] = [
  {
    title: '离心泵', en: 'Centrifugal Pump',
    body: '剖开正面：叶轮转起来把水往外甩，中心变成低压，水从进水口被“吸”进来；蜗壳越往出口越宽，把速度变成压力，水从顶上被压出去。小点画出水流。',
    state: { explode: 0, section: true, running: true, select: 'impeller', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆进水口、取出叶轮，退出机械密封，再抽出泵轴和轴承架。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const centrifugal: MachineDef = level({
  id: 'centrifugal',
  unit: 0.02,
  bounds: [[-150, -180, -200], [150, 242, 152]],
  name: '离心泵',
  en: 'Centrifugal Pump',
  subtitle: '装配体 · 单级端吸 · 蜗壳',
  summary: '7 种零件 · 叶轮甩水、蜗壳增压，水流可见',
  drawingNo: 'GW-LXB-00',
  scale: '1 : 5',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'impeller', origin: [0, 0, 0] }],
  centreLines: [[[0, 0, -220], [0, 0, 170], R_IMP + 60]],
  steps: STEPS,
  camera: { target: [0, 40, 0], offset: [340, 280, 1250], orthoDistance: 3200, exploded: { target: [0, 20, -40], scale: 1.4 } },
  Model: CentrifugalPump,
  Driver: PumpDriver,
});
