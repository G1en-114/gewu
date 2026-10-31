import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { PartDef, StepDef, Vec3 } from '../types';
import { Box, cone, Cyl, level, Rod, Turn } from '../kit';

/**
 * Grumman Lunar Module, standing on the Moon: footpads at y = 0, x forward
 * (the front hatch and ladder), metres. About 7 m tall and 9.4 m across the
 * footpads. Folded (as carried in the adapter) the legs are not drawn.
 */

const BODY: [number, number] = [1.55, 3.2];
const ASC = 3.2;

/** Main legs on the four faces; the front one carries the porch and ladder. */
const LEGS = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2);

function Leg({ a }: { a: number }) {
  const p = (r: number, y: number, side = 0): Vec3 => [r * Math.cos(a) - side * Math.sin(a), y, r * Math.sin(a) + side * Math.cos(a)];
  return (
    <>
      <Rod a={p(2.1, 2.95)} b={p(4.55, 0.32)} r={0.11} seg={10} />
      <Rod a={p(1.9, 1.7, 0.9)} b={p(4.2, 0.6)} r={0.06} seg={8} />
      <Rod a={p(1.9, 1.7, -0.9)} b={p(4.2, 0.6)} r={0.06} seg={8} />
      <Turn k="lm-footpad" profile={[[0, 0], [0.47, 0], [0.47, 0.06], [0.3, 0.2], [0, 0.22]]} p={p(4.6, 0)} seg={24} />
      {a !== 0 && <Rod a={p(4.6, 0.02)} b={p(4.6, -1.6)} r={0.02} seg={6} />}
    </>
  );
}

