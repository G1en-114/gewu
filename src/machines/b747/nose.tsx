import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, level, Turn } from '../kit';
import { fuselageAt, hullZ, MAIN_FLOOR, NOSE_X, UPPER_FLOOR } from './airframe';
import { Cockpit, cockpitLevel } from './cockpit';
import { JumboDriver, PhaseControls } from './controls';
import { openings, skin } from './fuselage';
import { boxes, type P3 } from './geo';
import { seatRows } from './seats';

/**
 * Forward fuselage, station 13 m to the nose: the double-deck section with
 * the upper deck and flight deck in the hump, the radome and weather radar,
 * the nose gear bay. Aircraft coordinates, metres.
 */

export const NOSE_FROM = 13;
const RADOME_FROM = 34.2;

/** Floor plate and the transverse beams under it, between stations, sized to the hull. */
export function floorBoxes(x0: number, x1: number, y: number, step = 0.51) {
  const out: Array<{ c: P3; s: P3 }> = [];
  for (let x = x0 + step / 2; x < x1; x += step) {
    const w = hullZ(x, y) - 0.12;
    out.push({ c: [x, y - 0.03, 0], s: [step, 0.05, w * 2] });
    out.push({ c: [x, y - 0.2, 0], s: [0.06, 0.28, w * 1.96] });
  }
  return out;
}

const upperSeats = () => seatRows('business', 27.6, 12, 1.08, [-1.3, -0.72, 0.72, 1.3], UPPER_FLOOR, (x, z) => Math.abs(z) < hullZ(x, UPPER_FLOOR + 0.5) - 0.32);
const stairs = () => Array.from({ length: 14 }, (_, i) => ({ c: [24.4 - i * 0.16, MAIN_FLOOR + 0.1 + i * 0.215, 1.75] as P3, s: [0.3, 0.05, 0.9] as P3 }));

