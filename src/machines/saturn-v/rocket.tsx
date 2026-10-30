import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { PartDef, StepDef, Vec3 } from '../types';
import { Box, cone, Cyl, dome, level, Rod, Turn, tube } from '../kit';
import { OUTER, R1, SIC } from './sic';

/**
 * Saturn V with Apollo, lying along +x the way the surviving rockets are
 * shown in their halls: F-1 nozzle exits at x = 0, escape tower tip at
 * 111.3 m. Proportions from NASA's published stage dimensions; metres.
 */

const R3 = 3.3;
const RC = 1.96;

/** J-2: hydrogen engine of the upper stages, gimbal at x, nozzle toward −x. */
function J2({ x, y = 0, z = 0 }: { x: number; y?: number; z?: number }) {
  return (
    <group position={[x, y, z]}>
      <Turn k="j2-bell" profile={[[0.1, 0], [0.38, 0], [0.42, -0.35], [0.3, -0.9], [1.0, -3.3], [0.96, -3.3], [0.26, -0.9], [0.1, -0.5]]} axis="x" seg={40} />
      <Box c={[-0.6, 0.55, 0]} s={[0.7, 0.4, 0.4]} />
      <Box c={[-0.6, -0.55, 0]} s={[0.7, 0.4, 0.4]} />
    </group>
  );
}

/** Rings of stiffeners on a skin, every `step` degrees. */
function Stringers({ x0, x1, r, n }: { x0: number; x1: number; r: number; n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} rotation={[(i / n) * Math.PI * 2, 0, 0]}>
          <Box c={[(x0 + x1) / 2, r + 0.03, 0]} s={[x1 - x0, 0.06, 0.1]} />
        </group>
      ))}
    </>
  );
}

