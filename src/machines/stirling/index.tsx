import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Rod, Turn } from '../kit';

/**
 * Gamma-type Stirling engine of the desk-model kind: a wide displacer
 * cylinder heated from below and cooled on top, a small power cylinder
 * beside it, both driven from one crankshaft with the displacer leading by
 * 90°. Millimetres; y up, crank axis along z.
 */

const CRANK: [number, number] = [0, 150];
const R_DISP = 9;
const R_POWER = 7;
const DISP_X = -32;
const POWER_X = 40;
const TOP = 72;

export const stirlingMotion = { theta: 0 };
export function StirlingDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) stirlingMotion.theta += Math.min(dt, 0.05) * 2.2; }, -1);
  return null;
}

/** Pins: displacer crank leads the power crank by 90°. */
function pins(theta: number) {
  const disp: [number, number] = [CRANK[0] + R_DISP * Math.cos(theta + Math.PI / 2), CRANK[1] + R_DISP * Math.sin(theta + Math.PI / 2)];
  const power: [number, number] = [CRANK[0] + R_POWER * Math.cos(theta), CRANK[1] + R_POWER * Math.sin(theta)];
  return { disp, power };
}

/** Slider below a pin on a vertical line at x, with a link of length L. */
const slider = (pin: [number, number], x: number, L: number) => pin[1] - Math.sqrt(L * L - (pin[0] - x) ** 2);

export function stirlingState(theta: number) {
  const p = pins(theta);
  const dispTop = slider(p.disp, DISP_X, 88);
  const powerY = slider(p.power, POWER_X, 62);
  return { ...p, dispTop, powerY };
}

function Track({ get, children }: { get: (s: ReturnType<typeof stirlingState>) => [number, number, number?]; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const [x, y, r] = get(stirlingState(stirlingMotion.theta));
    ref.current.position.set(x, y, 0);
    ref.current.rotation.z = r ?? 0;
  });
  return <group ref={ref}>{children}</group>;
}

/** Link between two moving points, drawn as a bar from one to the other. */
function Link({ from, to, z, r = 1.2 }: { from: (s: ReturnType<typeof stirlingState>) => [number, number]; to: (s: ReturnType<typeof stirlingState>) => [number, number]; z: number; r?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const s = stirlingState(stirlingMotion.theta);
    const a = from(s);
    const b = to(s);
    ref.current.position.set(a[0], a[1], z);
    ref.current.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ref.current.scale.x = Math.hypot(b[0] - a[0], b[1] - a[1]);
  });
  return (
    <group ref={ref}>
      <Box c={[0.5, 0, 0]} s={[1, r * 2, r * 1.4]} />
    </group>
  );
}

