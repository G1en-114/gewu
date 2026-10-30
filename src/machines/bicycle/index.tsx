import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef, Vec3 } from '../types';
import { Box, Cyl, Hoop, level, Pipe, Plate, Rod, Turn, XY_Z } from '../kit';
import { hubLevel, RearHub } from './hub';

/**
 * Road bicycle, drive side toward the viewer (+z), facing +x; millimetres.
 * 700C wheels, 50-tooth chainring, chain on the 15 of an eight-speed cassette.
 */

type P = [number, number];
const REAR: P = [0, 340];
const FRONT: P = [990, 340];
const BB: P = [405, 270];
const ST_TOP: P = [255, 770];
const HT_TOP: P = [830, 835];
const HT_BOT: P = [867, 715];
const CROWN: P = [872, 698];
const CHAIN_Z = 42;

const pitchR = (teeth: number) => 12.7 / (2 * Math.sin(Math.PI / teeth));
const RING = 50;
const COG = 15;
const COGS = [28, 24, 21, 19, 17, 15, 13, 11];
const cogZ = (i: number) => 22 + i * 4.3;
const JOCKEY_UP: P = [REAR[0] + 8, REAR[1] - 62];
const JOCKEY_LOW: P = [REAR[0] + 30, REAR[1] - 135];

export const bikeMotion = { crank: 0 };

export function BikeDriver() {
  useFrame((_, dt) => {
    if (useStudio.getState().running) bikeMotion.crank += Math.min(dt, 0.05) * 1.3;
  }, -1);
  return null;
}

const v = (p: P, z = 0): Vec3 => [p[0], p[1], z];

/** Spinning about z through a point in the side plane. */
function Spin({ at, rate, children }: { at: P; rate: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = -bikeMotion.crank * rate; });
  return <group position={[at[0], at[1], 0]}><group ref={ref}>{children}</group></group>;
}

/* ── Chain: links moving along a closed path round ring, jockey wheels and cog ── */

const around = (c: P, r: number, degs: number[]) => degs.map((d): THREE.Vector3 => new THREE.Vector3(c[0] + r * Math.cos((d * Math.PI) / 180), c[1] + r * Math.sin((d * Math.PI) / 180), CHAIN_Z));

function chainPath() {
  const ring = pitchR(RING);
  const cog = pitchR(COG);
  const jockey = pitchR(11);
  const pts = [
    ...around(BB, ring, [90, 60, 30, 0, -30, -60, -90]),
    ...around(JOCKEY_LOW, jockey, [-80, -130, 180, 130]),
    ...around(JOCKEY_UP, jockey, [-60, 0, 50]),
    ...around(REAR, cog, [250, 200, 150, 100]),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const length = curve.getLength();
  return { curve, length, count: Math.round(length / 12.7) };
}

function Chain() {
  const { curve, length, count } = useMemo(chainPath, []);
  const refs = useRef<Array<THREE.Group | null>>([]);
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  useFrame(() => {
    const travel = bikeMotion.crank * pitchR(RING);
    refs.current.forEach((g, i) => {
      if (!g) return;
      const u = ((((i * length) / count - travel) % length) + length) % length / length;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, t);
      g.position.copy(p);
      g.rotation.z = Math.atan2(t.y, t.x);
    });
  });
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }}>
          <Box c={[0, 0, 0]} s={[13.5, 6, i % 2 ? 5 : 7.4]} />
        </group>
      ))}
    </>
  );
}

/* ── Wheels ── */

