import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, Hoop, level, Turn } from '../kit';

/**
 * Four-blade helicopter rotor head with a swashplate. Mast along y, rotor
 * turning about it; the blades are cut short so the head stays in view.
 * Metres; +x is forward.
 */

const SWASH_Y = 0.72;
const HUB_Y = 1.3;
const RING_R = 0.17;
const HORN_R = 0.22;
const LEAD = 0.07;
const BLADES = 4;
const SERVOS = [0, 1, 2].map((i) => Math.PI / 2 + (i * Math.PI * 2) / 3);

export type Flight = 'hover' | 'climb' | 'forward' | 'side';
/** Collective height, and swashplate tilt about z (forward) and x (sideways). */
const TARGET: Record<Flight, [number, number, number]> = {
  hover: [0, 0, 0],
  climb: [0.06, 0, 0],
  forward: [0.01, -0.14, 0],
  side: [0.01, 0, 0.14],
};
export const useRotor = create<{ flight: Flight; set: (f: Flight) => void }>((set) => ({ flight: 'hover', set: (flight) => set({ flight }) }));
export const rotorMotion = { psi: 0, h: 0, tiltZ: 0, tiltX: 0 };

export function RotorDriver() {
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const m = rotorMotion;
    const [h, tz, tx] = TARGET[useRotor.getState().flight];
    const k = 1 - Math.exp(-dt * 2.5);
    m.h += (h - m.h) * k;
    m.tiltZ += (tz - m.tiltZ) * k;
    m.tiltX += (tx - m.tiltX) * k;
    if (useStudio.getState().running) m.psi += dt * 1.6;
  }, -1);
  return null;
}

const tilt = new THREE.Euler();
const v = new THREE.Vector3();

/** A point on the swashplate (local x, z in the plate) in the mast frame. */
function onPlate(x: number, z: number, out = new THREE.Vector3()) {
  tilt.set(rotorMotion.tiltX, 0, rotorMotion.tiltZ);
  return out.set(x, 0, z).applyEuler(tilt).add(v.set(0, SWASH_Y + rotorMotion.h, 0));
}

/** Pitch-link foot for blade i (rotates with the rotor, rides on the tilted plate). */
function foot(i: number, out = new THREE.Vector3()) {
  const a = rotorMotion.psi + (i * Math.PI * 2) / BLADES;
  const x = RING_R * Math.cos(a) - LEAD * Math.sin(a);
  const z = -RING_R * Math.sin(a) - LEAD * Math.cos(a);
  return onPlate(x, z, out);
}
const pitchOf = (i: number) => (foot(i).y - SWASH_Y) * 3.2 + 0.06;

function Plate({ spin, children }: { spin?: boolean; children: ReactNode }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  useFrame(() => {
    const m = rotorMotion;
    if (outer.current) {
      outer.current.position.y = SWASH_Y + m.h;
      outer.current.rotation.set(m.tiltX, 0, m.tiltZ);
    }
    if (inner.current && spin) inner.current.rotation.y = m.psi;
  });
  return <group ref={outer}><group ref={inner}>{children}</group></group>;
}

/** A rod between two moving points. */
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

function Spinning({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y = rotorMotion.psi; });
  return <group ref={ref}>{children}</group>;
}

/** Blade i: grip and blade turn about their own span (local x) for pitch. */
function Blade({ i, grip }: { i: number; grip: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = pitchOf(i); });
  return (
    <group rotation={[0, (i * Math.PI * 2) / BLADES, 0]} position={[0, HUB_Y, 0]}>
      <group ref={ref}>
        {grip ? (
          <>
            <Box c={[0.24, 0, 0]} s={[0.24, 0.07, 0.1]} />
            <Box c={[HORN_R, -0.04, LEAD / 2 + 0.02]} s={[0.04, 0.03, LEAD + 0.04]} />
          </>
        ) : (
          <Box c={[1.3, 0, 0]} s={[1.9, 0.03, 0.26]} />
        )}
      </group>
    </group>
  );
}

