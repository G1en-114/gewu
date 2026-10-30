import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, Hoop, level, Plate, Rod, Turn } from '../kit';

/**
 * Rack-and-pinion steering with Ackermann linkage. Front axle line along z
 * (x forward), kingpins at z = ±KP; the steering arms point back toward
 * the middle of the rear axle so the inner wheel turns further. Metres.
 */

const KP = 0.72;
const Y = 0.3;
const WHEELBASE = 2.6;
const ARM = 0.15;
const RACK_X = -0.14;
const RACK_HALF = 0.42;
const PINION_Z = -0.3;
const PINION_R = 0.022;
const ACK = Math.atan(KP / WHEELBASE);
/** Steering arm at rest, from the kingpin (x, z) for the +z wheel; mirrored for −z. */
const arm0 = (side: number): [number, number] => [-ARM * Math.cos(ACK), -side * ARM * Math.sin(ACK)];
const TIE = KP - ARM * Math.sin(ACK) - RACK_HALF;

export const steerMotion = { t: 0 };
export function SteerDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) steerMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}
/** Rack travel (+z = toward the left wheel). */
export const rackTravel = (t: number) => 0.062 * Math.sin(t * 0.55);

/** Arm-end position for a wheel angle δ (positive = steering toward +z, i.e. left). */
function armEnd(side: number, d: number): [number, number] {
  const [ax, az] = arm0(side);
  return [ax * Math.cos(d) - az * Math.sin(d), side * KP + ax * Math.sin(d) + az * Math.cos(d)];
}

/** Wheel angle that keeps the tie rod its length for a rack travel s. */
export function wheelAngle(side: number, s: number) {
  const rx = RACK_X;
  const rz = side * RACK_HALF + s;
  let lo = -0.8;
  let hi = 0.8;
  const f = (d: number) => { const [x, z] = armEnd(side, d); return Math.hypot(x - rx, z - rz) - TIE; };
  // The tie rod pushes outward as the arm swings: find the root by bisection.
  const sign = f(hi) > f(lo) ? 1 : -1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (f(mid) * sign > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

function state() {
  const s = rackTravel(steerMotion.t);
  return { s, left: wheelAngle(1, s), right: wheelAngle(-1, s), pinion: -s / PINION_R };
}

function Steered({ side, children }: { side: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y = side > 0 ? state().left : state().right; });
  return <group position={[0, Y, side * KP]}><group ref={ref}>{children}</group></group>;
}

function Slide({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.position.z = state().s; });
  return <group ref={ref}>{children}</group>;
}

function Strut({ ends, r }: { ends: () => [THREE.Vector3, THREE.Vector3]; r: number }) {
  const ref = useRef<THREE.Group>(null);
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  useFrame(() => {
    if (!ref.current) return;
    const [a, b] = ends();
    const d = b.clone().sub(a);
    ref.current.position.copy(a).addScaledVector(d, 0.5);
    ref.current.quaternion.copy(q.setFromUnitVectors(up, d.clone().normalize()));
    ref.current.scale.set(1, d.length(), 1);
  });
  return <group ref={ref}><Cyl c={[0, 0, 0]} r={r} len={1} seg={10} /></group>;
}

const COLUMN_TOP = new THREE.Vector3(-0.85, 0.95, PINION_Z);
const COLUMN_MID = new THREE.Vector3(-0.42, 0.55, PINION_Z);

function TurningWheel({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y = state().pinion; });
  return <group ref={ref}>{children}</group>;
}

