import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Rod, Turn } from '../kit';

/**
 * Toilet cistern with a float-operated fill valve and a flapper flush valve.
 * Front of the tank toward +z, the lever on the left (−x); millimetres,
 * tank floor at y = 0.
 */

const W = 420;
const D = 170;
const H = 330;
const FULL = 250;
const EMPTY = 40;
const FLAP: [number, number] = [40, 0];
const FILL_X = -150;

export const cisternMotion = { t: 0 };
export function CisternDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) cisternMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}

const CYCLE = 14;
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** Lever, flapper angle, water level and fill valve opening through one flush. */
export function cisternState(t: number) {
  const c = t % CYCLE;
  const press = smooth((c - 1) / 0.4) - smooth((c - 2.2) / 0.4);
  const drain = smooth((c - 1.3) / 2.6);
  const refill = smooth((c - 4.2) / 8);
  const water = c < 4.2 ? FULL - (FULL - EMPTY) * drain : EMPTY + (FULL - EMPTY) * refill;
  // The flapper floats open until the water is nearly gone, then drops shut.
  const flap = c > 1.2 && c < 4.0 ? 1.1 * smooth((c - 1.2) / 0.3) * (1 - smooth((c - 3.6) / 0.4)) : 0;
  const valve = water < FULL - 3 && c > 3.4 ? 1 : 0;
  let phase = 0;
  if (c > 1 && c < 1.3) phase = 1;
  else if (c >= 1.3 && c < 4.0) phase = 2;
  else if (c >= 4.0 && water < FULL - 3) phase = 3;
  else if (c >= 4.0) phase = 4;
  return { press, flap, water, valve, phase };
}

function Animated({ apply, children }: { apply: (g: THREE.Group, s: ReturnType<typeof cisternState>) => void; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) apply(ref.current, cisternState(cisternMotion.t)); });
  return <group ref={ref}>{children}</group>;
}

/** Lever: pivot near the handle, arm reaching over the flush valve. */
const LEVER_PIVOT: [number, number] = [-W / 2 + 10, 300];
const LEVER_LEN = FLAP[0] + W / 2 - 20;
const leverAngle = (press: number) => press * 0.45;
const FLAP_PIVOT: [number, number] = [FLAP[0] + 44, 16];
/** Where the chain hooks on, in the flapper's frame (relative to its hinge). */
const HOOK: [number, number] = [-70, 16];

function chainEnds(): [THREE.Vector3, THREE.Vector3] {
  const s = cisternState(cisternMotion.t);
  const a = leverAngle(s.press);
  const top = new THREE.Vector3(LEVER_PIVOT[0] + LEVER_LEN * Math.cos(a), LEVER_PIVOT[1] + LEVER_LEN * Math.sin(a) - 4, 0);
  const f = -s.flap;
  const bottom = new THREE.Vector3(FLAP_PIVOT[0] + HOOK[0] * Math.cos(f) - HOOK[1] * Math.sin(f), FLAP_PIVOT[1] + HOOK[0] * Math.sin(f) + HOOK[1] * Math.cos(f), 0);
  return [bottom, top];
}

/** The chain hangs from the lever to the flapper (slack shown as a straight run). */
function Chain() {
  const ref = useRef<THREE.Group>(null);
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  useFrame(() => {
    if (!ref.current) return;
    const [a, b] = chainEnds();
    const d = b.clone().sub(a);
    ref.current.position.copy(a).addScaledVector(d, 0.5);
    ref.current.quaternion.copy(q.setFromUnitVectors(up, d.clone().normalize()));
    ref.current.scale.set(1, d.length(), 1);
  });
  return <group ref={ref}><Cyl c={[0, 0, 0]} r={2} len={1} seg={6} /></group>;
}

/** Float arm pivot on the fill valve; the float sits on the water. */
const PIVOT: [number, number] = [FILL_X + 20, 290];
const ARM = 120;
const floatAngle = (water: number) => Math.asin(Math.max(-0.95, Math.min(0.95, (water + 15 - PIVOT[1]) / ARM)));

