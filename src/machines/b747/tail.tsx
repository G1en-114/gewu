import type { ReactNode } from 'react';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, level, Turn } from '../kit';
import { FIN, jumboMotion, STABILIZER } from './airframe';
import { Apu, apuLevel } from './apu';
import { JumboDriver, PhaseControls } from './controls';
import { loft, onSection, type P3, sectionRing, spanSteps, stationAt } from './geo';
import { Hinged } from './wing';

/**
 * 747-400 empennage in aircraft coordinates: fin with split rudder,
 * all-moving-trim stabilizer with four elevators, the trim jackscrew, and the
 * APU in the tail cone. Metres.
 */

/** Hinge line of control surfaces at 70% chord. */
const HINGE = 0.7;
const fin = (y: number) => stationAt(FIN, y, 1);
const stab = (z: number) => stationAt(STABILIZER, z);
const flat = { cambered: false };
const vert = { vertical: true, cambered: false };

/** Mid-thickness point at chord fraction f (a hinge line). */
const mid = (a: P3, b: P3): P3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const finHinge = (y: number): P3 => mid(onSection(fin(y), HINGE, 1, vert), onSection(fin(y), HINGE, -1, vert));
const stabHinge = (z: number): P3 => mid(onSection(stab(z), HINGE, 1, flat), onSection(stab(z), HINGE, -1, flat));

const finPiece = (k: string, y0: number, y1: number, f0: number, f1: number) =>
  loft(k, () => spanSteps(FIN, y0, y1, 2, 1).map((y) => sectionRing(fin(y), f0, f1, 12, vert)));
const stabPiece = (k: string, z0: number, z1: number, f0: number, f1: number) =>
  loft(k, () => spanSteps(STABILIZER, z0, z1, 2).map((z) => sectionRing(stab(z), f0, f1, 12, flat)));

export const APU_AT: P3 = [-32.35, 6.95, 0];
const sway = () => Math.sin(jumboMotion.t * 0.9) * 0.1;

function Mirror({ on, children }: { on: boolean; children: ReactNode }) {
  return on ? <group scale={[1, 1, -1]}>{children}</group> : <>{children}</>;
}

