import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { level } from '../kit';
import { hullZ, MAIN_FLOOR } from './airframe';
import { JumboDriver, PhaseControls } from './controls';
import { boxes, type P3 } from './geo';
import { floorBoxes, NOSE_FROM } from './nose';
import { seatRows } from './seats';

/**
 * Main-deck cabin, nose to aft galley, in a three-class layout of about 400
 * seats: first 2-2 in the nose, business 2-3-2, economy 3-4-3. Aircraft
 * coordinates, metres. Seats that would not fit the narrowing tail are left
 * out row by row.
 */

const F = MAIN_FLOOR;
/** A seat fits if its outer edge stays clear of the sidewall at armrest height. */
const fits = (x: number, z: number) => Math.abs(z) + 0.3 < hullZ(x, F + 0.6);

const ECONOMY = [-2.62, -2.16, -1.7, -0.69, -0.23, 0.23, 0.69, 1.7, 2.16, 2.62];

const bins = () => {
  const out: Array<{ c: P3; s: P3; r?: P3 }> = [];
  for (let x = -20.5; x < 29; x += 1.4) {
    const y = F + 2.1;
    const z = hullZ(x, y) - 0.32;
    for (const s of [1, -1]) out.push({ c: [x, y, s * z], s: [1.36, 0.42, 0.55], r: [s * 0.25, 0, 0] });
    if (x < 12) for (const s of [1, -1]) out.push({ c: [x, y + 0.1, s * 0.62], s: [1.36, 0.4, 0.6] });
  }
  return out;
};
const galleys = (): Array<{ c: P3; s: P3 }> => [
  { c: [25.6, F + 1.0, 0], s: [0.9, 2.0, 2.2] },
  { c: [14.6, F + 1.0, 0], s: [0.9, 2.0, 2.6] },
  { c: [-0.4, F + 1.0, 0], s: [1.2, 2.0, 2.4] },
  { c: [-21.6, F + 1.0, 0], s: [1.6, 2.0, 3.6] },
];
const lavs = (): Array<{ c: P3; s: P3 }> => [14.6, -0.4, -20.0].flatMap((x) => [1, -1].map((s) => ({ c: [x, F + 1.0, s * (hullZ(x, F + 1) - 0.65)] as P3, s: [1.0, 2.0, 1.0] as P3 })));