export function Rocket() {
  return (
    <group>
      <Part id="s-ic">
        <SIC />
        <Callout id="s-ic" p={[30, R1 + 0.5, 2]} />
      </Part>

      <Part id="interstage-1">
        <Turn k="isa-1" profile={tube(R1, 42.1, 47.6, 0.08)} axis="x" seg={72} />
        <Stringers x0={42.3} x1={47.4} r={R1} n={24} />
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} rotation={[(i / 8) * Math.PI * 2 + Math.PI / 8, 0, 0]}>
            <Cyl c={[44.4, R1 + 0.22, 0]} r={0.12} r2={0.22} len={2.4} axis="x" seg={14} />
          </group>
        ))}
        <Callout id="interstage-1" p={[45, R1 + 0.4, 2]} />
      </Part>

      <Part id="s-ii">
        <Turn k="sii-aft-skirt" profile={tube(R1, 47.6, 48.8)} axis="x" seg={72} />
        <Turn k="sii-skin" profile={tube(R1, 48.8, 64.6)} axis="x" seg={72} />
        <Turn k="sii-lox-aft" profile={dome(R1 - 0.06, 50.6, -2.4)} axis="x" seg={56} />
        <Turn k="sii-common" profile={dome(R1 - 0.06, 52.2, 2.6)} axis="x" seg={56} />
        <Turn k="sii-lh2-fwd" profile={dome(R1 - 0.06, 64.6, 2.2)} axis="x" seg={56} />
        <Turn k="sii-fwd-skirt" profile={tube(R1, 64.6, 67.0)} axis="x" seg={72} />
        <Turn k="sii-thrust-cone" profile={cone(R1 - 0.1, 2.6, 48.8, 47.7, 0.06)} axis="x" seg={56} />
        <J2 x={47.6} />
        {OUTER.map((a) => <J2 key={a} x={47.6} y={2.7 * Math.cos(a)} z={2.7 * Math.sin(a)} />)}
        <Box c={[56.6, R1 + 0.16, 0]} s={[17.6, 0.3, 0.7]} />
        <Callout id="s-ii" p={[58, R1 + 0.5, 2]} />
      </Part>

      <Part id="interstage-2">
        <Turn k="isa-2" profile={cone(R1, R3, 67.0, 72.0, 0.06)} axis="x" seg={72} />
        <Callout id="interstage-2" p={[69.5, 4.4, 1.5]} />
      </Part>

      <Part id="s-ivb">
        <Turn k="sivb-aft-skirt" profile={tube(R3, 72.0, 73.0)} axis="x" seg={64} />
        <Turn k="sivb-skin" profile={tube(R3, 73.0, 83.2)} axis="x" seg={64} />
        <Turn k="sivb-lox-aft" profile={dome(R3 - 0.05, 74.9, -1.8, 0.05)} axis="x" seg={48} />
        <Turn k="sivb-common" profile={dome(R3 - 0.05, 76.0, 1.8, 0.05)} axis="x" seg={48} />
        <Turn k="sivb-lh2-fwd" profile={dome(R3 - 0.05, 83.2, 1.3, 0.05)} axis="x" seg={48} />
        <Turn k="sivb-fwd-skirt" profile={tube(R3, 83.2, 84.8)} axis="x" seg={64} />
        <J2 x={72.0} />
        {[1, -1].map((s) => <Box key={s} c={[72.8, 0, s * (R3 + 0.35)]} s={[2.0, 1.2, 0.7]} />)}
        <Box c={[78, R3 + 0.12, 0]} s={[11, 0.24, 0.5]} />
        <Callout id="s-ivb" p={[79, R3 + 0.4, 1.5]} />
      </Part>

      <Part id="iu">
        <Turn k="iu-skin" profile={tube(R3, 84.8, 85.7, 0.1)} axis="x" seg={64} />
        {Array.from({ length: 14 }, (_, i) => (
          <group key={i} rotation={[(i / 14) * Math.PI * 2, 0, 0]}>
            <Box c={[85.25, R3 - 0.35, 0]} s={[0.6, 0.45, 0.9]} />
          </group>
        ))}
        <Callout id="iu" p={[85.2, R3 + 0.3, 1]} />
      </Part>

      <Part id="sla">
        <Turn k="sla" profile={cone(R3, RC + 0.02, 85.7, 94.2, 0.05)} axis="x" seg={64} />
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          const p = (r: number, x: number): Vec3 => [x, r * Math.cos(a), r * Math.sin(a)];
          return <Rod key={i} a={p(R3 + 0.03, 85.8)} b={p(RC + 0.05, 94.1)} r={0.04} seg={6} />;
        })}
        <Callout id="sla" p={[89, 2.9, 1.2]} />
      </Part>

      <Part id="lm">
        <Cyl c={[87.7, 0, 0]} r={2.0} len={1.7} axis="x" seg={8} />
        <Turn k="lm-descent-bell" profile={[[0.2, 0], [0.4, 0], [0.75, -0.9], [0.7, -0.9], [0.2, -0.1]]} p={[86.85, 0, 0]} axis="x" seg={28} />
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          return <Rod key={i} a={[88.4, 1.95 * Math.cos(a), 1.95 * Math.sin(a)]} b={[86.4, 2.35 * Math.cos(a), 2.35 * Math.sin(a)]} r={0.08} seg={8} />;
        })}
        <Box c={[89.9, 0, 0]} s={[2.4, 2.9, 3.2]} />
        <Cyl c={[90.0, 0, 1.0]} r={1.15} len={2.2} axis="x" seg={8} />
        <Cyl c={[91.4, 0, 0]} r={0.42} len={0.6} axis="x" seg={20} />
        <Callout id="lm" p={[90, 1.5, 1.6]} />
      </Part>

      <Part id="sm">
        <Turn k="sm-skin" profile={tube(RC, 94.2, 98.1, 0.08)} axis="x" seg={56} />
        <Turn k="sm-aft" profile={[[0.5, 0], [RC, 0], [RC, 0.12], [0.5, 0.12]]} p={[94.2, 0, 0]} axis="x" seg={56} />
        <Turn k="sps-bell" profile={[[0.25, 0], [0.42, 0], [1.2, -2.6], [1.16, -2.6], [0.38, -0.15], [0.25, -0.1]]} p={[94.2, 0, 0]} axis="x" seg={48} />
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          return (
            <group key={i}>
              <Cyl c={[96.0, 0.95 * Math.cos(a), 0.95 * Math.sin(a)]} r={0.48} len={3.4} axis="x" seg={24} />
              <group rotation={[(i * Math.PI) / 2, 0, 0]}>
                <Box c={[96.9, RC + 0.15, 0]} s={[0.5, 0.3, 0.5]} />
              </group>
            </group>
          );
        })}
        <Cyl c={[96.0, 0, 0]} r={0.3} len={3.4} axis="x" seg={20} />
        <Callout id="sm" p={[96.2, RC + 0.3, 0.8]} />
      </Part>

      <Part id="cm">
        <Turn k="cm-shell" profile={cone(RC, 0.42, 98.1, 101.3, 0.1)} axis="x" seg={56} />
        <Turn k="cm-heat-shield" profile={dome(RC, 98.1, -0.28, 0.12)} axis="x" seg={56} />
        <Cyl c={[101.45, 0, 0]} r={0.42} len={0.3} axis="x" seg={24} />
        <Callout id="cm" p={[99.6, 1.4, 0.6]} />
      </Part>

      <Part id="les">
        <Turn k="bpc" profile={cone(RC + 0.08, 0.5, 98.0, 101.5, 0.04)} axis="x" seg={56} />
        {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sy, sz], i) => (
          <group key={i}>
            <Rod a={[101.5, 0.55 * sy, 0.55 * sz]} b={[104.6, 0.32 * sy, 0.32 * sz]} r={0.045} seg={6} />
            <Rod a={[101.5, 0.55 * sy, 0.55 * sz]} b={[104.6, 0.32 * sy, -0.32 * sz]} r={0.03} seg={6} />
          </group>
        ))}
        <Cyl c={[106.95, 0, 0]} r={0.33} len={4.7} axis="x" seg={24} />
        <Turn k="les-nose" profile={[[0, 0], [0.33, 0], [0.33, 0.6], [0.18, 1.3], [0.08, 2.0], [0, 2.0]]} p={[109.3, 0, 0]} axis="x" seg={24} />
        <Callout id="les" p={[107, 0.6, 0.3]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 's-ic', index: 1, name: 'S-IC 第一级', en: 'S-IC First Stage', role: '起飞 · 穿过大气', material: '铝合金', description: '五台 F-1 发动机，液氧 / 煤油。点“拆开此组件”看贮箱和发动机。', explode: [0, 0, 0], stage: [1, 1], deep: [0, -24, 0] },
  { id: 'interstage-1', index: 2, name: '一二级间段', en: 'S-IC/S-II Interstage', role: '连接 · 分离', material: '铝合金', description: '包住第二级的五台 J-2。一级关机后先点燃外圈 8 台小火箭把推进剂“压”到箱底，再分离；约 30 秒后间段本身也被抛掉。', explode: [3, 0, 0], stage: [0.6, 0.68] },
  { id: 's-ii', index: 3, name: 'S-II 第二级', en: 'S-II Second Stage', role: '加速到近轨道速度', material: '铝合金', description: '五台 J-2 发动机，液氧 / 液氢。下面液氧、上面液氢，两箱之间只隔一层“共底”，省掉箱间段，减重约 3.6 吨。', explode: [9, 0, 0], stage: [0.5, 0.62] },
  { id: 'interstage-2', index: 4, name: '二三级间段', en: 'S-II/S-IVB Interstage', role: '连接 · 过渡', material: '铝合金', description: '从 10 米直径收到 6.6 米的锥段。', explode: [13, 0, 0], stage: [0.44, 0.52] },
  { id: 's-ivb', index: 5, name: 'S-IVB 第三级', en: 'S-IVB Third Stage', role: '入轨 · 奔月', material: '铝合金', description: '一台可再次点火的 J-2：第一次点火进入地球停泊轨道，绕地球一圈半后第二次点火，把飞船送上奔月轨道。尾部两侧是姿控发动机舱。', explode: [18, 0, 0], stage: [0.36, 0.46] },
  { id: 'iu', index: 6, name: '仪器舱', en: 'Instrument Unit', role: '制导 · 控制', material: '铝蜂窝', description: '一圈不到 1 米高的环，装着整枚火箭的“大脑”：惯性平台、制导计算机和遥测设备，飞行中一直指挥三级火箭。', explode: [22, 0, 0], stage: [0.3, 0.38] },
  { id: 'sla', index: 7, name: '登月舱适配器', en: 'Spacecraft-LM Adapter', role: '罩住登月舱', material: '铝蜂窝', description: '锥形整流罩，由四块壁板组成。奔月途中壁板像花瓣一样张开，指令服务舱掉头对接，把登月舱拉出来。', explode: [26, 8, 0], stage: [0.18, 0.26] },
  { id: 'lm', index: 8, name: '登月舱', en: 'Lunar Module', role: '登月 · 返回月球轨道', material: '铝合金 / 隔热毯', description: '两名航天员乘它降落月面。下降级（腿和下降发动机）留在月球上当发射台，上升级带人回月球轨道与指令舱会合。发射时腿折叠着。', explode: [36, 0, 0], stage: [0.24, 0.32] },
  { id: 'sm', index: 9, name: '服务舱', en: 'Service Module', role: '动力 · 电源 · 氧气', material: '铝蜂窝', description: '尾部的服务推进系统发动机负责进出月球轨道；内部分扇区装推进剂箱、燃料电池和氧气。四组姿控喷管在侧面。返回地球前抛掉。', explode: [42, 0, 0], stage: [0.12, 0.2] },
  { id: 'cm', index: 10, name: '指令舱', en: 'Command Module', role: '乘员舱 · 再入', material: '不锈钢蜂窝 / 烧蚀材料', description: '三名航天员全程坐在这里，是唯一返回地球的部分。底部的烧蚀防热罩在再入时承受约 2700℃ 高温。', explode: [46, 0, 0], stage: [0.06, 0.14] },
  { id: 'les', index: 11, name: '逃逸塔', en: 'Launch Escape System', role: '应急救生', material: '钢 / 玻璃钢', description: '万一发射出事，塔顶的固体火箭能在几秒内把指令舱拽离火箭。正常情况下二级点火后就抛掉。下面的锥形罩保护指令舱。', explode: [50, 0, 0], stage: [0, 0.08] },
];

