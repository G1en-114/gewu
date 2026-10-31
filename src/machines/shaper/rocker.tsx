import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { gearShape } from '../../scene/geometry';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, Turn } from '../kit';
import { SHA, strokeArcs } from './layout';
import { shaperMotion, ShaperDriver } from './motion';

/**
 * The slotted-link (Whitworth) quick-return drive of the shaper, pivot at the
 * origin: crank centre (0, 440), rocker length 1385, bull gear Ø400 with a
 * radial slot and sliding crank pin. Millimetres; mechanism plane z = 0.
 */

const D = SHA.crank.d;

function rotateYaw(ref: React.MutableRefObject<THREE.Group | null>, angle: number) {
  if (ref.current) ref.current.rotation.z = angle;
}

function BullGearSpin({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => rotateYaw(ref, shaperMotion.crank));
  return <group ref={ref} position={[0, D, 0]}>{children}</group>;
}

function RockerSwing({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => rotateYaw(ref, shaperMotion.phi));
  return <group ref={ref}>{children}</group>;
}

function PinionSpin({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = -shaperMotion.crank * (SHA.crank.teeth / SHA.crank.pinionTeeth);
  });
  return <group ref={ref} position={[SHA.pinion.x - SHA.pivot.x, SHA.pinion.y - SHA.pivot.y, 0]}>{children}</group>;
}

/** Crank pin block: rides in the bull gear's radial slot at the set stroke. */
function CrankBlock() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = shaperMotion.radius;
  });
  return (
    <group ref={ref}>
      <Part id="crank-block">
        <Box c={[0, 0, 0]} s={[68, 66, 82]} />
        <Box c={[0, 40, 0]} s={[90, 12, 96]} />
        <Callout id="crank-block" p={[20, 40, 45]} />
      </Part>
      <Part id="crank-pin">
        <Cyl c={[0, 0, 0]} r={18} len={150} axis="z" seg={24} />
        <Cyl c={[0, 0, 86]} r={26} len={14} axis="z" seg={6} />
        <Callout id="crank-pin" p={[0, 26, 80]} />
      </Part>
    </group>
  );
}

/** Sliding block held in the rocker's slot; it moves with the crank pin. */
function SlotBlock() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.y = shaperMotion.slot;
  });
  return (
    <group ref={ref}>
      <Part id="slider">
        <Box c={[0, 0, 0]} s={[24, 92, 44]} />
        <Cyl c={[0, 0, 0]} r={26} len={44} axis="z" seg={20} />
        <Callout id="slider" p={[16, 40, 30]} />
      </Part>
    </group>
  );
}

