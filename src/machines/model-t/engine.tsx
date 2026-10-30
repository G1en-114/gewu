import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { coil, gearShape, webShape } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { BoltSetDef, PartDef, StepDef } from '../types';
import { ArcTurn, Box, Cyl, Fastener, level, Pipe, Plate, poly, Rod, roundFrame, roundRect, Turn, XZ_Y, YZ_X } from './kit';
import { PistonRod, pistonAngles } from './piston';
import { Transmission } from './transmission';

/**
 * Model T power plant: 177 cu in four-cylinder side-valve engine with the
 * flywheel magneto and planetary transmission in one oil pan. Crank axis
 * along x at the origin, front toward +x, valves on the right (+z). Inches.
 */

const DECK = 11.55;
const HEAD_TOP = DECK + 1.9;
export const CYL_X = [6.75, 2.25, -2.25, -6.75];
const THROW = [0, Math.PI, Math.PI, 0];
const VZ = 3.4;
const CAM: [number, number] = [4.2, VZ];

/** Valves front to rear, with their cylinder and whether exhaust. */
const VALVES = [
  [7.7, 0, true], [5.8, 0, false], [3.2, 1, false], [1.3, 1, true],
  [-1.3, 2, true], [-3.2, 2, false], [-5.8, 3, false], [-7.7, 3, true],
] as const;
/** Power stroke starts (crank angle) per cylinder: firing order 1-2-4-3. */
const FIRE = [0, Math.PI, 3 * Math.PI, 2 * Math.PI];
const lobePhase = ([, cyl, exhaust]: (typeof VALVES)[number]) => (FIRE[cyl] + (exhaust ? 1.5 : 2.5) * Math.PI) / 2;

export const engineMotion = { theta: 0 };

export function EngineDriver() {
  useFrame((_, rawDt) => {
    if (!useStudio.getState().running) return;
    engineMotion.theta += Math.min(rawDt, 0.05) * 3.2;
    THROW.forEach((t, i) => { pistonAngles[i] = engineMotion.theta + t; });
  }, -1);
  return null;
}

/** Spins a group about x with the crank (times a ratio, plus a phase). */
function useSpin(ratio = 1, phase = 0) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = engineMotion.theta * ratio + phase; });
  return ref;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function Valve({ v }: { v: (typeof VALVES)[number] }) {
  const ref = useRef<THREE.Group>(null);
  const phase = lobePhase(v);
  useFrame(() => {
    const a = wrap(-engineMotion.theta / 2 + phase);
    const bump = Math.abs(a) < 1.2 ? Math.cos((a / 1.2) * (Math.PI / 2)) ** 2 : 0;
    if (ref.current) ref.current.position.y = 0.2 * bump;
  });
  const x = v[0];
  return (
    <group ref={ref}>
      <Turn k="valve-head" profile={[[0, 0], [0.75, 0], [0.6, 0.2], [0, 0.2]]} p={[x, DECK - 0.22, VZ]} seg={32} />
      <Cyl c={[x, (6.1 + DECK - 0.2) / 2, VZ]} r={0.155} len={DECK - 6.3} seg={12} />
      <M clip geo={coil('mt-valve-spring', 0.45, 0.07, 2.2, 7)} p={[x, 6.4, VZ]} />
      <Cyl c={[x, 6.35, VZ]} r={0.5} len={0.1} seg={20} />
      <Cyl c={[x, 5.35, VZ]} r={0.24} len={1.2} seg={16} />
    </group>
  );
}

