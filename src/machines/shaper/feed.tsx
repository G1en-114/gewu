import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, Rod, Turn } from '../kit';
import { FEED_TEETH, SHA } from './layout';
import { shaperMotion, ShaperDriver } from './motion';

/**
 * Cross-feed mechanism of the shaper, local origin at the ratchet wheel on the
 * right end of the cross screw: screw along −z, ratchet wheel in the x-y plane.
 * The pawl and its lever are one part on a common shaft; the connecting rod
 * from the drive eccentric is drawn by the machine itself.
 * Millimetres.
 */

export const LEVER_PIVOT: [number, number, number] = [0, 120, 26];
const LEVER_ARM: [number, number] = [-150, 230];
const PAWL_TIP_R = 80;

/** World point the feed connecting rod attaches to (machine coordinates). */
export function feedLeverPoint(): [number, number, number] {
  const tip = [PAWL_TIP_R * Math.cos(shaperMotion.ratchet), PAWL_TIP_R * Math.sin(shaperMotion.ratchet)];
  const angle = Math.atan2(tip[1] - LEVER_PIVOT[1], tip[0] - LEVER_PIVOT[0]);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const localX = LEVER_PIVOT[0] + LEVER_ARM[0] * c - LEVER_ARM[1] * s;
  const localY = LEVER_PIVOT[1] + LEVER_ARM[0] * s + LEVER_ARM[1] * c;
  return [SHA.screw.x + localX, SHA.screw.y + localY, SHA.screw.z + LEVER_PIVOT[2] + 8];
}

/** Asymmetric ratchet teeth (24), sawtooth outline in the x-y plane. */
function ratchetShape(teeth: number, rRoot: number, rTip: number, bore: number) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step;
    const p = (angle: number, r: number): [number, number] => [r * Math.cos(angle), r * Math.sin(angle)];
    const points: Array<[number, number]> = [p(a, rRoot), p(a, rTip), p(a + step * 0.62, rTip), p(a + step * 0.92, rRoot)];
    points.forEach(([x, y], j) => {
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

/** The ratchet wheel and screw turn together. */
function WheelSpin({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = shaperMotion.ratchet;
  });
  return <group ref={ref}>{children}</group>;
}

/** Pawl and its lever on one shaft above the wheel. */
function PawlArm({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const tip = [PAWL_TIP_R * Math.cos(shaperMotion.ratchet), PAWL_TIP_R * Math.sin(shaperMotion.ratchet)];
    if (ref.current) ref.current.rotation.z = Math.atan2(tip[1] - LEVER_PIVOT[1], tip[0] - LEVER_PIVOT[0]);
  });
  return <group ref={ref} position={LEVER_PIVOT}>{children}</group>;
}

/** Nut on the cross screw, carried by the table. */
function Nut({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.z = -465 + shaperMotion.tableZ;
  });
  return <group ref={ref}>{children}</group>;
}