export function Rocker() {
  const R = 200;
  return (
    <group>
      <Part id="bracket">
        <Box c={[0, -190, 0]} s={[560, 80, 320]} />
        {[1, -1].map((s) => (
          <Box key={s} c={[0, -90, s * 105]} s={[190, 120, 50]} />
        ))}
        <Turn k="sp-pivot-boss" profile={[[38, -125], [78, -125], [78, 125], [38, 125]]} axis="z" seg={40} />
        <Callout id="bracket" p={[120, -170, 140]} />
      </Part>

      <Part id="pivot-pin">
        <Cyl c={[0, 0, 0]} r={36} len={270} axis="z" seg={28} />
        <Cyl c={[0, 0, 142]} r={52} len={16} axis="z" seg={6} />
        <Cyl c={[0, 0, -142]} r={52} len={16} axis="z" seg={6} />
        <Callout id="pivot-pin" p={[0, 44, 150]} />
      </Part>

      <BullGearSpin>
        <Part id="bull-gear">
          <Plate k="sp-bull-gear" shape={() => gearShape(SHA.crank.teeth, R, 10, 55)} depth={60} p={[0, 0, -30]} />
          <Turn k="sp-bull-hub" profile={[[52, -80], [108, -80], [108, 80], [52, 80]]} axis="z" seg={40} />
          {[1, -1].map((s) => (
            <Box key={s} c={[110 + 90, 0, s * 33]} s={[180, 14, 6]} />
          ))}
          <Box c={[60, 0, 0]} s={[30, 40, 66]} />
          <Callout id="bull-gear" p={[-120, 210, 40]} />
        </Part>
        <CrankBlock />
        <Part id="adjust">
          <Cyl c={[0, 0, 100]} r={46} r2={28} len={46} axis="z" seg={24} />
          <Cyl c={[95, 0, 45]} r={9} len={190} axis="x" seg={14} />
          <Turn k="sp-adjust-nut" profile={[[10, -16], [26, -16], [26, 16], [10, 16]]} axis="x" p={[150, 0, 45]} seg={6} />
          <Callout id="adjust" p={[0, -60, 110]} />
        </Part>
      </BullGearSpin>

      <RockerSwing>
        <Part id="rocker">
          {[1, -1].map((s) => (
            <Box key={s} c={[s * 31, 690, 0]} s={[38, 1320, 50]} />
          ))}
          <Box c={[0, 1360, 0]} s={[104, 80, 56]} />
          <Box c={[0, 40, 0]} s={[96, 60, 56]} />
          <Cyl c={[0, 1385, 0]} r={28} len={56} axis="z" seg={24} />
          <Turn k="sp-rocker-hub" profile={[[36, -45], [62, -45], [62, 45], [36, 45]]} axis="z" seg={32} />
          <Callout id="rocker" p={[45, 1180, 40]} />
        </Part>
        <SlotBlock />
      </RockerSwing>

      <PinionSpin>
        <Part id="pinion">
          <Plate k="sp-pinion" shape={() => gearShape(SHA.crank.pinionTeeth, SHA.crank.pinionPitchR, 4, 28)} depth={60} p={[0, 0, -30]} />
          <Turn k="sp-pinion-hub" profile={[[26, -70], [54, -70], [54, 70], [26, 70]]} axis="z" seg={32} />
          <Cyl c={[0, 0, 180]} r={24} len={520} axis="z" seg={24} />
          <Callout id="pinion" p={[40, 60, 40]} />
        </Part>
      </PinionSpin>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'bracket', index: 1, name: '支座', en: 'Pivot Bracket', role: '支承摆杆轴', material: 'HT200 灰铸铁', description: '固定在床身里的轴承支座，摆杆轴装在它上面。整台机器的往复运动都从这根轴开始。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'bull-gear', index: 2, name: '大齿轮', en: 'Bull Gear', role: '把转动变成往复', material: 'HT200 灰铸铁', description: '60 齿大齿轮（Ø400），由 18 齿小齿轮带动，每转一圈滑枕往复一次。齿轮面上开一条径向槽，曲柄滑块在里面滑动来改变行程。', explode: [0, 240, 0], stage: [0.72, 0.86] },
  { id: 'crank-block', index: 3, name: '曲柄滑块', en: 'Crank Sliding Block', role: '调节曲柄半径', material: '45 钢', description: '装在大齿轮的径向槽里，用调节丝杠改变它到中心的距离：半径越大行程越长。BC6063 最大刨削长度 630 mm。', explode: [0, 160, 160], stage: [0.6, 0.72] },
  { id: 'crank-pin', index: 4, name: '曲柄销', en: 'Crank Pin', role: '驱动摆杆', material: '20Cr 渗碳', description: '曲柄滑块上的销子，随大齿轮在圆周上走。它在摆杆的滑动槽里上下滑，把圆周运动变成摆杆的摆动。', explode: [140, 120, 220], stage: [0.52, 0.64] },
  { id: 'rocker', index: 5, name: '摆杆', en: 'Slotted Rocker', role: '摆动 → 滑枕往复', material: 'HT200 灰铸铁', description: '一根 1385 mm 长的开槽摆杆，下端铰在支座上，槽里容曲柄销滑动，上端推着滑枕来回走。', explode: [160, -120, 0], stage: [0.36, 0.5] },
  { id: 'slider', index: 6, name: '滑块', en: 'Rocker Slider', role: '槽内滑动', material: 'ZQSn6-6-3 青铜', description: '曲柄销外面的青铜滑块，在摆杆槽里上下滑动，减小摩擦。磨损后可以单独更换。', explode: [80, 320, 160], stage: [0.44, 0.56] },
  { id: 'pivot-pin', index: 7, name: '摆杆轴', en: 'Rocker Pivot Pin', role: '摆杆铰点', material: '45 钢', description: '摆杆绕它摆动，两端用螺母锁在支座上。位置决定了急回特性的快慢比。', explode: [0, -120, 240], stage: [0.62, 0.74] },
  { id: 'pinion', index: 8, name: '小齿轮与输入轴', en: 'Pinion & Input Shaft', role: '输入动力', material: '40Cr', description: '18 齿小齿轮与 60 齿大齿轮啮合，传动比 1:3.33；轴伸出机身右边，用三角带连到电机。', explode: [-180, 140, 0], stage: [0.18, 0.3] },
  { id: 'adjust', index: 9, name: '行程调节机构', en: 'Stroke Adjuster', role: '改变行程', material: '45 钢 / 青铜', description: '一对锥齿轮把外侧的转动传进大齿轮中心，再带动径向丝杠，让曲柄滑块沿槽移动——调的就是滑枕行程。', explode: [0, -80, 260], stage: [0.28, 0.4] },
];

const CUT_ANGLE = (strokeArcs(102.7).cutting * 180) / Math.PI;
const RET_ANGLE = (strokeArcs(102.7).returning * 180) / Math.PI;

const STEPS: StepDef[] = [
  {
    title: '摆杆机构', en: 'Slotted Link',
    body: '这台刨床的往复运动来自一套“摆杆机构”（Whitworth 急回机构）：大齿轮匀速转，曲柄销在摆杆槽里滑动，摆杆绕下端的轴来回摆，上端推着滑枕走。',
    state: { explode: 0, section: false, running: true, select: 'bull-gear', focus: null },
  },
  {
    title: '急回特性', en: 'Quick Return',
    body: `曲柄转一圈，摆杆摆一个来回：慢的切削行程占 ${Math.round(CUT_ANGLE)}°，快的返回行程只占 ${Math.round(RET_ANGLE)}°——行程速度比 K≈1.38，回来时刀不切削，所以能省时间。`,
    state: { explode: 0, section: false, running: true, select: 'crank-pin', focus: 'pin' },
  },
  {
    title: '调行程', en: 'Adjusting Stroke',
    body: '转动机身侧面的手轮，锥齿轮带动齿条/丝杠，让曲柄滑块在大齿轮上径向移动。曲柄半径越大，滑枕行程越长（最大 630 mm）。',
    state: { explode: 0, section: false, running: true, select: 'crank-block', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆摆杆轴的两端螺母、取下摆杆和滑块；再卸曲柄销、抽出曲柄滑块和调节丝杠；最后把大齿轮和输入齿轮轴从支座里取出来。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const rockerLevel: MachineDef = level({
  id: 'shaper/rocker',
  parent: 'shaper',
  unit: 0.008,
  bounds: [[-280, -260, -320], [260, 1460, 500]],
  name: '摆杆机构',
  en: 'Slotted-Link Quick-Return Drive',
  subtitle: '子组件 · 曲柄摆动导杆 · 急回',
  summary: '9 种零件 · 摆杆把转动变成滑枕往复，带急回',
  drawingNo: 'GW-BC-01',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'rocker', origin: [0, 700, 0] }],
  centreLines: [[[0, 0, -160], [0, 0, 340], 60], [[0, D, -160], [0, D, 340], 220]],
  steps: STEPS,
  camera: {
    target: [0, 650, 40],
    offset: [1800, 1300, 3800],
    orthoDistance: 9000,
    exploded: { target: [0, 760, 60], scale: 1.5 },
    foci: { pin: { target: [30, 600, 60], scale: 0.62 } },
  },
  Model: Rocker,
  Driver: ShaperDriver,
});