function Crank() {
  const spin = useSpin();
  return (
    <group ref={spin}>
      {CYL_X.map((x, i) => (
        <group key={x} rotation={[THROW[i], 0, 0]}>
          <Cyl c={[x, 2, 0]} r={0.625} len={1.1} axis="x" seg={24} />
          <Plate k="crank-web" shape={() => webShape(1.0, 0.85, 2)} depth={0.5} p={[x - 1.05, 0, 0]} r={YZ_X} />
          <Plate k="crank-web" shape={() => webShape(1.0, 0.85, 2)} depth={0.5} p={[x + 0.55, 0, 0]} r={YZ_X} />
        </group>
      ))}
      {[[8.55, 1.5], [4.5, 2.4], [0, 2.4], [-4.5, 2.4], [-8.55, 1.5], [10.95, 3.3]].map(([x, len]) => (
        <Cyl key={x} c={[x, 0, 0]} r={x > 10 ? 0.55 : 0.625} len={len} axis="x" seg={24} />
      ))}
      <Plate k="crank-gear" shape={() => gearShape(20, 1.8, 0.1, 0.55)} depth={1.0} p={[9.8, 0, 0]} r={YZ_X} />
      <Turn k="pulley" profile={[[0.55, 0], [1.9, 0], [1.9, 0.15], [1.5, 0.35], [1.9, 0.55], [1.9, 0.7], [0.55, 0.7]]} p={[11.7, 0, 0]} axis="x" />
      <Turn k="crank-flange" profile={[[0.6, 0], [2.0, 0], [2.0, 1.7], [0.6, 1.7]]} p={[-9.3, 0, 0]} axis="-x" />
    </group>
  );
}

function Cam() {
  const spin = useSpin(-0.5);
  return (
    <group position={[0, CAM[0], CAM[1]]}>
      <group ref={spin}>
        <Cyl c={[0.9, 0, 0]} r={0.4} len={20.6} axis="x" seg={20} />
        {VALVES.map((v) => (
          <group key={v[0]} rotation={[lobePhase(v), 0, 0]}>
            <Plate k="cam-lobe" shape={() => webShape(0.55, 0.3, 0.45)} depth={0.5} p={[v[0] - 0.25, 0, 0]} r={YZ_X} />
          </group>
        ))}
        <Plate k="cam-gear" shape={() => gearShape(40, 3.6, 0.1, 0.4)} depth={0.9} p={[9.8, 0, 0]} r={YZ_X} />
      </group>
    </group>
  );
}

/** Plan outline of block and head (x, −z), valve chest on the right. */
const PLAN: Array<[number, number]> = [[-9.6, -5.2], [9.6, -5.2], [9.6, 2.7], [-9.6, 2.7]];
const BORES: Array<[number, number, number]> = CYL_X.map((x) => [x, 0, 1.875]);
const PORTS: Array<[number, number, number]> = VALVES.map(([x]) => [x, -VZ, 0.62]);
const HEAD_BOLTS = [-8.9, -4.5, 0, 4.5, 8.9].flatMap((x) => [-2.2, 1.6, 4.5].map((z) => [x, z] as const));

/** U-section of the engine oil pan in (y, z). */
const PAN_U: Array<[number, number]> = [
  [0, -4.9], [-3.6, -4.3], [-4.6, -2.5], [-4.6, 2.5], [-3.6, 4.3], [0, 4.9],
  [0, 4.75], [-3.45, 4.15], [-4.45, 2.45], [-4.45, -2.45], [-3.45, -4.15], [0, -4.75],
];
const PAN_OUTER = PAN_U.slice(0, 6);
const BELL: Array<[number, number]> = [[8.6, 0], [8.75, 0], [8.75, 13.6], [8.6, 13.6]];
const FAN: [number, number, number] = [12.3, 10.8, 0];

