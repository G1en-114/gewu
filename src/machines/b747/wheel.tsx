import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Hoop, level, Turn } from '../kit';
import { jumboMotion } from './airframe';
import { cyl } from '../../scene/geometry';
import { boxes, merged } from './geo';
import { JumboDriver, PhaseControls } from './controls';

/**
 * One main wheel with its carbon brake, H49×19 tyre (about 1.25 m across).
 * Axle along z, wheel centre at the origin, outboard side toward +z; metres.
 * The nose wheels are the same wheel without the brake.
 */

const R = 0.62;
const W = 0.24;
const RIM = 0.29;

function Rolling({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = -jumboMotion.roll; });
  return <group ref={ref}>{children}</group>;
}

const ring = (r0: number, r1: number, z0: number, z1: number): Array<[number, number]> => [[r0, z0], [r1, z0], [r1, z1], [r0, z1]];
/** Brake discs: five rotors keyed to the wheel, four stators keyed to the torque tube, interleaved. */
const DISC = 0.026;
const discZ = (i: number) => -0.21 + i * 0.022;

export function Wheel({ brakes = true }: { brakes?: boolean }) {
  return (
    <group>
      <Part id="tyre">
        <Rolling>
          <Turn k="mw-tyre" profile={[[RIM, -0.2], [0.42, -W], [0.55, -0.232], [0.605, -0.185], [R, -0.1], [R, 0.1], [0.605, 0.185], [0.55, 0.232], [0.42, W], [RIM, 0.2], [RIM - 0.01, 0.19], [RIM - 0.01, -0.19]]} axis="z" seg={64} />
          {[-0.12, -0.04, 0.04, 0.12].map((z) => <Hoop key={z} k="mw-groove" c={[0, 0, z]} R={R + 0.001} r={0.006} axis="z" seg={64} />)}
        </Rolling>
        <Callout id="tyre" p={[0.35, 0.5, 0.2]} />
      </Part>
      <Part id="outer-hub">
        <Rolling>
          <Turn k="mw-hub-out" profile={[[0.07, 0], [RIM - 0.01, 0], [RIM - 0.01, 0.19], [RIM + 0.03, 0.235], [RIM + 0.02, 0.25], [RIM - 0.03, 0.215], [0.2, 0.08], [0.1, 0.07], [0.07, 0.06]]} axis="z" seg={48} />
        </Rolling>
        <Callout id="outer-hub" p={[0.12, 0.18, 0.1]} />
      </Part>
      <Part id="inner-hub">
        <Rolling>
          <Turn k="mw-hub-in" profile={[[0.07, 0], [RIM - 0.01, 0], [RIM - 0.01, -0.19], [RIM + 0.03, -0.235], [RIM + 0.02, -0.25], [RIM - 0.03, -0.215], [0.26, -0.22], [0.26, -0.03], [0.1, -0.03], [0.07, -0.02]]} axis="z" seg={48} />
        </Rolling>
        <Callout id="inner-hub" p={[0.2, -0.2, -0.2]} />
      </Part>
      <Part id="tie-bolts">
        <Rolling>
          <M clip geo={merged('mw-bolts', () => Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return { g: cyl(0.012, 0.012, 0.16, 8), c: [0.2 * Math.cos(a), 0.2 * Math.sin(a), 0.02] as [number, number, number], r: [Math.PI / 2, 0, 0] as [number, number, number] };
          }))} />
        </Rolling>
        <Callout id="tie-bolts" p={[0.2, 0.02, 0.1]} />
      </Part>
      <Part id="bearings">
        <Turn k="mw-bearing-o" profile={[[0.05, 0.1], [0.085, 0.1], [0.075, 0.15], [0.05, 0.15]]} axis="z" seg={24} />
        <Turn k="mw-bearing-i" profile={[[0.05, -0.15], [0.075, -0.15], [0.085, -0.1], [0.05, -0.1]]} axis="z" seg={24} />
        <Callout id="bearings" p={[0.06, 0.08, 0.15]} />
      </Part>
      <Part id="valve">
        <Rolling>
          <group rotation={[0, 0, 0.6]}>
            <M clip geo={cyl(0.008, 0.008, 0.06, 8)} p={[0.24, 0, 0.12]} r={[Math.PI / 2, 0, 0]} />
            {[1.6, 3.7, 5.8].map((a) => <M key={a} geo={cyl(0.01, 0.01, 0.02, 6)} p={[0.22 * Math.cos(a), 0.22 * Math.sin(a), 0.075]} r={[Math.PI / 2, 0, 0]} />)}
          </group>
        </Rolling>
        <Callout id="valve" p={[0.2, 0.15, 0.15]} />
      </Part>
      {brakes && (
        <>
          <Part id="rotors">
            <Rolling>
              {[0, 2, 4, 6, 8].map((i) => <Turn key={i} k={`mw-rotor-${i}`} profile={ring(0.15, 0.25, discZ(i), discZ(i) + DISC * 0.8)} axis="z" seg={40} />)}
              <M clip geo={boxes('mw-rotor-keys', () => Array.from({ length: 16 }, (_, i) => {
                const a = (i / 16) * Math.PI * 2;
                return { c: [0.255 * Math.cos(a), 0.255 * Math.sin(a), -0.115], s: [0.02, 0.02, 0.19], r: [0, 0, a] };
              }))} />
            </Rolling>
            <Callout id="rotors" p={[0.23, 0.1, -0.12]} />
          </Part>
          <Part id="stators">
            {[1, 3, 5, 7].map((i) => <Turn key={i} k={`mw-stator-${i}`} profile={ring(0.12, 0.22, discZ(i), discZ(i) + DISC * 0.8)} axis="z" seg={40} />)}
            <Callout id="stators" p={[0.15, -0.1, -0.15]} />
          </Part>
          <Part id="torque-tube">
            <Turn k="mw-torque" profile={ring(0.1, 0.118, -0.26, -0.02)} axis="z" seg={32} />
            <M clip geo={boxes('mw-splines', () => Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return { c: [0.122 * Math.cos(a), 0.122 * Math.sin(a), -0.12], s: [0.014, 0.014, 0.2], r: [0, 0, a] };
            }))} />
            <Callout id="torque-tube" p={[0.11, 0, -0.04]} />
          </Part>
          <Part id="housing">
            <Turn k="mw-housing" profile={ring(0.09, 0.25, -0.31, -0.25)} axis="z" seg={40} />
            <M clip geo={merged('mw-pistons', () => Array.from({ length: 8 }, (_, i) => {
              const a = ((i + 0.5) / 8) * Math.PI * 2;
              return { g: cyl(0.028, 0.028, 0.05, 12), c: [0.2 * Math.cos(a), 0.2 * Math.sin(a), -0.23] as [number, number, number], r: [Math.PI / 2, 0, 0] as [number, number, number] };
            }))} />
            <Callout id="housing" p={[0.24, 0.05, -0.3]} />
          </Part>
        </>
      )}
    </group>
  );
}