export function Steering() {
  const colDir = COLUMN_TOP.clone().sub(COLUMN_MID).normalize();
  const tiltZ = -Math.atan2(colDir.x, colDir.y);
  return (
    <group>
      <Part id="subframe">
        <Box c={[0.05, Y - 0.14, 0]} s={[0.12, 0.08, 1.2]} />
        {[1, -1].map((s) => <Box key={s} c={[-0.3, Y - 0.14, s * 0.45]} s={[0.6, 0.06, 0.08]} />)}
        <Callout id="subframe" p={[0.05, Y - 0.1, 0.3]} />
      </Part>
      <Part id="wheels">
        {[1, -1].map((side) => (
          <Steered key={side} side={side}>
            <group position={[0, 0, side * 0.13]}>
              <Turn k="st-tyre" profile={[[0.2, -0.1], [0.3, -0.1], [0.32, -0.06], [0.32, 0.06], [0.3, 0.1], [0.2, 0.1]]} axis="z" seg={48} />
              <Turn k="st-rim" profile={[[0.05, -0.02], [0.2, -0.06], [0.2, 0.06], [0.05, 0.02]]} axis="z" seg={40} />
            </group>
          </Steered>
        ))}
        <Callout id="wheels" p={[0.25, Y + 0.3, KP + 0.15]} />
      </Part>
      <Part id="knuckles">
        {[1, -1].map((side) => {
          const [ax, az] = arm0(side);
          return (
            <Steered key={side} side={side}>
              <Cyl c={[0, 0, 0]} r={0.03} len={0.22} seg={14} />
              <Cyl c={[0, 0, side * 0.06]} r={0.025} len={0.12} axis="z" seg={12} />
              <Rod a={[0, -0.03, 0]} b={[ax, -0.03, az]} r={0.015} seg={10} />
            </Steered>
          );
        })}
        <Callout id="knuckles" p={[-0.1, Y + 0.12, -KP]} />
      </Part>
      <Part id="housing">
        <Cyl c={[RACK_X, Y - 0.03, 0]} r={0.03} len={0.72} axis="z" seg={20} />
        <Cyl c={[RACK_X + 0.02, Y + 0.02, PINION_Z]} r={0.04} len={0.1} seg={16} />
        {[1, -1].map((s) => <Turn key={s} k="st-boot" profile={[[0.012, 0], [0.034, 0.02], [0.026, 0.04], [0.034, 0.06], [0.026, 0.08], [0.012, 0.1]]} p={[RACK_X, Y - 0.03, s * 0.36]} axis={s > 0 ? 'z' : '-z'} seg={20} />)}
        <Callout id="housing" p={[RACK_X, Y + 0.08, -0.1]} />
      </Part>
      <Part id="rack">
        <Slide>
          <Cyl c={[RACK_X, Y - 0.03, 0]} r={0.013} len={2 * RACK_HALF} axis="z" seg={12} />
          {Array.from({ length: 16 }, (_, i) => <Box key={i} c={[RACK_X + 0.012, Y - 0.03, PINION_Z - 0.09 + i * 0.012]} s={[0.006, 0.02, 0.005]} />)}
        </Slide>
        <Callout id="rack" p={[RACK_X, Y - 0.06, 0.2]} />
      </Part>
      <Part id="pinion">
        <group position={[RACK_X + 0.02, Y - 0.01, PINION_Z]}>
          <TurningWheel>
            <Plate k="st-pinion" shape={() => gearShape(8, PINION_R, 0.005, 0.006)} depth={0.04} p={[0, -0.04, 0]} r={[-Math.PI / 2, 0, 0]} />
          </TurningWheel>
        </group>
        <Callout id="pinion" p={[RACK_X + 0.05, Y + 0.05, PINION_Z]} />
      </Part>
      <Part id="tie-rods">
        {[1, -1].map((side) => (
          <Strut key={side} r={0.011} ends={() => {
            const st = state();
            const [ex, ez] = armEnd(side, side > 0 ? st.left : st.right);
            return [new THREE.Vector3(RACK_X, Y - 0.03, side * RACK_HALF + st.s), new THREE.Vector3(ex, Y - 0.03, ez)];
          }} />
        ))}
        <Callout id="tie-rods" p={[RACK_X - 0.03, Y - 0.03, 0.55]} />
      </Part>
      <Part id="column">
        <Rod a={[RACK_X + 0.02, Y + 0.06, PINION_Z]} b={[COLUMN_MID.x, COLUMN_MID.y, COLUMN_MID.z]} r={0.012} seg={10} />
        <Rod a={[COLUMN_MID.x, COLUMN_MID.y, COLUMN_MID.z]} b={[COLUMN_TOP.x, COLUMN_TOP.y, COLUMN_TOP.z]} r={0.016} seg={12} />
        <Cyl c={[COLUMN_MID.x, COLUMN_MID.y, COLUMN_MID.z]} r={0.022} len={0.04} axis="z" seg={10} />
        <Callout id="column" p={[COLUMN_MID.x, COLUMN_MID.y + 0.05, PINION_Z]} />
      </Part>
      <Part id="wheel">
        <group position={[COLUMN_TOP.x, COLUMN_TOP.y, COLUMN_TOP.z]} rotation={[0, 0, tiltZ]}>
          <TurningWheel>
            <Hoop k="st-wheel" c={[0, 0.03, 0]} R={0.18} r={0.014} />
            {[0, 1, 2].map((i) => (
              <group key={i} rotation={[0, (i * Math.PI * 2) / 3 + Math.PI / 2, 0]}><Box c={[0.09, 0.02, 0]} s={[0.17, 0.012, 0.03]} /></group>
            ))}
            <Cyl c={[0, 0.02, 0]} r={0.05} len={0.04} seg={20} />
          </TurningWheel>
        </group>
        <Callout id="wheel" p={[COLUMN_TOP.x, COLUMN_TOP.y + 0.12, PINION_Z + 0.2]} />
      </Part>
    </group>
  );
}