export function Cabin() {
  return (
    <group>
      <Part id="floor">
        <M clip geo={boxes('cb-floor', () => floorBoxes(-22.6, NOSE_FROM, F))} />
        <Callout id="floor" p={[-10, F, 2.8]} />
      </Part>
      <Part id="first">
        <M clip geo={boxes('cb-first', () => seatRows('first', 30.2, 3, 1.75, [-1.25, -0.5, 0.5, 1.25], F, fits))} />
        <Callout id="first" p={[28.4, F + 1.1, 1.25]} />
      </Part>
      <Part id="business">
        <M clip geo={boxes('cb-business', () => seatRows('business', 24.6, 9, 1.05, [-2.45, -1.82, -0.62, 0, 0.62, 1.82, 2.45], F, fits))} />
        <Callout id="business" p={[20, F + 1.1, 2.45]} />
      </Part>
      <Part id="economy-front">
        <M clip geo={boxes('cb-eco-f', () => seatRows('economy', 13.6, 16, 0.81, ECONOMY, F, fits))} />
        <Callout id="economy-front" p={[6, F + 1.0, 2.62]} />
      </Part>
      <Part id="economy-rear">
        <M clip geo={boxes('cb-eco-r', () => seatRows('economy', -1.6, 24, 0.81, ECONOMY, F, fits))} />
        <Callout id="economy-rear" p={[-10, F + 1.0, 2.62]} />
      </Part>
      <Part id="bins">
        <M clip geo={boxes('cb-bins', bins)} />
        <Callout id="bins" p={[2, F + 2.3, 2.6]} />
      </Part>
      <Part id="galleys">
        <M clip geo={boxes('cb-galleys', galleys)} />
        <Callout id="galleys" p={[-0.4, F + 2.0, 1.2]} />
      </Part>
      <Part id="lavatories">
        <M clip geo={boxes('cb-lavs', lavs)} />
        <Callout id="lavatories" p={[-20, F + 2.0, 1.6]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'floor', index: 1, name: '主舱地板', en: 'Main Deck Floor', role: '承载', material: '铝合金梁 / 蜂窝板', description: '地板下面是货舱和中央翼盒。地板梁上开着座椅滑轨，航空公司可以随时调整座位布局。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'first', index: 2, name: '头等舱', en: 'First Class', role: '机头', material: '—', description: '747 的机头是一个“鼻子”，头等舱就坐在最前面，前方没有驾驶舱打扰——驾驶舱在楼上。', explode: [0, 3.6, 0], stage: [0.62, 0.76] },
  { id: 'business', index: 3, name: '公务舱', en: 'Business Class', role: '2-3-2', material: '—', description: '更宽的座椅、更大的排距，在主舱前段。', explode: [0, 4.2, 0], stage: [0.48, 0.62] },
  { id: 'economy-front', index: 4, name: '经济舱前段', en: 'Economy, Forward', role: '3-4-3', material: '—', description: '一排十座，两条过道。主舱宽约 6.1 米，是第一架“宽体客机”。', explode: [0, 4.8, 0], stage: [0.34, 0.48] },
  { id: 'economy-rear', index: 5, name: '经济舱后段', en: 'Economy, Aft', role: '3-4-3', material: '—', description: '机翼后面一直排到尾部；机身收窄的地方两侧少放几个座位。', explode: [0, 4.8, 0], stage: [0.2, 0.34] },
  { id: 'bins', index: 6, name: '行李架', en: 'Overhead Bins', role: '放行李', material: '复合材料', description: '两侧和中间三排行李架；中间那排只到上层舱楼梯前，再往前就是上层舱的地板了。', explode: [0, 6.2, 0], stage: [0, 0.14] },
  { id: 'galleys', index: 7, name: '厨房', en: 'Galleys', role: '配餐', material: '不锈钢 / 复合材料', description: '烤箱、热水器、餐车位，一次长途要准备几百份餐食。', explode: [0, 3.2, -3.8], stage: [0.1, 0.22] },
  { id: 'lavatories', index: 8, name: '盥洗室', en: 'Lavatories', role: '卫生间', material: '复合材料', description: '真空马桶：一按，管道里的负压把东西“吸”到后部的污水箱，每次只用很少的水。', explode: [0, 3.2, 3.8], stage: [0.14, 0.26] },
];

const STEPS: StepDef[] = [
  {
    title: '客舱', en: 'Main Deck Cabin',
    body: '三舱布局约 400 座：机头头等舱 2-2，公务舱 2-3-2，经济舱 3-4-3。上层舱和驾驶舱在楼上（见前机身）。',
    state: { explode: 0, section: false, running: false, select: 'economy-front', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '取下行李架、厨房和盥洗室，再一段段搬走座椅，剩下光秃秃的主舱地板。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const cabinLevel: MachineDef = level({
  id: 'b747/cabin',
  parent: 'b747',
  unit: 0.3,
  bounds: [[-23, 4.3, -3.2], [31, 7.2, 3.2]],
  name: '主舱客舱',
  en: 'Main Deck Cabin',
  subtitle: '子组件 · 三舱约 400 座',
  summary: '8 种零件：头等、公务、经济舱座椅，行李架、厨房、盥洗室',
  drawingNo: 'GW-747-70',
  scale: '1 : 200',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [],
  centreLines: [],
  steps: STEPS,
  camera: { target: [4, 5.4, 0], offset: [-34, 50, 70], orthoDistance: 200, exploded: { target: [4, 7.4, 0], scale: 1.6 } },
  Model: Cabin,
  Driver: JumboDriver,
  Controls: PhaseControls,
});
