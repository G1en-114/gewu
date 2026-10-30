import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { ArcTurn, Box, Cyl, level, Plate, Turn, YZ_X } from '../kit';

/**
 * Brushed permanent-magnet DC motor of the toy / small-appliance kind: a
 * three-pole armature, three-segment commutator and two carbon brushes.
 * Shaft along x, commutator toward +x; millimetres.
 */

const POLES = 3;
export const motorMotion = { angle: 0 };

export function MotorDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) motorMotion.angle += Math.min(dt, 0.05) * 2.4; }, -1);
  return null;
}

function Rotor({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = motorMotion.angle; });
  return <group ref={ref}>{children}</group>;
}

/** Armature lamination: three T-shaped poles with rounded shoes, in (y, z). */
function armatureShape() {
  const s = new THREE.Shape();
  const shoe = 8.6;
  const half = Math.PI / POLES - 0.18;
  const neck = 1.6;
  for (let i = 0; i < POLES; i += 1) {
    const a = (i * Math.PI * 2) / POLES;
    const at = (r: number, t: number): [number, number] => [r * Math.cos(t), r * Math.sin(t)];
    const side = (d: number, r: number, t: number): [number, number] => {
      const [x, y] = at(r, t);
      return [x - d * Math.sin(t), y + d * Math.cos(t)];
    };
    const p0 = side(-neck, 3.2, a);
    if (i === 0) s.moveTo(...p0); else s.lineTo(...p0);
    s.lineTo(...side(-neck, 6.4, a));
    s.lineTo(...at(6.6, a - half));
    s.absarc(0, 0, shoe, a - half, a + half, false);
    s.lineTo(...at(6.6, a + half));
    s.lineTo(...side(neck, 6.4, a));
    s.lineTo(...side(neck, 3.2, a));
  }
  s.closePath();
  const h = new THREE.Path();
  h.absarc(0, 0, 1.0, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

/** One coil wound round a pole. */
function Winding({ i }: { i: number }) {
  const a = (i * Math.PI * 2) / POLES;
  return (
    <group rotation={[a, 0, 0]}>
      <Box c={[0, 4.8, 0]} s={[10.6, 2.6, 4.6]} />
    </group>
  );
}

export function Motor() {
  return (
    <group>
      <Part id="can">
        <Turn k="mo-can" profile={[[11.4, -8], [12, -8], [12, 7.5], [11.4, 7.5]]} axis="x" seg={56} />
        <Turn k="mo-can-back" profile={[[1.6, -8.6], [12, -8.6], [12, -8], [3.4, -8], [3.4, -10.2], [1.6, -10.2]]} axis="x" seg={56} />
        <Callout id="can" p={[0, 12, 6]} />
      </Part>
      <Part id="magnets">
        {[0, Math.PI].map((phi) => (
          <ArcTurn key={phi} k="mo-magnet" profile={[[9.0, -6.8], [11.4, -6.8], [11.4, 6.8], [9.0, 6.8]]} axis="x" phi0={phi + 0.5} phiLen={Math.PI - 1.0} seg={24} />
        ))}
        <Callout id="magnets" p={[0, -10.2, 3]} />
      </Part>
      <Part id="armature">
        <Rotor>
          <Plate k="mo-stack" shape={armatureShape} depth={12} p={[-6, 0, 0]} r={YZ_X} />
        </Rotor>
        <Callout id="armature" p={[-3, 8.6, 1]} />
      </Part>
      <Part id="windings">
        <Rotor>{Array.from({ length: POLES }, (_, i) => <Winding key={i} i={i} />)}</Rotor>
        <Callout id="windings" p={[2, 5, 3.5]} />
      </Part>
      <Part id="shaft">
        <Rotor><Cyl c={[2, 0, 0]} r={1.0} len={34} axis="x" seg={16} /></Rotor>
        <Callout id="shaft" p={[18, 1, 0.5]} />
      </Part>
      <Part id="commutator">
        <Rotor>
          {Array.from({ length: POLES }, (_, i) => (
            <ArcTurn key={i} k="mo-segment" profile={[[1.2, 8.6], [2.6, 8.6], [2.6, 13], [1.2, 13]]} axis="x" phi0={(i * Math.PI * 2) / POLES + Math.PI / POLES + 0.12} phiLen={(Math.PI * 2) / POLES - 0.24} seg={12} />
          ))}
        </Rotor>
        <Callout id="commutator" p={[11, 3, 2]} />
      </Part>
      <Part id="brushes">
        {[1, -1].map((s) => (
          <group key={s}>
            <Box c={[11, 0, s * 3.6]} s={[2.4, 1.6, 2.0]} />
            <Box c={[11, s * 1.5, s * 6.0]} s={[1.6, 0.25, 4.6]} r={[s * 0.3, 0, 0]} />
            <Box c={[11, s * 2.2, s * 9.6]} s={[2.0, 0.4, 3.0]} />
          </group>
        ))}
        <Callout id="brushes" p={[11, 2.5, 6]} />
      </Part>
      <Part id="endcap">
        <Turn k="mo-endcap" profile={[[1.4, 7.5], [12, 7.5], [12, 14.4], [3.2, 15], [3.2, 17], [1.4, 17]]} axis="x" seg={48} />
        {[1, -1].map((s) => <Box key={s} c={[16, s * 3.5, s * 9]} s={[1.2, 0.5, 3]} />)}
        <Callout id="endcap" p={[15, 8, 6]} />
      </Part>
      <Part id="bearings">
        {[-9.4, 16].map((x) => <Turn key={x} k="mo-bush" profile={[[1.0, -0.8], [1.6, -0.8], [1.6, 0.8], [1.0, 0.8]]} p={[x, 0, 0]} axis="x" seg={20} />)}
        <Callout id="bearings" p={[-9.4, 2, 1]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'can', index: 1, name: '机壳', en: 'Can', role: '外壳 · 磁轭', material: '软钢', description: '一个钢筒，既是外壳，也是两块磁铁之间的磁路——磁力线从一块磁铁出来，经钢筒回到另一块。', explode: [-20, 0, 0], stage: [0.62, 0.78] },
  { id: 'magnets', index: 2, name: '永磁体', en: 'Magnets', role: '定子磁场', material: '铁氧体', description: '两块瓦形磁铁贴在机壳内壁，一块 N 极朝里、一块 S 极朝里，在中间造出一个固定的磁场。', explode: [-8, 0, 16], stage: [0.78, 0.92] },
  { id: 'armature', index: 3, name: '电枢铁芯', en: 'Armature Core', role: '转子', material: '硅钢片叠压', description: '一叠冲成三个 T 形极的硅钢片，套在轴上一起转。三个极保证转子停在任何位置都能自己启动。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'windings', index: 4, name: '绕组', en: 'Windings', role: '通电产生磁场', material: '漆包铜线', description: '每个极上绕一组线圈。线圈通电后变成电磁铁，被永磁体吸引、排斥，转子就转起来。', explode: [0, 14, 0], stage: [0.46, 0.6] },
  { id: 'shaft', index: 5, name: '转轴', en: 'Shaft', role: '输出', material: '钢', description: '从电机一头伸出来，装风扇叶、齿轮或车轮。', explode: [0, -14, 0], stage: [0.36, 0.48] },
  { id: 'commutator', index: 6, name: '换向器', en: 'Commutator', role: '自动换电流方向', material: '铜', description: '三片互相绝缘的铜片，各连一组线圈。它跟着轴转，每转过一片，电刷就接上另一组线圈——磁极刚要对齐时电流已经换了方向，转矩永远朝同一边。', explode: [16, 0, 0], stage: [0.24, 0.38] },
  { id: 'brushes', index: 7, name: '电刷', en: 'Brushes', role: '把电送进旋转的转子', material: '碳 / 磷铜簧片', description: '两块碳刷被簧片压在换向器上，一正一负。它们会慢慢磨损，这是有刷电机寿命短的主要原因。', explode: [18, 0, 12], stage: [0.12, 0.26] },
  { id: 'endcap', index: 8, name: '端盖', en: 'End Cap', role: '装电刷 · 接线', material: '塑料', description: '扣在机壳一端，上面装电刷和两个接线片，同时支承转轴。', explode: [26, 0, 0], stage: [0, 0.14] },
  { id: 'bearings', index: 9, name: '含油轴承', en: 'Bushings', role: '支承转轴', material: '烧结铜', description: '多孔的粉末冶金轴套，孔里浸着油，转起来自己润滑。', explode: [0, 0, -14], stage: [0.88, 1] },
];

const STEPS: StepDef[] = [
  {
    title: '直流电动机', en: 'DC Motor',
    body: '玩具车、电动牙刷、吹风机里都有它。通电的线圈变成电磁铁，被固定的永磁体推拉而转动；换向器和电刷负责在恰当的时刻把电流反过来。',
    state: { explode: 0, section: true, running: true, select: 'commutator', focus: null },
  },
  {
    title: '剖开看磁路', en: 'Inside',
    body: '剖开：两块磁铁贴在机壳里，中间是三极电枢，极靴和磁铁之间只隔一条窄窄的气隙；右端是换向器和压在上面的电刷。',
    state: { explode: 0, section: true, running: true, select: 'magnets', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '撬下端盖，电刷随之离开；抽出换向器和转子，拆下绕组和轴，最后从机壳里取出磁铁和轴承。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const motor: MachineDef = level({
  id: 'motor',
  unit: 0.18,
  bounds: [[-10.2, -12, -12], [17, 12, 12]],
  name: '直流电动机',
  en: 'Brushed DC Motor',
  subtitle: '装配体 · 永磁有刷 · 三极电枢',
  summary: '9 种零件 · 换向器和电刷让转矩始终同向，会转',
  drawingNo: 'GW-DJ-00',
  scale: '3 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'endcap', origin: [17, 0, 0] }],
  centreLines: [[[-14, 0, 0], [22, 0, 0], 12.5]],
  steps: STEPS,
  camera: { target: [3, 0, 0], offset: [48, 40, 90], orthoDistance: 220, exploded: { target: [4, 0, 2], scale: 1.6 } },
  Model: Motor,
  Driver: MotorDriver,
});
