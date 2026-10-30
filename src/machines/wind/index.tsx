import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Cyl, level, Plate, poly, Turn, YZ_X } from '../kit';
import { windGearboxLevel, WindDriver, windMotion } from './gearbox';
import { AXIS_Y, Nacelle, nacelleLevel } from './nacelle';

/**
 * 2 MW-class horizontal-axis wind turbine: 78 m tower, 90 m rotor. Facing
 * +x into the wind, ground at y = 0; metres.
 */

const HUB_HEIGHT = 78;
const ROTOR_Y = HUB_HEIGHT + AXIS_Y;
const BLADE_X = 5.4;

/** Blade planform in (radius, chord): wide near the root, tapering to the tip. */
const BLADE = poly([
  [2.2, -0.9], [5, -1.4], [9, -1.9], [14, -1.7], [24, -1.25], [34, -0.85], [43, -0.45], [45, -0.15],
  [45, 0.2], [43, 0.4], [30, 0.75], [14, 1.05], [7, 1.0], [3.5, 0.95], [2.2, 0.9],
]);

function Rotor({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = windMotion.rotor; });
  return <group position={[BLADE_X, ROTOR_Y, 0]}><group ref={ref}>{children}</group></group>;
}

export function Turbine() {
  return (
    <group>
      <Part id="foundation">
        <Turn k="wt-foundation" profile={[[0, -3], [9, -3], [9, -1.5], [3, 0.4], [0, 0.4]]} seg={64} />
        <Callout id="foundation" p={[6, 0, 3]} />
      </Part>
      <Part id="tower">
        <Turn k="wt-tower" profile={[[2.1, 0.4], [2.15, 0.4], [1.35, HUB_HEIGHT - 0.4], [1.3, HUB_HEIGHT - 0.4]]} seg={48} />
        {[26, 52].map((y) => <Turn key={y} k={`wt-flange-${y}`} profile={[[1.4, 0], [2.0 - (y / HUB_HEIGHT) * 0.8 + 0.1, 0], [2.0 - (y / HUB_HEIGHT) * 0.8 + 0.1, 0.3], [1.4, 0.3]]} p={[0, y, 0]} seg={48} />)}
        <Cyl c={[2.0, 1.6, 0]} r={0.5} len={2.4} axis="x" seg={4} />
        <Callout id="tower" p={[1.6, 40, 1]} />
      </Part>
      <Part id="nacelle">
        <group position={[0, HUB_HEIGHT, 0]}><Nacelle /></group>
        <Callout id="nacelle" p={[-2, HUB_HEIGHT + 4, 1.5]} />
      </Part>
      <Part id="blades">
        <Rotor>
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[(i * Math.PI * 2) / 3, 0, 0]}>
              <Plate k="wt-blade" shape={BLADE} depth={0.5} p={[-0.25, 0, 0]} r={YZ_X} />
            </group>
          ))}
        </Rotor>
        <Callout id="blades" p={[BLADE_X, ROTOR_Y + 30, 1]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'foundation', index: 1, name: '基础', en: 'Foundation', role: '抗倾覆', material: '钢筋混凝土', description: '直径十几米、埋在地下的混凝土墩，靠自重压住整台风机，防止被风推倒。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'tower', index: 2, name: '塔筒', en: 'Tower', role: '把叶轮举高', material: '钢', description: '三段钢管用法兰螺栓连起来，约 78 米高；越高风越大越稳。里面有爬梯、电梯和电缆。底部是进出的门。', explode: [0, 0, 18], stage: [0.6, 0.85] },
  { id: 'nacelle', index: 3, name: '机舱', en: 'Nacelle', role: '传动 · 发电', material: '—', description: '齿轮箱、发电机、偏航系统都在里面，重约 70 吨。点“拆开此组件”进去看。', explode: [0, 14, 0], stage: [0.32, 0.58] },
  { id: 'blades', index: 4, name: '叶片 ×3', en: 'Blades', role: '捕获风能', material: '玻璃纤维 / 碳纤维', description: '每片约 45 米长，截面像飞机机翼：风吹过产生升力，推着叶轮转。叶尖速度可达每秒 70 多米。', explode: [26, 0, 0], stage: [0, 0.3] },
];

const STEPS: StepDef[] = [
  {
    title: '风力发电机', en: 'Wind Turbine',
    body: '风推着三片叶片转动，叶轮每分钟只转十几圈；机舱里的齿轮箱把转速提高约 99 倍带动发电机，一台每年能发约 500 万度电。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先吊下叶轮，再吊下机舱，最后一段段拆下塔筒。机舱、齿轮箱还可以再往里拆。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '全部展开', en: 'Everything',
    body: '打开“全部展开”，机舱会被拉到旁边拆开，里面的齿轮箱也一起拆开。',
    state: { explode: 1, section: false, running: false, select: 'nacelle', focus: null },
  },
];

export const wind: MachineDef = level({
  id: 'wind',
  unit: 0.1,
  bounds: [[-9, -3, -45], [12, 125, 45]],
  name: '风力发电机',
  en: 'Wind Turbine',
  subtitle: '整机 · 2 MW 级 · 可拆到齿轮箱',
  summary: '4 个大件，叶轮会转；机舱可拆，齿轮箱还能再拆',
  drawingNo: 'GW-FD-00',
  scale: '1 : 1000',
  parts: PARTS.map((p) => (p.id === 'nacelle' ? { ...p, deep: [30, -40, 0] } : p)),
  boltSets: {},
  neighbours: {},
  children: { nacelle: 'wind/nacelle' },
  guides: [{ stage: 'nacelle', origin: [0, HUB_HEIGHT, 0] }],
  centreLines: [[[0, -3, 0], [0, 84, 0], 2.2], [[-8, ROTOR_Y, 0], [14, ROTOR_Y, 0], 45]],
  steps: STEPS,
  camera: { target: [0, 62, 0], offset: [125, 38, 175], orthoDistance: 900, exploded: { target: [8, 66, 6], scale: 1.15 }, deep: { target: [20, 50, 4], scale: 1.2 } },
  Model: Turbine,
  Driver: WindDriver,
});

export const WIND_LEVELS: MachineDef[] = [nacelleLevel, windGearboxLevel];
