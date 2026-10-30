import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, dome, level, Plate, Turn } from '../kit';

/**
 * 50 mm lens with a nine-blade iris. Optical axis along z (front toward +z),
 * the iris in the plane z = 0. Millimetres.
 */

const BLADES = 9;
const PIVOT_R = 17;
const FOCAL = 50;

export const irisMotion = { t: 0 };
export function IrisDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) irisMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}
/** 0 = wide open, 1 = stopped down. */
export const closing = (t: number) => 0.5 - 0.5 * Math.cos(t * 0.6);
/** Blade swing about its pivot (negative = out of the light path). */
const swing = (k: number) => -1.0 + k * 1.45;
const ARC: [number, number, number, number, number] = [-11, 7.5, 14.5, -0.35, 2.05];

/** Opening diameter: twice the nearest approach of a blade to the axis. */
function diameter(k: number) {
  const [c, r0, r1, t0, t1] = ARC;
  const th = swing(k);
  let best = Infinity;
  for (let i = 0; i < 120; i += 1) {
    const t = t0 + ((t1 - t0) * i) / 119;
    for (const r of [r0, r1]) {
      const x = c + r * Math.cos(t);
      const y = r * Math.sin(t);
      const xr = x * Math.cos(th) - y * Math.sin(th);
      const yr = x * Math.sin(th) + y * Math.cos(th);
      best = Math.min(best, Math.hypot(PIVOT_R - yr, xr));
    }
  }
  return 2 * best;
}

/**
 * Blade in its own frame, pivot at the origin, local +y pointing at the
 * optical axis: a curved strip on circles round (-11, 0), swinging inward.
 */
function bladeShape() {
  const s = new THREE.Shape();
  const n = 28;
  const [c, r0, r1, t0, t1] = ARC;
  const at = (r: number, t: number): [number, number] => [c + r * Math.cos(t), r * Math.sin(t)];
  for (let i = 0; i <= n; i += 1) {
    const p = at(r1, t0 + ((t1 - t0) * i) / n);
    if (i === 0) s.moveTo(...p); else s.lineTo(...p);
  }
  for (let i = n; i >= 0; i -= 1) s.lineTo(...at(r0, t0 + ((t1 - t0) * i) / n));
  s.closePath();
  return s;
}

function Blade({ i }: { i: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = swing(closing(irisMotion.t)); });
  const a = (i / BLADES) * Math.PI * 2;
  return (
    <group rotation={[0, 0, a]}>
      <group position={[PIVOT_R, 0, -0.6 - 0.14 * (i % 3)]} rotation={[0, 0, Math.PI / 2]}>
        <group ref={ref}>
          <Plate k="ap-blade" shape={bladeShape} depth={0.12} p={[0, 0, 0]} r={[0, 0, 0]} />
          <Cyl c={[0, 0, -0.3]} r={0.8} len={0.6} axis="z" seg={10} />
        </group>
      </group>
    </group>
  );
}

function Turning({ rate, children }: { rate: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = closing(irisMotion.t) * rate; });
  return <group ref={ref}>{children}</group>;
}

