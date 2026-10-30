import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, XY_Z } from '../kit';

/**
 * Four-slot Geneva drive as used to pull film through a projector. Driver
 * at the origin, Geneva wheel at (C, 0), both turning about z; millimetres.
 */

const C = 60;
const SLOTS = 4;
const R_PIN = C * Math.sin(Math.PI / SLOTS);
const R_G = C * Math.cos(Math.PI / SLOTS);
const LOCK = R_PIN - 8;
const HALF = Math.PI / 2 - Math.PI / SLOTS;

export const genevaMotion = { t: 0 };
export function GenevaDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) genevaMotion.t += Math.min(dt, 0.05) * 1.4; }, -1);
  return null;
}

/** Driver angle T (from +x, toward the wheel) → Geneva wheel angle, and whether it is moving. */
export function genevaState(T: number) {
  const k = Math.floor((T + Math.PI) / (Math.PI * 2));
  const th = T - k * Math.PI * 2;
  let g = 0;
  let moving = false;
  if (th >= HALF) g = -(Math.PI * 2) / SLOTS;
  else if (th > -HALF) {
    moving = true;
    const phi = Math.atan2(R_PIN * Math.sin(th), R_PIN * Math.cos(th) - C);
    const start = Math.PI + Math.PI / SLOTS;
    g = ((phi + Math.PI * 2) % (Math.PI * 2)) - start;
  }
  return { driver: T, wheel: -(k * Math.PI * 2) / SLOTS + g, moving };
}

/** Wheel outline: concave arcs where the locking disc runs, slots as holes. */
function wheelShape() {
  const s = new THREE.Shape();
  const n = 160;
  const rho = LOCK + 1.5;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    let r = R_G;
    for (let j = 0; j < SLOTS; j += 1) {
      const d = a - (j * Math.PI * 2) / SLOTS;
      const ds = Math.atan2(Math.sin(d), Math.cos(d));
      const disc = rho * rho - C * C * Math.sin(ds) ** 2;
      if (Math.abs(ds) < Math.PI / 2 && disc > 0) r = Math.min(r, C * Math.cos(ds) - Math.sqrt(disc));
    }
    const p: [number, number] = [r * Math.cos(a), r * Math.sin(a)];
    if (i === 0) s.moveTo(...p); else s.lineTo(...p);
  }
  for (let j = 0; j < SLOTS; j += 1) {
    const a = (j * Math.PI * 2) / SLOTS + Math.PI / SLOTS;
    const u: [number, number] = [Math.cos(a), Math.sin(a)];
    const v: [number, number] = [-u[1], u[0]];
    const r0 = C - R_PIN - 4;
    const r1 = R_G - 2;
    const w = 4.6;
    const h = new THREE.Path();
    const pt = (r: number, o: number): [number, number] => [u[0] * r + v[0] * o, u[1] * r + v[1] * o];
    h.moveTo(...pt(r0, -w));
    h.lineTo(...pt(r1, -w));
    h.lineTo(...pt(r1, w));
    h.lineTo(...pt(r0, w));
    h.closePath();
    s.holes.push(h);
  }
  const hub = new THREE.Path();
  hub.absarc(0, 0, 5, 0, Math.PI * 2, true);
  s.holes.push(hub);
  return s;
}

/** Locking disc: a circle with a relief cut where the pin enters. */
function lockShape() {
  const s = new THREE.Shape();
  const relief = 0.75;
  s.absarc(0, 0, LOCK, relief, Math.PI * 2 - relief, false);
  s.absarc(LOCK * 1.25, 0, LOCK * 0.62, Math.PI + 0.9, Math.PI - 0.9, true);
  s.closePath();
  return s;
}

function Turning({ k, at = [0, 0], children }: { k: 'driver' | 'wheel'; at?: [number, number]; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = genevaState(genevaMotion.t)[k]; });
  return <group position={[at[0], at[1], 0]}><group ref={ref}>{children}</group></group>;
}

const SPROCKET = 14;

function Film() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const travel = -genevaState(genevaMotion.t).wheel * SPROCKET;
    ref.current.position.y = -(((travel % 19) + 19) % 19);
  });
  return (
    <group position={[C + SPROCKET + 1.2, 0, 16]}>
      <group ref={ref}>
        <Box c={[0, 0, 0]} s={[1.2, 130, 24]} />
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i}>
            <Box c={[0.4, -57 + i * 19, 0]} s={[0.6, 14, 15]} />
            {[1, -1].map((s) => <Box key={s} c={[0.7, -57 + i * 19 + s * 4.5, 10]} s={[0.4, 2.4, 1.8]} />)}
          </group>
        ))}
      </group>
    </group>
  );
}