const deg = (r: number) => (r * 180) / Math.PI;

/** Wheel angles, and how close they come to the Ackermann ideal. */
export function SteerControls() {
  const [a, setA] = useState({ left: 0, right: 0 });
  useEffect(() => {
    const id = window.setInterval(() => { const s = state(); setA({ left: s.left, right: s.right }); }, 100);
    return () => window.clearInterval(id);
  }, []);
  const turningLeft = a.left > 0.005;
  const inner = turningLeft ? a.left : -a.right;
  const outer = turningLeft ? a.right : -a.left;
  const ideal = Math.abs(inner) > 0.01 ? deg(Math.atan(1 / (1 / Math.tan(Math.abs(inner)) + (2 * KP) / WHEELBASE))) : 0;
  return (
    <>
      <div className="strokes">
        <span>左轮 {deg(a.left).toFixed(1)}°</span>
        <span>右轮 {deg(a.right).toFixed(1)}°</span>
      </div>
      <p className="gear-note">
        {Math.abs(inner) < 0.01
          ? '直行：两轮都朝正前方。'
          : `内侧轮 ${deg(Math.abs(inner)).toFixed(1)}°，外侧轮 ${deg(Math.abs(outer)).toFixed(1)}°；按阿克曼理想值外侧应为 ${ideal.toFixed(1)}°。`}
      </p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'wheel', index: 1, name: '方向盘', en: 'Steering Wheel', role: '输入', material: '钢骨 / 聚氨酯', description: '驾驶员转动它。中间的气囊盒这里没画。', explode: [-0.3, 0.3, 0], stage: [0, 0.14] },
  { id: 'column', index: 2, name: '转向柱与万向节', en: 'Column & U-joint', role: '传递转动', material: '钢', description: '中间有万向节，让转向轴可以拐弯绕过发动机舱里的东西；撞车时转向柱能溃缩，保护驾驶员。', explode: [-0.2, 0.2, 0], stage: [0.12, 0.26] },
  { id: 'pinion', index: 3, name: '小齿轮', en: 'Pinion', role: '转动 → 平移', material: '合金钢', description: '装在转向柱下端，和齿条啮合：方向盘转一圈，齿条横移几厘米。', explode: [0.1, 0.25, 0], stage: [0.42, 0.54] },
  { id: 'rack', index: 4, name: '齿条', en: 'Rack', role: '左右平移', material: '合金钢', description: '一根一面带齿的钢棒，在壳体里左右滑动，两端经球头接横拉杆。', explode: [0, -0.2, 0], stage: [0.6, 0.72] },
  { id: 'housing', index: 5, name: '转向器壳体与防尘套', en: 'Rack Housing & Boots', role: '支承 · 密封', material: '铝合金 / 橡胶', description: '固定在副车架上；两端的波纹防尘套挡住泥水。电动助力的电机通常也装在这里。', explode: [0, -0.35, 0], stage: [0.52, 0.64] },
  { id: 'tie-rods', index: 6, name: '横拉杆', en: 'Tie Rods', role: '推拉转向节', material: '钢', description: '两头都是球头，既能传力，又能跟着悬架上下跳。调它的长度就是调“前束”。', explode: [0, 0.15, 0], stage: [0.3, 0.44] },
  { id: 'knuckles', index: 7, name: '转向节与转向臂', en: 'Knuckles & Steering Arms', role: '绕主销转', material: '球墨铸铁', description: '车轮装在转向节上，绕主销转。两根转向臂不是正对后方，而是斜着指向后轴中点——这就是阿克曼梯形，它让内侧车轮自动多转一些。', explode: [0.25, 0, 0], stage: [0.7, 0.84] },
  { id: 'wheels', index: 8, name: '前轮', en: 'Front Wheels', role: '转向 · 承重', material: '钢 / 橡胶', description: '转弯时内轮走小圈、外轮走大圈，所以两轮转角不同才不会在地上拖着蹭。', explode: [0.45, 0, 0], stage: [0.84, 0.96] },
  { id: 'subframe', index: 9, name: '副车架', en: 'Subframe', role: '安装基座', material: '钢', description: '转向器和下摆臂都装在它上面。', explode: [0, 0, 0], stage: [1, 1] },
];