export function Stirling() {
  return (
    <group>
      <Part id="base">
        <Box c={[0, -6, 0]} s={[140, 8, 70]} />
        <Callout id="base" p={[50, -3, 30]} />
      </Part>
      <Part id="burner">
        <Turn k="st-burner" profile={[[0, -2], [14, -2], [14, 14], [9, 18], [0, 18]]} p={[DISP_X, 0, 0]} seg={40} />
        <Cyl c={[DISP_X, 22, 0]} r={2.4} len={8} seg={12} />
        <Callout id="burner" p={[DISP_X + 14, 10, 12]} />
      </Part>
      <Part id="hot">
        <Turn k="st-hot" profile={[[0, 30], [34, 30], [34, 32], [32, 32], [32, 70], [34, 70], [34, 72], [30, 72], [30, 33], [0, 33]]} p={[DISP_X, 0, 0]} seg={64} />
        {[1, -1].map((s) => <Box key={s} c={[DISP_X + s * 30, 15, 0]} s={[4, 30, 10]} />)}
        <Callout id="hot" p={[DISP_X - 34, 45, 10]} />
      </Part>
      <Part id="cold">
        <Turn k="st-cold" profile={[[3, TOP], [36, TOP], [36, TOP + 4], [3, TOP + 4]]} p={[DISP_X, 0, 0]} seg={64} />
        {Array.from({ length: 6 }, (_, i) => <Turn key={i} k="st-fin" profile={[[16, 0], [36, 0], [36, 1.5], [16, 1.5]]} p={[DISP_X, TOP + 6 + i * 3.2, 0]} seg={48} />)}
        <Callout id="cold" p={[DISP_X + 30, TOP + 18, 12]} />
      </Part>
      <Part id="displacer">
        <Track get={(s) => [DISP_X, s.dispTop - 27]}>
          <Turn k="st-displacer" profile={[[0, 0], [28, 0], [28, 18], [0, 18]]} seg={48} />
          <Cyl c={[0, 22.5, 0]} r={1.5} len={9} seg={10} />
          <Cyl c={[0, 27, 0]} r={2.2} len={3} axis="z" seg={12} />
        </Track>
        <Callout id="displacer" p={[DISP_X + 24, 52, 10]} />
      </Part>
      <Part id="power-cyl">
        <Turn k="st-power-cyl" profile={[[11, 74], [13, 74], [13, 112], [11, 112]]} p={[POWER_X, 0, 0]} seg={40} />
        <Rod a={[DISP_X + 30, TOP + 2, 0]} b={[POWER_X, 78, 0]} r={2.4} seg={12} />
        <Box c={[POWER_X, 92, -12]} s={[8, 40, 4]} />
        <Callout id="power-cyl" p={[POWER_X + 14, 96, 6]} />
      </Part>
      <Part id="piston">
        <Track get={(s) => [POWER_X, s.powerY]}>
          <Turn k="st-piston" profile={[[0, -10], [10.8, -10], [10.8, 2], [0, 2]]} seg={36} />
        </Track>
        <Callout id="piston" p={[POWER_X + 12, 104, 2]} />
      </Part>
      <Part id="rods">
        <Link from={(s) => [DISP_X, s.dispTop]} to={(s) => s.disp} z={-14} />
        <Link from={(s) => [POWER_X, s.powerY]} to={(s) => s.power} z={-8} />
        <Callout id="rods" p={[10, 130, 14]} />
      </Part>
      <Part id="crank">
        <Track get={() => [CRANK[0], CRANK[1], stirlingMotion.theta]}>
          <Cyl c={[0, 0, 0]} r={2.4} len={60} axis="z" seg={16} />
          <Box c={[R_POWER / 2, 0, -8]} s={[R_POWER + 6, 5, 2]} />
          <Cyl c={[R_POWER, 0, -8]} r={1.4} len={4} axis="z" seg={10} />
          <group rotation={[0, 0, Math.PI / 2]}>
            <Box c={[R_DISP / 2, 0, -14]} s={[R_DISP + 6, 5, 2]} />
            <Cyl c={[R_DISP, 0, -14]} r={1.4} len={4} axis="z" seg={10} />
          </group>
        </Track>
        <Box c={[CRANK[0], (CRANK[1] + TOP + 20) / 2, 16]} s={[8, CRANK[1] - TOP - 20, 4]} />
        <Callout id="crank" p={[CRANK[0] - 10, CRANK[1] + 8, 18]} />
      </Part>
      <Part id="flywheel">
        <Track get={() => [CRANK[0], CRANK[1], stirlingMotion.theta]}>
          <Turn k="st-flywheel" profile={[[2.4, -3], [8, -3], [8, -1], [34, -1], [34, -4], [40, -4], [40, 4], [34, 4], [34, 1], [8, 1], [8, 3], [2.4, 3]]} p={[0, 0, -26]} axis="z" seg={64} />
          {[0, 1, 2, 3, 4, 5].map((i) => <group key={i} rotation={[0, 0, (i * Math.PI) / 3]}><Box c={[21, 0, -26]} s={[26, 3, 2]} /></group>)}
        </Track>
        <Callout id="flywheel" p={[CRANK[0] + 36, CRANK[1] + 30, -26]} />
      </Part>
    </group>
  );
}

const PHASES = ['受热膨胀', '去冷端', '冷却收缩', '回热端'];

/** Where the gas is in the cycle. */
export function StirlingControls() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = ((stirlingMotion.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      setPhase(Math.floor(t / (Math.PI / 2)));
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="strokes" aria-live="off">
      {PHASES.map((p, i) => <span key={p} className={i === phase ? 'is-on' : ''}>{p}</span>)}
    </div>
  );
}

