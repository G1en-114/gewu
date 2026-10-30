import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { PartDef, StepDef } from '../types';
import { Box, Cyl, dome, Hoop, level, Pipe, Turn, cone } from '../kit';

/**
 * Rocketdyne F-1: 5.6 m tall, 3.76 m across the nozzle exit, about 6.8 MN of
 * thrust at sea level. Gimbal at the origin, nozzle down −y, turbopump on +x.
 * Metres.
 */

/** Thrust chamber wall: chamber, throat and the tube-wall nozzle to the 10 : 1 station. */
const CHAMBER: Array<[number, number]> = (() => {
  const outer: Array<[number, number]> = [[0.6, -0.8], [0.6, -1.55], [0.5, -2.0], [0.62, -2.4], [0.88, -2.95], [1.22, -3.6]];
  const inner = outer.map(([r, h]): [number, number] => [r - 0.05, h]).reverse();
  return [...outer, ...inner];
})();
const at = (h: number) => {
  // Outer radius of the chamber profile at a height on the nozzle.
  for (let i = 1; i < CHAMBER.length / 2; i += 1) {
    const [r0, h0] = CHAMBER[i - 1];
    const [r1, h1] = CHAMBER[i];
    if (h <= h0 && h >= h1) return r0 + ((h - h0) / (h1 - h0)) * (r1 - r0);
  }
  return 1;
};

