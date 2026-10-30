import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Turn } from '../kit';

/**
 * Traction elevator in a four-storey shaft: the car on one side of the
 * traction sheave, the counterweight on the other, 1 : 1 roping. Car door
 * faces +z; metres, pit floor at y = 0.
 */

const FLOOR_H = 3;
const FLOORS = 4;
const CAR: [number, number, number] = [1.5, 2.3, 1.3];
const SHEAVE: [number, number] = [-0.45, 13.4];
const SHEAVE_R = 0.45;
const CW_X = SHEAVE[0] - SHEAVE_R;
const TOP = 14.4;
const ROPES_TOP = SHEAVE[1];
/** Car floor height at a landing (0-based floor index); the pit is 1.2 m deep. */
const landing = (f: number) => 1.2 + f * FLOOR_H;
const ROPE_LEN = (ROPES_TOP - landing(0) - CAR[1]) + (ROPES_TOP - 2.5);

export const liftMotion = { t: 0 };
export function LiftDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) liftMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}

const ROUTE = [0, 3, 1, 2, 0];
const LEG = 7;
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** Car floor height, the floor it is at or heading to, and direction (+1 up). */
export function liftState(t: number) {
  const legs = ROUTE.length - 1;
  const c = t % (legs * LEG);
  const i = Math.floor(c / LEG);
  const from = ROUTE[i];
  const to = ROUTE[i + 1];
  const k = smooth(((c % LEG) - 2) / 4);
  const y = landing(from) + (landing(to) - landing(from)) * k;
  const moving = k > 0 && k < 1;
  return { y, floor: moving ? to : k >= 1 ? to : from, dir: moving ? Math.sign(to - from) : 0, doors: moving ? 0 : 1 - Math.abs(((c % LEG) < 2 ? (c % LEG) - 1 : (c % LEG) - 6.5)) };
}
/** Counterweight bottom height: the rope over the sheave has a fixed length. */
const cwY = (carY: number) => ROPES_TOP - (ROPE_LEN - (ROPES_TOP - carY - CAR[1])) - 1.6;

function Rides({ cw, children }: { cw?: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const y = liftState(liftMotion.t).y;
    ref.current.position.y = cw ? cwY(y) : y;
  });
  return <group ref={ref}>{children}</group>;
}

function Turning({ at, r, children }: { at: [number, number, number]; r: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = liftState(liftMotion.t).y / r; });
  return <group position={at}><group ref={ref}>{children}</group></group>;
}

/** A vertical rope from a moving bottom to a fixed top. */
function Rope({ x, z, bottom, top }: { x: number; z: number; bottom: () => number; top: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const b = bottom();
    ref.current.position.set(x, (b + top) / 2, z);
    ref.current.scale.y = Math.max(0.01, top - b);
  });
  return <group ref={ref}><Cyl c={[0, 0, 0]} r={0.012} len={1} seg={6} /></group>;
}

function Doors() {
  const refs = useRef<Array<THREE.Group | null>>([]);
  useFrame(() => {
    const s = liftState(liftMotion.t);
    refs.current.forEach((g, i) => {
      if (!g) return;
      const f = Math.floor(i / 2);
      const side = i % 2 ? 1 : -1;
      const open = f === s.floor ? Math.max(0, s.doors) : 0;
      g.position.x = side * (0.25 + open * 0.45);
    });
  });
  return (
    <>
      {Array.from({ length: FLOORS * 2 }, (_, i) => (
        <group key={i} position={[0, landing(Math.floor(i / 2)) + 1.05, 0.95]}>
          <group ref={(g) => { refs.current[i] = g; }}><Box c={[0, 0, 0]} s={[0.5, 2.1, 0.04]} /></group>
        </group>
      ))}
    </>
  );
}

