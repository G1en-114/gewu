import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { level } from '../kit';
import { ENGINE_SCALE, ENGINES, jumboMotion, WING, WING_TIP_Z } from './airframe';
import { JumboDriver, PhaseControls } from './controls';
import { Flap, FLAP_F, flapLevel, INBOARD_FLAP, OUTBOARD_FLAP } from './flap';
import { loft, memoGeo, onSection, type P3, type Ring, sectionRing, skinRing, spanSteps, stationAt } from './geo';

/**
 * The 747-400 starboard wing in aircraft coordinates (the port wing is its
 * mirror): wing box, leading-edge Krueger flaps, triple-slotted flaps,
 * ailerons, spoilers, winglet and the two engine pylons. Metres.
 */

const ROOT_Z = WING[0].le[2];
/** Front and rear spar positions (chord fractions). */
const SPARS = [0.15, 0.65] as const;
const zs = (z0: number, z1: number, step = 2) => spanSteps(WING, z0, z1, step);
const at = (z: number) => stationAt(WING, z);

/** A spanwise piece of the wing between chord fractions f0–f1 (whole thickness). */
const chordwise = (k: string, z0: number, z1: number, f0: number, f1: number, n = 12) =>
  loft(k, () => zs(z0, z1).map((z) => sectionRing(at(z), f0, f1, n)));