export function Cistern() {
  return (
    <group>
      <Part id="tank">
        <Box c={[0, -6, 0]} s={[W + 20, 12, D + 20]} />
        <Box c={[-W / 2 - 5, H / 2, 0]} s={[10, H, D + 20]} />
        <Box c={[W / 2 + 5, H / 2, 0]} s={[10, H, D + 20]} />
        <Box c={[0, H / 2, -D / 2 - 5]} s={[W, H, 10]} />
        <Box c={[0, H / 2, D / 2 + 5]} s={[W, H, 10]} />
        <Callout id="tank" p={[W / 2, H - 40, D / 2 + 10]} />
      </Part>
      <Part id="lid">
        <Box c={[0, H + 8, 0]} s={[W + 30, 16, D + 30]} />
        <Callout id="lid" p={[100, H + 16, 60]} />
      </Part>
      <Part id="water">
        <Animated apply={(g, s) => { g.scale.y = Math.max(0.01, s.water / FULL); }}>
          <Box c={[0, FULL / 2, 0]} s={[W - 2, FULL, D - 2]} />
        </Animated>
        <Callout id="water" p={[120, 120, D / 2]} />
      </Part>
      <Part id="flush-valve">
        <Turn k="ci-seat" profile={[[34, -12], [46, -12], [46, 14], [34, 14]]} p={[FLAP[0], 0, FLAP[1]]} seg={40} />
        <Cyl c={[FLAP[0] + 50, 140, 0]} r={12} len={240} seg={20} />
        <Rod a={[FLAP[0] + 50, 18, 0]} b={[FLAP[0] + 40, 12, 0]} r={8} />
        <Callout id="flush-valve" p={[FLAP[0] + 62, 220, 10]} />
      </Part>
      <Part id="flapper">
        <group position={[FLAP_PIVOT[0], FLAP_PIVOT[1], 0]}>
          <Animated apply={(g, s) => { g.rotation.z = -s.flap; }}>
            <Turn k="ci-flapper" profile={[[0, 0], [44, 0], [44, 8], [30, 16], [0, 18]]} p={[-44, 0, 0]} seg={36} />
            <Box c={[-6, 6, 0]} s={[14, 6, 20]} />
          </Animated>
        </group>
        <Callout id="flapper" p={[FLAP[0] - 40, 30, 30]} />
      </Part>
      <Part id="chain">
        <Chain />
        <Callout id="chain" p={[FLAP[0] - 8, 200, 6]} />
      </Part>
      <Part id="lever">
        <group position={[LEVER_PIVOT[0], LEVER_PIVOT[1], D / 2 - 30]}>
          <Animated apply={(g, s) => { g.rotation.z = leverAngle(s.press); }}>
            <Box c={[LEVER_LEN / 2, 0, -D / 2 + 30]} s={[LEVER_LEN, 8, 10]} />
            <Box c={[-24, 0, 35]} s={[60, 14, 16]} />
          </Animated>
        </group>
        <Callout id="lever" p={[-W / 2 - 30, 320, D / 2 + 20]} />
      </Part>
      <Part id="fill-valve">
        <Cyl c={[FILL_X, 150, 0]} r={14} len={300} seg={20} />
        <Cyl c={[FILL_X, 300, 0]} r={24} len={30} seg={24} />
        <Cyl c={[FILL_X, -30, 0]} r={10} len={60} seg={14} />
        <Rod a={[FILL_X + 14, 280, 0]} b={[FLAP[0] + 50, 262, 0]} r={3} seg={6} />
        <Callout id="fill-valve" p={[FILL_X - 30, 220, 10]} />
      </Part>
      <Part id="float">
        <group position={[PIVOT[0], PIVOT[1], 0]}>
          <Animated apply={(g, s) => { g.rotation.z = floatAngle(s.water); }}>
            <Box c={[ARM / 2, 0, 0]} s={[ARM, 6, 6]} />
            <Cyl c={[ARM, 0, 0]} r={34} len={44} seg={28} />
          </Animated>
        </group>
        <Callout id="float" p={[PIVOT[0] + ARM, PIVOT[1] + 30, 30]} />
      </Part>
    </group>
  );
}

const PHASES = ['按下', '排水', '补水', '满水关阀'];

export function CisternControls() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPhase(cisternState(cisternMotion.t).phase), 100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="strokes" aria-live="off">
      {PHASES.map((p, i) => <span key={p} className={i + 1 === phase ? 'is-on' : ''}>{p}</span>)}
    </div>
  );
}

