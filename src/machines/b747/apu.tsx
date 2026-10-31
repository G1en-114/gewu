import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Pipe, Turn } from '../kit';
import { fanMotion } from '../turbofan';
import { JumboDriver, PhaseControls } from './controls';

/**
 * Auxiliary power unit in the tail cone (GTCP660 class): a small single-shaft
 * gas turbine that drives a load compressor for cabin air and engine starting,
 * and a generator through its gearbox. Axis along x, gearbox forward (+x),
 * exhaust aft; metres.
 */

function Shaft({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = fanMotion.n2 * 1.6; });
  return <group ref={ref}>{children}</group>;
}

const shell = (outer: Array<[number, number]>, t = 0.012): Array<[number, number]> => [...outer, ...[...outer].reverse().map(([r, h]): [number, number] => [Math.max(0, r - t), h])];

function Vanes({ x, r0, r1, n, w }: { x: number; r0: number; r1: number; n: number; w: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} rotation={[(i / n) * Math.PI * 2, 0, 0]}>
          <Box c={[x, (r0 + r1) / 2, 0]} s={[w, r1 - r0, 0.006]} r={[0, 0.4, 0]} />
        </group>
      ))}
    </>
  );
}

export function Apu() {
  return (
    <group>
      <Part id="casing">
        <Turn k="apu-case" profile={shell([[0.2, 0.42], [0.3, 0.3], [0.3, -0.3], [0.33, -0.36], [0.33, -0.68], [0.26, -0.78]], 0.012)} axis="x" seg={40} />
        {[0.2, -0.5].map((x) => <Box key={x} c={[x, 0.36, 0]} s={[0.06, 0.12, 0.7]} />)}
        <Callout id="casing" p={[-0.1, 0.3, 0.1]} />
      </Part>
      <Part id="gearbox">
        <Box c={[0.62, -0.02, 0]} s={[0.36, 0.5, 0.44]} />
        <Turn k="apu-gen" profile={[[0, 0.8], [0.16, 0.8], [0.16, 1.1], [0.12, 1.16], [0, 1.16]]} p={[0, -0.05, 0]} axis="x" seg={28} />
        <Callout id="gearbox" p={[0.7, 0.2, 0.2]} />
      </Part>
      <Part id="inlet">
        <Pipe k="apu-inlet" pts={[[0.15, 0.3, 0], [0.12, 0.6, 0.05], [0.1, 0.95, 0.1], [0.08, 1.2, 0.1]]} r={0.13} seg={16} />
        <Callout id="inlet" p={[0.1, 1.0, 0.2]} />
      </Part>
      <Part id="load-compressor">
        <Shaft>
          <Turn k="apu-lc" profile={[[0.03, 0.38], [0.08, 0.38], [0.25, 0.18], [0.25, 0.15], [0.03, 0.15]]} axis="x" seg={40} />
          <Vanes x={0.27} r0={0.1} r1={0.24} n={14} w={0.14} />
        </Shaft>
        <Callout id="load-compressor" p={[0.28, 0.2, 0.1]} />
      </Part>
      <Part id="compressor">
        <Shaft>
          {[0.0, -0.18].map((x) => (
            <group key={x}>
              <Turn k={`apu-imp-${x}`} profile={[[0.03, x + 0.1], [0.07, x + 0.1], [0.22, x - 0.02], [0.22, x - 0.04], [0.03, x - 0.04]]} axis="x" seg={40} />
              <Vanes x={x + 0.03} r0={0.08} r1={0.21} n={12} w={0.1} />
            </group>
          ))}
        </Shaft>
        <Callout id="compressor" p={[-0.08, 0.2, 0.1]} />
      </Part>
      <Part id="combustor">
        <Turn k="apu-comb" profile={shell([[0.29, -0.36], [0.3, -0.64]], 0.01)} axis="x" seg={40} />
        <Turn k="apu-comb-in" profile={shell([[0.15, -0.36], [0.15, -0.64]], 0.01)} axis="x" seg={40} />
        <Callout id="combustor" p={[-0.5, 0.28, 0.1]} />
      </Part>
      <Part id="turbine">
        <Shaft>
          <Cyl c={[-0.32, 0, 0]} r={0.028} len={1.0} axis="x" seg={12} />
          <Turn k="apu-turb" profile={[[0.03, -0.66], [0.12, -0.67], [0.12, -0.71], [0.03, -0.72]]} axis="x" seg={32} />
          <Vanes x={-0.69} r0={0.12} r1={0.24} n={22} w={0.04} />
        </Shaft>
        <Callout id="turbine" p={[-0.69, 0.22, 0.08]} />
      </Part>
      <Part id="exhaust">
        <Turn k="apu-exh" profile={shell([[0.25, -0.78], [0.22, -1.1], [0.2, -1.4]], 0.012)} axis="x" seg={36} />
        <Callout id="exhaust" p={[-1.2, 0.2, 0.1]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'casing', index: 1, name: '机匣与安装架', en: 'Casing & Mounts', role: '包容 · 吊装', material: '不锈钢 / 钛合金', description: 'APU 用几根减振拉杆吊在尾锥里的防火舱内，外面是防火墙。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'gearbox', index: 2, name: '齿轮箱与发电机', en: 'Gearbox & Generator', role: '发电', material: '铝合金', description: '把每分钟四万多转降到发电机需要的转速，供一台 90 千伏安的交流发电机：地面上整架飞机的电都靠它。', explode: [0.8, 0, 0], stage: [0, 0.16] },
  { id: 'inlet', index: 3, name: '进气道', en: 'Inlet Duct', role: '进气', material: '铝合金', description: '从尾锥侧面的进气门吸气，弯过来送进压气机。', explode: [0, 0.6, 0], stage: [0.12, 0.26] },
  { id: 'load-compressor', index: 4, name: '负载压气机', en: 'Load Compressor', role: '供气', material: '钛合金', description: '专门给飞机供压缩空气：地面空调、起动主发动机都靠这股气。', explode: [0.5, -0.2, 0], stage: [0.24, 0.4] },
  { id: 'compressor', index: 5, name: '离心压气机 ×2', en: 'Centrifugal Compressors', role: '给燃烧供气', material: '钛合金', description: '两级离心叶轮，结构简单、耐用，适合 APU 这种频繁起停的小发动机。', explode: [0.2, -0.6, 0], stage: [0.4, 0.56] },
  { id: 'combustor', index: 6, name: '燃烧室', en: 'Combustor', role: '燃烧', material: '高温合金', description: '用主油箱的航空煤油，和主发动机一样连续燃烧。', explode: [0, 0.5, 0], stage: [0.54, 0.7] },
  { id: 'turbine', index: 7, name: '涡轮与主轴', en: 'Turbine & Shaft', role: '带动一切', material: '高温合金', description: '单轴：一个涡轮同时带动两级压气机、负载压气机和齿轮箱。', explode: [-0.6, 0, 0], stage: [0.68, 0.84] },
  { id: 'exhaust', index: 8, name: '排气管', en: 'Exhaust', role: '排气', material: '不锈钢', description: '一直通到尾锥最末端——747 屁股上那个小圆孔就是 APU 的排气口。', explode: [-0.9, 0, 0], stage: [0.82, 1] },
];

const STEPS: StepDef[] = [
  {
    title: '辅助动力装置', en: 'APU',
    body: '藏在尾锥里的一台小燃气涡轮。主发动机没开时，它给飞机供电、供空调用的压缩空气，并且用压缩空气把四台主发动机一台台起动起来。',
    state: { explode: 0, section: true, running: true, select: 'load-compressor', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆下齿轮箱和发电机、进气道，抽出负载压气机和两级压气机，再取出燃烧室、涡轮和排气管。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const apuLevel: MachineDef = level({
  id: 'b747/apu',
  parent: 'b747/tail',
  unit: 6,
  bounds: [[-1.4, -0.33, -0.33], [1.16, 1.33, 0.33]],
  name: '辅助动力装置',
  en: 'Auxiliary Power Unit',
  subtitle: '子组件 · 单轴燃气涡轮 · 供电供气',
  summary: '8 种零件：负载压气机、离心压气机、燃烧室、涡轮、齿轮箱……',
  drawingNo: 'GW-747-62',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'gearbox', origin: [0.62, 0, 0] }],
  centreLines: [[[-1.5, 0, 0], [1.3, 0, 0], 0.3]],
  steps: STEPS,
  camera: { target: [-0.1, 0.2, 0], offset: [1.6, 1.6, 3.8], orthoDistance: 12, exploded: { target: [-0.1, 0.35, 0], scale: 2.1 } },
  Model: Apu,
  Driver: JumboDriver,
  Controls: PhaseControls,
});
