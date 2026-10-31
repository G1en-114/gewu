import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Pipe, Plate, Turn, YZ_X } from '../kit';
import { RotorDriver, rotorMotion } from './rotor';

/**
 * Light-helicopter turboshaft with a free power turbine (generic layout).
 * Axis along x, output flange at x = 0 and the engine running back toward
 * −x; metres. The same model sits on the helicopter's roof behind the main
 * gearbox, where its spools turn with the rotor (visual ratios, much slowed).
 */

/** Spool speeds as multiples of the main rotor's (slowed, not to scale). */
const GG_RATE = 14;
const PT_RATE = 8;
const OUT_RATE = 4;

function Spool({ rate, children }: { rate: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = -rotorMotion.psi * rate; });
  return <group ref={ref}>{children}</group>;
}

/** A thin-walled turned shell from an outer (radius, x) outline. */
function shell(outer: Array<[number, number]>, t = 0.012): Array<[number, number]> {
  return [...outer, ...[...outer].reverse().map(([r, h]): [number, number] => [Math.max(0, r - t), h])];
}

/** One row of n blades between radii r0 and r1, at station x, twisted about their span. */
function BladeRow({ x, r0, r1, n, chord, twist = 0.55 }: { x: number; r0: number; r1: number; n: number; chord: number; twist?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} rotation={[(i / n) * Math.PI * 2, 0, 0]}>
          <Box c={[x, (r0 + r1) / 2, 0]} s={[chord, r1 - r0, chord * 0.18]} r={[0, twist, 0]} />
        </group>
      ))}
    </>
  );
}

const CASING = shell([[0.17, -0.44], [0.2, -0.5], [0.2, -0.76], [0.235, -0.8], [0.235, -1.0], [0.2, -1.05], [0.2, -1.15]]);
const INLET = shell([[0.2, -0.3], [0.27, -0.31], [0.27, -0.44], [0.2, -0.46]], 0.015);
const COLLECTOR = shell([[0.2, -1.14], [0.23, -1.17], [0.23, -1.26], [0.1, -1.3], [0.035, -1.3]], 0.012);