export function Tail() {
  return (
    <group>
      <Part id="fin">
        <M clip geo={finPiece('tl-fin', 8.2, 19.4, 0, HINGE)} />
        <Callout id="fin" p={onSection(fin(15), 0.35, 1, vert)} />
      </Part>
      {([['rudder-upper', 13.9, 19.25], ['rudder-lower', 8.7, 13.8]] as const).map(([id, y0, y1]) => (
        <Part key={id} id={id}>
          <Hinged a0={finHinge(y0)} a1={finHinge(y1)} angle={sway}>
            <M clip geo={finPiece(`tl-${id}`, y0, y1, HINGE + 0.005, 1)} />
          </Hinged>
          <Callout id={id} p={onSection(fin((y0 + y1) / 2), 0.85, 1, vert)} />
        </Part>
      ))}
      {([['stab-r', false], ['stab-l', true]] as const).map(([id, mirror]) => (
        <Part key={id} id={id}>
          <Mirror on={mirror}><M clip geo={stabPiece('tl-stab', 1.2, 11.1, 0, HINGE)} /></Mirror>
          <Callout id={id} p={(([x, y, z]) => [x, y, mirror ? -z : z] as P3)(onSection(stab(8), 0.35, 1, flat))} />
        </Part>
      ))}
      {([['elevator-ir', 1.5, 6.3, false], ['elevator-or', 6.4, 10.95, false], ['elevator-il', 1.5, 6.3, true], ['elevator-ol', 6.4, 10.95, true]] as const).map(([id, z0, z1, mirror]) => (
        <Part key={id} id={id}>
          <Mirror on={mirror}>
            <Hinged a0={stabHinge(z0)} a1={stabHinge(z1)} angle={() => -jumboMotion.elevator}>
              <M clip geo={stabPiece(`tl-elev-${z0}`, z0, z1, HINGE + 0.005, 1)} />
            </Hinged>
          </Mirror>
          <Callout id={id} p={(([x, y, z]) => [x, y, mirror ? -z : z] as P3)(onSection(stab((z0 + z1) / 2), 0.86, 1, flat))} />
        </Part>
      ))}
      <Part id="trim">
        <M clip geo={stabPiece('tl-centre', 0, 1.2, 0.08, 0.6)} />
        <Mirror on><M clip geo={stabPiece('tl-centre', 0, 1.2, 0.08, 0.6)} /></Mirror>
        <Turn k="tl-screw" profile={[[0, 0], [0.07, 0], [0.07, 1.5], [0, 1.5]]} p={[-24.4, 5.7, 0]} seg={16} />
        <Box c={[-24.4, 5.6, 0]} s={[0.5, 0.3, 0.5]} />
        <Callout id="trim" p={[-24.4, 6.6, 0.1]} />
      </Part>
      <Part id="apu">
        <group position={APU_AT}><Apu /></group>
        <Callout id="apu" p={[APU_AT[0], APU_AT[1] + 0.3, 0.2]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'fin', index: 1, name: '垂直安定面', en: 'Fin', role: '航向稳定', material: '铝合金 / 复合材料', description: '高约 11 米，顶端离地 19.4 米，相当于六层楼。保持机头对准来流，单发失效时还要靠它对抗不对称推力。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'rudder-upper', index: 2, name: '上方向舵', en: 'Upper Rudder', role: '偏航操纵', material: '复合材料', description: '方向舵分上下两段，各由独立的液压系统驱动——一套坏了另一套还能用。运转时可以看到偏航阻尼器在轻轻地动。', explode: [-2.2, 1.2, 0], stage: [0.16, 0.3] },
  { id: 'rudder-lower', index: 3, name: '下方向舵', en: 'Lower Rudder', role: '偏航操纵', material: '复合材料', description: '同上方向舵。', explode: [-2.2, 0.2, 0], stage: [0.24, 0.38] },
  { id: 'stab-r', index: 4, name: '右水平安定面', en: 'Right Stabilizer', role: '俯仰稳定 · 配平', material: '铝合金', description: '整块可以转动来配平：调好角度后，驾驶员不用一直拉杆。', explode: [0, 0, 5], stage: [0.5, 0.64] },
  { id: 'stab-l', index: 5, name: '左水平安定面', en: 'Left Stabilizer', role: '俯仰稳定 · 配平', material: '铝合金', description: '同右水平安定面。', explode: [0, 0, -5], stage: [0.54, 0.68] },
  { id: 'elevator-ir', index: 6, name: '右内升降舵', en: 'Right Inboard Elevator', role: '俯仰操纵', material: '复合材料', description: '四块升降舵各由不同的液压系统驱动。用左栏切换“起飞”，看它们上偏让机头抬起。', explode: [-1.6, 0, 3], stage: [0.02, 0.14] },
  { id: 'elevator-or', index: 7, name: '右外升降舵', en: 'Right Outboard Elevator', role: '俯仰操纵', material: '复合材料', description: '同内升降舵。', explode: [-1.6, 0, 4.5], stage: [0, 0.12] },
  { id: 'elevator-il', index: 8, name: '左内升降舵', en: 'Left Inboard Elevator', role: '俯仰操纵', material: '复合材料', description: '同右内升降舵。', explode: [-1.6, 0, -3], stage: [0.06, 0.18] },
  { id: 'elevator-ol', index: 9, name: '左外升降舵', en: 'Left Outboard Elevator', role: '俯仰操纵', material: '复合材料', description: '同右内升降舵。', explode: [-1.6, 0, -4.5], stage: [0.04, 0.16] },
  { id: 'trim', index: 10, name: '平尾中央翼盒与配平丝杠', en: 'Centre Box & Trim Jackscrew', role: '转动整个平尾', material: '钢 / 铝合金', description: '左右平尾在机身里由中央翼盒连成一体，绕后面的枢轴转动；前端由一根竖着的大丝杠推上推下。', explode: [0, -2.2, 0], stage: [0.68, 0.82] },
  { id: 'apu', index: 11, name: '辅助动力装置', en: 'APU', role: '地面供电供气', material: '—', description: '尾锥里的小燃气涡轮。点“拆开此组件”看内部。', explode: [-3, -1.2, 0], stage: [0.34, 0.48] },
];

const STEPS: StepDef[] = [
  {
    title: '尾翼', en: 'Empennage',
    body: '垂尾和平尾负责稳定，方向舵和升降舵负责操纵。用左栏切换“起飞”，四块升降舵上偏，飞机抬头离地。',
    state: { explode: 0, section: false, running: true, select: 'elevator-ir', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆升降舵和方向舵，取出尾锥里的 APU，再拆下左右平尾、中央翼盒和配平丝杠。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const tailLevel: MachineDef = level({
  id: 'b747/tail',
  parent: 'b747',
  unit: 0.7,
  bounds: [[-33.5, 5.4, -11.2], [-21, 19.5, 11.2]],
  name: '尾翼',
  en: 'Empennage',
  subtitle: '子组件 · 分段方向舵 · 可配平平尾',
  summary: '11 种零件：垂尾、方向舵、平尾、4 块升降舵、配平丝杠、APU',
  drawingNo: 'GW-747-60',
  scale: '1 : 100',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { apu: 'b747/apu' },
  guides: [{ stage: 'stab-r', origin: [-28, 7.4, 4] }],
  centreLines: [],
  steps: STEPS,
  camera: { target: [-27.5, 11, 0], offset: [-18, 14, 34], orthoDistance: 120, exploded: { target: [-27.5, 11, 0], scale: 1.4 } },
  Model: Tail,
  Driver: JumboDriver,
  Controls: PhaseControls,
});

export const TAIL_LEVELS: MachineDef[] = [tailLevel, apuLevel];