export function Elevator() {
  return (
    <group>
      <Part id="shaft">
        {[[-1.6, -1.0], [1.0, -1.0], [-1.6, 1.0], [1.0, 1.0]].map(([x, z]) => <Box key={`${x}${z}`} c={[x, TOP / 2, z]} s={[0.08, TOP, 0.08]} />)}
        {Array.from({ length: FLOORS }, (_, f) => (
          <group key={f}>
            <Box c={[-0.3, landing(f) - 0.05, 1.3]} s={[2.6, 0.1, 0.6]} />
            <Box c={[-0.95, landing(f) + 1.1, 1.0]} s={[0.4, 2.2, 0.06]} />
            <Box c={[0.75, landing(f) + 1.1, 1.0]} s={[0.4, 2.2, 0.06]} />
            <Box c={[-0.1, landing(f) + 2.3, 1.0]} s={[2.1, 0.2, 0.06]} />
          </group>
        ))}
        <Box c={[-0.3, 12.72, 0]} s={[2.7, 0.12, 2.1]} />
        <Callout id="shaft" p={[1.0, 6, 1.0]} />
      </Part>
      <Part id="rails">
        {[1, -1].map((s) => <Box key={s} c={[s * (CAR[0] / 2 + 0.1), TOP / 2 - 0.4, 0]} s={[0.06, TOP - 0.8, 0.1]} />)}
        {[1, -1].map((s) => <Box key={s} c={[CW_X, TOP / 2 - 0.4, s * 0.4]} s={[0.05, TOP - 0.8, 0.06]} />)}
        <Callout id="rails" p={[CAR[0] / 2 + 0.15, 4, 0.1]} />
      </Part>
      <Part id="car">
        <Rides>
          <Box c={[0, CAR[1] / 2, 0]} s={CAR} />
          <Box c={[0, CAR[1] + 0.25, 0]} s={[0.12, 0.5, 1.3]} />
          <Box c={[0, CAR[1] + 0.5, 0]} s={[CAR[0] + 0.2, 0.12, 0.2]} />
          {[1, -1].map((s) => <Box key={s} c={[s * (CAR[0] / 2 + 0.05), CAR[1] / 2, 0]} s={[0.06, CAR[1] + 0.8, 0.14]} />)}
          <Box c={[0, -0.15, 0]} s={[CAR[0] + 0.2, 0.12, 0.2]} />
        </Rides>
        <Callout id="car" p={[0.4, 8, 0.7]} />
      </Part>
      <Part id="safety">
        <Rides>{[1, -1].map((s) => <Box key={s} c={[s * (CAR[0] / 2 + 0.1), -0.15, 0]} s={[0.14, 0.2, 0.2]} />)}</Rides>
        <Callout id="safety" p={[CAR[0] / 2 + 0.2, 1.2, 0.2]} />
      </Part>
      <Part id="counterweight">
        <Rides cw>
          <Box c={[CW_X, 0.8, 0]} s={[0.2, 1.6, 0.8]} />
          {Array.from({ length: 12 }, (_, i) => <Box key={i} c={[CW_X, 0.1 + i * 0.12, 0]} s={[0.22, 0.02, 0.82]} />)}
        </Rides>
        <Callout id="counterweight" p={[CW_X - 0.2, 7, 0.4]} />
      </Part>
      <Part id="ropes">
        {[-0.12, 0, 0.12].map((z) => (
          <group key={z}>
            <Rope x={0} z={z} top={ROPES_TOP} bottom={() => liftState(liftMotion.t).y + CAR[1] + 0.5} />
            <Rope x={CW_X} z={z} top={ROPES_TOP} bottom={() => cwY(liftState(liftMotion.t).y) + 1.6} />
          </group>
        ))}
        <Callout id="ropes" p={[0.05, 11.5, 0.15]} />
      </Part>
      <Part id="machine">
        <Turning at={[SHEAVE[0], SHEAVE[1], 0]} r={SHEAVE_R}>
          <Turn k="el-sheave" profile={[[0.05, -0.18], [SHEAVE_R + 0.03, -0.18], [SHEAVE_R + 0.03, 0.18], [0.05, 0.18]]} axis="z" seg={40} />
          {[0, 1, 2, 3, 4, 5].map((i) => <group key={i} rotation={[0, 0, (i * Math.PI) / 3]}><Box c={[0.25, 0, 0.19]} s={[0.4, 0.04, 0.02]} /></group>)}
        </Turning>
        <Cyl c={[SHEAVE[0], SHEAVE[1], -0.55]} r={0.32} len={0.6} axis="z" seg={28} />
        <Box c={[SHEAVE[0], 12.86, -0.3]} s={[0.9, 0.16, 1.2]} />
        <Box c={[SHEAVE[0] + 0.42, SHEAVE[1], -0.85]} s={[0.12, 0.35, 0.12]} />
        <Callout id="machine" p={[SHEAVE[0], SHEAVE[1] + 0.5, -0.5]} />
      </Part>
      <Part id="governor">
        <Turning at={[0.95, TOP - 0.4, 0.4]} r={0.15}>
          <Turn k="el-gov" profile={[[0.02, -0.03], [0.17, -0.03], [0.17, 0.03], [0.02, 0.03]]} axis="z" seg={24} />
          {[1, -1].map((s) => <Box key={s} c={[s * 0.1, 0, 0.05]} s={[0.06, 0.03, 0.03]} />)}
        </Turning>
        <Turning at={[0.95, 0.5, 0.4]} r={0.15}>
          <Turn k="el-gov-tension" profile={[[0.02, -0.03], [0.15, -0.03], [0.15, 0.03], [0.02, 0.03]]} axis="z" seg={20} />
        </Turning>
        <Box c={[0.95 + 0.15, TOP / 2, 0.4]} s={[0.012, TOP - 1, 0.012]} />
        <Box c={[0.95 - 0.15, TOP / 2, 0.4]} s={[0.012, TOP - 1, 0.012]} />
        <Callout id="governor" p={[1.1, TOP - 0.3, 0.4]} />
      </Part>
      <Part id="buffers">
        {[0, CW_X].map((x) => (
          <group key={x}>
            <Cyl c={[x, 0.25, 0]} r={0.09} len={0.5} seg={16} />
            <Cyl c={[x, 0.55, 0]} r={0.06} len={0.1} seg={16} />
          </group>
        ))}
        <Callout id="buffers" p={[0.2, 0.5, 0.3]} />
      </Part>
      <Part id="doors">
        <Doors />
        <Callout id="doors" p={[0.5, landing(1) + 1.5, 1.0]} />
      </Part>
    </group>
  );
}

