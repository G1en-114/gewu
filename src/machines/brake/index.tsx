import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Pipe, Turn } from '../kit';

/**
 * Single-piston floating disc brake. Wheel axle along x (inboard toward −x),
 * the caliper on top straddling the disc; the section plane z = 0 cuts
 * through the piston and both pads. Millimetres; clearances exaggerated.
 */

const DISC_R = 140;
const T = 12;
const GAP = 4;
const PAD_Y: [number, number] = [96, 138];
const PAD_T = 10;
const PISTON_R = 27;

export const brakeMotion = { t: 0, angle: 0, speed: 3 };

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
/** 0 = released, 1 = clamped. */
export const applied = (t: number) => { const c = t % 7; return smooth((c - 2) / 0.5) - smooth((c - 4.6) / 0.5); };

export function BrakeDriver() {
  useFrame((_, raw) => {
    if (!useStudio.getState().running) return;
    const dt = Math.min(raw, 0.05);
    const m = brakeMotion;
    m.t += dt;
    const b = applied(m.t);
    m.speed = b > 0.6 ? Math.max(0, m.speed - dt * 2.2 * b) : Math.min(3, m.speed + dt * 0.9);
    m.angle += dt * m.speed;
  }, -1);
  return null;
}

function Slide({ by, children }: { by: (b: number) => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.position.x = by(applied(brakeMotion.t)); });
  return <group ref={ref}>{children}</group>;
}

function Spin({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = -brakeMotion.angle; });
  return <group ref={ref}>{children}</group>;
}

/** Caliper slides inboard (−x) as the piston pushes out; the outer pad follows it. */
const caliperX = (b: number) => -GAP * b;
const pistonX = (b: number) => 2 * GAP * b;
const PY = (PAD_Y[0] + PAD_Y[1]) / 2;

