import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { BoltSetDef, PartDef, StepDef } from '../types';
import { Box, Cyl, Fastener, level, Plate, poly, Turn, YZ_X } from '../kit';

/**
 * Piston and connecting rod of the Model T engine: 3¾ in bore, 4 in stroke,
 * 7½ in between rod centres. Wrist pin at the origin along x; the rod hangs
 * down −y to the crank pin.
 */
export const PISTON = { bore: 3.75, rod: 7.5, crank: 2 };

/** Engine angle per piston, set by the engine's driver (index → crank angle). */
export const pistonAngles = [0, Math.PI, Math.PI, 0];

const GROOVES = [0.64, 0.99, 1.34];
const RING_W = 0.2;

const pistonProfile: Array<[number, number]> = [
  [1.66, -2.25], [1.875, -2.25],
  ...GROOVES.flatMap((g): Array<[number, number]> => [[1.875, g], [1.7, g], [1.7, g + 0.22], [1.875, g + 0.22]]),
  [1.875, 2.0], [0, 2.0], [0, 1.65], [1.66, 1.65],
];

/** Big-end half in (y, z) about the crank pin; sign +1 is the rod's half, −1 the cap. */
function bigEnd(sign: number) {
  const pts: Array<[number, number]> = [[0, -1.6], [0.42, -1.6], [0.42, -1.07]];
  for (let i = 0; i <= 16; i += 1) {
    const a = -1.197 + (i / 16) * 2.394;
    pts.push([1.15 * Math.cos(a), 1.15 * Math.sin(a)]);
  }
  pts.push([0.42, 1.07], [0.42, 1.6], [0, 1.6], [0, 0.69]);
  for (let i = 0; i <= 12; i += 1) {
    const a = Math.PI / 2 - (i / 12) * Math.PI;
    pts.push([0.69 * Math.cos(a), 0.69 * Math.sin(a)]);
  }
  return poly(pts.map(([dy, dz]): [number, number] => [-PISTON.rod + sign * dy, dz]));
}

/**
 * Piston, rings, pin, rod and cap. Given a cylinder index it follows the
 * engine's crank; on its own it stands at top dead centre.
 */