const STEPS: StepDef[] = [
  {
    title: '土星五号', en: 'Saturn V',
    body: '高 111 米、起飞重约 2900 吨，至今仍是成功发射过的最重的火箭之一。1967–1973 年发射 13 次，其中 6 次把人送上月面。这里像展馆里那样把它横放。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '剖开看三级各自的贮箱：一级液氧在上煤油在下；二、三级用液氢，体积大，液氧和液氢之间只隔一层共底。最前端是阿波罗飞船。',
    state: { explode: 0, section: true, running: false, select: 's-ii', focus: null },
  },
  {
    title: '分级', en: 'Stages',
    body: '按从上到下的顺序拆开：逃逸塔、指令舱、服务舱、适配器和登月舱、仪器舱、三级、间段、二级、间段，剩下一级。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '全部展开', en: 'Everything',
    body: '打开“全部展开”，第一级会被拉到下方再拆开，五台 F-1 也各自拆开。也可以选中第一级，点“拆开此组件”逐级进入。',
    state: { explode: 1, section: false, running: false, select: 's-ic', focus: null },
  },
];

export const rocketLevel = level({
  id: 'saturn-v',
  unit: 0.1,
  bounds: [[0, -7.8, -7.8], [111.3, 7.8, 7.8]],
  name: '土星五号',
  en: 'Saturn V / Apollo',
  subtitle: '整箭 · 三级火箭 + 阿波罗飞船',
  summary: '11 个大件，第一级可再拆到 F-1 发动机',
  drawingNo: 'GW-AP-00',
  scale: '1 : 1000',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { 's-ic': 'saturn-v/s-ic' },
  guides: [
    { stage: 'les', origin: [101.5, 0, 0] },
    { stage: 'cm', origin: [101.3, 0, 0] },
    { stage: 's-ivb', origin: [84.8, 0, 0] },
    { stage: 's-ii', origin: [67, 0, 0] },
  ],
  centreLines: [[[-4, 0, 0], [116, 0, 0], 5.5]],
  steps: STEPS,
  camera: { target: [55, 0, 0], offset: [24, 58, 185], orthoDistance: 900, exploded: { target: [80, 0, 0], scale: 1.4 }, deep: { target: [84, -10, 0], scale: 1.75 } },
  Model: Rocket,
});