/** Rotates its children about the line a0→a1 by angle(), read every frame. */
export function Hinged({ a0, a1, angle, children }: { a0: P3; a1: P3; angle: () => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const axis = useMemo(() => new THREE.Vector3(...a1).sub(new THREE.Vector3(...a0)).normalize(), [a0, a1]);
  useFrame(() => { if (ref.current) ref.current.quaternion.setFromAxisAngle(axis, angle()); });
  return <group position={a0}><group ref={ref}><group position={[-a0[0], -a0[1], -a0[2]]}>{children}</group></group></group>;
}

// ── Wing box (its own level) ────────────────────────────

const SKIN = 0.035;
const ribZs = () => {
  const out: number[] = [];
  for (let z = ROOT_Z + 0.4; z < WING_TIP_Z - 0.3; z += 0.85) out.push(z);
  return out;
};

/** A rib's section: the box between the spars, pulled in clear of the skins. */
function ribRing(z: number): Ring {
  const ring = sectionRing(at(z), SPARS[0] + 0.006, SPARS[1] - 0.006, 8);
  const c = ring.reduce((m, q) => m + q[1], 0) / ring.length;
  return ring.map((p): P3 => [p[0], c + (p[1] - c) * 0.9, p[2]]);
}

/** A stringer's small square section on one skin at chord fraction f. */
function stringerRing(z: number, f: number, side: 1 | -1): Ring {
  const p = onSection(at(z), f, side, { inset: SKIN });
  const d = side * 0.05;
  return [[p[0] + 0.02, p[1], p[2]], [p[0] - 0.02, p[1], p[2]], [p[0] - 0.02, p[1] - d, p[2]], [p[0] + 0.02, p[1] - d, p[2]]];
}

export function WingBox() {
  const ribs = memoGeo('wb-ribs', () => mergeGeometries(
    ribZs().map((z) => loft(`wb-rib-${z.toFixed(2)}`, () => [ribRing(z), ribRing(z + 0.035)], { crease: Math.PI / 4 })),
    false,
  )!);
  const stringers = memoGeo('wb-stringers', () => mergeGeometries(
    [0.2, 0.26, 0.32, 0.38, 0.44, 0.5, 0.56, 0.6].flatMap((f) => ([1, -1] as const).map((side) => loft(
      `wb-str-${f}-${side}`,
      () => zs(ROOT_Z, WING_TIP_Z - 0.4, 3).map((z) => stringerRing(z, f, side)),
    ))),
    false,
  )!);
  return (
    <group>
      <Part id="upper-skin">
        <M clip geo={loft('wb-upper', () => zs(ROOT_Z, WING_TIP_Z).map((z) => skinRing(at(z), SPARS[0], SPARS[1], 1, SKIN, 10)))} />
        <Callout id="upper-skin" p={onSection(at(16), 0.45, 1)} />
      </Part>
      <Part id="lower-skin">
        <M clip geo={loft('wb-lower', () => zs(ROOT_Z, WING_TIP_Z).map((z) => skinRing(at(z), SPARS[0], SPARS[1], -1, SKIN, 10)))} />
        <Callout id="lower-skin" p={onSection(at(20), 0.45, -1)} />
      </Part>
      <Part id="front-spar">
        <M clip geo={loft('wb-fspar', () => zs(ROOT_Z, WING_TIP_Z).map((z) => sparRing(at(z), SPARS[0])))} />
        <Callout id="front-spar" p={onSection(at(9), SPARS[0], 1, { inset: 0.1 })} />
      </Part>
      <Part id="rear-spar">
        <M clip geo={loft('wb-rspar', () => zs(ROOT_Z, WING_TIP_Z).map((z) => sparRing(at(z), SPARS[1] - 0.012)))} />
        <Callout id="rear-spar" p={onSection(at(12), SPARS[1], 1, { inset: 0.1 })} />
      </Part>
      <Part id="ribs">
        <M clip geo={ribs} />
        <Callout id="ribs" p={onSection(at(6.2), 0.4, 1, { inset: 0.2 })} />
      </Part>
      <Part id="stringers">
        <M clip geo={stringers} />
        <Callout id="stringers" p={onSection(at(24), 0.3, 1, { inset: 0.06 })} />
      </Part>
    </group>
  );
}

/** A spar web: a thin slab at chord fraction f between the skins. */
function sparRing(s: ReturnType<typeof at>, f: number): Ring {
  const w = 0.012;
  return [
    onSection(s, f, 1, { inset: SKIN }), onSection(s, f + w, 1, { inset: SKIN }),
    onSection(s, f + w, -1, { inset: SKIN }), onSection(s, f, -1, { inset: SKIN }),
  ];
}

// ── The whole wing ──────────────────────────────────────

/** Winglet: canted 29° outboard from vertical, swept back, from the tip upward. */
function wingletRings(): Ring[] {
  const tip = at(WING_TIP_Z - 0.05);
  const cant = 0.5;
  const span = 1.9;
  return [0, 0.35, 1].map((u) => {
    const chord = tip.chord * 0.92 + (1.2 - tip.chord * 0.92) * u;
    const le: P3 = [tip.le[0] - 0.15 - 2.2 * u, tip.le[1] + 0.12 + span * Math.cos(cant) * u, WING_TIP_Z - 0.1 + span * Math.sin(cant) * u];
    const n: P3 = [0, -Math.sin(cant), Math.cos(cant)];
    const fs = Array.from({ length: 11 }, (_, i) => (i / 10) ** 2);
    const side = (sgn: 1 | -1) => fs.map((f): P3 => {
      const h = sgn * Math.max(0.0015, 0.5 * 0.09 * (2.969 * Math.sqrt(f) - 1.26 * f - 3.516 * f * f + 2.843 * f ** 3 - 1.036 * f ** 4)) * chord;
      return [le[0] - f * chord, le[1] + n[1] * h, le[2] + n[2] * h];
    });
    return [...side(1), ...side(-1).reverse()];
  });
}

/** Pylon from an engine's top up to the wing's lower surface and on aft under the wing. */
function pylonRings(engine: P3): Ring[] {
  const top = engine[1] + 0.96 * ENGINE_SCALE;
  const s = at(engine[2]);
  const under = onSection(s, 0.3, -1)[1];
  const stations: Array<[number, number, number, number]> = [
    // x offset from the engine origin, bottom, top, half-width
    [-0.6, top - 0.05, top + 0.35, 0.22],
    [-2.2, top - 0.08, under + 0.05, 0.3],
    [-3.6, top - 0.2, under + 0.05, 0.3],
    [-5.6, top - 0.1, under, 0.22],
    [-7.4, under - 0.35, under - 0.05, 0.08],
  ];
  return stations.map(([dx, y0, y1, w]) => {
    const x = engine[0] + dx;
    const pts: Ring = [];
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      pts.push([x, (y0 + y1) / 2 + ((y1 - y0) / 2) * Math.sign(sn) * Math.abs(sn) ** 0.4, w * Math.sign(c) * Math.abs(c) ** 0.4 + engine[2]]);
    }
    return pts;
  });
}

const SPOILERS = [[4.2, 6.6], [6.8, 9.0], [9.2, 11.1], [13.9, 16.4], [16.6, 19.0], [19.2, 21.3]] as const;