function Wheel({ rear = false }: { rear?: boolean }) {
  return (
    <>
      <Turn k="bk-rim" profile={[[296, -10], [318, -9], [318, 9], [296, 10], [292, 0]]} axis="z" seg={96} />
      <Hoop k="bk-tyre" c={[0, 0, 0]} R={329} r={12} axis="z" seg={96} />
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2;
        const side = i % 2 ? 1 : -1;
        const b = a + side * 0.18;
        return <Rod key={i} a={[28 * Math.cos(b), 28 * Math.sin(b), side * (rear && side > 0 ? 24 : 28)]} b={[296 * Math.cos(a), 296 * Math.sin(a), 0]} r={1} seg={4} />;
      })}
      {rear ? <RearHub /> : (
        <>
          <Turn k="bk-front-hub" profile={[[8, -50], [14, -50], [14, -30], [28, -28], [28, -24], [14, -20], [14, 20], [28, 24], [28, 28], [14, 30], [14, 50], [8, 50]]} axis="z" seg={32} />
          <Cyl c={[0, 0, 0]} r={5} len={110} axis="z" seg={12} />
        </>
      )}
    </>
  );
}

/* ── Frame ── */

function Tube({ a, b, r, z = 0, z2 }: { a: P; b: P; r: number; z?: number; z2?: number }) {
  return <Rod a={v(a, z)} b={v(b, z2 ?? z)} r={r} seg={18} />;
}

const SEAT_STAY_TOP: P = [262, 748];

function Frame() {
  return (
    <>
      <Tube a={BB} b={ST_TOP} r={14} />
      <Tube a={ST_TOP} b={HT_TOP} r={14} />
      <Tube a={BB} b={HT_BOT} r={18} />
      <Rod a={v(HT_TOP)} b={v([HT_TOP[0] + (HT_BOT[0] - HT_TOP[0]) * 1.12, HT_TOP[1] + (HT_BOT[1] - HT_TOP[1]) * 1.12])} r={19} seg={24} />
      <Cyl c={v(BB)} r={21} len={70} axis="z" seg={24} />
      {[1, -1].map((s) => (
        <group key={s}>
          <Tube a={BB} b={REAR} r={9} z={s * 26} z2={s * 64} />
          <Tube a={SEAT_STAY_TOP} b={REAR} r={7.5} z={s * 18} z2={s * 64} />
          <Box c={[REAR[0] + 6, REAR[1] - 4, s * 66]} s={[40, 26, 6]} />
        </group>
      ))}
      <Box c={[178, 620, 0]} s={[12, 12, 100]} />
    </>
  );
}

function Fork() {
  return (
    <>
      <Rod a={v([CROWN[0] - 12, CROWN[1] + 150])} b={v(CROWN)} r={13} seg={16} />
      <Box c={v(CROWN)} s={[34, 22, 110]} r={[0, 0, -0.3]} />
      {[1, -1].map((s) => (
        <Pipe key={s} k={`bk-fork-${s}`} pts={[v(CROWN, s * 50), [905, 560, s * 50], [955, 430, s * 50], v(FRONT, s * 52)]} r={11} seg={10} />
      ))}
    </>
  );
}

/* ── Drivetrain ── */

function Crankset() {
  return (
    <Spin at={BB} rate={1}>
      <Plate k="bk-ring" shape={() => gearShape(RING, pitchR(RING), 3.4, 70)} depth={3.5} p={[0, 0, CHAIN_Z - 1.75]} r={XY_Z} />
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} rotation={[0, 0, (i / 5) * Math.PI * 2]}><Box c={[0, 52, CHAIN_Z + 4]} s={[14, 70, 6]} /></group>
      ))}
      <Cyl c={[0, 0, 0]} r={12} len={140} axis="z" seg={20} />
      <Box c={[0, -86, 56]} s={[24, 184, 12]} />
      <Box c={[0, 86, -56]} s={[24, 184, 12]} />
    </Spin>
  );
}

/** Pedals turn with the cranks but stay level. */
function Pedals() {
  const refs = useRef<Array<THREE.Group | null>>([]);
  useFrame(() => {
    const a = -bikeMotion.crank;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const s = i ? 1 : -1;
      g.position.set(BB[0] + s * 172 * Math.sin(-a), BB[1] - s * 172 * Math.cos(a), (i ? -1 : 1) * 105);
    });
  });
  return (
    <>
      {[0, 1].map((i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }}>
          <Box c={[0, 0, 0]} s={[78, 16, 88]} />
          <Cyl c={[0, 0, (i ? 1 : -1) * 40]} r={6} len={20} axis="z" seg={10} />
        </group>
      ))}
    </>
  );
}