export function PistonRod({ cylinder }: { cylinder?: number }) {
  const top = useRef<THREE.Group>(null);
  const rod = useRef<THREE.Group>(null);
  useFrame(() => {
    if (cylinder === undefined || !top.current || !rod.current) return;
    const t = pistonAngles[cylinder];
    const { crank: r, rod: l } = PISTON;
    const s = r * Math.sin(t);
    const yp = r * Math.cos(t) + Math.sqrt(l * l - s * s);
    top.current.position.y = yp;
    rod.current.position.y = yp;
    rod.current.rotation.x = Math.atan2(-s, yp - r * Math.cos(t));
  });
  return (
    <group>
      <group ref={top}>
        <Part id="piston">
          <Turn k="piston" profile={pistonProfile} seg={56} />
          <Cyl c={[1.1, 0, 0]} r={0.58} len={1.1} axis="x" />
          <Cyl c={[-1.1, 0, 0]} r={0.58} len={1.1} axis="x" />
          <Callout id="piston" p={[-1.2, 1.8, 1.2]} />
        </Part>
        <Part id="rings">
          {GROOVES.map((g) => <Turn key={g} k="ring" profile={[[1.71, 0], [1.875, 0], [1.875, RING_W], [1.71, RING_W]]} p={[0, g + 0.01, 0]} seg={56} />)}
          <Callout id="rings" p={[1.6, 1.3, 1.0]} />
        </Part>
        <Part id="pin">
          <Cyl c={[0, 0, 0]} r={0.375} len={3.3} axis="x" seg={24} />
          <Callout id="pin" p={[1.7, 0, 0.3]} />
        </Part>
      </group>
      <group ref={rod}>
        <Part id="pinch-bolt">
          <Fastener p={[0, -0.72, 1.0]} dir="z" d={0.3} len={1.6} />
          <Callout id="pinch-bolt" p={[0, -0.8, 1.2]} />
        </Part>
        <Part id="rod">
          <Turn k="small-end" profile={[[0.375, -0.5], [0.62, -0.5], [0.62, 0.5], [0.375, 0.5]]} axis="x" seg={32} />
          <Box c={[0, -0.7, 0.35]} s={[0.8, 0.5, 1.3]} />
          <Box c={[0, -3.7, 0]} s={[0.22, 5.9, 0.8]} />
          <Box c={[0, -3.7, 0.42]} s={[0.66, 5.9, 0.16]} />
          <Box c={[0, -3.7, -0.42]} s={[0.66, 5.9, 0.16]} />
          <Plate k="big-end" shape={bigEnd(1)} depth={1.2} p={[-0.6, 0, 0]} r={YZ_X} />
          <Callout id="rod" p={[0, -4, 0.5]} />
        </Part>
        <Part id="bearing">
          <Turn k="babbitt" profile={[[0.625, -0.55], [0.69, -0.55], [0.69, 0.55], [0.625, 0.55]]} p={[0, -PISTON.rod, 0]} axis="x" seg={40} />
          <Callout id="bearing" p={[0.6, -7.5, 0.3]} />
        </Part>
        <Part id="cap">
          <Plate k="cap" shape={bigEnd(-1)} depth={1.2} p={[-0.6, 0, 0]} r={YZ_X} />
          {[1.35, -1.35].map((z) => <Fastener key={z} p={[0, -PISTON.rod - 0.42, z]} dir="-y" set="rod-bolts" d={0.3} len={1.0} />)}
          <Callout id="cap" p={[0, -8.6, 1.4]} />
        </Part>
      </group>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'piston', index: 1, name: '活塞', en: 'Piston', role: '承受燃气压力', material: '铸铁', description: '直径 3¾ 英寸的铸铁活塞，顶部平，上部三道环槽；两侧的销座承接活塞销。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'rings', index: 2, name: '活塞环', en: 'Piston Rings', role: '密封 · 刮油', material: '铸铁', description: '三道开口的弹性铸铁环，靠自身弹力贴紧缸壁，既挡住燃气下窜，也刮掉多余的机油。拆时把环撑开，从活塞顶上方取下。', explode: [0, 4, 0], stage: [0.82, 1] },
  { id: 'pin', index: 3, name: '活塞销', en: 'Wrist Pin', role: '铰接活塞与连杆', material: '钢', description: '空心钢销穿过活塞的两个销座和连杆小头，让连杆可以相对活塞摆动。', explode: [5.5, 0, 0], stage: [0.46, 0.62] },
  { id: 'pinch-bolt', index: 4, name: '销夹紧螺栓', en: 'Pin Clamp Bolt', role: '锁住活塞销', material: '钢', description: 'T 型车的连杆小头是开口夹紧式：这颗螺栓把小头夹紧在活塞销上，销就在活塞销座里转动。', explode: [0, 0, 3], stage: [0.36, 0.46] },
  { id: 'rod', index: 5, name: '连杆', en: 'Connecting Rod', role: '往复 → 旋转', material: '锻钢', description: '工字形截面的锻钢连杆，中心距 7½ 英寸。小头连活塞销，大头抱住曲轴的连杆轴颈。', explode: [0, -5, 0], stage: [0.62, 0.82] },
  { id: 'bearing', index: 6, name: '连杆轴瓦', en: 'Babbitt Bearing', role: '减摩', material: '巴氏合金', description: 'T 型车在连杆大头里直接浇铸一层软的巴氏合金作为轴瓦，磨损后要重新浇铸、刮研。', explode: [-3.6, 0, 0], stage: [0.22, 0.36] },
  { id: 'cap', index: 7, name: '连杆盖', en: 'Rod Cap', role: '合抱轴颈', material: '锻钢', description: '大头的下半个圆，用两颗螺栓和连杆合在一起，把曲轴连杆轴颈抱在中间。', explode: [0, -9, 0], stage: [0.08, 0.24] },
];

const BOLT_SETS: Record<string, BoltSetDef> = {
  'rod-bolts': { owner: 'cap', distance: 2, stage: [0, 0.1] },
};

const STEPS: StepDef[] = [
  {
    title: '活塞连杆组', en: 'Piston & Rod',
    body: '发动机里四组完全相同。活塞在缸里上下走 4 英寸，连杆把这个往复运动传到曲轴上变成旋转。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '剖开看：活塞是空心的“倒杯”，三道环槽在销座上方；连杆大头里那层薄薄的就是浇铸的巴氏合金轴瓦。',
    state: { explode: 0, section: true, running: false, select: 'bearing', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆连杆螺栓取下连杆盖，抽出轴瓦；松开夹紧螺栓，推出活塞销，连杆就和活塞分开了；最后撑开活塞环从顶上取下。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const pistonLevel = level({
  id: 'model-t/piston',
  parent: 'model-t/engine',
  unit: 0.6,
  bounds: [[-1.9, -8.7, -1.9], [1.9, 2.0, 1.9]],
  name: '活塞连杆组',
  en: 'Piston & Connecting Rod',
  subtitle: '子组件 · 缸径 3¾ in · 连杆 7½ in',
  summary: '7 种零件：活塞、活塞环、活塞销、连杆、轴瓦、连杆盖…',
  drawingNo: 'GW-T-11',
  scale: '1 : 1',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: {},
  guides: [
    { stage: 'cap', origin: [0, -7.92, 0] },
    { stage: 'pin', origin: [1.65, 0, 0] },
    { stage: 'rod', origin: [0, -7.5, 0] },
    { stage: 'rings', origin: [0, 1.35, 1.875] },
  ],
  centreLines: [
    [[0, -9.5, 0], [0, 3, 0], 2.1],
    [[-2.4, 0, 0], [2.4, 0, 0]],
    [[-1.4, -7.5, 0], [1.4, -7.5, 0]],
  ],
  steps: STEPS,
  camera: { target: [0, -3, 0], offset: [19, 12, 25], orthoDistance: 100, exploded: { target: [0, -5, 0], scale: 1.5 } },
  Model: () => <PistonRod />,
});