export function Wing() {
  const inner = ENGINES.filter((e) => e.at[2] > 0);
  return (
    <group>
      <Part id="wingbox">
        <WingBox />
        <Callout id="wingbox" p={onSection(at(17), 0.4, 1)} />
      </Part>
      <Part id="leading-edge">
        <M clip geo={chordwise('wg-le', ROOT_Z, WING_TIP_Z, 0, SPARS[0], 14)} />
        <Callout id="leading-edge" p={onSection(at(25), 0.03, 1)} />
      </Part>
      <Part id="krueger-in">
        <Hinged a0={onSection(at(3.6), 0.02, -1)} a1={onSection(at(11.2), 0.02, -1)} angle={() => jumboMotion.krueger * 2.1}>
          <M clip geo={loft('wg-kr-in', () => zs(3.6, 11.2).map((z) => skinRing(at(z), 0.025, 0.11, -1, 0.03, 6)))} />
        </Hinged>
        <Callout id="krueger-in" p={onSection(at(7), 0.05, -1)} />
      </Part>
      <Part id="krueger-out">
        <Hinged a0={onSection(at(12.2), 0.02, -1)} a1={onSection(at(28), 0.02, -1)} angle={() => jumboMotion.krueger * 2.0}>
          <M clip geo={loft('wg-kr-out', () => zs(12.2, 28).map((z) => skinRing(at(z), 0.025, 0.1, -1, 0.025, 6)))} />
        </Hinged>
        <Callout id="krueger-out" p={onSection(at(22), 0.05, -1)} />
      </Part>
      <Part id="flap-in">
        <Flap k="flap-in" {...INBOARD_FLAP} />
        <Callout id="flap-in" p={onSection(at(6), 0.85, 1)} />
      </Part>
      <Part id="flap-out">
        <Flap k="flap-out" {...OUTBOARD_FLAP} />
        <Callout id="flap-out" p={onSection(at(18), 0.85, 1)} />
      </Part>
      <Part id="aileron-in">
        <Hinged a0={onSection(at(11.2), FLAP_F[0], 1)} a1={onSection(at(13.7), FLAP_F[0], 1)} angle={() => jumboMotion.flap * 0.12}>
          <M clip geo={chordwise('wg-ail-in', 11.25, 13.65, FLAP_F[0] + 0.005, 1, 10)} />
        </Hinged>
        <Callout id="aileron-in" p={onSection(at(12.4), 0.85, 1)} />
      </Part>
      <Part id="aileron-out">
        <Hinged a0={onSection(at(21.4), 0.72, 1)} a1={onSection(at(28.2), 0.72, 1)} angle={() => jumboMotion.flap * 0.08}>
          <M clip geo={chordwise('wg-ail-out', 21.45, 28.2, 0.725, 1, 10)} />
        </Hinged>
        <Callout id="aileron-out" p={onSection(at(25), 0.85, 1)} />
      </Part>
      <Part id="te-fixed">
        <M clip geo={chordwise('wg-te-out', 21.4, 28.2, FLAP_F[0] + 0.004, 0.72, 6)} />
        <M clip geo={chordwise('wg-te-tip', 28.2, WING_TIP_Z, FLAP_F[0] + 0.004, 1, 8)} />
        <M clip geo={chordwise('wg-te-mid', 11.2, 13.7, 0.6, FLAP_F[0], 4)} />
        <Callout id="te-fixed" p={onSection(at(28.8), 0.8, 1)} />
      </Part>
      <Part id="spoilers">
        {SPOILERS.map(([z0, z1], i) => (
          <Hinged key={z0} a0={onSection(at(z0), 0.56, 1)} a1={onSection(at(z1), 0.56, 1)} angle={() => -jumboMotion.spoiler * (0.75 + 0.03 * i)}>
            <M clip geo={loft(`wg-sp-${i}`, () => [z0, z1].map((z) => skinRing(at(z), 0.56, 0.69, 1, -0.03, 5)))} />
          </Hinged>
        ))}
        <Callout id="spoilers" p={onSection(at(15), 0.62, 1)} />
      </Part>
      <Part id="winglet">
        <M clip geo={loft('wg-winglet', wingletRings)} />
        <Callout id="winglet" p={[-17.0, 8.2, 30.4]} />
      </Part>
      {inner.map((e, i) => (
        <Part key={e.id} id={i ? 'pylon-out' : 'pylon-in'}>
          <M clip geo={loft(`wg-pylon-${e.at[2]}`, () => pylonRings(e.at))} />
          <Callout id={i ? 'pylon-out' : 'pylon-in'} p={[e.at[0] - 2.2, e.at[1] + 0.96 * ENGINE_SCALE + 0.2, e.at[2] + 0.3]} />
        </Part>
      ))}
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'wingbox', index: 1, name: '翼盒', en: 'Wing Box', role: '承力 · 油箱', material: '铝合金', description: '前后两根梁、上下壁板和几十根翼肋组成的盒子，承受全部升力；盒子里面就是油箱，一侧机翼能装约 6 万升燃油。点“拆开此组件”看内部结构。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'leading-edge', index: 2, name: '前缘', en: 'Leading Edge', role: '整流 · 防冰', material: '铝合金', description: '前梁之前的圆头部分，里面走着发动机引来的热空气管，给前缘除冰。', explode: [3.2, 0, 0], stage: [0.72, 0.84] },
  { id: 'krueger-in', index: 3, name: '内侧克鲁格襟翼', en: 'Inboard Krueger Flaps', role: '起降时增升', material: '铝合金', description: '平时收在前缘下面，起降时向前翻下约 120°，把前缘“加长、加圆”，大迎角时气流不分离。', explode: [2.2, -1.4, 0], stage: [0.52, 0.62] },
  { id: 'krueger-out', index: 4, name: '外侧可变弯度前缘襟翼', en: 'Variable-Camber Krueger Flaps', role: '起降时增升', material: '玻璃纤维', description: '747 特有的可变弯度克鲁格襟翼：放下时板面还会弯成弧形，更贴合气流。', explode: [2.4, -1.6, 0], stage: [0.56, 0.68] },
  { id: 'flap-in', index: 5, name: '内侧三缝襟翼', en: 'Inboard Flap', role: '起降时增升', material: '—', description: '用左栏切换“着陆”看它伸出。点“拆开此组件”看三段襟翼和滑轨。', explode: [-3.6, -0.8, 0], stage: [0.12, 0.26] },
  { id: 'flap-out', index: 6, name: '外侧三缝襟翼', en: 'Outboard Flap', role: '起降时增升', material: '—', description: '结构和内侧襟翼一样，翼展方向更窄。', explode: [-3.6, -0.8, 1.2], stage: [0.18, 0.32] },
  { id: 'aileron-in', index: 7, name: '内副翼', en: 'Inboard Aileron', role: '高速时滚转', material: '铝合金 / 复合材料', description: '在两块襟翼之间。高速时外副翼被锁住，只用内副翼滚转，避免外翼扭转。', explode: [-2.6, 0.6, 0], stage: [0.26, 0.38] },
  { id: 'aileron-out', index: 8, name: '外副翼', en: 'Outboard Aileron', role: '低速时滚转', material: '复合材料', description: '离机身远、力臂大，低速时效果好；只在襟翼放下时才工作。', explode: [-2.6, 0.6, 0.8], stage: [0.3, 0.42] },
  { id: 'te-fixed', index: 9, name: '后缘固定段', en: 'Fixed Trailing Edge', role: '整流', material: '复合材料', description: '后梁之后、活动面之间不动的那几块。', explode: [-2.0, -0.4, 0], stage: [0.62, 0.72] },
  { id: 'spoilers', index: 10, name: '扰流板 ×6', en: 'Spoilers', role: '减速 · 卸升力 · 辅助滚转', material: '复合材料', description: '上表面一排板子。空中半开是减速板；接地后全部立起，把升力“打掉”，让重量压到轮子上好刹车；单侧打开还能帮副翼滚转。', explode: [0, 1.4, 0], stage: [0, 0.14] },
  { id: 'winglet', index: 11, name: '翼梢小翼', en: 'Winglet', role: '减小诱导阻力', material: '复合材料', description: '747-400 的标志：约 1.8 米高、向外斜着的翼梢小翼，减弱翼尖涡，省油约 3%。', explode: [-0.6, 1.4, 1.4], stage: [0.4, 0.52] },
  { id: 'pylon-in', index: 12, name: '内侧发动机吊挂', en: 'Inboard Pylon', role: '挂发动机', material: '钛合金 / 钢', description: '把 4 吨多的发动机和最大约 25 吨的推力传给机翼；里面走着燃油、引气、液压和电缆。设计成在剧烈撞击时先断开，保护油箱。', explode: [0, -1.6, 0], stage: [0.44, 0.56] },
  { id: 'pylon-out', index: 13, name: '外侧发动机吊挂', en: 'Outboard Pylon', role: '挂发动机', material: '钛合金 / 钢', description: '和内侧吊挂一样。外侧发动机离翼根远，吊挂还帮着压住机翼的颤振。', explode: [0, -1.6, 0], stage: [0.48, 0.6] },
];

const STEPS: StepDef[] = [
  {
    title: '机翼', en: 'Wing',
    body: '后掠 37.5°、展弦比 7.7 的大机翼，一侧面积约 260 平方米。用左栏切换飞行阶段：起降时前缘克鲁格襟翼翻下、后缘三缝襟翼伸出，着陆接地后扰流板立起。',
    state: { explode: 0, section: false, running: true, select: 'flap-in', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆扰流板、襟翼和副翼，再拆翼梢小翼、吊挂、前缘襟翼和前缘，剩下翼盒。翼盒、襟翼还能再拆。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '选中翼盒或任一块襟翼，点“拆开此组件”。',
    state: { explode: 1, section: false, running: false, select: 'wingbox', focus: null },
  },
];

const BOX_PARTS: PartDef[] = [
  { id: 'lower-skin', index: 1, name: '下壁板', en: 'Lower Skin Panels', role: '受拉', material: '铝合金 2324', description: '飞行时机翼向上弯，下壁板被拉长，所以用抗疲劳性能好的铝合金；上面开着检修口。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'upper-skin', index: 2, name: '上壁板', en: 'Upper Skin Panels', role: '受压', material: '铝合金 7055', description: '上壁板被压缩，用强度更高的合金，内侧加了一排排桁条防止失稳。', explode: [0, 3.0, 0], stage: [0, 0.3] },
  { id: 'stringers', index: 3, name: '桁条', en: 'Stringers', role: '加强壁板', material: '铝合金', description: '沿翼展方向贴在壁板内侧的细长型材，和壁板一起受力。', explode: [0, 1.8, 0], stage: [0.3, 0.5] },
  { id: 'front-spar', index: 4, name: '前梁', en: 'Front Spar', role: '主承力', material: '铝合金', description: '约在 15% 弦长处，从翼根贯穿到翼尖，承受大部分弯矩和剪力。', explode: [3.0, 0.6, 0], stage: [0.6, 0.8] },
  { id: 'rear-spar', index: 5, name: '后梁', en: 'Rear Spar', role: '主承力 · 挂襟翼', material: '铝合金', description: '约在 65% 弦长处。襟翼滑轨、副翼和扰流板的铰链都挂在后梁上。', explode: [-3.0, 0.6, 0], stage: [0.7, 0.9] },
  { id: 'ribs', index: 6, name: '翼肋', en: 'Ribs', role: '保形 · 分隔油箱', material: '铝合金', description: '每隔约 85 厘米一根，保持翼型形状，把壁板载荷传给翼梁；有的翼肋同时是油箱的隔板。', explode: [0, 1.0, 0], stage: [0.5, 0.7] },
];

const BOX_STEPS: StepDef[] = [
  {
    title: '翼盒', en: 'Wing Box',
    body: '机翼真正受力的部分：前梁、后梁、上下壁板围成一个长盒子，几十根翼肋撑住形状。盒子密封起来就是整体油箱。',
    state: { explode: 0, section: false, running: false, select: 'ribs', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '揭开上壁板，取下桁条和翼肋，露出前后梁，剩下下壁板。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const wingBoxLevel: MachineDef = level({
  id: 'b747/wingbox',
  parent: 'b747/wing',
  unit: 0.42,
  bounds: [[-17, 3.3, 3], [6, 7, 29.5]],
  name: '翼盒',
  en: 'Wing Box',
  subtitle: '子组件 · 双梁 · 整体油箱',
  summary: '6 种零件：上下壁板、前后梁、翼肋、桁条',
  drawingNo: 'GW-747-11',
  scale: '1 : 200',
  parts: BOX_PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'upper-skin', origin: [-4, 5.2, 14] }],
  centreLines: [],
  steps: BOX_STEPS,
  camera: { target: [-4.5, 5, 16.5], offset: [-24, 44, 36], orthoDistance: 200, exploded: { target: [-4.5, 6, 16.5], scale: 1.3 } },
  Model: WingBox,
});

export const wingLevel: MachineDef = level({
  id: 'b747/wing',
  parent: 'b747',
  unit: 0.4,
  bounds: [[-19.5, 2, 3], [7.5, 9, 31]],
  name: '机翼',
  en: 'Wing',
  subtitle: '子组件 · 后掠 37.5° · 三缝襟翼',
  summary: '13 种零件：翼盒、克鲁格襟翼、三缝襟翼、副翼、扰流板、小翼、吊挂',
  drawingNo: 'GW-747-10',
  scale: '1 : 200',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { wingbox: 'b747/wingbox', 'flap-in': 'b747/flap', 'flap-out': 'b747/flap' },
  guides: [{ stage: 'flap-in', origin: [-6, 4.2, 7] }],
  centreLines: [],
  steps: STEPS,
  camera: { target: [-5, 4.5, 16.5], offset: [-26, 46, 38], orthoDistance: 200, exploded: { target: [-5, 4.5, 16.5], scale: 1.3 } },
  Model: Wing,
  Driver: JumboDriver,
  Controls: PhaseControls,
});

export const WING_LEVELS: MachineDef[] = [wingLevel, wingBoxLevel, flapLevel];
