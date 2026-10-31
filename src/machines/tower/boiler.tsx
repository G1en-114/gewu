import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, dome, level, Pipe, Plate, Rod, roundRect, Turn, tube } from '../kit';
import { boxes, type P3 } from '../b747/geo';
import { TowerControls } from './controls';
import { TowerDriver, towerMotion } from './motion';
import { Geo, rivetLine, rivetRing, Slide, SpinX, SpinZ } from './shared';

/**
 * 锅炉房: a locomotive-type fire-tube boiler on the ground floor. Coal burns
 * on the grate in the firebox; the hot gas runs forward through nineteen
 * fire tubes inside the water-filled barrel into the smokebox and up the
 * chimney. Steam collects in the dome and leaves for the engine; two spring
 * safety valves, a gauge glass and a pressure gauge keep it in bounds, and a
 * duplex pump feeds water back. Barrel along x; origin at the floor centre; metres.
 */

const AXIS_Y = 0.78;
const BARREL = { x0: -0.6, x1: 0.9, r: 0.48, t: 0.02 };
const FIREBOX = { x0: -1.38, x1: -0.6, z: 0.5, y0: 0.05, y1: 1.2 };
const SMOKE = { x0: 0.9, x1: 1.28, r: 0.5 };
const DOME_X = 0.2;

/** Gauge pressure (bar) shown by the dial, from engine speed: 4, 6, 8 bar at 22.5, 45, 90 r/min. */
export const boilerPressure = () => 4 + 2 * Math.log2(Math.max(1, towerMotion.crankRate * 60) / 22.5);

/** Fire-tube layout: 19 tubes in the lower part of the barrel. */
const TUBES: Array<[number, number]> = (() => {
  const out: Array<[number, number]> = [];
  for (let row = 0; row < 4; row += 1) {
    const y = -0.3 + row * 0.11;
    const n = [4, 5, 5, 5][row];
    for (let k = 0; k < n; k += 1) out.push([y, (k - (n - 1) / 2) * 0.11]);
  }
  return out;
})();

/** Scales its children in y with a flicker (the flames). */
function Flicker({ seed, children }: { seed: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const t = towerMotion.clock * 7 + seed * 2.3;
    ref.current.scale.y = 0.75 + 0.25 * Math.sin(t) * Math.sin(t * 0.61 + seed);
  });
  return <group ref={ref}>{children}</group>;
}

const firebrick = boxes('tw-bo-grate', () => Array.from({ length: 9 }, (_, i) => ({ c: [FIREBOX.x0 + 0.1 + i * 0.075, 0.32, 0] as P3, s: [0.04, 0.03, 2 * FIREBOX.z - 0.1] as P3 })));