const WHEEL_PARTS: PartDef[] = [
  { id: 'inner-hub', index: 1, name: '内半轮毂', en: 'Inner Wheel Half', role: '装刹车 · 承载', material: '锻铝', description: '轮毂分成内外两半，夹住无内胎轮胎；内半边是深杯形，刹车盘组就藏在里面。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'outer-hub', index: 2, name: '外半轮毂', en: 'Outer Wheel Half', role: '夹住轮胎', material: '锻铝', description: '拆下连接螺栓就能取下外半边，换轮胎不用把轮胎硬撬过轮缘。', explode: [0, 0, 1.1], stage: [0.18, 0.32] },
  { id: 'tie-bolts', index: 3, name: '连接螺栓 ×12', en: 'Tie Bolts', role: '连接两半轮毂', material: '高强度钢', description: '一圈十二根螺栓把两半轮毂拉在一起，按规定扭矩交叉拧紧。', explode: [0, 0, 0.7], stage: [0.04, 0.18] },
  { id: 'tyre', index: 4, name: '轮胎', en: 'Tyre', role: '承重 · 抓地', material: '橡胶 / 尼龙帘线', description: 'H49×19 无内胎子午线轮胎，充约 14 个大气压的氮气（不用空气，避免高温下氧化起火）。一架 747 有 18 个轮胎。', explode: [0, 0, 1.9], stage: [0.32, 0.46] },
  { id: 'valve', index: 5, name: '充气阀与易熔塞', en: 'Valve & Fusible Plugs', role: '充气 · 过热泄压', material: '黄铜 / 低熔点合金', description: '易熔塞在刹车过热时熔化，放掉胎压，防止轮胎爆裂。', explode: [0, 0.5, 0.9], stage: [0, 0.1] },
  { id: 'bearings', index: 6, name: '轮毂轴承', en: 'Wheel Bearings', role: '让轮子在轮轴上转', material: '轴承钢', description: '一对圆锥滚子轴承，内外各一，承受飞机的重量和转弯时的侧力。', explode: [0, -0.5, 0], stage: [0.5, 0.6] },
  { id: 'housing', index: 7, name: '刹车壳体与活塞', en: 'Brake Housing & Pistons', role: '施加刹车压力', material: '铝合金 / 钢', description: '一圈液压活塞同时把盘组压紧；防滞系统每秒调压几十次，防止轮子抱死打滑。', explode: [0, 0, -1.4], stage: [0.62, 0.74] },
  { id: 'torque-tube', index: 8, name: '扭力管', en: 'Torque Tube', role: '承受刹车扭矩', material: '钢', description: '静盘的内齿卡在扭力管的花键上，刹车时的巨大扭矩由它传给起落架。', explode: [0, 0, -1.0], stage: [0.72, 0.84] },
  { id: 'rotors', index: 9, name: '刹车动盘 ×5', en: 'Brake Rotors', role: '跟着轮子转', material: '碳 / 碳复合材料', description: '外缘的键卡在轮毂里，跟轮子一起转。碳刹车又轻又耐高温，一次中断起飞能烧到 1000℃ 以上。', explode: [0, 0, -0.75], stage: [0.84, 0.94] },
  { id: 'stators', index: 10, name: '刹车静盘 ×4', en: 'Brake Stators', role: '不转 · 摩擦', material: '碳 / 碳复合材料', description: '和动盘一片隔一片地叠在一起；活塞一压，动盘被静盘夹住，动能变成热。', explode: [0, 0, -0.5], stage: [0.9, 1] },
];

const WHEEL_STEPS: StepDef[] = [
  {
    title: '机轮与刹车', en: 'Wheel & Brake',
    body: '剖开看：轮胎夹在两半轮毂之间，内半边里装着一叠碳刹车盘——动盘跟着轮子转，静盘固定不动，活塞把它们压紧就是刹车。选“起飞”或“着陆”，轮子会滚。',
    state: { explode: 0, section: true, running: true, select: 'rotors', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '放气、拆连接螺栓，取下外半轮毂和轮胎；再从内侧卸下刹车壳体、扭力管，把动盘和静盘一片片取出来。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

const wheelDef = (id: string, name: string, en: string, parts: PartDef[], summary: string, drawingNo: string, brakes: boolean): MachineDef => level({
  id,
  parent: id === 'b747/wheel' ? 'b747/main-gear' : 'b747/nose-gear',
  unit: 9,
  bounds: [[-R, -R, -0.32], [R, R, 0.26]],
  name,
  en,
  subtitle: brakes ? '子组件 · 无内胎轮胎 · 碳刹车' : '子组件 · 无刹车',
  summary,
  drawingNo,
  scale: '1 : 10',
  parts,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'outer-hub', origin: [0, 0, 0.2] }],
  centreLines: [[[0, 0, -0.45], [0, 0, 0.45], R]],
  steps: WHEEL_STEPS.map((s, i) => (i === 0 && !brakes ? { ...s, body: '前起落架的两个机轮没有刹车（刹车全在 16 个主轮上），结构简单得多：两半轮毂夹住轮胎，中间一对轴承。', state: { ...s.state, select: 'tyre' } } : s)),
  camera: { target: [0, 0, -0.03], offset: [1.4, 0.9, 2.2], orthoDistance: 8, exploded: { target: [0, 0, 0.15], scale: 2.0 } },
  Model: brakes ? Wheel : NoseWheel,
  Driver: JumboDriver,
  Controls: PhaseControls,
});

function NoseWheel() {
  return <Wheel brakes={false} />;
}

export const wheelLevel = wheelDef('b747/wheel', '主机轮与刹车', 'Main Wheel & Brake', WHEEL_PARTS, '10 种零件：轮胎、两半轮毂、碳刹车盘组……', 'GW-747-31', true);
export const noseWheelLevel = wheelDef(
  'b747/nose-wheel', '前机轮', 'Nose Wheel',
  WHEEL_PARTS.filter((p) => ['inner-hub', 'outer-hub', 'tie-bolts', 'tyre', 'valve', 'bearings'].includes(p.id)),
  '6 种零件：轮胎、两半轮毂、螺栓、轴承', 'GW-747-21', false,
);