export function Lens() {
  return (
    <group>
      <Part id="barrel">
        <Turn k="ap-barrel" profile={[[24, -22], [27, -22], [27, 22], [24, 22]]} axis="z" seg={72} />
        <Turn k="ap-front-rim" profile={[[20, 22], [27, 22], [27, 26], [20, 24]]} axis="z" seg={72} />
        <Callout id="barrel" p={[0, 27, 14]} />
      </Part>
      <Part id="front">
        <Turn k="ap-front-lens" profile={[...dome(19, 12, 6, 0.01, 16).slice(0, 17), [0, 9], [19, 9]]} axis="z" seg={56} />
        <Turn k="ap-front-2" profile={[[0, 4], [15, 4], [15, 7], [0, 8.5]]} axis="z" seg={48} />
        <Callout id="front" p={[0, 10, 18]} />
      </Part>
      <Part id="rear">
        <Turn k="ap-rear-lens" profile={[[0, -4], [15, -4], [15, -7], [0, -8.5]]} axis="z" seg={48} />
        <Turn k="ap-rear-2" profile={[[0, -12], [16, -11], [16, -15], [0, -17]]} axis="z" seg={48} />
        <Callout id="rear" p={[0, -10, -14]} />
      </Part>
      <Part id="base-ring">
        <Turn k="ap-base" profile={[[19, -1.6], [24, -1.6], [24, -1.1], [19, -1.1]]} axis="z" seg={64} />
        {Array.from({ length: BLADES }, (_, i) => {
          const a = (i / BLADES) * Math.PI * 2;
          return <Cyl key={i} c={[PIVOT_R * Math.cos(a), PIVOT_R * Math.sin(a), -1.0]} r={0.6} len={1.2} axis="z" seg={8} />;
        })}
        <Callout id="base-ring" p={[-22, -10, -1]} />
      </Part>
      <Part id="blades">
        {Array.from({ length: BLADES }, (_, i) => <Blade key={i} i={i} />)}
        <Callout id="blades" p={[8, 8, 1]} />
      </Part>
      <Part id="cam-ring">
        <Turning rate={0.35}>
          <Turn k="ap-cam" profile={[[20, 0.9], [24, 0.9], [24, 1.4], [20, 1.4]]} axis="z" seg={64} />
          {Array.from({ length: BLADES }, (_, i) => {
            const a = (i / BLADES) * Math.PI * 2 + 0.25;
            return <Box key={i} c={[21.5 * Math.cos(a), 21.5 * Math.sin(a), 1.5]} s={[3.6, 0.6, 0.3]} r={[0, 0, a + 0.9]} />;
          })}
          <Box c={[0, 24.6, 1.1]} s={[1.6, 2, 1]} />
        </Turning>
        <Callout id="cam-ring" p={[18, -16, 2]} />
      </Part>
      <Part id="aperture-ring">
        <Turning rate={0.35}>
          <Turn k="ap-ring" profile={[[27, -6], [29, -6], [29, 2], [27, 2]]} axis="z" seg={72} />
          {Array.from({ length: 36 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i / 36) * Math.PI * 2]}><Box c={[29.1, 0, -2]} s={[0.4, 0.8, 7]} /></group>
          ))}
        </Turning>
        <Callout id="aperture-ring" p={[-29, 0, -2]} />
      </Part>
      <Part id="mount">
        <Turn k="ap-mount" profile={[[21, -22], [26, -22], [26, -25], [23, -25], [23, -28], [21, -28]]} axis="z" seg={64} />
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}><Box c={[24.5, 0, -27.6]} s={[3, 10, 1]} /></group>
        ))}
        <Callout id="mount" p={[0, -26, -26]} />
      </Part>
    </group>
  );
}

const STOPS = [2, 2.8, 4, 5.6, 8, 11, 16];