function Cassette() {
  return (
    <Spin at={REAR} rate={RING / COG}>
      {COGS.map((t, i) => <Plate key={t} k={`bk-cog-${t}`} shape={() => gearShape(t, pitchR(t), 3.4, 17)} depth={1.8} p={[0, 0, cogZ(i)]} r={XY_Z} />)}
    </Spin>
  );
}

function RearDerailleur() {
  return (
    <>
      <Box c={[REAR[0] + 12, REAR[1] - 30, 68]} s={[22, 40, 10]} />
      <Box c={[REAR[0] + 24, REAR[1] - 52, 62]} s={[48, 22, 14]} r={[0, 0, 0.6]} />
      {[1, -1].map((s) => <Box key={s} c={[(JOCKEY_UP[0] + JOCKEY_LOW[0]) / 2, (JOCKEY_UP[1] + JOCKEY_LOW[1]) / 2, CHAIN_Z + s * 7]} s={[40, 108, 2]} r={[0, 0, 0.29]} />)}
      {[JOCKEY_UP, JOCKEY_LOW].map((c, i) => (
        <Spin key={i} at={c} rate={pitchR(RING) / pitchR(11)}>
          <Plate k="bk-jockey" shape={() => gearShape(11, pitchR(11), 3, 4)} depth={3} p={[0, 0, CHAIN_Z - 1.5]} r={XY_Z} />
        </Spin>
      ))}
    </>
  );
}

function Brakes() {
  return (
    <>
      <Box c={[188, 642, 0]} s={[22, 50, 120]} r={[0, 0, 0.55]} />
      {[1, -1].map((s) => <Box key={s} c={[168, 610, s * 22]} s={[30, 10, 8]} r={[0, 0, 0.55]} />)}
      <Box c={[CROWN[0] + 22, CROWN[1] + 6, 0]} s={[22, 50, 120]} r={[0, 0, -0.35]} />
      {[1, -1].map((s) => <Box key={s} c={[CROWN[0] + 40, CROWN[1] - 22, s * 22]} s={[30, 10, 8]} r={[0, 0, -0.35]} />)}
    </>
  );
}

function Cockpit() {
  const bar: P = [930, 862];
  return (
    <>
      <Rod a={[823, 865, 0]} b={[bar[0], bar[1], 0]} r={15} seg={16} />
      <Cyl c={[bar[0], bar[1], 0]} r={12} len={420} axis="z" seg={16} />
      {[1, -1].map((s) => (
        <Pipe key={s} k={`bk-drop-${s}`} pts={[[bar[0], bar[1], s * 205], [985, 860, s * 210], [1015, 820, s * 212], [1000, 760, s * 214], [950, 748, s * 215], [915, 752, s * 215]]} r={12} seg={10} />
      ))}
      {[1, -1].map((s) => <Box key={s} c={[1000, 862, s * 205]} s={[40, 50, 30]} r={[0, 0, -0.4]} />)}
    </>
  );
}

function Saddle() {
  return (
    <>
      <Rod a={[240, 820, 0]} b={[208, 925, 0]} r={13.5} seg={16} />
      <Box c={[190, 940, 0]} s={[150, 22, 140]} />
      <Box c={[305, 938, 0]} s={[110, 18, 50]} r={[0, 0, -0.05]} />
    </>
  );
}

