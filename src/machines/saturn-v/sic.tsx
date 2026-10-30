import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { PartDef, StepDef } from '../types';
import { Box, Cyl, dome, level, Plate, poly, Turn, tube, XY_Z, YZ_X } from '../kit';
import { F1 } from './f1';

/**
 * S-IC first stage, in the rocket's frame: axis along +x from the F-1 nozzle
 * exits (x = 0) to the top of the forward skirt (x = 42.1), metres.
 */

export const R1 = 5.03;
const GIMBAL_X = 6.1;
/** Outer engines on the diagonals, where the fins and fairings are. */
export const OUTER = [0, 1, 2, 3].map((i) => Math.PI / 4 + (i * Math.PI) / 2);
const ENGINE_R = 3.05;

/** Base heat shield in (y, z) with an opening per engine. */
function heatShield() {
  const s = new THREE.Shape();
  s.absarc(0, 0, R1, 0, Math.PI * 2, false);
  for (const [y, z] of [[0, 0], ...OUTER.map((a): [number, number] => [ENGINE_R * Math.cos(a), ENGINE_R * Math.sin(a)])]) {
    const h = new THREE.Path();
    h.absarc(y, z, 0.95, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return s;
}

/** Fin in (x, r): swept leading edge, square tip. */
const FIN = poly([[5.2, R1 - 0.1], [11.2, R1 - 0.1], [7.6, 7.8], [5.2, 7.8]]);

export function SIC() {
  return (
    <group>
      <Part id="f1s">
        {[[0, 0, 0], ...OUTER.map((a) => [ENGINE_R * Math.cos(a), ENGINE_R * Math.sin(a), a])].map(([y, z, a], i) => (
          <group key={i} position={[GIMBAL_X, y, z]} rotation={[a + Math.PI, 0, 0]}>
            <group rotation={[0, 0, -Math.PI / 2]}><F1 /></group>
          </group>
        ))}
        <Callout id="f1s" p={[2, 4, 3]} />
      </Part>
      <Part id="heat-shield">
        <Plate k="sic-heat-shield" shape={heatShield} depth={0.18} p={[5.8, 0, 0]} r={YZ_X} />
        <Callout id="heat-shield" p={[5.8, -4, 2]} />
      </Part>
      <Part id="thrust">
        <Turn k="sic-thrust-skin" profile={tube(R1, 5.98, 9.4, 0.08)} axis="x" seg={72} />
        <Box c={[6.6, 0, 0]} s={[1.0, 2 * R1 - 0.2, 0.5]} r={[Math.PI / 4, 0, 0]} />
        <Box c={[6.6, 0, 0]} s={[1.0, 2 * R1 - 0.2, 0.5]} r={[-Math.PI / 4, 0, 0]} />
        <Cyl c={[7.6, 0, 0]} r={0.9} len={2.6} axis="x" />
        <Callout id="thrust" p={[8, 4.8, 2]} />
      </Part>
      <Part id="fuel-tank">
        <Turn k="sic-fuel-skin" profile={tube(R1, 9.4, 19.4)} axis="x" seg={72} />
        <Turn k="sic-fuel-aft" profile={dome(R1 - 0.06, 9.6, -1.5)} axis="x" seg={56} />
        <Turn k="sic-fuel-fwd" profile={dome(R1 - 0.06, 19.4, 1.6)} axis="x" seg={56} />
        <Callout id="fuel-tank" p={[14.5, 4.9, 1.5]} />
      </Part>
      <Part id="lox-tunnels">
        {[[0, 0], ...OUTER.map((a) => [ENGINE_R * Math.cos(a), ENGINE_R * Math.sin(a)])].map(([y, z], i) => (
          <Cyl key={i} c={[14.3, y, z]} r={0.22} len={15.4} axis="x" seg={16} />
        ))}
        <Callout id="lox-tunnels" p={[15, 0.4, 0.3]} />
      </Part>
      <Part id="intertank">
        <Turn k="sic-intertank" profile={tube(R1, 19.4, 23.6)} axis="x" seg={72} />
        {Array.from({ length: 36 }, (_, i) => (
          <group key={i} rotation={[(i / 36) * Math.PI * 2, 0, 0]}>
            <Box c={[21.5, R1 + 0.04, 0]} s={[4.2, 0.08, 0.14]} />
          </group>
        ))}
        <Callout id="intertank" p={[21.5, 5, 1]} />
      </Part>
      <Part id="lox-tank">
        <Turn k="sic-lox-skin" profile={tube(R1, 23.6, 38.0)} axis="x" seg={72} />
        <Turn k="sic-lox-aft" profile={dome(R1 - 0.06, 24.6, -2.2)} axis="x" seg={56} />
        <Turn k="sic-lox-fwd" profile={dome(R1 - 0.06, 38.0, 2.0)} axis="x" seg={56} />
        {[28, 31.5, 35].map((x) => <Turn key={x} k="sic-baffle" profile={[[4.3, 0], [R1 - 0.06, 0], [R1 - 0.06, 0.05], [4.3, 0.05]]} p={[x, 0, 0]} axis="x" seg={56} />)}
        <Callout id="lox-tank" p={[31, 4.9, 1.5]} />
      </Part>
      <Part id="forward-skirt">
        <Turn k="sic-fwd-skirt" profile={tube(R1, 38.0, 42.1)} axis="x" seg={72} />
        <Callout id="forward-skirt" p={[40, 5, 1]} />
      </Part>
      <Part id="fins">
        {OUTER.map((a) => (
          <group key={a} rotation={[a, 0, 0]}>
            <Plate k="sic-fin" shape={FIN} depth={0.24} p={[0, 0, -0.12]} r={XY_Z} />
          </group>
        ))}
        <Callout id="fins" p={[6, 6.5, 4]} />
      </Part>
      <Part id="fairings">
        {OUTER.map((a) => (
          <group key={a} rotation={[a, 0, 0]}>
            <Cyl c={[8.6, R1, 0]} r={0.35} r2={1.4} len={9.4} axis="x" seg={28} />
          </group>
        ))}
        <Callout id="fairings" p={[11, 4.3, 4.3]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'f1s', index: 1, name: 'F-1 发动机 ×5', en: 'F-1 Engines', role: '产生推力', material: '因科镍 / 不锈钢', description: '中间一台固定，外圈四台可摆动。五台合计起飞推力约 3400 吨力，2 分 41 秒烧完约 2000 吨推进剂。可以“拆开此组件”看一台 F-1 的内部。', explode: [-10, 0, 0], stage: [0, 0.1], deep: [0, -14, 0] },
  { id: 'heat-shield', index: 2, name: '底部隔热板', en: 'Base Heat Shield', role: '挡住发动机热辐射', material: '石棉 / 钢', description: '盖在推力结构底部，只留五个发动机的口子，挡住五团火焰回卷的热量。', explode: [-7, 0, 0], stage: [0.16, 0.26] },
  { id: 'thrust', index: 3, name: '推力结构', en: 'Thrust Structure', role: '传递推力', material: '铝合金', description: '十字交叉的大梁和中心柱承受五台发动机的推力，再分散到整个箭体蒙皮上。起飞前也由它把火箭压在发射台的夹持臂上。', explode: [-4, 0, 0], stage: [0.24, 0.34] },
  { id: 'fuel-tank', index: 4, name: '煤油箱', en: 'RP-1 Tank', role: '装燃料', material: '2219 铝合金', description: '装约 81 万升 RP-1 精炼煤油。上下两个椭球封头，五根液氧输送管从中间穿过。', explode: [-2, 0, 0], stage: [0.32, 0.44] },
  { id: 'lox-tunnels', index: 5, name: '液氧输送管', en: 'LOX Suction Ducts', role: '输送液氧', material: '铝合金', description: '液氧箱在上、煤油箱在下，所以五根液氧管要穿过煤油箱直通五台发动机。', explode: [0, 0, 10], stage: [0.42, 0.52] },
  { id: 'intertank', index: 6, name: '箱间段', en: 'Intertank', role: '连接两个贮箱', material: '铝合金波纹板', description: '外面是一圈波纹加强板，里面上下两个贮箱的封头彼此相对。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'lox-tank', index: 7, name: '液氧箱', en: 'LOX Tank', role: '装氧化剂', material: '2219 铝合金', description: '装约 131 万升零下 183℃ 的液氧。里面一圈圈挡板防止液体晃动（防晃板）。', explode: [4, 0, 0], stage: [0.58, 0.7] },
  { id: 'forward-skirt', index: 8, name: '前裙', en: 'Forward Skirt', role: '连接第二级', material: '铝合金', description: '上面接一二级间段，里面装着贮箱排气阀和部分仪器。', explode: [8, 0, 0], stage: [0.5, 0.6] },
  { id: 'fins', index: 9, name: '尾翼', en: 'Fins', role: '气动稳定', material: '钛 / 钢', description: '四片尾翼在低空稠密大气中帮助保持稳定，前缘用钛合金耐高温。', explode: [-4, 0, 0], stage: [0.08, 0.18] },
  { id: 'fairings', index: 10, name: '发动机整流罩', en: 'Engine Fairings', role: '减小阻力', material: '铝合金', description: '罩住外圈四台发动机伸出箭体的部分，前端尖、后端粗，也保护摆动的发动机。', explode: [-4, 0, 0], stage: [0.08, 0.18] },
];

const STEPS: StepDef[] = [
  {
    title: 'S-IC 第一级', en: 'First Stage',
    body: '高 42 米、直径 10 米，加满推进剂重约 2300 吨，占整箭重量的四分之三。工作 2 分 41 秒，把火箭送到约 67 公里高度后分离坠海。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '剖开看：下面是煤油箱，上面是液氧箱，中间箱间段里两个封头相对；五根液氧管穿过煤油箱通到发动机。',
    state: { explode: 0, section: true, running: false, select: 'lox-tunnels', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先卸发动机、尾翼和整流罩，拆隔热板和推力结构，退出煤油箱，抽出液氧管，再拆前裙和液氧箱。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const sicLevel = level({
  id: 'saturn-v/s-ic',
  parent: 'saturn-v',
  unit: 0.3,
  bounds: [[0, -7.8, -7.8], [42.1, 7.8, 7.8]],
  name: 'S-IC 第一级',
  en: 'S-IC First Stage',
  subtitle: '子组件 · 五台 F-1 · 液氧 / 煤油',
  summary: '10 种零件：F-1 发动机、推力结构、煤油箱、液氧箱、尾翼…',
  drawingNo: 'GW-AP-10',
  scale: '1 : 300',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { f1s: 'saturn-v/f1' },
  guides: [
    { stage: 'f1s', origin: [GIMBAL_X, 0, 0] },
    { stage: 'lox-tank', origin: [38, 0, 0] },
    { stage: 'forward-skirt', origin: [42.1, 0, 0] },
    { stage: 'lox-tunnels', origin: [14.3, 0, 0] },
  ],
  centreLines: [[[-2, 0, 0], [44, 0, 0], 5.5]],
  steps: STEPS,
  camera: { target: [20, 0, 0], offset: [30, 54, 105], orthoDistance: 300, exploded: { target: [20, 0, 2], scale: 1.35 }, deep: { target: [18, -6, 2], scale: 1.4 } },
  Model: SIC,
});