export function LunarModule({ folded = false }: { folded?: boolean }) {
  return (
    <group>
      <Part id="descent">
        <Cyl c={[0, (BODY[0] + BODY[1]) / 2, 0]} r={2.27} len={BODY[1] - BODY[0]} seg={8} />
        {LEGS.map((a) => <Box key={a} c={[1.9 * Math.cos(a), 2.4, 1.9 * Math.sin(a)]} s={[0.9, 1.3, 0.9]} r={[0, -a, 0]} />)}
        <Callout id="descent" p={[1.4, 2.4, 1.8]} />
      </Part>
      <Part id="legs">
        {!folded && LEGS.map((a) => <Leg key={a} a={a} />)}
        {folded && <Cyl c={[0, 1.6, 0]} r={2.0} len={0.1} seg={8} />}
        <Callout id="legs" p={[3.6, 1.2, -2.6]} />
      </Part>
      <Part id="descent-engine">
        <Turn k="lm-dps" profile={[[0.25, BODY[0]], [0.42, BODY[0]], [0.78, BODY[0] - 0.75], [0.74, BODY[0] - 0.75], [0.36, BODY[0] - 0.05], [0.25, BODY[0] - 0.02]]} seg={36} />
        <Cyl c={[0, BODY[0] + 0.35, 0]} r={0.4} len={0.7} seg={24} />
        <Callout id="descent-engine" p={[0.6, 0.9, 0.5]} />
      </Part>
      {!folded && (
        <Part id="porch">
          <Box c={[2.75, 2.9, 0]} s={[1.0, 0.08, 1.0]} />
          {[0.35, -0.35].map((s) => <Rod key={s} a={[3.2, 2.85, s]} b={[4.3, 0.55, s]} r={0.03} seg={6} />)}
          {Array.from({ length: 8 }, (_, i) => {
            const t = (i + 1) / 9;
            return <Rod key={i} a={[3.2 + t * 1.1, 2.85 - t * 2.3, 0.35]} b={[3.2 + t * 1.1, 2.85 - t * 2.3, -0.35]} r={0.02} seg={6} />;
          })}
          <Callout id="porch" p={[3.6, 2.2, 0.5]} />
        </Part>
      )}
      <Part id="cabin">
        <Cyl c={[0.35, ASC + 1.4, 0]} r={1.17} len={2.34} axis="z" seg={24} />
        <Box c={[0.95, ASC + 1.1, 0]} s={[0.9, 1.5, 2.2]} r={[0, 0, 0.25]} />
        <Box c={[-1.15, ASC + 1.0, 0]} s={[1.3, 1.6, 2.6]} />
        <Box c={[-0.2, ASC + 0.2, 0]} s={[3.2, 0.4, 2.8]} />
        {[0.55, -0.55].map((z) => <Box key={z} c={[1.32, ASC + 1.75, z]} s={[0.06, 0.5, 0.45]} r={[0, 0, 0.5]} />)}
        <Callout id="cabin" p={[0.5, ASC + 2.4, 1]} />
      </Part>
      <Part id="ascent-engine">
        <Turn k="lm-aps" profile={cone(0.45, 0.2, ASC - 0.1, ASC + 0.9, 0.04)} seg={28} />
        <Callout id="ascent-engine" p={[0.4, ASC + 0.1, -0.4]} />
      </Part>
      <Part id="tanks">
        {[1.7, -1.7].map((z) => <Cyl key={z} c={[-0.3, ASC + 0.8, z]} r={0.62} len={0.9} axis="z" seg={20} />)}
        <Callout id="tanks" p={[-0.3, ASC + 1.4, 2.1]} />
      </Part>
      <Part id="rcs">
        {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz], i) => (
          <group key={i} position={[sx * 1.45, ASC + 1.7, sz * 1.55]}>
            <Box c={[0, 0, 0]} s={[0.3, 0.3, 0.3]} />
            <Cyl c={[sx * 0.3, 0, 0]} r={0.06} r2={0.09} len={0.3} axis={sx > 0 ? 'x' : '-x'} seg={10} />
            <Cyl c={[0, 0.3, 0]} r={0.06} r2={0.09} len={0.3} seg={10} />
            <Cyl c={[0, -0.3, 0]} r={0.06} r2={0.09} len={0.3} axis="-y" seg={10} />
            <Cyl c={[0, 0, sz * 0.3]} r={0.06} r2={0.09} len={0.3} axis={sz > 0 ? 'z' : '-z'} seg={10} />
          </group>
        ))}
        <Callout id="rcs" p={[1.45, ASC + 2.0, 1.55]} />
      </Part>
      <Part id="tunnel">
        <Turn k="lm-tunnel" profile={[[0.3, 0], [0.42, 0], [0.42, 0.45], [0.5, 0.5], [0.3, 0.5]]} p={[0.2, ASC + 2.55, 0]} seg={28} />
        <Box c={[1.38, ASC + 0.75, 0]} s={[0.06, 0.8, 0.8]} r={[0, 0, 0.25]} />
        <Callout id="tunnel" p={[0.2, ASC + 3.2, 0.3]} />
      </Part>
      <Part id="antennas">
        <Rod a={[1.0, ASC + 2.3, 0.6]} b={[1.2, ASC + 2.75, 0.6]} r={0.04} seg={6} />
        <Turn k="lm-radar" profile={[[0, 0], [0.33, 0.12], [0.33, 0.15], [0, 0.04]]} p={[1.25, ASC + 2.8, 0.6]} axis="x" seg={24} />
        <Rod a={[-1.0, ASC + 2.0, -0.9]} b={[-1.1, ASC + 2.6, -0.9]} r={0.04} seg={6} />
        <Turn k="lm-sband" profile={[[0, 0], [0.3, 0.1], [0.3, 0.13], [0, 0.03]]} p={[-1.1, ASC + 2.6, -0.9]} seg={24} />
        <Callout id="antennas" p={[1.3, ASC + 3.0, 0.8]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'descent', index: 1, name: '下降级', en: 'Descent Stage', role: '着陆 · 发射台', material: '铝合金 / 隔热毯', description: '八角形的下半部，四个隔间里装下降用的推进剂，另一个隔间装月面科学仪器和月球车（后期任务）。返回时它留在月面，当上升级的发射台。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'legs', index: 2, name: '着陆腿', en: 'Landing Gear', role: '支撑 · 缓冲', material: '铝合金蜂窝', description: '四条腿的主支柱里填着可压溃的铝蜂窝，着陆时一次性吸收冲击。脚垫下挂着 1.7 米长的探针，一碰到月面驾驶舱就亮灯，航天员随即关机。', explode: [0, -1.4, 0], stage: [0.74, 0.88] },
  { id: 'descent-engine', index: 3, name: '下降发动机', en: 'Descent Engine', role: '减速 · 悬停', material: '铌合金', description: '可在约 10% 到 60% 推力之间连续调节，是第一台用于载人飞行的可调推力发动机，用来从月球轨道减速、悬停、选择落点。', explode: [0, -3.4, 0], stage: [0.86, 1] },
  { id: 'porch', index: 4, name: '前廊与梯子', en: 'Porch & Ladder', role: '出舱', material: '铝合金', description: '前舱门外的小平台和沿前腿的梯子。阿姆斯特朗就是从这里走下月面的。', explode: [3.4, 0, 0], stage: [0.62, 0.74] },
  { id: 'cabin', index: 5, name: '上升级乘员舱', en: 'Ascent Stage Cabin', role: '载人 · 返回月球轨道', material: '铝合金（极薄）', description: '两名航天员站着驾驶，没有座椅。舱壁最薄处只有约 0.3 毫米，为了省重量。前面两扇三角窗，下面是方形前舱门。', explode: [0, 3.6, 0], stage: [0.36, 0.5] },
  { id: 'ascent-engine', index: 6, name: '上升发动机', en: 'Ascent Engine', role: '离开月面', material: '—', description: '构造极简、不可调推力，用自燃推进剂（一接触就着火），只为确保一次点火成功——它是航天员回家唯一的发动机。', explode: [0, 1.7, 0], stage: [0.48, 0.6] },
  { id: 'tanks', index: 7, name: '上升级贮箱', en: 'Ascent Propellant Tanks', role: '装推进剂', material: '钛合金', description: '左右两侧鼓出来的两个贮箱，一个装燃料、一个装氧化剂。', explode: [-2.6, 3.4, 0], stage: [0.26, 0.38] },
  { id: 'rcs', index: 8, name: '姿控喷管组', en: 'RCS Quads', role: '姿态控制', material: '—', description: '四个角上各一组四个小喷管，控制上升级的姿态和对接时的微调。', explode: [0, 6.2, 0], stage: [0.14, 0.26] },
  { id: 'tunnel', index: 9, name: '对接通道与舱门', en: 'Docking Tunnel & Hatches', role: '对接 · 进出', material: '铝合金', description: '顶上的圆形通道与指令舱对接，航天员从这里在两艘飞船之间爬来爬去；前面的方形舱门通往月面。', explode: [0, 7.6, 0], stage: [0.06, 0.16] },
  { id: 'antennas', index: 10, name: '雷达与天线', en: 'Radar & Antennas', role: '交会 · 通信', material: '—', description: '前上方是交会雷达，用来找回在轨道上等候的指令舱；后方的可转动 S 波段天线与地球通信。', explode: [1.4, 7.0, 0], stage: [0, 0.1] },
];