const PARTS: PartDef[] = [
  { id: 'base', index: 1, name: '底座', en: 'Base', role: '安装', material: '木 / 铝', description: '托起整台机器。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'burner', index: 2, name: '酒精灯', en: 'Spirit Burner', role: '热源', material: '玻璃 / 黄铜', description: '外部燃烧：火焰在缸外面加热，所以斯特林机可以用任何热源——阳光、余热、甚至手掌的温度。', explode: [0, -20, 40], stage: [0, 0.12] },
  { id: 'hot', index: 3, name: '热缸', en: 'Hot Cylinder', role: '受热端', material: '不锈钢', description: '大缸的底部被火加热，里面的空气在这里受热膨胀。', explode: [0, -30, -40], stage: [0.56, 0.7] },
  { id: 'cold', index: 4, name: '冷端与散热片', en: 'Cold Plate & Fins', role: '散热端', material: '铝', description: '缸顶的铝板和散热片把热量散到空气里，空气到这里就冷却收缩。冷热温差越大，机器转得越有劲。', explode: [0, 40, 0], stage: [0.4, 0.52] },
  { id: 'displacer', index: 5, name: '置换活塞', en: 'Displacer', role: '赶着空气在冷热两端之间跑', material: '轻质泡沫 / 铝', description: '比缸径小一圈、很轻的大活塞，它不做功，只负责把空气推来推去：它往上走，空气被挤到下面受热；它往下走，空气被挤到上面冷却。', explode: [0, 24, 50], stage: [0.5, 0.62] },
  { id: 'power-cyl', index: 6, name: '动力缸', en: 'Power Cylinder', role: '与热缸连通', material: '玻璃 / 黄铜', description: '一根细管把它和大缸连通，两个缸里是同一团空气。', explode: [30, 0, 0], stage: [0.28, 0.4] },
  { id: 'piston', index: 7, name: '动力活塞', en: 'Power Piston', role: '输出功', material: '石墨', description: '空气受热膨胀时把它往上推（做功），冷却收缩时又把它吸回来。', explode: [30, 30, 0], stage: [0.2, 0.32] },
  { id: 'rods', index: 8, name: '连杆', en: 'Connecting Rods', role: '连到曲柄', material: '钢', description: '两根连杆把两个活塞挂到同一根曲轴上。', explode: [0, 20, 40], stage: [0.12, 0.24] },
  { id: 'crank', index: 9, name: '曲轴', en: 'Crankshaft', role: '定相位', material: '钢', description: '两个曲拐互相错开 90°：置换活塞总比动力活塞领先四分之一圈——先把空气送到热端，动力活塞才被推上去。', explode: [0, 40, 30], stage: [0.62, 0.78] },
  { id: 'flywheel', index: 10, name: '飞轮', en: 'Flywheel', role: '储能', material: '黄铜', description: '只有膨胀那一段在出力，飞轮靠惯性带着机器度过其余三段。', explode: [0, 30, -40], stage: [0.7, 0.86] },
];

const STEPS: StepDef[] = [
  {
    title: '斯特林发动机', en: 'Stirling Engine',
    body: '没有爆炸、没有气门：同一团空气被反复加热和冷却。热了膨胀推动活塞，冷了收缩把活塞吸回。左栏显示空气此刻在做什么。',
    state: { explode: 0, section: true, running: true, select: 'displacer', focus: null },
  },
  {
    title: '90° 的秘密', en: 'The Phase',
    body: '盯住两个活塞：置换活塞先动，把空气赶到热端；四分之一圈后动力活塞才被推上去。如果两者同步，机器就转不起来。',
    state: { explode: 0, section: true, running: true, select: 'crank', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '移开酒精灯，拆连杆、动力活塞和动力缸，卸下冷端，抽出置换活塞，再拆热缸、曲轴和飞轮。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const stirling: MachineDef = level({
  id: 'stirling',
  unit: 0.07,
  bounds: [[-70, -10, -35], [70, 190, 35]],
  name: '斯特林发动机',
  en: 'Stirling Engine (γ type)',
  subtitle: '装配体 · 外燃 · 置换活塞领先 90°',
  summary: '10 种零件 · 加热膨胀、冷却收缩，会转',
  drawingNo: 'GW-ST-00',
  scale: '1 : 2',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'displacer', origin: [DISP_X, 40, 0] }],
  centreLines: [[[DISP_X, -4, 0], [DISP_X, 95, 0], 34], [[POWER_X, 70, 0], [POWER_X, 118, 0], 13]],
  steps: STEPS,
  camera: { target: [0, 92, 0], offset: [200, 150, 370], orthoDistance: 900, exploded: { target: [0, 95, 10], scale: 1.4 } },
  Model: Stirling,
  Driver: StirlingDriver,
  Controls: StirlingControls,
});