export function RotorHead() {
  return (
    <group>
      <Part id="gearbox">
        <Box c={[0, 0.18, 0]} s={[0.7, 0.36, 0.55]} />
        <Turn k="ro-gb-top" profile={[[0.06, 0.36], [0.22, 0.36], [0.12, 0.5], [0.06, 0.5]]} seg={32} />
        <Callout id="gearbox" p={[0.3, 0.3, 0.3]} />
      </Part>
      <Part id="mast">
        <Spinning><Cyl c={[0, 0.9, 0]} r={0.045} len={0.85} seg={20} /></Spinning>
        <Callout id="mast" p={[0.05, 1.05, 0.05]} />
      </Part>
      <Part id="hub">
        <Spinning>
          <Turn k="ro-hub" profile={[[0.045, -0.06], [0.14, -0.06], [0.14, 0.06], [0.045, 0.06]]} p={[0, HUB_Y, 0]} seg={8} />
          <Cyl c={[0, HUB_Y + 0.1, 0]} r={0.04} len={0.1} seg={6} />
        </Spinning>
        <Callout id="hub" p={[0, HUB_Y + 0.15, 0.1]} />
      </Part>
      <Part id="grips">
        <Spinning>{Array.from({ length: BLADES }, (_, i) => <Blade key={i} i={i} grip />)}</Spinning>
        <Callout id="grips" p={[0.3, HUB_Y + 0.06, 0.1]} />
      </Part>
      <Part id="blades">
        <Spinning>{Array.from({ length: BLADES }, (_, i) => <Blade key={i} i={i} grip={false} />)}</Spinning>
        <Callout id="blades" p={[1.6, HUB_Y + 0.05, 0.2]} />
      </Part>
      <Part id="rotating">
        <Plate spin>
          <Hoop k="ro-rot" c={[0, 0.03, 0]} R={RING_R - 0.02} r={0.022} seg={40} />
          {Array.from({ length: BLADES }, (_, i) => {
            const a = (i * Math.PI * 2) / BLADES;
            return <Box key={i} c={[RING_R * Math.cos(a) - LEAD * Math.sin(a), 0.03, -RING_R * Math.sin(a) - LEAD * Math.cos(a)]} s={[0.04, 0.03, 0.04]} />;
          })}
        </Plate>
        <Callout id="rotating" p={[0.2, SWASH_Y + 0.06, 0.1]} />
      </Part>
      <Part id="stationary">
        <Plate>
          <Hoop k="ro-stat" c={[0, -0.02, 0]} R={RING_R} r={0.025} seg={40} />
          {SERVOS.map((a) => <Box key={a} c={[0.2 * Math.cos(a), -0.03, 0.2 * Math.sin(a)]} s={[0.05, 0.03, 0.05]} />)}
        </Plate>
        <Callout id="stationary" p={[-0.22, SWASH_Y - 0.03, 0.15]} />
      </Part>
      <Part id="links">
        {Array.from({ length: BLADES }, (_, i) => (
          <Strut key={i} r={0.01} ends={() => {
            const a = rotorMotion.psi + (i * Math.PI * 2) / BLADES;
            const top = new THREE.Vector3(HORN_R * Math.cos(a) - (LEAD + 0.02) * Math.sin(a), HUB_Y - 0.05, -HORN_R * Math.sin(a) - (LEAD + 0.02) * Math.cos(a));
            return [foot(i).add(new THREE.Vector3(0, 0.04, 0)), top];
          }} />
        ))}
        <Callout id="links" p={[0.25, 1.0, 0.1]} />
      </Part>
      <Part id="servos">
        {SERVOS.map((a) => (
          <group key={a}>
            <Cyl c={[0.2 * Math.cos(a), 0.46, 0.2 * Math.sin(a)]} r={0.025} len={0.18} seg={12} />
            <Strut r={0.012} ends={() => [new THREE.Vector3(0.2 * Math.cos(a), 0.5, 0.2 * Math.sin(a)), onPlate(0.2 * Math.cos(a), 0.2 * Math.sin(a)).add(new THREE.Vector3(0, -0.04, 0))]} />
          </group>
        ))}
        <Callout id="servos" p={[-0.25, 0.48, 0.1]} />
      </Part>
    </group>
  );
}

const FLIGHTS: Array<[Flight, string, string]> = [
  ['hover', '悬停', '倾斜盘水平、居中：四片桨叶桨距一样，升力刚好等于重量。'],
  ['climb', '爬升', '“总距”：三个舵机同时伸长，倾斜盘整体抬高，所有桨叶一起加大桨距，升力变大。'],
  ['forward', '前飞', '“周期变距”：倾斜盘向前倾。桨叶转到后方时桨距大、转到前方时桨距小，旋翼盘向前倾斜，把飞机往前拉。'],
  ['side', '侧飞', '倾斜盘向一侧倾，旋翼盘随之侧倾，飞机向那一侧平移。'],
];