export function NoseSection() {
  return (
    <group>
      <Part id="skin">
        <M clip geo={skin('nose', NOSE_FROM, RADOME_FROM)} />
        <Callout id="skin" p={[20, fuselageAt(20).yc - 1.5, 3.1]} />
      </Part>
      <Part id="openings">
        <M clip geo={openings('nose', NOSE_FROM, RADOME_FROM)} />
        <Callout id="openings" p={[22.3, MAIN_FLOOR + 1.3, 3.2]} />
      </Part>
      <Part id="radome">
        <M clip geo={skin('radome', RADOME_FROM, NOSE_X)} />
        <Callout id="radome" p={[35.3, 5.2, 0.8]} />
      </Part>
      <Part id="radar">
        <Turn k="ns-dish" profile={[[0, 0], [0.5, -0.12], [0.52, -0.08], [0.02, 0.04]]} p={[34.85, 5.0, 0]} axis="x" seg={32} />
        <Box c={[34.55, 5.0, 0]} s={[0.4, 0.16, 0.16]} />
        <Callout id="radar" p={[34.85, 5.4, 0.2]} />
      </Part>
      <Part id="cockpit">
        <Cockpit />
        <Callout id="cockpit" p={[32.2, UPPER_FLOOR + 1.3, 0.4]} />
      </Part>
      <Part id="upper-deck">
        <M clip geo={boxes('ns-upper-floor', () => floorBoxes(14.2, 30.1, UPPER_FLOOR))} />
        <M clip geo={boxes('ns-upper-seats', upperSeats)} />
        <Callout id="upper-deck" p={[21, UPPER_FLOOR + 0.9, 1.3]} />
      </Part>
      <Part id="stairs">
        <M clip geo={boxes('ns-stairs', stairs)} />
        <Callout id="stairs" p={[23.4, MAIN_FLOOR + 1.6, 2.2]} />
      </Part>
      <Part id="floor-beams">
        <M clip geo={boxes('ns-main-floor', () => floorBoxes(NOSE_FROM, 31.2, MAIN_FLOOR))} />
        <Callout id="floor-beams" p={[16, MAIN_FLOOR, 2.6]} />
      </Part>
      <Part id="gear-bay">
        <M clip geo={boxes('ns-bay', () => [
          { c: [27.5, 3.0, 0.6], s: [2.6, 1.2, 0.05] },
          { c: [27.5, 3.0, -0.6], s: [2.6, 1.2, 0.05] },
          { c: [27.5, 3.6, 0], s: [2.6, 0.05, 1.25] },
          { c: [28.8, 3.0, 0], s: [0.05, 1.2, 1.25] },
        ])} />
        <Callout id="gear-bay" p={[28.2, 3.4, 0.6]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'skin', index: 1, name: '前机身蒙皮与框', en: 'Forward Fuselage Skin', role: '承压 · 外形', material: '铝合金 2024', description: '1.6–2 毫米厚的铝蒙皮铆在一圈圈隔框和纵向长桁上，飞行时承受内外约 0.6 个大气压的压差——那个标志性的“驼峰”就是上层舱。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'openings', index: 2, name: '舷窗与舱门框', en: 'Windows & Door Frames', role: '采光 · 进出', material: '丙烯酸 / 钛', description: '主舱和上层舱的舷窗，以及 L1、L2 门。舷窗是多层的：最外层承压，中间一层是备份，最里面的薄板挡刮。', explode: [0, 0, 2.2], stage: [0.6, 0.72] },
  { id: 'radome', index: 3, name: '雷达罩', en: 'Radome', role: '透波 · 整流', material: '玻璃纤维 / 蜂窝', description: '机头尖上那一块不是金属，是能让雷达波穿过的复合材料。', explode: [3.2, 0, 0], stage: [0, 0.12] },
  { id: 'radar', index: 4, name: '气象雷达天线', en: 'Weather Radar', role: '探测雷雨', material: '—', description: '平板天线左右扫描，前方几百公里的雷雨云会以彩色显示在导航显示器上。', explode: [2.0, -0.6, 0], stage: [0.1, 0.22] },
  { id: 'cockpit', index: 5, name: '驾驶舱', en: 'Flight Deck', role: '驾驶', material: '—', description: '在上层舱最前面，比主舱地板高 3 米，驾驶员坐在离地约 9 米的位置。点“拆开此组件”进去看。', explode: [0, 3.2, 0], stage: [0.2, 0.36] },
  { id: 'upper-deck', index: 6, name: '上层舱', en: 'Upper Deck', role: '客舱', material: '—', description: '747 独有的二层：“驼峰”里的一间客舱，这里按公务舱 2-2 布局排了几十个座位。', explode: [0, 4.6, 0], stage: [0.34, 0.5] },
  { id: 'stairs', index: 7, name: '上层舱楼梯', en: 'Stairs', role: '上下层连接', material: '铝合金', description: '早期 747 是螺旋楼梯，-400 改成直梯。', explode: [0, 2.2, 3.2], stage: [0.48, 0.6] },
  { id: 'floor-beams', index: 8, name: '主舱地板与地板梁', en: 'Main Deck Floor', role: '承载乘客', material: '铝合金 / 蜂窝板', description: '横梁每隔约半米一根，上面铺蜂窝地板；地板下面是前货舱。', explode: [0, -2.4, 0], stage: [0.7, 0.84] },
  { id: 'gear-bay', index: 9, name: '前起落架舱', en: 'Nose Gear Bay', role: '收起落架', material: '铝合金', description: '前起落架向前收进这里，舱是不增压的，用一块承压隔板和上面的客舱隔开。', explode: [0, -2.6, 0], stage: [0.82, 0.94] },
];

const STEPS: StepDef[] = [
  {
    title: '前机身', en: 'Forward Fuselage',
    body: '747 的机头是双层的：上层是驾驶舱和上层客舱（“驼峰”），下层是主舱头等舱，再往下是前起落架舱和前货舱。剖开能看到这三层。',
    state: { explode: 0, section: true, running: false, select: 'upper-deck', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '取下雷达罩和雷达，吊出驾驶舱和上层舱，拆下楼梯、舷窗与门框，最后是主舱地板和前起落架舱。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '选中驾驶舱，点“拆开此组件”。',
    state: { explode: 1, section: false, running: false, select: 'cockpit', focus: null },
  },
];

export const noseLevel: MachineDef = level({
  id: 'b747/nose',
  parent: 'b747',
  unit: 0.55,
  bounds: [[NOSE_FROM, 2.2, -3.3], [NOSE_X, 10.5, 3.3]],
  name: '前机身',
  en: 'Forward Fuselage',
  subtitle: '子组件 · 双层 · 驾驶舱与上层舱',
  summary: '9 种零件：蒙皮、雷达罩、驾驶舱、上层舱、楼梯、地板……',
  drawingNo: 'GW-747-50',
  scale: '1 : 100',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { cockpit: 'b747/cockpit' },
  guides: [{ stage: 'cockpit', origin: [32, UPPER_FLOOR + 0.6, 0] }],
  centreLines: [],
  steps: STEPS,
  camera: { target: [24.5, 6.2, 0], offset: [-14, 13, 40], orthoDistance: 120, exploded: { target: [25, 7.2, 0], scale: 1.75 } },
  Model: NoseSection,
  Driver: JumboDriver,
  Controls: PhaseControls,
});

export const NOSE_LEVELS: MachineDef[] = [noseLevel, cockpitLevel];