export function DiscBrake() {
  return (
    <group>
      <Part id="disc">
        <Spin>
          <Turn k="br-disc" profile={[[78, -T], [DISC_R, -T], [DISC_R, T], [78, T]]} axis="x" seg={96} />
          {Array.from({ length: 36 }, (_, i) => (
            <group key={i} rotation={[(i / 36) * Math.PI * 2, 0, 0]}><Box c={[0, 108, 0]} s={[T * 2 + 0.5, 40, 2]} /></group>
          ))}
        </Spin>
        <Callout id="disc" p={[0, -110, 60]} />
      </Part>
      <Part id="hub">
        <Spin>
          <Turn k="br-hat" profile={[[30, -T], [80, -T], [80, -T + 6], [62, -T + 6], [62, 40], [30, 40]]} axis="x" seg={64} />
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return <Cyl key={i} c={[52, 48 * Math.cos(a), 48 * Math.sin(a)]} r={6} len={30} axis="x" seg={12} />;
          })}
        </Spin>
        <Cyl c={[-30, 0, 0]} r={28} len={50} axis="x" seg={32} />
        <Callout id="hub" p={[52, 40, 40]} />
      </Part>
      <Part id="bracket">
        <Box c={[-36, 64, 0]} s={[14, 70, 150]} />
        {[1, -1].map((s) => <Box key={s} c={[-8, PY, s * 70]} s={[70, 52, 12]} />)}
        <Callout id="bracket" p={[-40, 40, 78]} />
      </Part>
      <Part id="caliper">
        <Slide by={caliperX}>
          {/* piston housing (inboard), bridge over the disc, fingers (outboard) */}
          <Turn k="br-bore" profile={[[PISTON_R + 1, -T - GAP - PAD_T - 48], [PISTON_R + 14, -T - GAP - PAD_T - 48], [PISTON_R + 14, -T - GAP - PAD_T - 2], [PISTON_R + 1, -T - GAP - PAD_T - 2]]} p={[0, PY, 0]} axis="x" seg={40} />
          <Box c={[-T - GAP - PAD_T - 50, PY, 0]} s={[6, 2 * PISTON_R + 28, 2 * PISTON_R + 28]} />
          <Box c={[0, PAD_Y[1] + 12, 0]} s={[2 * (T + GAP + PAD_T) + 70, 20, 64]} />
          <Box c={[T + GAP + PAD_T + 10, PY + 8, 0]} s={[16, 58, 64]} />
          <Callout id="caliper" p={[0, PAD_Y[1] + 24, 30]} />
        </Slide>
      </Part>
      <Part id="piston">
        <Slide by={(b) => caliperX(b) + pistonX(b)}>
          <Turn k="br-piston" profile={[[0, -T - GAP - PAD_T - 44], [PISTON_R, -T - GAP - PAD_T - 44], [PISTON_R, -T - GAP - PAD_T], [PISTON_R - 6, -T - GAP - PAD_T], [PISTON_R - 6, -T - GAP - PAD_T - 34], [0, -T - GAP - PAD_T - 34]]} p={[0, PY, 0]} axis="x" seg={40} />
        </Slide>
        <Callout id="piston" p={[-60, PY, 12]} />
      </Part>
      <Part id="seal">
        <Slide by={caliperX}>
          <Turn k="br-seal" profile={[[PISTON_R, 0], [PISTON_R + 4, 0], [PISTON_R + 4, 5], [PISTON_R, 5]]} p={[-T - GAP - PAD_T - 22, PY, 0]} axis="x" seg={40} />
        </Slide>
        <Callout id="seal" p={[-50, PY + PISTON_R + 4, 8]} />
      </Part>
      <Part id="pads">
        <Slide by={(b) => caliperX(b) + pistonX(b)}>
          <Box c={[-T - GAP - PAD_T / 2 + 1.5, PY, 0]} s={[PAD_T - 3, PAD_Y[1] - PAD_Y[0], 110]} />
          <Box c={[-T - GAP - PAD_T + 1, PY, 0]} s={[3, PAD_Y[1] - PAD_Y[0] + 6, 116]} />
        </Slide>
        <Slide by={caliperX}>
          <Box c={[T + GAP + PAD_T / 2 - 1.5, PY, 0]} s={[PAD_T - 3, PAD_Y[1] - PAD_Y[0], 110]} />
          <Box c={[T + GAP + PAD_T - 1, PY, 0]} s={[3, PAD_Y[1] - PAD_Y[0] + 6, 116]} />
        </Slide>
        <Callout id="pads" p={[T + GAP + PAD_T, PAD_Y[0] - 6, 50]} />
      </Part>
      <Part id="pins">
        {[1, -1].map((s) => (
          <group key={s}>
            <Cyl c={[-20, PY + 10, s * 82]} r={6} len={80} axis="x" seg={14} />
            <Turn k="br-boot" profile={[[6, 0], [10, 6], [8, 12], [10, 18], [6, 24]]} p={[-50, PY + 10, s * 82]} axis="x" seg={16} />
          </group>
        ))}
        <Callout id="pins" p={[-20, PY + 24, 88]} />
      </Part>
      <Part id="hose">
        <Slide by={caliperX}>
          <Pipe k="br-hose" pts={[[-T - GAP - PAD_T - 52, PY + 30, 10], [-110, PY + 70, 20], [-150, PY + 110, 0]]} r={4} seg={8} />
          <Cyl c={[-T - GAP - PAD_T - 40, PY + 38, -20]} r={4} len={16} seg={10} />
        </Slide>
        <Callout id="hose" p={[-140, PY + 100, 6]} />
      </Part>
    </group>
  );
}