export function F1() {
  return (
    <group>
      <Part id="gimbal">
        <Box c={[0, 0.15, 0]} s={[0.5, 0.3, 0.5]} />
        <Cyl c={[0, 0.12, 0]} r={0.16} len={0.8} axis="z" seg={20} />
        <Cyl c={[0, -0.12, 0]} r={0.28} len={0.3} seg={24} />
        <Callout id="gimbal" p={[0, 0.35, 0.3]} />
      </Part>
      <Part id="chamber">
        <Turn k="f1-lox-dome" profile={dome(0.6, -0.8, 0.5, 0.05)} seg={40} />
        <Turn k="f1-chamber" profile={CHAMBER} seg={56} />
        {[-2.4, -2.8, -3.2].map((h) => <Hoop key={h} k={`f1-band-${h}`} c={[0, h, 0]} R={at(h) + 0.02} r={0.035} />)}
        <Callout id="chamber" p={[-0.6, -1.4, 0.4]} />
      </Part>
      <Part id="injector">
        <Turn k="f1-injector" profile={[[0, 0], [0.55, 0], [0.55, 0.1], [0, 0.1]]} p={[0, -0.92, 0]} seg={40} />
        <Callout id="injector" p={[-0.5, -0.9, 0.2]} />
      </Part>
      <Part id="extension">
        <Turn k="f1-extension" profile={cone(1.24, 1.88, -3.6, -5.6, 0.04)} seg={64} />
        <Callout id="extension" p={[-1.5, -4.8, 0.6]} />
      </Part>
      <Part id="manifold">
        <Hoop k="f1-manifold" c={[0, -3.58, 0]} R={1.36} r={0.2} />
        <Pipe k="f1-exhaust-duct" pts={[[1.05, -3.05, 0], [1.25, -3.3, 0.35], [0.97, -3.55, 0.95]]} r={0.17} />
        <Callout id="manifold" p={[-1.2, -3.5, 0.9]} />
      </Part>
      <Part id="turbopump">
        <Cyl c={[1.05, -1.6, 0]} r={0.4} len={1.4} />
        <Hoop k="f1-lox-volute" c={[1.05, -1.0, 0]} R={0.42} r={0.16} />
        <Hoop k="f1-fuel-volute" c={[1.05, -2.0, 0]} R={0.42} r={0.16} />
        <Cyl c={[1.05, -2.5, 0]} r={0.5} len={0.4} />
        <Cyl c={[1.05, -2.9, 0]} r={0.55} len={0.4} />
        <Callout id="turbopump" p={[1.6, -1.6, 0.3]} />
      </Part>
      <Part id="gas-generator">
        <Cyl c={[0.62, -2.55, -0.62]} r={0.17} len={0.5} />
        <Pipe k="f1-gg-feed" pts={[[0.62, -2.3, -0.62], [0.85, -2.2, -0.35], [1.05, -2.35, -0.25]]} r={0.06} />
        <Callout id="gas-generator" p={[0.6, -2.4, -0.8]} />
      </Part>
      <Part id="ducts">
        {[0.55, -0.55].map((z) => (
          <group key={z}>
            <Pipe k={`f1-lox-in-${z}`} pts={[[0.45, 0.25, z], [0.95, -0.25, z * 0.9], [1.05, -0.85, z * 0.3]]} r={0.13} />
            <Pipe k={`f1-fuel-in-${z}`} pts={[[0.1, 0.25, z * 1.25], [1.25, -0.9, z * 1.1], [1.48, -1.95, z * 0.4]]} r={0.11} />
          </group>
        ))}
        <Pipe k="f1-lox-out" pts={[[1.45, -1.0, 0], [1.0, -0.45, 0.55], [0.35, -0.5, 0.45]]} r={0.12} />
        <Pipe k="f1-fuel-out" pts={[[1.45, -2.0, 0.1], [0.95, -1.5, 0.6], [0.62, -1.3, 0.3]]} r={0.1} />
        <Callout id="ducts" p={[0.9, -0.2, 0.8]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'gimbal', index: 1, name: '万向节', en: 'Gimbal', role: '摆动转向', material: '钢', description: '发动机挂在万向节上，外侧四台可以摆动约 6°，靠改变推力方向来控制火箭姿态。中间那台固定。', explode: [0, 1.6, 0], stage: [0, 0.12] },
  { id: 'chamber', index: 2, name: '推力室', en: 'Thrust Chamber', role: '燃烧 · 加速燃气', material: '因科镍管束', description: '燃烧室和喷管上段由 178 根细管焊成，煤油先从管子里流过把壁冷却，再进喷注器燃烧，叫“再生冷却”。喉部最窄，燃气在这里达到音速。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'injector', index: 3, name: '喷注器', en: 'Injector', role: '雾化 · 混合', material: '铜 / 不锈钢', description: '一块打了约 6300 个小孔的圆盘，把液氧和煤油喷成细流互相撞击、雾化混合。F-1 研制时最大的难题就是这里的燃烧不稳定。', explode: [0, 0, 2.4], stage: [0.72, 0.86] },
  { id: 'extension', index: 4, name: '喷管延伸段', en: 'Nozzle Extension', role: '继续膨胀', material: '镍基合金', description: '从面积比 10 : 1 接到 16 : 1，靠涡轮排出的较冷燃气在内壁形成一层气膜来冷却。', explode: [0, -3.2, 0], stage: [0.12, 0.28] },
  { id: 'manifold', index: 5, name: '涡轮排气歧管', en: 'Turbine Exhaust Manifold', role: '导出涡轮废气', material: '镍基合金', description: '涡轮排出的富燃燃气经这圈歧管均匀注入延伸段内壁，顺便当作冷却气膜。', explode: [0, -1.6, 1.8], stage: [0.26, 0.4] },
  { id: 'turbopump', index: 6, name: '涡轮泵', en: 'Turbopump', role: '把推进剂加压送入', material: '铝 / 钢', description: '同一根轴上一个液氧泵、一个煤油泵，下面的涡轮功率约 41 MW。每秒要泵送约 1.8 吨液氧和 0.8 吨煤油。', explode: [2.6, 0, 0], stage: [0.5, 0.66] },
  { id: 'gas-generator', index: 7, name: '燃气发生器', en: 'Gas Generator', role: '驱动涡轮', material: '不锈钢', description: '烧掉一小部分推进剂产生燃气，专门用来吹动涡轮。', explode: [1.2, 0, -1.8], stage: [0.4, 0.52] },
  { id: 'ducts', index: 8, name: '推进剂管路', en: 'Propellant Ducts', role: '输送', material: '不锈钢', description: '两根液氧进口、两根煤油进口从上方接入泵；泵出的高压液氧送到顶部液氧集合腔，高压煤油送进推力室冷却管。', explode: [0, 1.8, 1.8], stage: [0.6, 0.74] },
];

const STEPS: StepDef[] = [
  {
    title: 'F-1 发动机', en: 'F-1 Engine',
    body: '土星五号第一级的五台 F-1 是史上单燃烧室推力最大的液体火箭发动机，烧液氧和煤油，每台推力约 690 吨力，工作约 165 秒。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '剖开推力室：顶上是液氧集合腔和喷注器，下面依次是燃烧室、喉部、扩张段，再接延伸段。',
    state: { explode: 0, section: true, running: false, select: 'injector', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '依次拆下万向节、延伸段、排气歧管、燃气发生器、涡轮泵和管路，最后取出喷注器。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const f1Level = level({
  id: 'saturn-v/f1',
  parent: 'saturn-v/s-ic',
  unit: 1.6,
  bounds: [[-1.9, -5.6, -1.9], [1.9, 0.4, 1.9]],
  name: 'F-1 发动机',
  en: 'Rocketdyne F-1',
  subtitle: '子组件 · 液氧 / 煤油 · 推力约 690 吨力',
  summary: '8 种零件：推力室、喷注器、涡轮泵、燃气发生器、延伸段…',
  drawingNo: 'GW-AP-11',
  scale: '1 : 20',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [
    { stage: 'extension', origin: [0, -3.6, 1.24] },
    { stage: 'turbopump', origin: [1.45, -1.6, 0] },
    { stage: 'gimbal', origin: [0, 0.3, 0] },
  ],
  centreLines: [[[0, -6.2, 0], [0, 1, 0], 2]],
  steps: STEPS,
  camera: { target: [0.3, -2.6, 0], offset: [9.5, 6, 14.5], orthoDistance: 40, exploded: { target: [0.8, -2.6, 0.6], scale: 1.4 } },
  Model: F1,
});
