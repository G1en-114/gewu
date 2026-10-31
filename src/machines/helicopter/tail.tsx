import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Turn } from '../kit';
import { RotorDriver, rotorMotion, Strut } from './rotor';

/**
 * Two-blade teetering tail rotor on its 90° tail gearbox. The rotor disc is
 * in the x–y plane, turning about +z (outboard); the drive shaft comes in
 * along +x from the boom. Metres, hub at the origin.
 */

/** Tail rotor speed as a multiple of the main rotor's. */
export const TAIL_RATE = 6;
const R = 0.8;
const HORN = 0.1;

export type Pedal = 'left' | 'centre' | 'right';
/** Blade pitch for each pedal position (rad). */
const PITCH: Record<Pedal, number> = { left: 0.42, centre: 0.18, right: -0.08 };
export const useTail = create<{ pedal: Pedal; set: (p: Pedal) => void }>((set) => ({ pedal: 'centre', set: (pedal) => set({ pedal }) }));
export const tailMotion = { pitch: PITCH.centre };

export function TailDriver() {
  useFrame((_, raw) => {
    const k = 1 - Math.exp(-Math.min(raw, 0.05) * 3);
    tailMotion.pitch += (PITCH[useTail.getState().pedal] - tailMotion.pitch) * k;
  }, -1);
  return null;
}

/** Main-rotor phase plus the pedal: everything a helicopter level needs per frame. */
export function HeliDriver() {
  return (
    <>
      <RotorDriver />
      <TailDriver />
    </>
  );
}

const sliderZ = () => 0.13 + 0.12 * Math.sin(tailMotion.pitch);

function Spinning({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = rotorMotion.psi * TAIL_RATE; });
  return <group ref={ref}>{children}</group>;
}

/** Blade i (0 or 1) along ±x, feathering about its own span. */
function Blade({ i, children }: { i: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = tailMotion.pitch; });
  return <group rotation={[0, 0, i * Math.PI]}><group ref={ref}>{children}</group></group>;
}

function Slider({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.position.z = sliderZ(); });
  return <group ref={ref}>{children}</group>;
}

const a = new THREE.Vector3();
const b = new THREE.Vector3();

export function TailRotor() {
  return (
    <group>
      <Part id="tail-gearbox">
        <Turn k="tr-gb" profile={[[0, -0.27], [0.08, -0.27], [0.1, -0.2], [0.1, -0.08], [0.05, -0.04], [0, -0.04]]} axis="z" seg={32} />
        <Cyl c={[0.13, 0, -0.17]} r={0.055} len={0.22} axis="x" seg={24} />
        <Cyl c={[0.25, 0, -0.17]} r={0.075} len={0.02} axis="x" seg={6} />
        <Spinning><Cyl c={[0, 0, 0.06]} r={0.022} len={0.24} axis="z" seg={12} /></Spinning>
        <Callout id="tail-gearbox" p={[0.08, 0.06, -0.2]} />
      </Part>
      <Part id="hub">
        <Spinning>
          <Box c={[0, 0, 0]} s={[0.26, 0.07, 0.06]} />
          <Cyl c={[0, 0, 0]} r={0.035} len={0.1} axis="z" seg={8} />
        </Spinning>
        <Callout id="hub" p={[0.06, 0.04, 0.04]} />
      </Part>
      <Part id="blades">
        <Spinning>
          {[0, 1].map((i) => (
            <Blade key={i} i={i}>
              <Box c={[0.12, 0, 0]} s={[0.1, 0.09, 0.05]} />
              <Box c={[(0.17 + R) / 2, 0, 0]} s={[R - 0.17, 0.13, 0.018]} />
              <Box c={[HORN, 0.06, 0]} s={[0.02, 0.05, 0.02]} />
            </Blade>
          ))}
        </Spinning>
        <Callout id="blades" p={[0.55, 0.06, 0.02]} />
      </Part>
      <Part id="slider">
        <Spinning>
          <Slider>
            <Cyl c={[0, 0, 0]} r={0.035} len={0.04} axis="z" seg={20} />
            <Box c={[0, 0.07, 0]} s={[0.025, 0.14, 0.025]} r={[0, 0, 0]} />
            <Box c={[0, -0.07, 0]} s={[0.025, 0.14, 0.025]} />
          </Slider>
        </Spinning>
        <Callout id="slider" p={[0.02, 0.1, 0.16]} />
      </Part>
      <Part id="links">
        <Spinning>
          {[0, 1].map((i) => (
            <Strut key={i} r={0.008} ends={() => {
              const s = i ? -1 : 1;
              const p = tailMotion.pitch;
              // Horn tip on the feathering blade, and the crosshead arm end on the slider.
              a.set(s * HORN, s * 0.085 * Math.cos(p), 0.085 * Math.sin(p));
              b.set(s * 0.012, s * 0.13, sliderZ());
              return [a.clone(), b.clone()];
            }} />
          ))}
        </Spinning>
        <Callout id="links" p={[0.08, 0.12, 0.1]} />
      </Part>
    </group>
  );
}