export function Turboshaft() {
  return (
    <group>
      <Part id="casing">
        <Turn k="ts-casing" profile={CASING} axis="x" seg={40} />
        <Callout id="casing" p={[-0.62, 0.2, 0.06]} />
      </Part>
      <Part id="gearbox">
        <Box c={[-0.15, 0.1, 0]} s={[0.26, 0.42, 0.34]} />
        <group position={[0, 0.16, 0]}>
          <Spool rate={OUT_RATE}>
            <Cyl c={[0.06, 0, 0]} r={0.028} len={0.13} axis="x" seg={16} />
            <Cyl c={[0.115, 0, 0]} r={0.06} len={0.02} axis="x" seg={6} />
          </Spool>
        </group>
        <Plate k="ts-gear-big" shape={() => gearShape(30, 0.11, 0.008, 0.03)} depth={0.03} p={[-0.17, 0.16, 0]} r={YZ_X} />
        <Plate k="ts-gear-small" shape={() => gearShape(12, 0.045, 0.008, 0.015)} depth={0.03} p={[-0.17, 0, 0]} r={YZ_X} />
        <Callout id="gearbox" p={[-0.1, 0.3, 0.17]} />
      </Part>
      <Part id="inlet">
        <Turn k="ts-inlet" profile={INLET} axis="x" seg={40} />
        {Array.from({ length: 12 }, (_, i) => (
          <group key={i} rotation={[(i / 12) * Math.PI * 2, 0, 0]}>
            <Box c={[-0.375, 0.27, 0]} s={[0.12, 0.006, 0.006]} />
          </group>
        ))}
        <Callout id="inlet" p={[-0.36, 0.27, 0.08]} />
      </Part>
      <Part id="compressor">
        <Spool rate={GG_RATE}>
          <Turn k="ts-comp-hub" profile={[[0, -0.42], [0.06, -0.42], [0.095, -0.68], [0, -0.68]]} axis="x" seg={32} />
          {[-0.46, -0.52, -0.58, -0.64].map((x, i) => <BladeRow key={x} x={x} r0={0.07 + i * 0.008} r1={0.17} n={14} chord={0.035} />)}
          <Turn k="ts-impeller" profile={[[0.03, -0.68], [0.1, -0.68], [0.185, -0.73], [0.185, -0.745], [0.03, -0.745]]} axis="x" seg={40} />
          {Array.from({ length: 12 }, (_, i) => (
            <group key={i} rotation={[(i / 12) * Math.PI * 2, 0, 0]}>
              <Box c={[-0.705, 0.14, 0]} s={[0.05, 0.09, 0.006]} />
            </group>
          ))}
        </Spool>
        <Callout id="compressor" p={[-0.55, 0.14, 0.06]} />
      </Part>
      <Part id="combustor">
        <Turn k="ts-liner-out" profile={shell([[0.2, -0.8], [0.205, -0.98]], 0.008)} axis="x" seg={40} />
        <Turn k="ts-liner-in" profile={shell([[0.115, -0.8], [0.115, -0.98]], 0.008)} axis="x" seg={40} />
        <Turn k="ts-dome" profile={[[0.115, -0.79], [0.205, -0.79], [0.205, -0.8], [0.115, -0.8]]} axis="x" seg={40} />
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} rotation={[(i / 6) * Math.PI * 2 + 0.3, 0, 0]}>
            <Cyl c={[-0.82, 0.235, 0]} r={0.012} len={0.08} seg={8} />
          </group>
        ))}
        <Callout id="combustor" p={[-0.9, 0.22, 0.08]} />
      </Part>
      <Part id="gg-turbine">
        <Spool rate={GG_RATE}>
          <Turn k="ts-gg-shaft" profile={shell([[0.04, -0.44], [0.04, -1.03]], 0.012)} axis="x" seg={20} />
          <Turn k="ts-gg-disc" profile={[[0.03, -1.0], [0.12, -1.005], [0.12, -1.035], [0.03, -1.04]]} axis="x" seg={32} />
          <BladeRow x={-1.02} r0={0.12} r1={0.19} n={20} chord={0.03} twist={-0.6} />
        </Spool>
        <Callout id="gg-turbine" p={[-1.02, 0.17, 0.06]} />
      </Part>
      <Part id="power-turbine">
        <Spool rate={PT_RATE}>
          <Cyl c={[-0.6, 0, 0]} r={0.018} len={1.1} axis="x" seg={12} />
          {[-1.075, -1.12].map((x) => (
            <group key={x}>
              <Turn k={`ts-pt-disc-${x}`} profile={[[0.018, x + 0.015], [0.125, x + 0.01], [0.125, x - 0.01], [0.018, x - 0.015]]} axis="x" seg={32} />
              <BladeRow x={x} r0={0.125} r1={0.2} n={22} chord={0.028} twist={0.6} />
            </group>
          ))}
        </Spool>
        <Callout id="power-turbine" p={[-1.1, 0.19, 0.06]} />
      </Part>
      <Part id="exhaust">
        <Turn k="ts-collector" profile={COLLECTOR} axis="x" seg={40} />
        {[-0.13, 0.13].map((z) => (
          <Pipe key={z} k={`ts-exhaust-${z}`} pts={[[-1.2, 0.14, z], [-1.22, 0.26, z * 1.3], [-1.28, 0.36, z * 1.6], [-1.38, 0.4, z * 1.8]]} r={0.06} seg={14} />
        ))}
        <Callout id="exhaust" p={[-1.3, 0.38, 0.22]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'casing', index: 1, name: '机匣', en: 'Engine Casing', role: '承力 · 包住燃气通道', material: '钛合金 / 高温合金', description: '把各段连成一体，前面接减速齿轮箱，后面接排气。燃烧段外壳略鼓，给火焰筒留出空间。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'gearbox', index: 2, name: '减速齿轮箱', en: 'Reduction Gearbox', role: '降速 · 输出', material: '铝合金 / 钢', description: '动力涡轮每分钟三万多转，这里先降到约六千转，再从上方的输出轴传给主减速器。', explode: [0.55, 0, 0], stage: [0, 0.16] },
  { id: 'inlet', index: 3, name: '进气道与防护网', en: 'Inlet & Screen', role: '整流 · 挡异物', material: '铝合金 / 钢丝网', description: '一圈环形进气口，外面罩着防护网，挡住碎石和鸟。空气从四周吸进来，拐个弯进压气机。', explode: [0, 0.55, 0], stage: [0.14, 0.28] },
  { id: 'compressor', index: 4, name: '压气机', en: 'Compressor', role: '把空气压缩', material: '钛合金', description: '四级轴流叶片加一级离心叶轮，把空气压到约 7 倍大气压。它和燃气发生器涡轮装在同一根轴上。', explode: [0.95, -0.1, 0], stage: [0.26, 0.42] },
  { id: 'combustor', index: 5, name: '燃烧室', en: 'Combustor', role: '喷油燃烧', material: '高温合金', description: '环形火焰筒，六个喷嘴把燃油喷成细雾和压缩空气一起烧，燃气温度超过 1000 ℃。', explode: [0, -0.55, 0], stage: [0.4, 0.56] },
  { id: 'gg-turbine', index: 6, name: '燃气发生器涡轮', en: 'Gas-Generator Turbine', role: '带动压气机', material: '单晶高温合金', description: '燃气先冲这一级涡轮，它只负责带动前面的压气机——两者合称“燃气发生器”，每分钟约五万转。', explode: [-0.55, 0.1, 0], stage: [0.54, 0.7] },
  { id: 'power-turbine', index: 7, name: '动力涡轮与输出轴', en: 'Power Turbine & Shaft', role: '输出功率', material: '高温合金 / 钢', description: '“自由涡轮”：和燃气发生器没有机械连接，只靠燃气吹动。细长的轴从核心机中间穿到前面的齿轮箱。旋翼转速因此可以基本恒定，不受发动机工况牵连。', explode: [-0.95, 0, 0], stage: [0.68, 0.84] },
  { id: 'exhaust', index: 8, name: '排气管', en: 'Exhaust', role: '排出废气', material: '不锈钢', description: '燃气做完功后从两侧的排气管向上斜着排出，离开机身和尾梁。', explode: [-0.3, 0.45, 0], stage: [0.82, 1] },
];