export function Boiler() {
  return (
    <group>
      <Part id="saddles">
        {[-0.3, 0.6].map((x) => (
          <Plate key={x} k="tw-bo-saddle" shape={roundRect(-0.42, 0, 0.42, AXIS_Y - BARREL.r + 0.1, 0.03)} depth={0.08} p={[x - 0.04, 0, 0]} r={[0, Math.PI / 2, 0]} />
        ))}
        <Box c={[0, 0.02, 0]} s={[2.8, 0.04, 1.1]} />
        <Callout id="saddles" p={[0.6, 0.2, 0.42]} />
      </Part>

      <Part id="firebox">
        <Box c={[FIREBOX.x0 + 0.02, (FIREBOX.y0 + FIREBOX.y1) / 2, 0]} s={[0.04, FIREBOX.y1 - FIREBOX.y0, 2 * FIREBOX.z]} />
        {[-1, 1].map((s) => <Box key={s} c={[(FIREBOX.x0 + FIREBOX.x1) / 2, (FIREBOX.y0 + FIREBOX.y1) / 2, s * (FIREBOX.z - 0.02)]} s={[FIREBOX.x1 - FIREBOX.x0, FIREBOX.y1 - FIREBOX.y0, 0.04]} />)}
        <Box c={[(FIREBOX.x0 + FIREBOX.x1) / 2, FIREBOX.y1 - 0.02, 0]} s={[FIREBOX.x1 - FIREBOX.x0, 0.04, 2 * FIREBOX.z]} />
        <Box c={[FIREBOX.x1 - 0.02, AXIS_Y - BARREL.r / 2 - 0.15, 0]} s={[0.04, 0.5, 2 * FIREBOX.z]} />
        <Geo g={rivetLine('bo-fb-top', [FIREBOX.x0 + 0.04, FIREBOX.y1, FIREBOX.z], [FIREBOX.x1, FIREBOX.y1, FIREBOX.z], 10, 0.016)} />
        <Geo g={rivetLine('bo-fb-side', [FIREBOX.x0 + 0.04, FIREBOX.y0 + 0.05, FIREBOX.z], [FIREBOX.x0 + 0.04, FIREBOX.y1 - 0.05, FIREBOX.z], 12, 0.016)} />
        <Callout id="firebox" p={[FIREBOX.x0 + 0.2, FIREBOX.y1, FIREBOX.z]} />
      </Part>

      <Part id="barrel">
        <Turn k="tw-bo-barrel" profile={tube(BARREL.r, BARREL.x0, BARREL.x1, BARREL.t)} p={[0, AXIS_Y, 0]} axis="x" seg={56} />
        {[BARREL.x0 + 0.02, (BARREL.x0 + BARREL.x1) / 2, BARREL.x1 - 0.02].map((x) => (
          <group key={x} position={[x, AXIS_Y, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <Turn k="tw-bo-band" profile={[[BARREL.r, -0.025], [BARREL.r + 0.012, -0.025], [BARREL.r + 0.012, 0.025], [BARREL.r, 0.025]]} seg={56} />
            <Geo g={rivetRing('bo-band', BARREL.r + 0.012, 0, 28, 0.016)} />
          </group>
        ))}
        <Callout id="barrel" p={[-0.2, AXIS_Y + BARREL.r, 0.12]} />
      </Part>

      <Part id="tubes">
        {TUBES.map(([y, z], i) => (
          <Cyl key={i} c={[(BARREL.x0 + BARREL.x1) / 2, AXIS_Y + y, z]} r={0.024} len={BARREL.x1 - BARREL.x0} axis="x" seg={10} />
        ))}
        <Plate k="tw-bo-tubeplate" shape={() => {
          const s = roundRect(-BARREL.r + 0.02, -BARREL.r + 0.02, BARREL.r - 0.02, BARREL.r - 0.02, BARREL.r - 0.03)();
          return s;
        }} depth={0.02} p={[BARREL.x1 - 0.02, AXIS_Y, 0]} r={[0, Math.PI / 2, 0]} />
        <Callout id="tubes" p={[0.3, AXIS_Y - 0.2, 0.2]} />
      </Part>

      <Part id="smokebox">
        <Turn k="tw-bo-smoke" profile={tube(SMOKE.r, SMOKE.x0, SMOKE.x1, 0.02)} p={[0, AXIS_Y, 0]} axis="x" seg={56} />
        <Turn k="tw-bo-smokedoor" profile={dome(SMOKE.r - 0.03, SMOKE.x1, 0.1, 0.02)} p={[0, AXIS_Y, 0]} axis="x" seg={56} />
        <Cyl c={[SMOKE.x1 + 0.12, AXIS_Y, 0]} r={0.05} len={0.04} axis="x" seg={20} />
        {[-1, 1].map((s) => <Box key={s} c={[SMOKE.x1 + 0.13, AXIS_Y + s * 0.05, 0]} s={[0.02, 0.012, 0.18]} r={[s * 0.6, 0, 0]} />)}
        <Turn k="tw-bo-uptake" profile={tube(0.16, 0, 0.45, 0.015)} p={[(SMOKE.x0 + SMOKE.x1) / 2, AXIS_Y + 0.3, 0]} seg={28} />
        <Callout id="smokebox" p={[SMOKE.x1, AXIS_Y + SMOKE.r - 0.1, 0.2]} />
      </Part>

      <Part id="grate">
        <Geo g={firebrick} />
        <Box c={[(FIREBOX.x0 + FIREBOX.x1) / 2, 0.12, 0]} s={[FIREBOX.x1 - FIREBOX.x0 - 0.1, 0.03, 2 * FIREBOX.z - 0.1]} />
        <group position={[FIREBOX.x0 - 0.005, 0.5, 0]}>
          <Plate k="tw-bo-door" shape={roundRect(-0.18, -0.12, 0.18, 0.12, 0.05)} depth={0.03} p={[-0.03, 0, 0]} r={[0, -Math.PI / 2, 0]} />
          <Box c={[-0.05, 0, 0.12]} s={[0.03, 0.03, 0.08]} />
        </group>
        <Callout id="grate" p={[FIREBOX.x0 - 0.02, 0.6, 0.15]} />
      </Part>

      <Part id="fire">
        {Array.from({ length: 10 }, (_, i) => {
          const x = FIREBOX.x0 + 0.15 + (i % 5) * 0.12;
          const z = (i < 5 ? -0.18 : 0.18) + ((i * 37) % 7) * 0.01;
          const h = 0.25 + ((i * 13) % 5) * 0.04;
          return (
            <group key={i} position={[x, 0.34, z]}>
              <Flicker seed={i}>
                <Cyl c={[0, h / 2, 0]} r={0.0001} r2={0.06} len={h} seg={7} />
              </Flicker>
            </group>
          );
        })}
        <Callout id="fire" p={[FIREBOX.x0 + 0.4, 0.6, 0.1]} />
      </Part>

      <Part id="dome">
        <Turn k="tw-bo-dome" profile={[[0, AXIS_Y + BARREL.r - 0.05], [0.2, AXIS_Y + BARREL.r - 0.05], [0.2, AXIS_Y + BARREL.r + 0.2], [0.17, AXIS_Y + BARREL.r + 0.3], [0.08, AXIS_Y + BARREL.r + 0.34], [0, AXIS_Y + BARREL.r + 0.35]]} p={[DOME_X, 0, 0]} seg={40} />
        <Turn k="tw-bo-domebase" profile={[[0.19, AXIS_Y + BARREL.r - 0.04], [0.25, AXIS_Y + BARREL.r - 0.04], [0.25, AXIS_Y + BARREL.r + 0.02], [0.19, AXIS_Y + BARREL.r + 0.02]]} p={[DOME_X, 0, 0]} seg={40} />
        <Geo g={rivetRing('bo-dome', 0.23, AXIS_Y + BARREL.r + 0.02, 16, 0.014)} p={[DOME_X, 0, 0]} />
        <Pipe k="tw-bo-steam" pts={[[DOME_X, AXIS_Y + BARREL.r + 0.33, 0], [DOME_X, 1.45, 0], [DOME_X - 0.3, 1.55, -0.2], [-0.95, 1.6, -0.45], [-0.95, 1.72, -0.45]]} r={0.04} />
        <Callout id="dome" p={[DOME_X + 0.15, AXIS_Y + BARREL.r + 0.3, 0.1]} />
      </Part>

      <Part id="safety">
        {[-0.38, -0.22].map((x, i) => (
          <group key={x} position={[x, AXIS_Y + BARREL.r - 0.02, 0]}>
            <Turn k="tw-bo-sv" profile={[[0, 0], [0.05, 0], [0.04, 0.12], [0.03, 0.18], [0, 0.18]]} seg={20} />
            <SpinZ at={[0.0, 0.2, 0]} angle={() => 0.03 * Math.max(0, Math.sin(towerMotion.clock * 3 + i)) * (boilerPressure() > 7.5 ? 1 : 0)}>
              <Box c={[0.12, 0, 0]} s={[0.28, 0.018, 0.02]} />
            </SpinZ>
            <Cyl c={[0.24, 0.07, 0]} r={0.015} len={0.14} seg={10} />
          </group>
        ))}
        <Callout id="safety" p={[-0.3, AXIS_Y + BARREL.r + 0.2, 0.05]} />
      </Part>

      <Part id="gauges">
        <group position={[FIREBOX.x0 - 0.02, 0, -0.3]}>
          <Cyl c={[0, 0.85, 0]} r={0.012} len={0.4} seg={10} />
          {[0.64, 1.06].map((y) => <Box key={y} c={[0.0, y, 0]} s={[0.05, 0.04, 0.05]} />)}
        </group>
        <group position={[FIREBOX.x0 - 0.04, 1.02, 0.2]}>
          <Turn k="tw-bo-dial" profile={[[0, -0.02], [0.11, -0.02], [0.11, 0.02], [0, 0.02]]} axis="-x" seg={36} />
          <SpinX angle={() => Math.PI * 0.75 - (boilerPressure() / 10) * Math.PI * 1.5}>
            <Box c={[-0.025, 0.045, 0]} s={[0.006, 0.09, 0.008]} />
          </SpinX>
          <Geo g={boxes('tw-bo-ticks', () => Array.from({ length: 11 }, (_, i) => {
            const a = Math.PI * 0.75 - (i / 10) * Math.PI * 1.5;
            return { c: [-0.022, 0.09 * Math.cos(a), -0.09 * Math.sin(a)] as P3, s: [0.004, 0.022, 0.005] as P3, r: [a, 0, 0] as P3 };
          }))} />
        </group>
        <Callout id="gauges" p={[FIREBOX.x0 - 0.05, 1.1, 0.25]} />
      </Part>

      <Part id="feed-pump">
        <group position={[0.35, 0, 0.75]}>
          <Box c={[0, 0.09, 0]} s={[0.7, 0.14, 0.32]} />
          {[-0.08, 0.08].map((z, i) => (
            <group key={z}>
              <Turn k="tw-bo-pumpcyl" profile={tube(0.06, -0.3, -0.05, 0.012)} p={[0, 0.26, z]} axis="x" seg={20} />
              <Turn k="tw-bo-pumpwater" profile={tube(0.045, 0.06, 0.28, 0.01)} p={[0, 0.26, z]} axis="x" seg={20} />
              <Slide offset={() => [0.09 * Math.sin(towerMotion.crank * 0.5 + i * Math.PI / 2), 0, 0]}>
                <Cyl c={[0, 0.26, z]} r={0.012} len={0.4} axis="x" seg={8} />
                <Cyl c={[-0.2, 0.26, z]} r={0.055} len={0.03} axis="x" seg={18} />
              </Slide>
            </group>
          ))}
          <Pipe k="tw-bo-feed" pts={[[0.28, 0.32, 0], [0.4, 0.5, -0.1], [0.4, AXIS_Y - 0.2, -0.3], [0.3, AXIS_Y - 0.25, -0.4]]} r={0.022} />
        </group>
        <Callout id="feed-pump" p={[0.6, 0.35, 0.85]} />
      </Part>

      <Part id="bunker">
        <group position={[-1.05, 0, -0.85]}>
          <Plate k="tw-bo-bunker" shape={roundRect(-0.3, 0, 0.3, 0.7, 0.02)} depth={0.4} p={[0, 0, -0.2]} />
          <Box c={[-0.32, 0.18, 0.05]} s={[0.04, 0.2, 0.3]} r={[0, 0, -0.5]} />
          <Rod a={[-0.42, 0.1, 0.25]} b={[-0.6, 0.8, 0.25]} r={0.012} />
          <Box c={[-0.43, 0.06, 0.25]} s={[0.12, 0.02, 0.12]} />
        </group>
        <Callout id="bunker" p={[-1.05, 0.72, -0.65]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'saddles', index: 1, name: '底座与鞍座', en: 'Base & Saddles', role: '托起锅炉', material: '铸铁', description: '两只铸铁鞍座把锅炉筒托离地面，底板直接坐在塔基的石头上。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'firebox', index: 2, name: '火箱', en: 'Firebox', role: '烧煤的地方', material: '铆接钢板（外）· 紫铜（内）', description: '方形火箱，四壁夹着水：火在里面烧，水在夹层里吸热。钢板之间用几百根撑条拉住，承受 8 bar 的压力。', explode: [-0.55, 0, 0], stage: [0.62, 0.76] },
  { id: 'barrel', index: 3, name: '锅炉筒', en: 'Boiler Barrel', role: '装水 · 存汽', material: '铆接钢板', description: 'Ø960 mm、长 1.5 m 的铆接筒，三道箍带。水面以下是火管，水面以上的空间存着蒸汽。', explode: [0, 0.7, 0.4], stage: [0.48, 0.62] },
  { id: 'tubes', index: 4, name: '火管 ×19', en: 'Fire Tubes', role: '让热气穿过水', material: '无缝钢管', description: '19 根 Ø48 mm 的火管把火箱和烟箱连通，热烟气从管里穿过整个锅炉筒，把热量交给四周的水。剖开锅炉才看得见。', explode: [0.2, 0.2, 1.0], stage: [0.7, 0.84] },
  { id: 'smokebox', index: 5, name: '烟箱与上烟道', en: 'Smokebox', role: '收烟 · 接烟囱', material: '钢板', description: '火管里出来的烟在这里汇合，从顶上的上烟道进烟囱。动力层的乏汽也从这里喷出，越喷越抽风。', explode: [0.55, 0, 0], stage: [0.36, 0.5] },
  { id: 'grate', index: 6, name: '炉排与炉门', en: 'Grate & Fire Door', role: '托住燃煤', material: '铸铁', description: '一排铸铁炉条托着燃煤，炉灰从缝里落到下面的灰盘。司炉从后面的炉门添煤。', explode: [-0.3, -0.05, 0.75], stage: [0.24, 0.38] },
  { id: 'fire', index: 7, name: '炉火', en: 'Fire', role: '约 1100 °C', material: '煤', description: '炉膛温度约 1100 °C。火越旺，汽压越高：左栏选高压，就是司炉多添了煤。', explode: [-0.3, 0.4, 0.75], stage: [0.12, 0.26] },
  { id: 'dome', index: 8, name: '汽包与主汽管', en: 'Steam Dome', role: '取最干的汽', material: '钢 · 黄铜罩', description: '锅炉顶上的汽包是全锅炉最高点，从这里取出的蒸汽最干。主汽管从汽包上去，穿过楼板，接到动力层的节流阀。', explode: [0, 0.6, 0], stage: [0.1, 0.24] },
  { id: 'safety', index: 9, name: '弹簧安全阀 ×2', en: 'Safety Valves', role: '超压就放汽', material: '青铜 · 弹簧', description: '两只弹簧杠杆式安全阀，调定 8.5 bar。左栏调到高压时，阀杆偶尔被顶起一点——那是它在“呼吸”。', explode: [0, 0.5, -0.25], stage: [0, 0.12] },
  { id: 'gauges', index: 10, name: '水位计与压力表', en: 'Gauge Glass & Pressure Gauge', role: '看水 · 看汽', material: '玻璃 · 黄铜', description: '司炉面前的两样仪表：玻璃水位计看水面（水干了火箱会烧坏），压力表看汽压，指针由左栏的压力档位决定。', explode: [-0.4, 0.2, 0], stage: [0.04, 0.16] },
  { id: 'feed-pump', index: 11, name: '双缸给水泵', en: 'Duplex Feed Pump', role: '往锅炉里补水', material: '铸铁 · 青铜', description: '小型蒸汽往复泵：两个柱塞相差 90°，一推一拉，把水压进 8 bar 的锅炉。锅炉每小时要喝掉约 300 升水。', explode: [0.2, 0, 0.6], stage: [0.18, 0.32] },
  { id: 'bunker', index: 12, name: '煤仓', en: 'Coal Bunker', role: '存煤', material: '钢板', description: '火箱旁边的煤仓，斜底让煤自己滑到出口。满负荷一小时烧约 40 kg 煤。', explode: [-0.2, 0, -0.5], stage: [0.3, 0.44] },
];

const STEPS: StepDef[] = [
  {
    title: '锅炉房', en: 'Boiler House',
    body: '机车式火管锅炉：煤在后面的火箱里烧，热烟气穿过 19 根火管往前走，进烟箱、上烟囱；管外是水，被烧成蒸汽聚在顶上的汽包里，再经主汽管送上动力层。左栏的压力档位就是汽压：4 / 6 / 8 bar。',
    state: { explode: 0, section: false, running: true, select: 'dome', focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '剖开锅炉：火在炉排上跳，火管一根根穿过水下的锅炉筒。',
    state: { explode: 0, section: true, running: true, select: 'tubes', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆仪表、安全阀和汽包，熄火、取出炉排，拆给水泵和煤仓，拆下烟箱，吊起锅炉筒，抽出火管，最后拆开火箱。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const boilerLevel: MachineDef = level({
  id: 'tower/boiler',
  parent: 'tower',
  unit: 3.8,
  bounds: [[-1.5, 0, -1.05], [1.45, 1.65, 1.0]],
  name: '锅炉房',
  en: 'Boiler House',
  subtitle: '子组件 · 机车式火管锅炉 · 8 bar',
  summary: '12 种零件：火箱、19 根火管、汽包、安全阀、给水泵……炉火在烧',
  drawingNo: 'GW-TG-01',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'barrel', origin: [0, AXIS_Y + BARREL.r, 0] }],
  centreLines: [[[-1.5, AXIS_Y, 0], [1.45, AXIS_Y, 0], BARREL.r]],
  steps: STEPS,
  camera: {
    target: [0, 0.7, 0],
    offset: [2.7, 2.2, 5.8],
    orthoDistance: 8,
    exploded: { target: [0, 0.8, 0.3], scale: 1.45 },
  },
  Model: Boiler,
  Driver: TowerDriver,
  Controls: TowerControls,
});