const PEDALS: Array<[Pedal, string, string]> = [
  ['left', '左舵', '踩左舵：尾桨桨距加大，侧推力变大，机头向左转。'],
  ['centre', '中立', '中立：尾桨的侧推力刚好抵消主旋翼的反扭矩，机头不转。'],
  ['right', '右舵', '踩右舵：桨距减小甚至反向，侧推力变小，机身被反扭矩带着向右转。'],
];

export function TailControls() {
  const { pedal, set } = useTail();
  const studio = useStudio((s) => s.set);
  return (
    <>
      <div className="strokes gears">
        {PEDALS.map(([p, label]) => (
          <button key={p} type="button" className={p === pedal ? 'is-on' : ''} onClick={() => { set(p); studio({ running: true }); }}>{label}</button>
        ))}
      </div>
      <p className="gear-note">{PEDALS.find((p) => p[0] === pedal)![2]}</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'tail-gearbox', index: 1, name: '尾减速器', en: 'Tail Gearbox', role: '转 90° · 减速', material: '镁合金 / 钢', description: '一对锥齿轮把沿尾梁来的传动轴转 90°，带动尾桨轴。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'hub', index: 2, name: '尾桨毂', en: 'Teetering Hub', role: '连接两片桨叶', material: '钛合金', description: '“跷跷板”式桨毂：两片桨叶连成一体，可以绕中间的铰一起摆动，吸收前飞时左右两边不一样的气动力。', explode: [0, 0, 0.45], stage: [0.5, 0.7] },
  { id: 'blades', index: 3, name: '尾桨叶 ×2', en: 'Tail Rotor Blades', role: '产生侧推力', material: '复合材料', description: '直径约 1.6 米，转速约是主旋翼的 6 倍。根部伸出的小臂是变距摇臂。', explode: [0, 0, 0.8], stage: [0, 0.24] },
  { id: 'slider', index: 4, name: '变距滑套', en: 'Pitch-Change Slider', role: '统一改变桨距', material: '钢', description: '套在尾桨轴上、跟着转；里面一根操纵杆连到驾驶员的脚蹬，推拉它沿轴滑动，两片桨叶的桨距一起变。', explode: [0, 0, 0.5], stage: [0.36, 0.56] },
  { id: 'links', index: 5, name: '变距拉杆', en: 'Pitch Links', role: '传递桨距', material: '钢', description: '从滑套的十字臂连到桨叶的变距摇臂，滑套一动，桨叶就绕自身长轴转一个角度。', explode: [0.25, 0.3, 0.3], stage: [0.2, 0.4] },
];

const STEPS: StepDef[] = [
  {
    title: '尾桨', en: 'Tail Rotor',
    body: '主旋翼往一个方向转，机身就会被反扭矩带着往反方向转。尾桨朝侧面吹，产生一个侧推力抵消它；驾驶员踩脚蹬改尾桨桨距，机头就左右转。用左栏切换脚蹬。',
    state: { explode: 0, section: false, running: true, select: 'slider', focus: null },
    apply: () => useTail.getState().set('centre'),
  },
  {
    title: '拆开', en: 'Teardown',
    body: '取下尾桨叶和变距拉杆，拔出变距滑套，拆下桨毂，剩下尾减速器。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const tailLevel: MachineDef = level({
  id: 'helicopter/tail',
  parent: 'helicopter',
  unit: 6,
  bounds: [[-0.82, -0.82, -0.28], [0.82, 0.82, 0.3]],
  name: '尾桨与尾减速器',
  en: 'Tail Rotor & Gearbox',
  subtitle: '子组件 · 跷跷板式双桨叶 · 脚蹬变距',
  summary: '5 种零件：尾减速器、桨毂、桨叶、变距滑套、拉杆',
  drawingNo: 'GW-ZS-03',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'blades', origin: [0.45, 0, 0] }],
  centreLines: [[[0, 0, -0.35], [0, 0, 0.4], 0.12]],
  steps: STEPS,
  camera: { target: [0, 0, 0.05], offset: [2.5, 1.3, 1.9], orthoDistance: 10, exploded: { target: [0.05, 0.05, 0.35], scale: 1.75 } },
  Model: TailRotor,
  Driver: HeliDriver,
  Controls: TailControls,
});