export function LiftControls() {
  const [s, setS] = useState({ floor: 0, dir: 0 });
  useEffect(() => {
    const id = window.setInterval(() => { const l = liftState(liftMotion.t); setS({ floor: l.floor, dir: l.dir }); }, 120);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <div className="strokes">
        {Array.from({ length: FLOORS }, (_, f) => <span key={f} className={f === s.floor ? 'is-on' : ''}>{f + 1} 层</span>)}
        <b>{s.dir > 0 ? '▲' : s.dir < 0 ? '▼' : '■'}</b>
      </div>
      <p className="gear-note">轿厢上行时对重下行；两者重量接近，电机只需克服差值。</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'machine', index: 1, name: '曳引机', en: 'Traction Machine', role: '驱动', material: '钢 / 铸铁', description: '电机带动曳引轮，钢丝绳嵌在轮槽里靠摩擦力被带着走——电梯不是“卷”上去的。旁边的制动器断电即抱闸。', explode: [0, 2.0, -0.6], stage: [0.12, 0.26] },
  { id: 'ropes', index: 2, name: '曳引钢丝绳', en: 'Hoist Ropes', role: '悬挂', material: '钢', description: '几根平行的钢丝绳，一头挂轿厢、一头挂对重。任何一根都足以吊住满载轿厢。', explode: [0.6, 0, 0], stage: [0.26, 0.38] },
  { id: 'car', index: 3, name: '轿厢', en: 'Car', role: '载人', material: '钢板', description: '装在轿厢架里，上下靠导靴沿导轨滑行，不会晃。', explode: [0, 0, 2.2], stage: [0.5, 0.64] },
  { id: 'counterweight', index: 4, name: '对重', en: 'Counterweight', role: '平衡', material: '铸铁块', description: '一摞铸铁块，重量约等于空轿厢加一半额定载重。它让电机只需要克服两边的差值，大大省电。', explode: [-1.4, 0, 0], stage: [0.4, 0.52] },
  { id: 'rails', index: 5, name: '导轨', en: 'Guide Rails', role: '导向', material: 'T 型钢', description: '轿厢和对重各有一对 T 型导轨，从井道底一直通到顶。安全钳动作时就夹在导轨上。', explode: [0, 0, -1.2], stage: [0.72, 0.84] },
  { id: 'safety', index: 6, name: '安全钳', en: 'Safety Gear', role: '防坠落', material: '钢', description: '装在轿厢底部两侧。万一超速下坠，限速器拉动它，楔块挤进导轨把轿厢卡住——这是 1853 年奥的斯发明的、让人敢坐电梯的关键。', explode: [0.8, -0.6, 0], stage: [0.6, 0.72] },
  { id: 'governor', index: 7, name: '限速器', en: 'Overspeed Governor', role: '检测超速', material: '钢', description: '一根独立的钢丝绳连着轿厢绕过它。速度超限时离心块甩开把绳卡住，绳子拉动安全钳。', explode: [1.2, 0, 0], stage: [0.2, 0.32] },
  { id: 'buffers', index: 8, name: '缓冲器', en: 'Buffers', role: '最后一道保险', material: '钢 / 油', description: '井道底坑里的油压缓冲器，万一冲到底，把冲击吸收掉。', explode: [0, -1, 1], stage: [0.84, 0.96] },
  { id: 'doors', index: 9, name: '层门', en: 'Landing Doors', role: '防止坠入井道', material: '不锈钢', description: '每层一扇，只有轿厢停在这一层时才会被轿门带着打开。', explode: [0, 0, 1.4], stage: [0, 0.14] },
  { id: 'shaft', index: 10, name: '井道与机房', en: 'Hoistway', role: '安装空间', material: '混凝土', description: '这里只画了骨架。机房在井道顶上，曳引机和限速器都装在那里。', explode: [0, 0, 0], stage: [1, 1] },
];

const STEPS: StepDef[] = [
  {
    title: '曳引式电梯', en: 'Traction Elevator',
    body: '钢丝绳绕过顶上的曳引轮，一头挂轿厢、一头挂对重，像一架天平。左栏显示轿厢在几层、往哪走。注意对重总是和轿厢反方向运动。',
    state: { explode: 0, section: false, running: true, select: 'counterweight', focus: null },
  },
  {
    title: '机房', en: 'Machine Room',
    body: '顶上看：曳引机、制动器和限速器。曳引轮转多少，绳子就带着轿厢走多少；限速器的轮子跟着轿厢速度转，超速就动作。',
    state: { explode: 0, section: false, running: true, select: 'machine', focus: 'top' },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆层门、曳引机和限速器，取下钢丝绳，吊出对重和轿厢，拆安全钳、导轨和缓冲器。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const elevator: MachineDef = level({
  id: 'elevator',
  unit: 0.55,
  bounds: [[-1.7, 0, -1.1], [1.15, TOP + 0.4, 1.6]],
  name: '电梯',
  en: 'Traction Elevator',
  subtitle: '整机 · 曳引式 · 4 层',
  summary: '10 种零件 · 轿厢与对重反向运行，会停靠各层',
  drawingNo: 'GW-DT-00',
  scale: '1 : 100',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'car', origin: [0, landing(0) + 1, 0.65] }],
  centreLines: [[[0, 0, 0], [0, TOP, 0]], [[CW_X, 0, 0], [CW_X, TOP, 0]]],
  steps: STEPS,
  camera: { target: [-0.2, 7.4, 0], offset: [13, 8, 31], orthoDistance: 90, exploded: { target: [0, 7.2, 0.6], scale: 1.2 }, foci: { top: { target: [-0.2, 13.3, 0], scale: 0.26 } } },
  Model: Elevator,
  Driver: LiftDriver,
  Controls: LiftControls,
});