const STEPS: StepDef[] = [
  {
    title: '登月舱', en: 'Lunar Module',
    body: '只在太空里飞的飞船，不需要流线型。下半部下降级负责着陆，上半部上升级载着两名航天员回到月球轨道。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '剖开看：上升级乘员舱是一个横放的圆筒，上升发动机就在它正下方，嵌在下降级中央；下降发动机在最底下。',
    state: { explode: 0, section: true, running: false, select: 'ascent-engine', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆天线、对接通道、姿控喷管和贮箱，取下上升级乘员舱和上升发动机，再拆前廊梯子、着陆腿和下降发动机。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const lmLevel = level({
  id: 'saturn-v/lm',
  parent: 'saturn-v',
  unit: 1.1,
  bounds: [[-5.1, -1.6, -5.1], [5.1, 6.7, 5.1]],
  name: '登月舱',
  en: 'Lunar Module',
  subtitle: '子组件 · 下降级 + 上升级',
  summary: '10 种零件：下降级、着陆腿、上升级乘员舱、两台发动机…',
  drawingNo: 'GW-AP-20',
  scale: '1 : 50',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [
    { stage: 'cabin', origin: [0, ASC + 2.4, 0] },
    { stage: 'legs', origin: [4.6, 0, 0] },
    { stage: 'descent-engine', origin: [0, BODY[0] - 0.75, 0] },
  ],
  centreLines: [[[0, -2, 0], [0, 7.5, 0], 2.4]],
  steps: STEPS,
  camera: { target: [0, 3, 0], offset: [13.5, 9, 19], orthoDistance: 46, exploded: { target: [0.5, 5, 0], scale: 1.85 } },
  Model: () => <LunarModule />,
});