export function IrisControls() {
  const [k, setK] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setK(closing(irisMotion.t)), 100);
    return () => window.clearInterval(id);
  }, []);
  const f = FOCAL / diameter(k);
  const near = STOPS.reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a));
  return (
    <>
      <div className="strokes">
        {STOPS.map((s) => <span key={s} className={s === near ? 'is-on' : ''}>f/{s}</span>)}
      </div>
      <p className="gear-note">通光孔径 {diameter(k).toFixed(1)} mm，f/{f.toFixed(1)}。f 值每加一档（×1.4），进光量减半，景深变深。</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'barrel', index: 1, name: '镜筒', en: 'Barrel', role: '外壳', material: '铝合金', description: '把所有镜片和光圈机构固定在同一条光轴上，前端可以拧滤镜。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'front', index: 2, name: '前组镜片', en: 'Front Group', role: '聚光', material: '光学玻璃', description: '光线先经过的几片透镜。50 mm 标准镜头一般是双高斯结构：光圈前后各一组，近乎对称。', explode: [0, 0, 40], stage: [0.08, 0.2] },
  { id: 'rear', index: 3, name: '后组镜片', en: 'Rear Group', role: '成像', material: '光学玻璃', description: '和前组一起把光聚到底片或传感器上，并校正像差。', explode: [0, 0, -44], stage: [0.2, 0.32] },
  { id: 'blades', index: 4, name: '光圈叶片 ×9', en: 'Iris Blades', role: '围成可变的孔', material: '发黑钢片', description: '九片弧形薄钢片，一头铰在固定环上。它们同时向内摆，交叠出一个近似圆形的孔——叶片越多，孔越圆，焦外光斑也越圆。', explode: [0, 0, 14], stage: [0.5, 0.66] },
  { id: 'base-ring', index: 5, name: '固定环', en: 'Pivot Ring', role: '叶片支点', material: '黄铜', description: '九个小销钉，每片叶片绕一个销钉摆动。', explode: [0, 0, 4], stage: [0.72, 0.86] },
  { id: 'cam-ring', index: 6, name: '拨动环', en: 'Actuating Ring', role: '同时拨动所有叶片', material: '黄铜', description: '环上有九条斜槽，每片叶片另一头的销子插在槽里。环一转，九片叶片一起转过同样的角度。', explode: [0, 0, 24], stage: [0.36, 0.5] },
  { id: 'aperture-ring', index: 7, name: '光圈环', en: 'Aperture Ring', role: '手动选光圈', material: '铝合金', description: '镜筒外的一圈刻着 f 值，转动它就带着拨动环转。每一档有“咔嗒”定位。', explode: [0, 0, 60], stage: [0.2, 0.34] },
  { id: 'mount', index: 8, name: '卡口', en: 'Bayonet Mount', role: '连接机身', material: '不锈钢', description: '三个凸爪插进机身卡口转一下就锁住。', explode: [0, 0, -64], stage: [0, 0.1] },
];

const STEPS: StepDef[] = [
  {
    title: '光圈', en: 'Iris Diaphragm',
    body: '把前组镜片剖掉，正对着看镜头中间那个能变大变小的孔：九片叶片由一个拨动环同时驱动，孔从 f/2 收到 f/16。左栏实时显示当前 f 值。',
    state: { explode: 0, section: true, running: true, select: 'blades', focus: 'front' },
  },
  {
    title: '整支镜头', en: 'The Lens',
    body: '光圈夹在前后两组镜片正中间——这是光线最“细”的地方，在这里收窄孔径，画面整体变暗，而不会只挡住一个角。外面那圈光圈环带着里面的拨动环一起转。',
    state: { explode: 0, section: false, running: true, select: 'aperture-ring', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆下卡口和前后镜组，取下光圈环和拨动环，九片叶片就松开了，最后是固定环。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const aperture: MachineDef = level({
  id: 'aperture',
  unit: 0.12,
  bounds: [[-29, -29, -28], [29, 29, 26]],
  name: '镜头光圈',
  en: 'Lens Iris Diaphragm',
  subtitle: '装配体 · 九叶片光圈 · 50 mm 标准镜头',
  summary: '8 种零件 · 九片叶片同时收放，实时显示 f 值',
  drawingNo: 'GW-GQ-10',
  scale: '2 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'front', origin: [0, 0, 22] }],
  centreLines: [[[0, 0, -34], [0, 0, 32], 27]],
  steps: STEPS,
  camera: { target: [0, 0, 0], offset: [70, 50, 120], orthoDistance: 500, exploded: { target: [0, 0, 0], scale: 1.6 }, foci: { front: { target: [0, 0, 0], scale: 0.85 } } },
  Model: Lens,
  Driver: IrisDriver,
  Controls: IrisControls,
});