export function Engine() {
  const flywheel = useSpin();
  const transmission = useSpin();
  const fan = useSpin(1.6);
  return (
    <group>
      <Part id="block">
        <Plate k="block-top" shape={poly(PLAN, [...BORES, ...PORTS])} depth={DECK - 5.0} p={[0, 5.0, 0]} r={XZ_Y} />
        <Plate k="crankcase" shape={roundFrame(-9.6, -4.6, 9.6, 4.6, 0.6, 0.4)} depth={5.0} r={XZ_Y} />
        <Plate k="block-lip" shape={roundFrame(-9.9, -5.2, 9.9, 5.2, 0.6, 0.6)} depth={0.4} r={XZ_Y} />
        {[-8.9, 0, 8.9].map((x) => <Box key={x} c={[x, 2.85, 0]} s={[0.6, 4.3, 8.4]} />)}
        <Cyl c={[5, 8, -3.3]} r={0.8} len={1.2} axis="-z" />
        <Callout id="block" p={[-5, 8.5, -2.7]} />
      </Part>
      <Part id="head">
        <Plate k="head" shape={poly(PLAN)} depth={1.85} p={[0, DECK + 0.05, 0]} r={XZ_Y} />
        {CYL_X.map((x) => (
          <group key={x}>
            <Cyl c={[x, HEAD_TOP + 0.3, 0.2]} r={0.42} len={0.6} seg={6} />
            <Cyl c={[x, HEAD_TOP + 1.25, 0.2]} r={0.28} len={1.3} seg={16} />
          </group>
        ))}
        <Cyl c={[7.0, HEAD_TOP + 0.7, 0.8]} r={1.1} len={1.4} />
        <Rod a={[7.0, HEAD_TOP + 1.2, 0.8]} b={[10.8, HEAD_TOP + 2.0, 0.8]} r={0.9} />
        {HEAD_BOLTS.map(([x, z]) => <Fastener key={`${x}:${z}`} p={[x, HEAD_TOP, z]} set="head-bolts" d={0.45} len={3} />)}
        <Callout id="head" p={[-3, HEAD_TOP + 0.4, -2]} />
      </Part>
      <Part id="gasket">
        <Plate k="gasket" shape={poly(PLAN, [...BORES, ...PORTS])} depth={0.05} p={[0, DECK, 0]} r={XZ_Y} />
        <Callout id="gasket" p={[-9, DECK, 2]} />
      </Part>
      <Part id="crank">
        <Crank />
        <Callout id="crank" p={[-4.5, -1, 2]} />
      </Part>
      <Part id="pistons">
        {CYL_X.map((x, i) => (
          <group key={x} position={[x, 0, 0]}>
            <PistonRod cylinder={i} />
          </group>
        ))}
        <Callout id="pistons" p={[2.25, 9, -1.5]} />
      </Part>
      <Part id="cam">
        <Cam />
        <Callout id="cam" p={[-6, CAM[0], CAM[1] + 0.6]} />
      </Part>
      <Part id="valves">
        {VALVES.map((v) => <Valve key={v[0]} v={v} />)}
        <Callout id="valves" p={[-3.2, 9, VZ]} />
      </Part>
      <Part id="doors">
        {[-4.65, 4.65].map((x) => (
          <group key={x}>
            <Box c={[x, 7.8, 5.27]} s={[8.7, 3.6, 0.15]} />
            {[-2.2, 2.2].map((dx) => <Fastener key={dx} p={[x + dx, 7.8, 5.35]} dir="z" set="door-nuts" d={0.3} len={0.8} />)}
          </group>
        ))}
        <Callout id="doors" p={[4.65, 7.8, 5.4]} />
      </Part>
      <Part id="timing">
        <Plate k="timing-rim" shape={roundFrame(-2.4, -2.4, 8.3, 7.5, 2.4, 0.18)} depth={1.2} p={[9.7, 0, 0]} r={YZ_X} />
        <Plate k="timing-face" shape={roundRect(-2.4, -2.4, 8.3, 7.5, 2.4, [[0, 0, 0.7]])} depth={0.3} p={[10.9, 0, 0]} r={YZ_X} />
        <Cyl c={[11.8, CAM[0], CAM[1]]} r={1.4} len={1.2} axis="x" />
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          return <Cyl key={i} c={[12.6, CAM[0] + Math.cos(a), CAM[1] + Math.sin(a)]} r={0.14} len={0.5} axis="x" seg={8} />;
        })}
        <Callout id="timing" p={[11.2, 7, 6]} />
      </Part>
      <Part id="pan">
        <Plate k="pan" shape={poly(PAN_U)} depth={19.8} p={[-9.9, 0, 0]} r={YZ_X} />
        <Plate k="pan-front" shape={poly(PAN_OUTER)} depth={0.15} p={[9.75, 0, 0]} r={YZ_X} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Box c={[0, -0.05, s * 5.05]} s={[19.8, 0.1, 0.7]} />
            <Box c={[-16.7, -0.05, s * 9.05]} s={[13.6, 0.1, 0.6]} />
          </group>
        ))}
        <ArcTurn k="bell-low" profile={BELL} p={[-23.5, 0, 0]} axis="x" phi0={0} phiLen={Math.PI} />
        <ArcTurn k="bell-low-back" profile={[[1.6, 0], [8.75, 0], [8.75, 0.15], [1.6, 0.15]]} p={[-23.65, 0, 0]} axis="x" phi0={0} phiLen={Math.PI} />
        <ArcTurn k="bell-low-front" profile={[[4.9, 0], [8.75, 0], [8.75, 0.15], [4.9, 0.15]]} p={[-10.05, 0, 0]} axis="x" phi0={0} phiLen={Math.PI} />
        <Callout id="pan" p={[-16, -8, 3]} />
      </Part>
      <Part id="flywheel">
        <group ref={flywheel}>
          <Turn k="flywheel" profile={[[2.0, 0], [8.0, 0], [8.0, 1.4], [2.0, 1.4]]} p={[-11.0, 0, 0]} axis="-x" seg={64} />
          {Array.from({ length: 16 }, (_, i) => (
            <group key={i} rotation={[(i / 16) * Math.PI * 2, 0, 0]}>
              <Box c={[-10.65, 6.6, 0]} s={[0.6, 1.3, 1.9]} />
            </group>
          ))}
        </group>
        <Callout id="flywheel" p={[-11.6, 7.4, 3]} />
      </Part>
      <Part id="coil">
        <Turn k="coil-ring" profile={[[5.6, 0], [7.8, 0], [7.8, 0.3], [5.6, 0.3]]} p={[-9.75, 0, 0]} axis="-x" seg={64} />
        {Array.from({ length: 16 }, (_, i) => (
          <group key={i} rotation={[((i + 0.5) / 16) * Math.PI * 2, 0, 0]}>
            <Box c={[-10.18, 6.6, 0]} s={[0.26, 1.0, 1.4]} />
          </group>
        ))}
        <Callout id="coil" p={[-9.9, 7.2, -4]} />
      </Part>
      <Part id="transmission">
        <group position={[-12.4, 0, 0]}>
          <group ref={transmission}>
            <Transmission />
          </group>
        </group>
        <Callout id="transmission" p={[-18, 4, 2]} />
      </Part>
      <Part id="cover">
        <ArcTurn k="bell-up" profile={BELL} p={[-23.5, 0, 0]} axis="x" phi0={Math.PI} phiLen={Math.PI} />
        <ArcTurn k="bell-up-back" profile={[[1.6, 0], [8.75, 0], [8.75, 0.15], [1.6, 0.15]]} p={[-23.65, 0, 0]} axis="x" phi0={Math.PI} phiLen={Math.PI} />
        {[-1, 1].map((s) => <Box key={s} c={[-16.7, 0.05, s * 9.05]} s={[13.6, 0.1, 0.6]} />)}
        <Box c={[-15, 9.0, 0]} s={[4, 1.6, 6]} />
        <Box c={[-12, 8.85, 0]} s={[2.4, 0.3, 4]} />
        {[-1.6, 0, 1.6].map((z) => (
          <group key={z}>
            <Rod a={[-15, 9.5, z]} b={[-20.5, 15.5, z]} r={0.3} />
            <Box c={[-20.8, 15.8, z]} s={[2.2, 0.3, 1.3]} r={[0, 0, 0.75]} />
          </group>
        ))}
        {[-11.5, -16.7, -21.9].flatMap((x) => [-1, 1].map((s) => (
          <Fastener key={`${x}:${s}`} p={[x, 0.1, s * 9.05]} set="cover-bolts" d={0.3} len={0.6} />
        )))}
        <Callout id="cover" p={[-20.5, 16, -1.6]} />
      </Part>
      <Part id="manifolds">
        <Rod a={[-8.5, 10.6, 6.6]} b={[8.5, 10.6, 6.6]} r={0.85} />
        {[7.7, 1.3, -1.3, -7.7].map((x) => <Rod key={x} a={[x, 10.6, 5.2]} b={[x, 10.6, 6.6]} r={0.65} />)}
        <Pipe k="exhaust-outlet" pts={[[0.5, 10.6, 7.2], [0.5, 8.6, 8.5], [0.5, 6.6, 8.8]]} r={0.75} />
        <Rod a={[-5, 8.6, 7.6]} b={[5, 8.6, 7.6]} r={0.55} />
        {[-4.5, 4.5].map((x) => <Rod key={x} a={[x, 8.6, 7.6]} b={[x, 10.3, 5.2]} r={0.5} />)}
        <Rod a={[0, 8.6, 7.6]} b={[0, 7.6, 7.6]} r={0.55} />
        <Callout id="manifolds" p={[-6, 11, 7]} />
      </Part>
      <Part id="carb">
        <Cyl c={[0, 6.7, 7.6]} r={0.85} len={1.8} />
        <Cyl c={[0, 5.2, 7.6]} r={1.05} len={1.2} />
        <Cyl c={[0, 6.7, 8.9]} r={0.55} len={1.2} axis="z" />
        <Box c={[0.9, 7.2, 7.6]} s={[0.8, 0.2, 0.3]} />
        <Callout id="carb" p={[0, 5, 8.6]} />
      </Part>
      <Part id="fan">
        <Cyl c={FAN} r={0.7} len={0.8} axis="x" />
        <Cyl c={[11.8, FAN[1], 0]} r={1.4} len={0.55} axis="x" />
        <group position={FAN}>
          <group ref={fan}>
            {[0, 1, 2, 3].map((i) => (
              <group key={i} rotation={[(i * Math.PI) / 2 + Math.PI / 4, 0, 0]}>
                <Box c={[0, 2.9, 0]} s={[0.15, 4.2, 1.6]} r={[0, 0.35, 0]} />
              </group>
            ))}
          </group>
        </group>
        <Rod a={[11.95, 0, 1.9]} b={[11.95, FAN[1], 1.4]} r={0.12} />
        <Rod a={[11.95, 0, -1.9]} b={[11.95, FAN[1], -1.4]} r={0.12} />
        <Box c={[10.6, FAN[1], 0]} s={[2.4, 0.6, 0.8]} />
        <Callout id="fan" p={[12.4, 15, 1]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'block', index: 1, name: '气缸体', en: 'Cylinder Block', role: '骨架', material: '灰铸铁', description: '四个气缸和上半个曲轴箱铸成一整块——T 型车是最早大批量采用整体铸造缸体的汽车之一。右侧是装气门的气门室。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'head', index: 2, name: '气缸盖', en: 'Cylinder Head', role: '燃烧室顶', material: '灰铸铁', description: '可拆的平顶缸盖，四个火花塞拧在上面，前端的出水口通散热器。侧置气门发动机的燃烧室偏向气门一侧。', explode: [0, 17, 0], stage: [0.37, 0.46] },
  { id: 'gasket', index: 3, name: '气缸垫', en: 'Head Gasket', role: '密封', material: '铜皮夹石棉', description: '夹在缸体和缸盖之间，封住燃气和冷却水。', explode: [0, 15, 0], stage: [0.42, 0.5] },
  { id: 'crank', index: 4, name: '曲轴', en: 'Crankshaft', role: '输出转矩', material: '钒钢锻件', description: '三道主轴颈，曲拐 1、4 缸朝一边，2、3 缸朝另一边。前端是正时齿轮和风扇皮带轮，后端法兰装飞轮。', explode: [0, -6.5, 0], stage: [0.88, 0.97] },
  { id: 'pistons', index: 5, name: '活塞连杆组', en: 'Pistons & Rods', role: '往复 → 旋转', material: '铸铁 / 钢', description: '四组相同的活塞连杆。点火顺序 1-2-4-3，曲轴每转半圈有一个缸做功。', explode: [0, 14, 0], stage: [0.56, 0.66], deep: [0, 0, 26] },
  { id: 'cam', index: 6, name: '凸轮轴', en: 'Camshaft', role: '控制气门', material: '钢', description: '8 个凸轮对应 8 个气门，由曲轴前端的正时齿轮按 2 : 1 带动。前端还带着点火分配器（定时器）。', explode: [16, 0, 0], stage: [0.68, 0.76] },
  { id: 'valves', index: 7, name: '气门组', en: 'Valves & Springs', role: '进气 · 排气', material: '钢', description: '8 个气门头朝上排在缸体右侧（侧置气门，L 型燃烧室）。凸轮顶起挺杆和气门，弹簧再把它压回去。', explode: [0, 8, 0], stage: [0.62, 0.7] },
  { id: 'doors', index: 8, name: '气门室盖', en: 'Valve Covers', role: '封住气门室', material: '钢板', description: '缸体右侧两块盖板，打开就能看到气门弹簧和挺杆，调气门间隙从这里下手。', explode: [0, 0, 6], stage: [0.28, 0.36] },
  { id: 'timing', index: 9, name: '正时齿轮盖', en: 'Timing Cover & Timer', role: '罩住正时齿轮', material: '铸铁', description: '罩住曲轴和凸轮轴的一对正时齿轮。前面那个圆盒是定时器（分电盘），按顺序把电送到四个点火线圈。', explode: [9, 0, -9], stage: [0.46, 0.54] },
  { id: 'pan', index: 10, name: '油底壳', en: 'Oil Pan', role: '储油 · 下半壳', material: '冲压钢板', description: '一整块冲压钢板，从发动机一直延伸到变速器后端，下面兜着机油，飞轮转动时把油甩向各处润滑。', explode: [0, -10, 0], stage: [0.5, 0.58] },
  { id: 'flywheel', index: 11, name: '飞轮与磁铁', en: 'Flywheel & Magnets', role: '储能 · 发电', material: '铸铁 / 磁钢', description: '飞轮前面装着 16 块 V 形永磁铁，转动时扫过固定的线圈发出交流电，供点火（和后来的车灯）使用——这就是飞轮磁电机。后面的三根销装三联齿轮。', explode: [-8, 0, 0], stage: [0.78, 0.86] },
  { id: 'coil', index: 12, name: '磁电机线圈', en: 'Magneto Coil Ring', role: '发电', material: '铜线 / 铁芯', description: '固定在缸体后面的一圈 16 个线圈，和飞轮上的磁铁只隔约 1/32 英寸。', explode: [-4.5, 0, 0], stage: [0.84, 0.9] },
  { id: 'transmission', index: 13, name: '行星变速器', en: 'Planetary Transmission', role: '变速 · 制动', material: '钢 / 铸铁', description: '紧接在飞轮后面，和发动机共用一个油底壳。点“拆开此组件”看三联齿轮和三个鼓。', explode: [-14, 0, 0], stage: [0.72, 0.8], deep: [-6, 0, 26] },
  { id: 'cover', index: 14, name: '变速器盖与踏板', en: 'Transmission Cover & Pedals', role: '操纵', material: '铸铝 / 钢', description: '变速器上半壳，三个踏板从这里伸到驾驶员脚下：左边离合（踩一半空挡、踩到底低速）、中间倒档、右边制动。', explode: [0, 14, 0], stage: [0.2, 0.3] },
  { id: 'manifolds', index: 15, name: '进排气歧管', en: 'Manifolds', role: '进气 · 排气', material: '铸铁', description: '都在发动机右侧：上面粗的是排气歧管，下面细的是进气歧管，化油器挂在它下方。', explode: [0, 2, 9], stage: [0.1, 0.2] },
  { id: 'carb', index: 16, name: '化油器', en: 'Carburettor', role: '混合燃油', material: '黄铜 / 铸铁', description: '浮子式化油器，燃油靠重力从座椅下的油箱流来。', explode: [0, -3, 8], stage: [0.05, 0.13] },
  { id: 'fan', index: 17, name: '风扇', en: 'Fan & Belt', role: '散热', material: '钢', description: '曲轴前端皮带带动，把空气抽过散热器。T 型车没有水泵，冷却水靠冷热对流循环（热虹吸）。', explode: [9, 6, 0], stage: [0, 0.08] },
];