const STEPS: StepDef[] = [
  {
    title: '涡轴发动机', en: 'Turboshaft',
    body: '空气从四周吸进来，压气机压缩，燃烧室烧成高温燃气。燃气先吹燃气发生器涡轮（带动压气机），再吹后面的动力涡轮；动力涡轮的轴穿过中间，经减速齿轮箱输出到主减速器。两根轴各转各的。',
    state: { explode: 0, section: true, running: true, select: 'power-turbine', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '卸下减速齿轮箱和进气道，抽出压气机，取出火焰筒，再从后面拆下两级涡轮和排气管。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const engineLevel: MachineDef = level({
  id: 'helicopter/engine',
  parent: 'helicopter',
  unit: 6,
  bounds: [[-1.4, -0.24, -0.3], [0.13, 0.42, 0.3]],
  name: '涡轴发动机',
  en: 'Turboshaft Engine',
  subtitle: '子组件 · 自由涡轮 · 双轴',
  summary: '8 种零件：压气机、燃烧室、两级涡轮、减速齿轮箱……',
  drawingNo: 'GW-ZS-02',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'compressor', origin: [-0.55, 0, 0] }],
  centreLines: [[[-1.45, 0, 0], [0.2, 0, 0], 0.24]],
  steps: STEPS,
  camera: { target: [-0.62, 0.06, 0], offset: [1.3, 1.05, 3.1], orthoDistance: 10, exploded: { target: [-0.55, 0.15, 0], scale: 2.1 } },
  Model: Turboshaft,
  Driver: RotorDriver,
});
