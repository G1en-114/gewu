import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, Rod, roundRect, Turn, XZ_Y } from '../kit';
import { SHA } from './layout';
import { shaperMotion, ShaperDriver } from './motion';
import { ShaperControls } from './controls';
import { ToolHead, toolHeadLevel } from './toolhead';
import { Rocker, rockerLevel } from './rocker';
import { FeedMechanism, feedLevel, feedLeverPoint } from './feed';

/**
 * BC6063 牛头刨床 (horizontal shaping machine). The ram slides on top of the
 * column; the slotted-link drive inside the column turns the bull gear's
 * rotation into the ram's stroke; the table rides on a cross rail on the
 * column front and is fed across by the ratchet drive every return stroke.
 *
 * Millimetres; +x is forward (toward the table), +y up, the mechanism plane is
 * z = 0, so the section cuts the drive, the ram, the table screw and tool head.
 * Specs: shaping length 630 mm, table 650 × 450 mm, table travels 630 / 360 mm,
 * table to ram 6.5–370 mm, tool slide 120 mm, tool head ±60°,
 * 14/20/28/40/56/80 strokes per minute, cross feed 0.33–3.33 mm, motor 3 kW,
 * 2280 × 1450 × 1750 mm, 1850 kg.
 * Sources: 山东普机 BC6063 公开规格; standard shaper kinematic references.
 */

function RockerGroup({ children }: { children: ReactNode }) {
  return <group position={[SHA.pivot.x, SHA.pivot.y, 0]}>{children}</group>;
}

/** The ram (and the tool head bolted under its nose) slides along x. */
function RamGroup({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = SHA.pivot.x + shaperMotion.ramDx;
  });
  return <group ref={ref}>{children}</group>;
}

/** The table rides on the cross rail and is fed across in z. */
function TableGroup({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.z = shaperMotion.tableZ;
  });
  return <group ref={ref}>{children}</group>;
}

/** Belt loop around two pulleys in the x-y plane, extruded in z. */
function beltShape(c1: [number, number], r1: number, c2: [number, number], r2: number, half: number) {
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const C = Math.hypot(dx, dy);
  const u: [number, number] = [dx / C, dy / C];
  const p: [number, number] = [-u[1], u[0]];
  const a = (r1 - r2) / C;
  const b = Math.sqrt(Math.max(0, 1 - a * a));
  const n: [number, number] = [a * u[0] + b * p[0], a * u[1] + b * p[1]];
  const T1a: [number, number] = [c1[0] + r1 * n[0], c1[1] + r1 * n[1]];
  const T1b: [number, number] = [c1[0] - r1 * n[0], c1[1] - r1 * n[1]];
  const T2a: [number, number] = [c2[0] + r2 * n[0], c2[1] + r2 * n[1]];
  const T2b: [number, number] = [c2[0] - r2 * n[0], c2[1] - r2 * n[1]];
  const angle = (c: [number, number], q: [number, number]) => Math.atan2(q[1] - c[1], q[0] - c[0]);
  const wrap = (c: [number, number], r: number, a0: number, a1: number, through: number) => {
    const norm = (v: number) => ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const ccw = norm(a1 - a0);
    const cw = Math.PI * 2 - ccw;
    const dist = (x: number, y: number) => {
      const d = Math.abs(norm(x - y));
      return Math.min(d, Math.PI * 2 - d);
    };
    const sweep = dist(norm(a0 + ccw / 2), through) <= dist(norm(a0 - cw / 2), through) ? ccw : -cw;
    return Array.from({ length: 23 }, (_, i): [number, number] => {
      const t = a0 + (sweep * (i + 1)) / 24;
      return [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)];
    });
  };
  const outer: Array<[number, number]> = [];
  const inner: Array<[number, number]> = [];
  const add = (q: [number, number], nx: number, ny: number) => {
    outer.push([q[0] + half * nx, q[1] + half * ny]);
    inner.push([q[0] - half * nx, q[1] - half * ny]);
  };
  add(T1a, n[0], n[1]);
  add(T2a, n[0], n[1]);
  const rear = Math.atan2(-u[1], -u[0]);
  for (const q of wrap(c2, r2, angle(c2, T2a), angle(c2, T2b), rear)) {
    add(q, (q[0] - c2[0]) / r2, (q[1] - c2[1]) / r2);
  }
  add(T2b, n[0], n[1]);
  add(T1b, n[0], n[1]);
  const front = Math.atan2(u[1], u[0]);
  for (const q of wrap(c1, r1, angle(c1, T1b), angle(c1, T1a), front)) {
    add(q, (q[0] - c1[0]) / r1, (q[1] - c1[1]) / r1);
  }
  const shape = new THREE.Shape();
  shape.moveTo(...outer[0]);
  for (const q of outer.slice(1)) shape.lineTo(...q);
  shape.closePath();
  const hole = new THREE.Path();
  const reversed = [...inner].reverse();
  hole.moveTo(...reversed[0]);
  for (const q of reversed.slice(1)) hole.lineTo(...q);
  hole.closePath();
  shape.holes.push(hole);
  return () => shape;
}