export function Geneva() {
  return (
    <group>
      <Part id="plate">
        <Box c={[C / 2, 0, -10]} s={[C + 2 * R_G + 30, 2 * R_G + 30, 4]} />
        <Callout id="plate" p={[-40, -50, -8]} />
      </Part>
      <Part id="driver">
        <Turning k="driver">
          <Plate k="gv-lock" shape={lockShape} depth={6} p={[0, 0, -2]} r={XY_Z} />
          <Box c={[R_PIN / 2, 0, 5.5]} s={[R_PIN + 8, 9, 3]} />
          <Cyl c={[0, 0, 0]} r={4} len={26} axis="z" seg={16} />
        </Turning>
        <Callout id="driver" p={[-20, 30, 6]} />
      </Part>
      <Part id="pin">
        <Turning k="driver"><Cyl c={[R_PIN, 0, 2.5]} r={3.8} len={9} axis="z" seg={16} /></Turning>
        <Callout id="pin" p={[R_PIN, 10, 8]} />
      </Part>
      <Part id="wheel">
        <Turning k="wheel" at={[C, 0]}>
          <Plate k="gv-wheel" shape={wheelShape} depth={6} p={[0, 0, -2]} r={XY_Z} />
          <Cyl c={[0, 0, 4]} r={5} len={30} axis="z" seg={16} />
        </Turning>
        <Callout id="wheel" p={[C + 30, 30, 4]} />
      </Part>
      <Part id="sprocket">
        <Turning k="wheel" at={[C, 0]}>
          <Plate k="gv-sprocket" shape={() => gearShape(16, SPROCKET, 1.4, 4)} depth={22} p={[0, 0, 5]} r={XY_Z} />
        </Turning>
        <Callout id="sprocket" p={[C + 5, -14, 26]} />
      </Part>
      <Part id="film">
        <Film />
        <Callout id="film" p={[C + 16, 70, 28]} />
      </Part>
    </group>
  );
}

export function GenevaControls() {
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setMoving(genevaState(genevaMotion.t).moving), 60);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <div className="strokes">
        <span className={moving ? 'is-on' : ''}>转位 · 走一格</span>
        <span className={moving ? '' : 'is-on'}>停歇 · 锁住</span>
      </div>
      <p className="gear-note">拨盘转一圈，槽轮只转 90°：四分之一的时间在动，四分之三的时间被锁止弧卡住不动。</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'plate', index: 1, name: '机架', en: 'Frame', role: '安装', material: '铸铁', description: '两根轴都装在它上面，中心距固定。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'driver', index: 2, name: '拨盘与锁止弧', en: 'Driver & Locking Disc', role: '主动 · 锁止', material: '钢', description: '匀速旋转。圆盘边缘的锁止弧嵌在槽轮的凹弧里，把槽轮“抱住”；只在缺口转到槽轮那边、销子进槽的时候才放开它。', explode: [0, 0, 30], stage: [0.4, 0.56] },
  { id: 'pin', index: 3, name: '拨销', en: 'Drive Pin', role: '拨动槽轮', material: '淬火钢', description: '它沿着槽的方向切入、切出，所以槽轮起动和停止时速度都是零，没有冲击。', explode: [0, 0, 50], stage: [0.24, 0.4] },
  { id: 'wheel', index: 4, name: '槽轮', en: 'Geneva Wheel', role: '间歇转动', material: '钢', description: '四条径向槽、四段凹弧。这个形状像瑞士国旗上的十字，所以也叫“马耳他十字”。', explode: [30, 0, 30], stage: [0.56, 0.72] },
  { id: 'sprocket', index: 5, name: '输片齿轮', en: 'Film Sprocket', role: '拉胶片', material: '钢', description: '和槽轮同轴，齿插进胶片两边的齿孔里。槽轮转 90°，胶片正好走一格画面。', explode: [30, 0, 60], stage: [0.12, 0.28] },
  { id: 'film', index: 6, name: '胶片', en: 'Film', role: '被间歇拖动', material: '醋酸纤维', description: '每秒 24 格：每一格都要停稳了才开快门投光，所以胶片必须“走—停—走—停”，不能匀速跑。', explode: [60, 0, 40], stage: [0, 0.14] },
];

const STEPS: StepDef[] = [
  {
    title: '槽轮机构', en: 'Geneva Drive',
    body: '把连续转动变成“走一格、停一下”。拨盘匀速转，槽轮只在销子进槽的那四分之一圈里转 90°，其余时间被锁止弧锁住。左栏显示此刻在转还是在停。',
    state: { explode: 0, section: false, running: true, select: 'wheel', focus: null },
  },
  {
    title: '电影放映机', en: 'Projector',
    body: '老式放映机用它拉片：槽轮带着输片齿轮，胶片每次走一格就停住，快门打开投光，画面稳稳地落在银幕上。每秒重复 24 次，眼睛就看到连续的动作。',
    state: { explode: 0, section: false, running: true, select: 'film', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '取下胶片和输片齿轮，拔出拨销，再取下拨盘和槽轮。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const geneva: MachineDef = level({
  id: 'geneva',
  unit: 0.07,
  bounds: [[-R_G - 15, -70, -12], [C + R_G + 15, 70, 30]],
  name: '槽轮机构',
  en: 'Geneva Drive',
  subtitle: '装配体 · 四槽 · 间歇运动',
  summary: '6 种零件 · 走一格停一下，带动放映机胶片',
  drawingNo: 'GW-CL-00',
  scale: '1 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'wheel', origin: [C, 0, 0] }],
  centreLines: [[[0, 0, -15], [0, 0, 20], LOCK + 4], [[C, 0, -15], [C, 0, 30], R_G + 4]],
  steps: STEPS,
  camera: { target: [C / 2 + 8, 0, 0], offset: [70, 130, 420], orthoDistance: 1000, exploded: { target: [C / 2 + 20, 0, 20], scale: 1.3 } },
  Model: Geneva,
  Driver: GenevaDriver,
  Controls: GenevaControls,
});
