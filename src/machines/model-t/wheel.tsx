import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { cyl } from '../../scene/geometry';
import type { BoltSetDef, PartDef, StepDef } from '../types';
import { circleProfile, Fastener, level, Turn } from './kit';

/**
 * Wood-spoke artillery wheel, 30 × 3½ clincher (rear; the front tyre is
 * 30 × 3). Hub axis along x, outer face toward +x, centre at the origin.
 */
export const WHEEL = { radius: 15, rim: 11.5, spokes: 12 };

const tyre: Array<[number, number]> = (() => {
  const c = 13.25;
  const outer = Array.from({ length: 25 }, (_, i): [number, number] => {
    const a = (-120 + i * 10) * (Math.PI / 180);
    return [c + 1.75 * Math.cos(a), 1.75 * Math.sin(a)];
  });
  const inner = outer.map(([r, y]): [number, number] => [c + (r - c) * 0.8, y * 0.8]).reverse();
  return [...outer, ...inner];
})();

const HUB_BOLTS = Array.from({ length: 6 }, (_, i) => (i + 0.5) * (Math.PI / 3));

export function Wheel() {
  return (
    <group>
      <Part id="tire">
        <Turn k="tyre" profile={tyre} axis="x" seg={72} />
        <Callout id="tire" p={[0, 15, 0]} />
      </Part>
      <Part id="tube">
        <Turn k="tube" profile={circleProfile(13.25, 0, 1.3)} axis="x" seg={72} />
        <Callout id="tube" p={[0, -13.2, 1]} />
      </Part>
      <Part id="rim">
        <Turn
          k="rim"
          profile={[[11.3, -1.75], [12.25, -1.75], [12.25, -1.5], [11.6, -1.45], [11.6, 1.45], [12.25, 1.5], [12.25, 1.75], [11.3, 1.75]]}
          axis="x"
          seg={72}
        />
        <Callout id="rim" p={[0, 9, 9]} />
      </Part>
      <Part id="felloe">
        <Turn k="felloe" profile={[[10.2, -0.9], [11.3, -0.9], [11.3, 0.9], [10.2, 0.9]]} axis="x" seg={72} />
        <Callout id="felloe" p={[0, -7.5, -7.5]} />
      </Part>
      <Part id="spokes">
        {Array.from({ length: WHEEL.spokes }, (_, i) => (
          <group key={i} rotation={[(i / WHEEL.spokes) * Math.PI * 2, 0, 0]}>
            <M clip geo={cyl(0.4, 0.62, 8.2, 12)} p={[0, 6.3, 0]} />
          </group>
        ))}
        <Callout id="spokes" p={[0, 6, -2]} />
      </Part>
      <Part id="hub">
        <Turn
          k="hub"
          profile={[[1.1, -3.2], [1.5, -3.2], [1.5, -1.3], [3.2, -1.3], [3.2, -0.9], [1.5, -0.9], [1.5, 0.9], [3.2, 0.9], [3.2, 1.3], [1.5, 1.3], [1.5, 2.6], [1.1, 2.6]]}
          axis="x"
        />
        {HUB_BOLTS.map((a) => (
          <Fastener key={a} p={[1.3, 2.55 * Math.cos(a), 2.55 * Math.sin(a)]} dir="x" set="hub-bolts" d={0.3} len={2.6} />
        ))}
        <Callout id="hub" p={[-2, 2.6, 1]} />
      </Part>
      <Part id="hubcap">
        <Turn k="hubcap" profile={[[0, 0], [1.6, 0], [1.6, 0.5], [1.2, 0.9], [0, 1.0]]} p={[2.6, 0, 0]} axis="x" />
        <Callout id="hubcap" p={[3.5, 0.6, 0]} />
      </Part>
      <Part id="bearings">
        <Turn k="cone-in" profile={[[0.55, 0], [1.1, 0], [0.95, 0.6], [0.55, 0.6]]} p={[-2.9, 0, 0]} axis="x" />
        <Turn k="cone-out" profile={[[0.55, 0], [0.95, 0], [1.1, 0.6], [0.55, 0.6]]} p={[1.7, 0, 0]} axis="x" />
        <Callout id="bearings" p={[2, -0.8, 0]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'tire', index: 1, name: '外胎', en: 'Clincher Tyre', role: '着地 · 缓冲', material: '橡胶 / 帘布', description: '30 × 3½ 英寸“钳入式”外胎：两侧胎唇卡进轮辋的弯钩里，靠内胎充气后撑紧。', explode: [10, 0, 0], stage: [0.12, 0.3] },
  { id: 'tube', index: 2, name: '内胎', en: 'Inner Tube', role: '充气', material: '橡胶', description: '真正装气的是内胎。那个年代路上钉子多，补胎是司机的家常便饭。', explode: [6, 0, 0], stage: [0.25, 0.4] },
  { id: 'rim', index: 3, name: '轮辋', en: 'Clincher Rim', role: '承托外胎', material: '钢', description: '钢制轮辋，两边卷成弯钩扣住外胎胎唇，套在木轮圈外面。', explode: [-5, 0, 0], stage: [0.35, 0.5] },
  { id: 'felloe', index: 4, name: '木轮圈', en: 'Felloe', role: '连接辐条', material: '山核桃木', description: '弯成一圈的硬木，12 根辐条的外端插在里面。', explode: [-9, 0, 0], stage: [0.45, 0.62] },
  { id: 'spokes', index: 5, name: '辐条', en: 'Spokes', role: '传力', material: '山核桃木', description: '12 根木辐条，内端楔形，在轮毂处挤成一圈，由两片轮毂法兰夹紧。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'hub', index: 6, name: '轮毂', en: 'Hub', role: '装轴承 · 夹辐条', material: '钢', description: '内外两片法兰夹住辐条，6 根螺栓穿过辐条之间把它们锁紧。中间是装轴承的毂筒。', explode: [-4.5, 0, 0], stage: [0.66, 0.82] },
  { id: 'hubcap', index: 7, name: '轮毂盖', en: 'Hub Cap', role: '防尘 · 存润滑脂', material: '黄铜 / 钢', description: '拧在毂筒外端，盖住轴头螺母，里面塞满润滑脂。', explode: [14, 0, 0], stage: [0, 0.12] },
  { id: 'bearings', index: 8, name: '轴承', en: 'Bearing Cones', role: '支承转动', material: '钢', description: '内外两个锥形轴承座，配滚珠或滚柱轴承，承受车重和转弯时的侧向力。', explode: [4, 0, 0], stage: [0.82, 0.95] },
];

const BOLT_SETS: Record<string, BoltSetDef> = {
  'hub-bolts': { owner: 'hub', distance: 4, stage: [0.55, 0.66] },
};

const STEPS: StepDef[] = [
  {
    title: '车轮总成', en: 'Wheel',
    body: '木辐条炮车轮：钢轮毂夹住 12 根木辐条，外端插进木轮圈，外面套钢轮辋和钳入式充气轮胎。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '剖开看层次', en: 'Section',
    body: '沿轴线剖开：最外是外胎，里面是内胎，再往里是钢轮辋、木轮圈、辐条，中心是轮毂和轴承。',
    state: { explode: 0, section: true, running: false, select: 'tube', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拧下轮毂盖，扒下外胎、取出内胎；再拆轮辋、退出轮毂螺栓，取下轮毂和轴承。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const wheelLevel = level({
  id: 'model-t/wheel',
  parent: 'model-t',
  unit: 0.25,
  bounds: [[-3.2, -15, -15], [3.6, 15, 15]],
  name: '车轮',
  en: 'Wheel',
  subtitle: '子组件 · 30 × 3½ 木辐条车轮',
  summary: '8 种零件：外胎、内胎、轮辋、木轮圈、辐条、轮毂…',
  drawingNo: 'GW-T-05',
  scale: '1 : 4',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: {},
  guides: [
    { stage: 'tire', origin: [1.75, 13.25, 0] },
    { stage: 'hubcap', origin: [3.6, 0, 0] },
    { stage: 'hub', origin: [-3.2, 1.5, 0] },
  ],
  centreLines: [[[-6, 0, 0], [7, 0, 0], 16]],
  steps: STEPS,
  camera: { target: [0, 0, 0], offset: [48, 30, 64], orthoDistance: 200, exploded: { target: [1, 0, 0], scale: 1.35 } },
  Model: Wheel,
});