/** Disc on the bull-gear shaft that drives the feed connecting rod. */
function EccentricSpin({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = shaperMotion.crank;
  });
  return <group ref={ref} position={[SHA.pivot.x, SHA.pivot.y + SHA.crank.d, 440]}>{children}</group>;
}

/** Rod between two points that both move each frame. */
function DynamicRod({ from, to, r, children }: { from: () => [number, number, number]; to: () => [number, number, number]; r: number; children?: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  useFrame(() => {
    if (!ref.current) return;
    const a = new THREE.Vector3(...from());
    const b = new THREE.Vector3(...to());
    dir.copy(b).sub(a);
    const len = dir.length();
    ref.current.position.copy(a).addScaledVector(dir, 0.5);
    ref.current.quaternion.setFromUnitVectors(up, dir.normalize());
    ref.current.scale.set(1, Math.max(1e-3, len), 1);
  });
  return (
    <group ref={ref}>
      <Cyl c={[0, 0, 0]} r={r} len={1} axis="y" seg={14} />
      {children}
    </group>
  );
}

export function Shaper() {
  const beltHalf = 8;
  const mr = SHA.drive.motorR;
  const ir = SHA.drive.inputR;
  const eccPin = (): [number, number, number] => [
    SHA.pivot.x + 45 * Math.cos(shaperMotion.crank),
    SHA.pivot.y + SHA.crank.d + 45 * Math.sin(shaperMotion.crank),
    440,
  ];
  return (
    <group>
      <Part id="bed">
        <Box c={[-290, 85, 0]} s={[1660, 170, 860]} />
        <Box c={[-290, 15, 0]} s={[1560, 30, 780]} />
        {/* column: rear, front and side walls, hollow for the drive */}
        <Box c={[-1090, 810, 0]} s={[60, 1280, 760]} />
        <Box c={[-450, 810, 0]} s={[60, 1280, 760]} />
        <Box c={[-800, 810, -350]} s={[640, 1280, 60]} />
        <Box c={[-800, 810, 350]} s={[640, 1280, 60]} />
        <Box c={[-1120, 110, 0]} s={[120, 60, 860]} />
        <Box c={[-760, 820, 382]} s={[380, 900, 5]} />
        <Box c={[-500, 1300, 0]} s={[100, 100, 680]} />
        {/* ram guide on top of the column */}
        <Box c={[-710, 1465, 0]} s={[820, 30, 640]} />
        {[1, -1].map((s) => (
          <Box key={s} c={[-710, 1490, s * 250]} s={[820, 20, 60]} />
        ))}
        <Box c={[-1090, 1490, 0]} s={[60, 20, 500]} />
        {[[-70, -120], [-70, 120], [180, -120], [180, 120]].map(([x, z], i) => (
          <Turn key={i} k={`bc-foot-${i}`} profile={[[8, 0], [14, 0], [14, 1], [8, 1]]} p={[x, 170, z]} axis="y" />
        ))}

        {[1, -1].map((s) => (
          <Box key={s} c={[-417, 700, s * 280]} s={[6, 1000, 26]} />
        ))}
        {[1, -1].map((s) => (
          <Box key={s} c={[-800, 1452, s * 340]} s={[600, 6, 40]} />
        ))}
        <Box c={[-417, 1245, 160]} s={[6, 130, 220]} />
        {[1195, 1245, 1295].map((y) => (
          <Box key={y} c={[-413, y, 160]} s={[2, 3, 190]} />
        ))}
        {[-920, -590].map((x) => [-440, 1240].map((y) => (
          <Cyl key={`${x}-${y}`} c={[x, y, 386]} r={7} len={6} axis="z" seg={6} />
        )))}
        <Callout id="bed" p={[-980, 140, 300]} />
      </Part>

      <RamGroup>
        <Part id="ram">
          <Box c={[275, 1665, 0]} s={[1250, 50, 220]} />
          {[1, -1].map((s) => (
            <Box key={s} c={[275, 1565, s * 65]} s={[1250, 220, 70]} />
          ))}
          <Box c={[-330, 1560, 0]} s={[40, 180, 60]} />
          <Box c={[880, 1560, 0]} s={[40, 180, 60]} />
          <Box c={[880, 1470, 0]} s={[180, 20, 200]} />
          <Box c={[275, 1692, 0]} s={[1100, 6, 160]} />
          <Box c={[560, 1485, 0]} s={[260, 10, 14]} />
          <Box c={[275, 1694, 0]} s={[1000, 2, 18]} />
          {[1, -1].map((s) => (
            <Box key={s} c={[275, 1560, s * 101]} s={[1140, 4, 2]} />
          ))}
          <Callout id="ram" p={[640, 1705, 90]} />
        </Part>
        <Part id="tool-head">
          <group position={[SHA.tool.x, SHA.tool.y, 0]}><ToolHead /></group>
          <Callout id="tool-head" p={[SHA.tool.x + 130, SHA.tool.y - 60, 130]} />
        </Part>
      </RamGroup>

      <Part id="cross-rail">
        <Box c={[-150, 1065, 0]} s={[540, 130, 860]} />
        <Box c={[-400, 1065, 0]} s={[40, 130, 500]} />
        <Box c={[100, 1065, 0]} s={[60, 130, 860]} />
        <Cyl c={[-400, 650, 0]} r={20} len={700} seg={20} />
        <Box c={[-400, 1065, 0]} s={[90, 140, 90]} />
        <Turn k="bc-vert-wheel" profile={[[0, 268], [110, 268], [110, 292], [0, 292]]} p={[-400, 0, 0]} seg={36} />
        {[0, 1, 2, 3].map((i) => (
          <Rod key={i} a={[-400, 280, 0]} b={[-400 + 78 * Math.cos((i * Math.PI) / 2), 280, 78 * Math.sin((i * Math.PI) / 2)]} r={8} seg={10} />
        ))}
        <Rod a={[60, 1065, 330]} b={[190, 1065, 420]} r={11} seg={12} />
        <Rod a={[190, 1065, 420]} b={[240, 1065, 460]} r={16} seg={14} />
        <Callout id="cross-rail" p={[40, 1075, 440]} />
      </Part>

      <TableGroup>
        <Part id="table">
          <Plate k="bc-table" shape={roundRect(-50, -325, 400, 325, 10)} depth={70} p={[0, 1130, 0]} r={XZ_Y} />
          {[60, 150, 240].map((x) => (
            <Box key={x} c={[x, 1200, 0]} s={[16, 1.4, 620]} />
          ))}
          {[1, -1].map((s) => (
            <Box key={s} c={[-50, 1165, s * 325]} s={[12, 10, 4]} />
          ))}
          <Box c={[120, 1136, 0]} s={[180, 10, 500]} />
          <Callout id="table" p={[350, 1215, 110]} />
        </Part>
      </TableGroup>

      <Part id="rocker">
        <RockerGroup><Rocker /></RockerGroup>
        <Callout id="rocker" p={[SHA.pivot.x + 40, 1200, 60]} />
      </Part>

      <Part id="feed">
        <group position={[SHA.screw.x, SHA.screw.y, SHA.screw.z]}>
          <FeedMechanism />
        </group>
        <Callout id="feed" p={[SHA.screw.x + 90, SHA.screw.y + 60, SHA.screw.z + 60]} />
      </Part>

      <Part id="feed-rod">
        <EccentricSpin>
          <Cyl c={[0, 0, 0]} r={62} len={24} axis="z" seg={36} />
          <Cyl c={[45, 0, 0]} r={16} len={60} axis="z" seg={20} />
        </EccentricSpin>
        <Cyl c={[SHA.pivot.x, SHA.pivot.y + SHA.crank.d, 180]} r={42} len={520} axis="z" seg={28} />
        <DynamicRod from={eccPin} to={feedLeverPoint} r={14} />
        <Callout id="feed-rod" p={[SHA.pivot.x + 60, SHA.pivot.y + SHA.crank.d - 60, 470]} />
      </Part>

      <Part id="motor">
        <Cyl c={[SHA.motor.x, SHA.motor.y, (SHA.motor.z0 + SHA.motor.z1) / 2]} r={SHA.motor.r} len={SHA.motor.z1 - SHA.motor.z0} axis="z" seg={32} />
        {Array.from({ length: 9 }, (_, i) => (
          <Cyl key={i} c={[SHA.motor.x, SHA.motor.y, -308 + i * 24]} r={128} len={3} axis="z" seg={32} />
        ))}
        <Box c={[SHA.motor.x, SHA.motor.y + 112, -200]} s={[84, 54, 74]} />
        <Cyl c={[SHA.motor.x, SHA.motor.y, -60]} r={30} len={60} axis="z" seg={20} />
        <Box c={[SHA.motor.x, 200, -200]} s={[240, 30, 160]} />
        <Callout id="motor" p={[SHA.motor.x + 130, SHA.motor.y + 60, -240]} />
      </Part>

      <Part id="drive">
        <Turn k="bc-motor-pulley" profile={[[0, -78], [mr, -78], [mr, -46], [0, -46]]} p={[SHA.drive.motor.x, SHA.drive.motor.y, 0]} seg={48} />
        <Turn k="bc-input-pulley" profile={[[0, -80], [ir, -80], [ir, -44], [0, -44]]} p={[SHA.pinion.x, SHA.pinion.y, 0]} seg={56} />
        <Plate k="bc-belt" shape={beltShape([SHA.drive.motor.x, SHA.drive.motor.y], mr + 5, [SHA.pinion.x, SHA.pinion.y], ir + 5, beltHalf)} depth={18} p={[0, 0, -72]} />
        <Cyl c={[SHA.pinion.x, SHA.pinion.y, -130]} r={26} len={220} axis="z" seg={24} />
        <Callout id="drive" p={[SHA.drive.motor.x - 140, SHA.drive.motor.y, -120]} />
      </Part>

      <Part id="switch">
        <Box c={[-700, 980, 405]} s={[150, 190, 44]} />
        <Cyl c={[-700, 1010, 430]} r={18} len={14} axis="z" seg={16} />
        <Cyl c={[-700, 945, 430]} r={12} len={12} axis="z" seg={12} />
        <Callout id="switch" p={[-700, 1090, 430]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'bed', index: 1, name: '床身与立柱', en: 'Bed & Column', role: '基础 · 导轨', material: 'HT200 灰铸铁', description: '整机 1850 kg 的铸铁床身。前面是装工作台的横梁导轨，里面是摆杆机构和传动齿轮，顶上是滑枕的燕尾导轨。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'ram', index: 2, name: '滑枕', en: 'Ram', role: '带着刨刀往复', material: 'HT200 灰铸铁', description: '200 × 220 mm 的铸铁滑枕，在立柱顶上的燕尾导轨里滑动，刨削长度 630 mm。3 kW 电机只能把滑枕推到 14–80 次/分。', explode: [0, 520, 0], stage: [0.82, 0.94] },
  { id: 'cross-rail', index: 3, name: '横梁与垂直进给', en: 'Cross Rail', role: '承托工作台 · 升降', material: 'HT200 灰铸铁', description: '横梁沿立柱前面的导轨升降（垂直行程 360 mm），手动丝杠加手轮；工作台就装在这根横梁上。', explode: [0, -320, 180], stage: [0.64, 0.76] },
  { id: 'table', index: 4, name: '工作台', en: 'Table', role: '装夹工件', material: 'HT200 灰铸铁', description: '650 × 450 mm 的工作台，台面有三条 T 形槽（槽宽 18 mm），横向行程 630 mm，每刨一次横向或垂直进给 0.33–3.33 mm。', explode: [420, -40, 0], stage: [0.52, 0.64] },
  { id: 'tool-head', index: 5, name: '刀架', en: 'Tool Head', role: '装刀 · 吃刀 · 抬刀', material: '—', description: '装在滑枕前端：转盘可以回转 ±60°，滑板垂直行程 120 mm，拍板在回程时抬起让刀。点“拆开此组件”进去看。', explode: [420, 320, 0], deep: [520, 260, 0], stage: [0.36, 0.48] },
  { id: 'rocker', index: 6, name: '摆杆机构', en: 'Slotted-Link Drive', role: '转动 → 往复', material: '—', description: '大齿轮上的曲柄销在摆杆槽里滑，摆杆绕下端轴摆动，把 28 次/分的转动变成滑枕的往复，而且回程更快（急回）。点“拆开此组件”进去看。', explode: [-380, 140, 0], deep: [-620, 0, 0], stage: [0.3, 0.44] },
  { id: 'feed', index: 7, name: '横向进给机构', en: 'Cross-Feed Mechanism', role: '间歇进给', material: '—', description: '丝杠右端的棘轮被连杆拉着，每个往复行程拨过一齿，工作台因此间歇横向进给。点“拆开此组件”进去看。', explode: [300, 320, 0], deep: [520, 320, 0], stage: [0.42, 0.54] },
  { id: 'feed-rod', index: 8, name: '进给连杆与偏心', en: 'Feed Rod & Eccentric', role: '把转动传进给', material: '45 钢', description: '大齿轮轴右端的偏心盘通过这根长连杆拉动棘爪摆杆。偏心半径决定摆杆摆角，进给量靠换偏心轮来调。', explode: [420, 460, 260], stage: [0.2, 0.32] },
  { id: 'motor', index: 9, name: '电机', en: 'Motor', role: '动力', material: '铸铁 · 绕组', description: '3 kW 三相异步电机，卧式装在床身内腔里，经三角带把动力送给机身里的齿轮轴——剖视时才能看见。', explode: [-320, -120, 0], stage: [0.14, 0.26] },
  { id: 'drive', index: 10, name: '皮带传动', en: 'Belt Drive', role: '把动力送进去', material: '三角带 / 铸铁带轮', description: '两只带轮一大一小：电机轮 Ø190、小齿轮轴上的输入轮 Ø280，三角带张紧后把动力传进机身。电机 1440 r/min 经它和六档齿轮换来 14–80 次/分。', explode: [-260, 160, 260], stage: [0.06, 0.18] },
  { id: 'switch', index: 11, name: '电气控制箱', en: 'Control Box', role: '启停 · 保护', material: '钢板', description: '按钮在床身正面：启动、停止、点动。3 kW 电机带热保护，过载时会跳闸。', explode: [0, 260, 160], stage: [0, 0.1] },
];

const STEPS: StepDef[] = [
  {
    title: '牛头刨床', en: 'Shaper',
    body: 'BC6063 牛头刨床：滑枕带着刨刀往复（14–80 次/分），工作台每行程横向进给 0.33–3.33 mm。切削是单刃间断的——去程切削、回程抬刀快返，所以适合加工平面、沟槽和燕尾面。左栏可换速度和行程。',
    state: { explode: 0, section: false, running: true, select: 'tool-head', focus: null },
  },
  {
    title: '摆杆机构（全剖）', en: 'Slotted Link',
    body: '沿中线剖开：大齿轮在立柱里转，曲柄销带着滑块在摆杆槽里滑，摆杆绕下端轴摆动，上端通过滑枕中间的槽推着滑枕走。切削行程约 209°，返回行程只有 151°——这就是急回。',
    state: { explode: 0, section: true, running: true, select: 'rocker', focus: 'drive' },
  },
  {
    title: '刀架与进给', en: 'Tool Head & Feed',
    body: '刀架挂在滑枕前端：滑板经丝杠下降吃刀（行程 120 mm），拍板在回程抬起让刀。工作台那边，连杆拉着棘爪，每行程拨过棘轮一齿，工作台就横向进给一点。',
    state: { explode: 0, section: false, running: true, select: 'tool-head', focus: 'cut' },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆皮带和电机，吊下滑枕和刀架；拆横梁与工作台，再拆进给机构和立柱里的摆杆机构；最后把床身留下。这里按零件顺序散开。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '摆杆机构、刀架、横向进给机构都能再拆开：选中后点“拆开此组件”。或者打开“全部展开”，三个子组件被拉到旁边一起拆开。',
    state: { explode: 1, section: false, running: false, select: 'rocker', focus: null },
  },
];

export const shaper: MachineDef = level({
  id: 'shaper',
  unit: 0.006,
  bounds: [[-1400, 0, -740], [620, 1760, 740]],
  name: '牛头刨床',
  en: 'Shaper',
  subtitle: 'BC6063 · 刨削长度 630 mm · 可拆到摆杆、刀架、进给',
  summary: '11 个大件 · 摆杆急回、滑枕往复、棘轮进给，三组都能再拆开',
  drawingNo: 'GW-BC-00',
  scale: '1 : 25',
  parts: PARTS,
  boltSets: {},
  neighbours: {
    ram: ['ram', 'tool-head'],
    rocker: ['rocker', 'feed-rod'],
    table: ['table', 'feed'],
  },
  children: { 'tool-head': 'shaper/tool-head', rocker: 'shaper/rocker', feed: 'shaper/feed' },
  guides: [
    { stage: 'ram', origin: [400, 1660, 0] },
    { stage: 'rocker', origin: [-700, 700, 0] },
    { stage: 'feed', origin: [175, 1075, 470] },
    { stage: 'tool-head', origin: [200, 1300, 60] },
  ],
  centreLines: [
    [[-1100, 1690, 0], [620, 1690, 0]],
    [[SHA.pivot.x, 0, 0], [SHA.pivot.x, 1600, 0]],
    [[-400, 260, 0], [-400, 1140, 0], 80],
  ],
  steps: STEPS,
  camera: {
    target: [-300, 850, 40],
    offset: [2400, 1800, 3900],
    orthoDistance: 6000,
    exploded: { target: [-320, 920, 120], scale: 1.55 },
    deep: { target: [-320, 950, 120], scale: 1.9 },
    foci: {
      drive: { target: [-450, 850, 0], scale: 0.95 },
      cut: { target: [150, 1300, 60], scale: 0.6 },
    },
  },
  Model: Shaper,
  Driver: ShaperDriver,
  Controls: ShaperControls,
});

export const SHAPER_LEVELS: MachineDef[] = [rockerLevel, toolHeadLevel, feedLevel];