export function FeedMechanism() {
  return (
    <group>
      <Part id="screw">
        <Cyl c={[0, 0, -475]} r={18} len={910} axis="z" seg={24} />
        <Cyl c={[0, 0, -20]} r={30} len={26} axis="z" seg={20} />
        <Box c={[14, 0, -475]} s={[6, 8, 860]} />
        <Callout id="screw" p={[20, 26, -380]} />
      </Part>

      <WheelSpin>
        <Part id="ratchet">
          <Plate k="sf-ratchet" shape={() => ratchetShape(FEED_TEETH, 58, 74, 22)} depth={26} p={[0, 0, -13]} />
          <Cyl c={[0, 0, 0]} r={30} len={40} axis="z" seg={24} />
          <Callout id="ratchet" p={[-30, 58, 20]} />
        </Part>
      </WheelSpin>

      <PawlArm>
        <Part id="pawl">
          <Rod a={[0, 0, 0]} b={[PAWL_TIP_R, 0, 0]} r={9} seg={12} />
          <Box c={[PAWL_TIP_R - 6, -6, 0]} s={[26, 22, 16]} />
          <Callout id="pawl" p={[PAWL_TIP_R, 24, 20]} />
        </Part>
        <Part id="lever">
          <Rod a={[0, 0, 4]} b={[LEVER_ARM[0], LEVER_ARM[1], 4]} r={11} seg={12} />
          <Cyl c={[0, 0, 0]} r={20} len={40} axis="z" seg={16} />
          <Rod a={[LEVER_ARM[0] - 8, LEVER_ARM[1] + 4, 8]} b={[LEVER_ARM[0] - 26, LEVER_ARM[1] + 26, 8]} r={8} seg={10} />
          <Callout id="lever" p={[LEVER_ARM[0] - 20, LEVER_ARM[1] + 40, 20]} />
        </Part>
      </PawlArm>

      <Nut>
        <Part id="nut">
          <Box c={[0, 0, 0]} s={[88, 72, 116]} />
          <Box c={[0, 40, 0]} s={[64, 18, 90]} />
          <Callout id="nut" p={[34, 40, -40]} />
        </Part>
      </Nut>

      <Part id="handwheel">
        <Turn k="sf-handwheel" profile={[[0, -984], [98, -984], [98, -960], [0, -960]]} axis="z" seg={36} />
        {[0, 1, 2, 3].map((i) => (
          <Rod key={i} a={[0, 0, -972]} b={[78 * Math.cos((i * Math.PI * 2) / 4), 78 * Math.sin((i * Math.PI * 2) / 4), -972]} r={8} seg={10} />
        ))}
        <Rod a={[108, 0, -972]} b={[150, 0, -972]} r={12} seg={12} />
        <Cyl c={[0, 0, -948]} r={26} len={20} axis="z" seg={16} />
        <Callout id="handwheel" p={[-60, 0, -990]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'screw', index: 1, name: '横向丝杠', en: 'Cross-Feed Screw', role: '驱动工作台', material: '45 钢', description: '沿机身横向的丝杠（轴线沿 z），转动时带动工作台左右移动。机动进给由后面的棘轮驱动，手柄也可以手动转。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'ratchet', index: 2, name: '棘轮', en: 'Ratchet Wheel', role: '把摆动变成步进', material: '45 钢', description: `24 齿棘轮固定在丝杠端头。滑枕每往复一次，棘爪拨过一齿，工作台就前进一点——这就是“间歇进给”，刨削时工件不动，回程时进给。每齿进给 0.33–3.33 mm，共 10 级。`, explode: [0, 90, 160], stage: [0.72, 0.84] },
  { id: 'pawl', index: 3, name: '棘爪', en: 'Pawl', role: '单向拨动', material: '45 钢 · 淬火', description: '尖头卡在棘轮齿间。往前推时拨动棘轮，往回退时沿齿背滑过，所以丝杠只能单向转。弹簧让它始终压在齿面上。', explode: [100, 140, 120], stage: [0.56, 0.68] },
  { id: 'lever', index: 4, name: '棘爪摆杆', en: 'Pawl Lever', role: '接受连杆驱动', material: 'HT200 灰铸铁', description: '和棘爪装在同一根小轴上，由滑枕后方的连杆拉动，来回摆一个角度。', explode: [160, 60, 40], stage: [0.44, 0.56] },
  { id: 'nut', index: 5, name: '丝杠螺母', en: 'Cross-Feed Nut', role: '带动工作台', material: 'ZQSn6-6-3 青铜', description: '固定在工作台底面，和横向丝杠旋合。丝杠转转，螺母带着工作台沿横梁导轨移动；磨损后可以换。', explode: [0, 120, -120], stage: [0.3, 0.42] },
  { id: 'handwheel', index: 6, name: '手动进给手轮', en: 'Feed Handwheel', role: '手动横向进给', material: '铸铁', description: '装在丝杠另一端，对刀、调整时手动转动；机动进给时和丝杠一起转。', explode: [0, 60, -260], stage: [0.12, 0.24] },
];

const STEPS: StepDef[] = [
  {
    title: '间歇进给', en: 'Intermittent Feed',
    body: '工作台不是一直在走：滑枕每往复一次，连杆拉着棘爪摆杆摆一个角度，棘爪拨过棘轮一齿，横向丝杠转一下，工作台前进 0.33–3.33 mm。刨削行程里工件不动，返回时进给。',
    state: { explode: 0, section: false, running: true, select: 'ratchet', focus: null },
  },
  {
    title: '棘轮棘爪', en: 'Ratchet & Pawl',
    body: '棘爪前推拨动棘轮、后退沿齿背滑过，所以丝杠只朝一个方向步进。24 齿、丝杠螺距与传动比一起决定每齿的进给量。',
    state: { explode: 0, section: false, running: true, select: 'pawl', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '卸下棘轮端螺母和棘轮，抽出棘爪摆杆的轴，取下棘爪和弹簧；再拆另一头的手轮，最后把丝杠从工作台螺母里旋出来。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const feedLevel: MachineDef = level({
  id: 'shaper/feed',
  parent: 'shaper',
  unit: 0.01,
  bounds: [[-260, -80, -1010], [240, 380, 90]],
  name: '横向进给机构',
  en: 'Cross-Feed Mechanism',
  subtitle: '子组件 · 棘轮棘爪 · 每行程 0.33–3.33 mm',
  summary: '6 种零件 · 棘轮把摆动变成间歇进给',
  drawingNo: 'GW-BC-03',
  scale: '1 : 5',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'ratchet', origin: [0, 0, 0] }],
  centreLines: [[[0, 0, -1000], [0, 0, 60], 80]],
  steps: STEPS,
  camera: {
    target: [-40, 130, -420],
    offset: [1000, 800, 2200],
    orthoDistance: 4000,
    exploded: { target: [-20, 150, -300], scale: 1.4 },
  },
  Model: FeedMechanism,
  Driver: ShaperDriver,
});