export function RotorControls() {
  const { flight, set } = useRotor();
  const studio = useStudio((s) => s.set);
  const note = FLIGHTS.find((f) => f[0] === flight)![2];
  return (
    <>
      <div className="strokes gears">
        {FLIGHTS.map(([f, label]) => (
          <button key={f} type="button" className={f === flight ? 'is-on' : ''} onClick={() => { set(f); studio({ running: true }); }}>{label}</button>
        ))}
      </div>
      <p className="gear-note">{note}</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'gearbox', index: 1, name: '主减速器', en: 'Main Gearbox', role: '减速 · 承力', material: '镁合金 / 钢', description: '把涡轴发动机每分钟几万转降到旋翼的三四百转；整架直升机其实是“吊”在它上面的。', explode: [0, -0.4, 0], stage: [0.8, 0.94] },
  { id: 'mast', index: 2, name: '旋翼轴', en: 'Mast', role: '传扭 · 吊起机身', material: '钢', description: '空心钢轴，从减速器伸出来带动桨毂。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'hub', index: 3, name: '桨毂', en: 'Hub', role: '连接桨叶', material: '钛合金 / 复合材料', description: '四个臂各连一片桨叶，同时允许桨叶上下挥舞、前后摆动。', explode: [0, 0.6, 0], stage: [0.3, 0.42] },
  { id: 'grips', index: 4, name: '变距铰（桨叶夹）', en: 'Pitch Grips', role: '让桨叶转桨距', material: '钛合金', description: '夹住桨根，可以绕桨叶自身的长轴转动；伸出来的小臂叫变距摇臂，被拉杆推拉。', explode: [0, 0.45, 0], stage: [0.2, 0.32] },
  { id: 'blades', index: 5, name: '桨叶（截短）', en: 'Blades', role: '产生升力', material: '复合材料', description: '真实桨叶长约 5 米以上，这里截短画。桨距（迎角）越大，升力越大。', explode: [0, 0.9, 0], stage: [0, 0.16] },
  { id: 'rotating', index: 6, name: '旋转盘', en: 'Rotating Swashplate', role: '跟旋翼转', material: '铝合金', description: '倾斜盘的上半部分，跟着旋翼一起转，四根拉杆从这里接到四个变距摇臂。', explode: [0, 0.25, 0.35], stage: [0.5, 0.62] },
  { id: 'stationary', index: 7, name: '不转盘', en: 'Stationary Swashplate', role: '接受操纵', material: '铝合金', description: '下半部分不转，由三个舵机托着。两半之间是一个大轴承。驾驶员的操纵从这里“传”进旋转的世界。', explode: [0, -0.15, 0.45], stage: [0.6, 0.72] },
  { id: 'links', index: 8, name: '变距拉杆', en: 'Pitch Links', role: '传递桨距', material: '钢', description: '旋转盘高的地方把拉杆往上推，那片桨叶的桨距就大。倾斜盘一倾，桨叶每转一圈桨距就大小变化一次。', explode: [0.4, 0.3, 0], stage: [0.4, 0.52] },
  { id: 'servos', index: 9, name: '舵机作动筒', en: 'Servo Actuators', role: '推动倾斜盘', material: '—', description: '三个液压作动筒：一起伸缩是总距，伸缩不一是周期变距。驾驶员的总距杆和驾驶杆就是在指挥这三根杆。', explode: [0, -0.3, -0.4], stage: [0.7, 0.84] },
];

const STEPS: StepDef[] = [
  {
    title: '直升机旋翼头', en: 'Rotor Head',
    body: '桨叶在转，驾驶员却要控制每一片桨叶在每个方位的角度——靠的就是倾斜盘：一半跟着转，一半不转。用左栏切换飞行状态，看倾斜盘和桨叶怎么变。',
    state: { explode: 0, section: false, running: true, select: 'rotating', focus: null },
    apply: () => useRotor.getState().set('hover'),
  },
  {
    title: '周期变距', en: 'Cyclic',
    body: '前飞时倾斜盘向前倾：盯住一片桨叶，它转到后面时被拉杆顶高、桨距变大，转到前面时桨距变小——一圈一个周期。',
    state: { explode: 0, section: false, running: true, select: 'links', focus: 'swash' },
    apply: () => useRotor.getState().set('forward'),
  },
  {
    title: '拆开', en: 'Teardown',
    body: '取下桨叶和变距铰，拆桨毂和拉杆，取出倾斜盘的两半，最后是舵机和主减速器。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const rotor: MachineDef = level({
  id: 'rotor',
  unit: 2.2,
  bounds: [[-2.3, 0, -2.3], [2.3, 1.5, 2.3]],
  name: '直升机旋翼头',
  en: 'Helicopter Rotor Head',
  subtitle: '装配体 · 倾斜盘 · 总距与周期变距',
  summary: '9 种零件 · 倾斜盘让旋转的桨叶周期变距，会动',
  drawingNo: 'GW-ZS-00',
  scale: '1 : 20',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'blades', origin: [0.6, HUB_Y, 0] }],
  centreLines: [[[0, 0, 0], [0, 1.6, 0], 0.3]],
  steps: STEPS,
  camera: { target: [0, 0.9, 0], offset: [3.4, 2.6, 5.6], orthoDistance: 30, exploded: { target: [0, 1.0, 0], scale: 1.3 }, foci: { swash: { target: [0, 0.95, 0], scale: 0.45 } } },
  Model: RotorHead,
  Driver: RotorDriver,
  Controls: RotorControls,
});