export function BrakeControls() {
  const [s, setS] = useState({ b: 0, v: 3 });
  useEffect(() => {
    const id = window.setInterval(() => setS({ b: applied(brakeMotion.t), v: brakeMotion.speed }), 100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <div className="strokes">
        <span className={s.b > 0.5 ? 'is-on' : ''}>制动</span>
        <span className={s.b > 0.5 ? '' : 'is-on'}>松开</span>
        <b>{Math.round((s.v / 3) * 100)}%</b>
      </div>
      <p className="gear-note">{s.b > 0.5 ? '液压推出活塞，内片压上刹车盘；卡钳被反推着沿导销滑动，把外片也拉上去——两面夹紧。' : '松开踏板：活塞密封圈像弹簧一样把活塞拉回一点点，刹车片离开刹车盘。'}</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'disc', index: 1, name: '刹车盘', en: 'Disc (Rotor)', role: '被夹住', material: '灰铸铁', description: '和车轮一起转的铸铁盘。中间是一圈通风道，转起来像离心风扇一样把热量甩出去——一次急刹能让它升到几百度。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'hub', index: 2, name: '轮毂与盘帽', en: 'Hub & Hat', role: '连车轮', material: '钢 / 铸铁', description: '刹车盘的“帽子”套在轮毂上，车轮用 5 颗螺栓压在外面。', explode: [80, 0, 0], stage: [0.8, 0.94] },
  { id: 'bracket', index: 3, name: '卡钳支架', en: 'Caliper Bracket', role: '固定 · 承受制动力', material: '铸铁', description: '用螺栓固定在转向节上。刹车片卡在它上面，制动时巨大的扭矩由它承受。', explode: [-120, 0, 0], stage: [0.64, 0.8] },
  { id: 'caliper', index: 4, name: '卡钳体', en: 'Caliper Body', role: '跨在刹车盘上', material: '铸铁 / 铝', description: '“浮动”卡钳：只有内侧一个活塞，整个钳体可以沿导销左右滑。活塞把内片推上去时，反作用力把钳体往里拉，外侧的钳爪就把外片也压上去。', explode: [0, 120, 0], stage: [0.2, 0.36] },
  { id: 'piston', index: 5, name: '活塞', en: 'Piston', role: '推内片', material: '钢 / 酚醛树脂', description: '踩下踏板，总泵把刹车油压过来，推着活塞向外顶。油压可达 10 MPa 以上。', explode: [-80, 120, 0], stage: [0.36, 0.5] },
  { id: 'seal', index: 6, name: '活塞密封圈', en: 'Piston Seal', role: '密封 · 回位', material: '橡胶', description: '方形截面的橡胶圈：活塞向外推时它被扭一点，松开时弹回去把活塞拉回零点几毫米——刹车片就这样自动离开刹车盘，还能自动补偿磨损。', explode: [-110, 140, 0], stage: [0.42, 0.56] },
  { id: 'pads', index: 7, name: '刹车片 ×2', en: 'Pads', role: '摩擦', material: '摩擦材料 / 钢背', description: '钢背板上粘着摩擦材料，把动能变成热。磨薄到 3 mm 左右就该换了。', explode: [0, 60, 120], stage: [0.08, 0.22] },
  { id: 'pins', index: 8, name: '导销', en: 'Slide Pins', role: '让卡钳浮动', material: '钢 / 橡胶护套', description: '两根涂了润滑脂的销子，卡钳就沿着它们滑。护套防止进灰锈死。', explode: [-60, 40, 0], stage: [0.56, 0.68] },
  { id: 'hose', index: 9, name: '刹车油管与放气螺钉', en: 'Hose & Bleeder', role: '供油', material: '橡胶 / 钢', description: '软管把刹车油从总泵引过来；放气螺钉用来排掉油路里的空气——有空气刹车就会“软”。', explode: [-80, 80, 0], stage: [0, 0.12] },
];

const STEPS: StepDef[] = [
  {
    title: '盘式制动器', en: 'Disc Brake',
    body: '剖开卡钳看：刹车盘一直在转，踩下刹车时活塞把内片推上去，卡钳整体被反推着滑过来，外片也贴上去，两面夹住刹车盘，转速很快降下来。左栏显示状态和转速。',
    state: { explode: 0, section: true, running: true, select: 'piston', focus: null },
  },
  {
    title: '浮动卡钳', en: 'Floating Caliper',
    body: '注意卡钳体：制动时它整个往里挪了几毫米（这里放大了），所以一个活塞就能从两边夹紧。松开时密封圈把活塞拉回，刹车片离开刹车盘。',
    state: { explode: 0, section: true, running: true, select: 'caliper', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆油管，取下刹车片和卡钳体，从卡钳里压出活塞、取出密封圈，再拆导销和支架，最后取下刹车盘。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const brake: MachineDef = level({
  id: 'brake',
  unit: 0.02,
  bounds: [[-160, -DISC_R, -DISC_R], [60, PY + 120, DISC_R]],
  name: '盘式制动器',
  en: 'Floating-Caliper Disc Brake',
  subtitle: '装配体 · 单活塞浮动卡钳 · 通风盘',
  summary: '9 种零件 · 制动时卡钳浮动、两面夹紧，刹车盘减速',
  drawingNo: 'GW-ZD-00',
  scale: '1 : 4',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'caliper', origin: [0, PAD_Y[1] + 12, 0] }],
  centreLines: [[[-80, 0, 0], [80, 0, 0], DISC_R + 6], [[-120, PY, 0], [60, PY, 0]]],
  steps: STEPS,
  camera: { target: [-30, 60, 0], offset: [-330, 220, 600], orthoDistance: 3000, exploded: { target: [-30, 80, 20], scale: 1.4 } },
  Model: DiscBrake,
  Driver: BrakeDriver,
  Controls: BrakeControls,
});