const PARTS: PartDef[] = [
  { id: 'tank', index: 1, name: '水箱', en: 'Tank', role: '储水', material: '陶瓷', description: '储存一次冲水的水量（这种老式水箱约 6–9 升）。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'lid', index: 2, name: '水箱盖', en: 'Lid', role: '盖子', material: '陶瓷', description: '掀开它就能看到下面这一整套机构。', explode: [0, 160, 0], stage: [0, 0.12] },
  { id: 'water', index: 3, name: '水', en: 'Water', role: '工作介质', material: '—', description: '水位就是这套机构的“控制量”：浮子感受它、进水阀据此开关。', explode: [0, 0, 260], stage: [0.12, 0.24] },
  { id: 'lever', index: 4, name: '扳手', en: 'Handle & Lever', role: '输入', material: '塑料 / 钢', description: '按下外面的手柄，里面的杠杆一端抬起，拉动链条。', explode: [-120, 120, 0], stage: [0.24, 0.36] },
  { id: 'chain', index: 5, name: '提拉链', en: 'Chain', role: '传力', material: '不锈钢', description: '连着杠杆和排水阀盖，要留一点松量：太紧会漏水，太松拉不开。', explode: [0, 140, 120], stage: [0.32, 0.44] },
  { id: 'flapper', index: 6, name: '排水阀盖', en: 'Flapper', role: '开关出水口', material: '橡胶', description: '平时被水压压在出水口上。拉起后它自己浮在水里保持打开，直到水快放完才因自重落下，封住出水口——所以只需按一下，不用一直按着。', explode: [100, 60, 120], stage: [0.42, 0.56] },
  { id: 'flush-valve', index: 7, name: '排水阀与溢流管', en: 'Flush Valve & Overflow', role: '出水口 · 防溢', material: '塑料', description: '底部是出水口阀座；立着的管子是溢流管，万一进水阀关不严，多出的水从这里流进马桶，不会漫出水箱。', explode: [160, 0, -140], stage: [0.6, 0.74] },
  { id: 'fill-valve', index: 8, name: '进水阀', en: 'Fill Valve', role: '补水', material: '塑料 / 黄铜', description: '接自来水管。浮子下落时阀门打开补水，浮子升到位时把阀门压死。细管把一部分水引进溢流管，给马桶存水弯补水封。', explode: [-160, 0, -140], stage: [0.72, 0.86] },
  { id: 'float', index: 9, name: '浮子', en: 'Float', role: '感受水位', material: '塑料', description: '漂在水面上，通过一根杠杆压住进水阀：水位低，浮子落下、阀开；水位到了，浮子浮起、阀关。这就是最早的“负反馈”自动控制。', explode: [-60, 120, 140], stage: [0.5, 0.64] },
];

const STEPS: StepDef[] = [
  {
    title: '冲水马桶水箱', en: 'Cistern',
    body: '没有一个电子元件，却能自己完成“放水—关阀—补水—停水”。剖开水箱看一次完整的冲水，左栏显示当前阶段。',
    state: { explode: 0, section: true, running: true, select: 'flapper', focus: null },
  },
  {
    title: '浮子：负反馈', en: 'Float Control',
    body: '盯住浮子和进水阀：水位越低，浮子越低，阀门开得越大；水位上来，浮子把阀门慢慢压住。水位就这样稳定在设定高度——温度计、稳压器、恒温器都是同样的思路。',
    state: { explode: 0, section: true, running: true, select: 'float', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '掀开盖子、放掉水，取下扳手和链条，再拆排水阀盖、浮子，最后是排水阀和进水阀。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const cistern: MachineDef = level({
  id: 'cistern',
  unit: 0.02,
  bounds: [[-W / 2 - 60, -60, -D / 2 - 10], [W / 2 + 10, H + 16, D / 2 + 30]],
  name: '马桶水箱',
  en: 'Toilet Cistern',
  subtitle: '装配体 · 浮子进水阀 · 翻板排水阀',
  summary: '9 种零件 · 浮子负反馈自动补水，完整冲水循环',
  drawingNo: 'GW-SX-00',
  scale: '1 : 5',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'lid', origin: [0, H + 8, 0] }],
  centreLines: [[[FILL_X, -60, 0], [FILL_X, H, 0]], [[FLAP[0], -20, 0], [FLAP[0], 60, 0]]],
  steps: STEPS,
  camera: { target: [0, 150, 0], offset: [340, 420, 1180], orthoDistance: 3000, exploded: { target: [0, 200, 0], scale: 1.35 } },
  Model: Cistern,
  Driver: CisternDriver,
  Controls: CisternControls,
});