export function Bicycle() {
  return (
    <group>
      <Part id="frame"><Frame /><Callout id="frame" p={[560, 520, 20]} /></Part>
      <Part id="fork"><Fork /><Callout id="fork" p={[930, 520, 60]} /></Part>
      <Part id="front-wheel">
        <Spin at={FRONT} rate={RING / COG}><Wheel /></Spin>
        <Callout id="front-wheel" p={[FRONT[0] + 230, FRONT[1] + 230, 0]} />
      </Part>
      <Part id="rear-wheel">
        <Spin at={REAR} rate={RING / COG}><Wheel rear /></Spin>
        <Callout id="rear-wheel" p={[REAR[0] - 230, REAR[1] + 230, 0]} />
      </Part>
      <Part id="crankset"><Crankset /><Callout id="crankset" p={[BB[0] + 70, BB[1] + 60, 50]} /></Part>
      <Part id="pedals"><Pedals /><Callout id="pedals" p={[BB[0] + 120, BB[1] - 160, 105]} /></Part>
      <Part id="chain"><Chain /><Callout id="chain" p={[220, 380, CHAIN_Z]} /></Part>
      <Part id="cassette"><Cassette /><Callout id="cassette" p={[REAR[0] - 20, REAR[1] + 30, 60]} /></Part>
      <Part id="rear-derailleur"><RearDerailleur /><Callout id="rear-derailleur" p={[JOCKEY_LOW[0], JOCKEY_LOW[1] - 20, 60]} /></Part>
      <Part id="front-derailleur">
        <Box c={[338, 395, CHAIN_Z]} s={[68, 22, 18]} r={[0, 0, -0.15]} />
        <Box c={[322, 420, 14]} s={[26, 30, 34]} />
        <Callout id="front-derailleur" p={[338, 410, 50]} />
      </Part>
      <Part id="brakes"><Brakes /><Callout id="brakes" p={[188, 670, 60]} /></Part>
      <Part id="cockpit"><Cockpit /><Callout id="cockpit" p={[960, 880, 120]} /></Part>
      <Part id="saddle"><Saddle /><Callout id="saddle" p={[200, 955, 60]} /></Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'frame', index: 1, name: '车架', en: 'Frame', role: '骨架', material: '铝合金 / 碳纤维', description: '前三角（上管、下管、立管）加后三角（平叉、后上叉），三角形结构又轻又刚。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'fork', index: 2, name: '前叉', en: 'Fork', role: '转向 · 支承前轮', material: '碳纤维', description: '叉管穿过头管，上面接把立；叉腿略向前弯（前叉偏移），让车子直行更稳。', explode: [160, -60, 0], stage: [0.86, 0.96] },
  { id: 'front-wheel', index: 3, name: '前轮', en: 'Front Wheel', role: '行驶 · 转向', material: '铝 / 钢 / 橡胶', description: '700C 车轮：轮圈、28 根钢丝辐条、花鼓、外胎。辐条是受拉的，靠张力把轮圈撑圆。', explode: [380, 0, 0], stage: [0.62, 0.72] },
  { id: 'rear-wheel', index: 4, name: '后轮', en: 'Rear Wheel', role: '驱动', material: '铝 / 钢 / 橡胶', description: '后轮花鼓里装着棘轮机构，所以不蹬也能滑行。点“拆开此组件”看花鼓内部。', explode: [-380, 0, 0], stage: [0.68, 0.8], deep: [-200, -420, 0] },
  { id: 'crankset', index: 5, name: '牙盘与曲柄', en: 'Crankset', role: '踩踏输入', material: '铝合金', description: '50 齿牙盘和两根 172.5 mm 曲柄，中轴穿过车架的五通。', explode: [0, -80, 240], stage: [0.5, 0.6] },
  { id: 'pedals', index: 6, name: '脚踏', en: 'Pedals', role: '传递脚力', material: '铝合金', description: '绕自己的轴转，所以曲柄转一圈，脚踏始终保持水平。', explode: [0, -200, 0], stage: [0.2, 0.3] },
  { id: 'chain', index: 7, name: '链条', en: 'Chain', role: '传动', material: '钢', description: '节距 12.7 mm（半英寸），内外链节交替。踩一圈，链条走过 50 节，带着 15 齿飞轮转 3.33 圈。', explode: [0, 0, 150], stage: [0.12, 0.22] },
  { id: 'cassette', index: 8, name: '飞轮（齿片组）', en: 'Cassette', role: '变速', material: '钢', description: '8 片齿轮 11–28 齿，套在后花鼓的塔基上。链条挂在越小的齿片上，蹬一圈车轮转得越多。', explode: [-380, 0, 180], stage: [0.78, 0.88] },
  { id: 'rear-derailleur', index: 9, name: '后拨', en: 'Rear Derailleur', role: '换飞轮 · 张紧链条', material: '铝 / 钢', description: '平行四边形机构左右平移，把链条拨到不同齿片上；下面的两个导轮兼作张紧，吸收不同档位的链条长度差。', explode: [-120, -140, 160], stage: [0.4, 0.5] },
  { id: 'front-derailleur', index: 10, name: '前拨', en: 'Front Derailleur', role: '换牙盘', material: '铝 / 钢', description: '夹在立管上，导板推着链条在大小牙盘之间换档（这里画的是单片牙盘）。', explode: [0, 60, 180], stage: [0.32, 0.42] },
  { id: 'brakes', index: 11, name: '刹车', en: 'Caliper Brakes', role: '减速', material: '铝合金', description: '双支点夹器：拉线一紧，两块刹车皮夹住轮圈侧面。', explode: [0, 160, 0], stage: [0.06, 0.14] },
  { id: 'cockpit', index: 12, name: '车把与把立', en: 'Handlebar & Stem', role: '操控', material: '铝合金', description: '弯把可以握上把、把位和下把三个位置；把立夹在前叉管上。两侧是变速 / 刹车手柄。', explode: [80, 220, 0], stage: [0.02, 0.1] },
  { id: 'saddle', index: 13, name: '座垫与座管', en: 'Saddle & Seatpost', role: '承重', material: '碳纤维 / 皮革', description: '座管插在立管里，用来调座高。', explode: [-40, 260, 0], stage: [0, 0.08] },
];

const STEPS: StepDef[] = [
  {
    title: '公路自行车', en: 'Road Bicycle',
    body: '脚踩脚踏 → 曲柄转动牙盘 → 链条 → 飞轮 → 后花鼓 → 后轮。50 齿牙盘配 15 齿飞轮，蹬一圈后轮转 3.33 圈。',
    state: { explode: 0, section: false, running: true, select: 'chain', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先卸座垫、车把和刹车，摘链条和脚踏，拆前后拨、牙盘，取下前后轮和飞轮，最后抽出前叉，剩下车架。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '全部展开', en: 'Everything',
    body: '打开“全部展开”，后轮会被拉到下方，花鼓里的塔基、棘爪也一并拆开。也可以选中后轮，点“拆开此组件”看棘轮怎么工作。',
    state: { explode: 1, section: false, running: false, select: 'rear-wheel', focus: null },
  },
];

export const bicycle: MachineDef = level({
  id: 'bicycle',
  unit: 0.008,
  bounds: [[-345, 0, -215], [1335, 955, 215]],
  name: '自行车',
  en: 'Road Bicycle',
  subtitle: '整车 · 链传动 · 后花鼓可拆',
  summary: '13 个大件，链条会走，后花鼓的棘轮可再拆',
  drawingNo: 'GW-ZXC-00',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { 'rear-wheel': 'bicycle/rear-hub' },
  guides: [
    { stage: 'front-wheel', origin: v(FRONT) },
    { stage: 'rear-wheel', origin: v(REAR) },
    { stage: 'saddle', origin: [190, 940, 0] },
  ],
  centreLines: [[v(REAR, -90), v(REAR, 90), 330], [v(FRONT, -90), v(FRONT, 90), 330]],
  steps: STEPS,
  camera: { target: [500, 470, 0], offset: [700, 900, 3400], orthoDistance: 12000, exploded: { target: [500, 520, 60], scale: 1.45 }, deep: { target: [450, 300, 60], scale: 1.6 } },
  Model: Bicycle,
  Driver: BikeDriver,
});

export const BICYCLE_LEVELS: MachineDef[] = [hubLevel];