const STEPS: StepDef[] = [
  {
    title: '齿轮齿条转向', en: 'Rack & Pinion',
    body: '方向盘 → 转向柱 → 小齿轮 → 齿条左右平移 → 横拉杆 → 转向节，车轮绕主销转动。左栏实时显示两个前轮的转角。',
    state: { explode: 0, section: false, running: true, select: 'rack', focus: null },
  },
  {
    title: '阿克曼几何', en: 'Ackermann',
    body: '从上往下看：两根转向臂的延长线交在后轴中点附近。于是转弯时内侧车轮转得比外侧多，四个车轮绕同一个圆心转，轮胎不打滑。左栏会把实际转角和理想值作比较。',
    state: { explode: 0, section: false, running: true, select: 'knuckles', focus: 'top' },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆方向盘和转向柱，摘下横拉杆，抽出小齿轮和齿条，卸下壳体，最后拆转向节和车轮。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const steering: MachineDef = level({
  id: 'steering',
  unit: 3,
  bounds: [[-1.05, 0, -1.2], [0.5, 1.15, 1.2]],
  name: '转向系统',
  en: 'Rack-and-Pinion Steering',
  subtitle: '装配体 · 齿轮齿条 · 阿克曼梯形',
  summary: '9 种零件 · 内轮转得比外轮多，实时显示转角',
  drawingNo: 'GW-ZX-00',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'rack', origin: [RACK_X, Y - 0.03, 0] }],
  centreLines: [[[0, Y, -1.3], [0, Y, 1.3]], [[0, Y - 0.25, KP], [0, Y + 0.25, KP], 0.33], [[0, Y - 0.25, -KP], [0, Y + 0.25, -KP], 0.33]],
  steps: STEPS,
  camera: { target: [-0.25, 0.45, 0], offset: [3.4, 2.9, 4.4], orthoDistance: 16, exploded: { target: [-0.2, 0.5, 0], scale: 1.3 }, foci: { top: { target: [-0.1, 0.3, 0], scale: 0.9 } } },
  Model: Steering,
  Driver: SteerDriver,
  Controls: SteerControls,
});