const BOLT_SETS: Record<string, BoltSetDef> = {
  'cover-bolts': { owner: 'cover', distance: 3, stage: [0.15, 0.2] },
  'door-nuts': { owner: 'doors', distance: 2, stage: [0.25, 0.29] },
  'head-bolts': { owner: 'head', distance: 4, stage: [0.32, 0.38] },
};

const STEPS: StepDef[] = [
  {
    title: '动力总成', en: 'Power Plant',
    body: '2.9 升直列四缸侧置气门发动机，缸径 3¾、行程 4 英寸，约 20 马力。飞轮磁电机和行星变速器都装在发动机后面的同一个油底壳里。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '沿气缸中心剖开：四个活塞上下运动，1、4 缸和 2、3 缸方向相反；后面是飞轮、磁电机线圈和变速器。',
    state: { explode: 0, section: true, running: true, select: 'pistons', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆风扇、化油器、歧管和变速器盖，再拆缸盖、取活塞和气门，抽出凸轮轴，向后取下变速器、飞轮和线圈，最后放下曲轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const engineLevel = level({
  id: 'model-t/engine',
  parent: 'model-t',
  unit: 0.25,
  bounds: [[-24.4, -8.75, -8.75], [12.7, 15.8, 9.5]],
  name: '动力总成',
  en: 'Engine & Transmission',
  subtitle: '子组件 · 177 立方英寸直列四缸 · 侧置气门',
  summary: '17 种零件：缸体、缸盖、曲轴、活塞、凸轮轴、飞轮磁电机、变速器…',
  drawingNo: 'GW-T-10',
  scale: '1 : 4',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: {},
  children: { pistons: 'model-t/piston', transmission: 'model-t/transmission' },
  guides: [
    { stage: 'head', origin: [0, HEAD_TOP, 0] },
    { stage: 'pistons', origin: [-2.25, DECK - 2, 0] },
    { stage: 'cam', origin: [10.7, CAM[0], CAM[1]] },
    { stage: 'transmission', origin: [-12.4, 0, 0] },
    { stage: 'pan', origin: [0, -4.6, 0] },
  ],
  centreLines: [[[-26, 0, 0], [15, 0, 0], 8.2], ...CYL_X.map((x): [[number, number, number], [number, number, number], number] => [[x, -1, 0], [x, HEAD_TOP + 1, 0], 2.1])],
  steps: STEPS,
  camera: { target: [-5, 3.5, 0], offset: [62, 48, 92], orthoDistance: 380, exploded: { target: [-4, 6, 0], scale: 1.5 }, deep: { target: [-12, 4, 14], scale: 1.9 } },
  Model: Engine,
  Driver: EngineDriver,
});

