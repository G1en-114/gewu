import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, Hoop, level, Rod, Turn } from '../kit';
import { boxes } from '../b747/geo';
import { GearTrain, gearsLevel } from './gears';
import { ARM_Y, BODY_R, GEAR_Y, HOUSING, LAYSHAFT, LONGITUDE_2026, MONTHS, ORBIT_R, OrreryControls, OrreryDriver, orreryMotion, planetAngle, PLANE_Y, Spin, TUBE_R } from './layout';
import { Ball, Tellurion, tellurionLevel } from './tellurion';
import type { Planet } from './train';

/**
 * 格物 · 太阳系仪: a desk orrery of the studio's own design. A crank turns a
 * layshaft once per Earth year; gear pairs chosen for each planet's period
 * drive six nested tubes, and a tellurion on the Earth arm keeps the Moon's
 * phases and the tilt of Earth's axis. About 0.7 m across; metres.
 */

const OUTER: Array<Exclude<Planet, 'earth'>> = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const NAMES: Record<Planet, string> = { mercury: '水星', venus: '金星', earth: '地球', mars: '火星', jupiter: '木星', saturn: '土星' };

/** The crank: an arm and handle at the end of the crank shaft, turning once a year. */
function Crank() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = -2 * Math.PI * orreryMotion.years; });
  return (
    <group position={[LAYSHAFT[0], 0.068, 0.4]}>
      <group ref={ref}>
        <Box c={[0.03, 0, 0.005]} s={[0.07, 0.012, 0.008]} />
        <Cyl c={[0.06, 0, 0.03]} r={0.007} len={0.045} axis="z" seg={14} />
      </group>
    </group>
  );
}

/** A planet: its arm off its tube, a post up to the common plane, and the globe. */
function PlanetArm({ p }: { p: Exclude<Planet, 'earth'> }) {
  const r = ORBIT_R[p];
  const y = ARM_Y[p];
  return (
    <Spin angle={() => planetAngle(p)}>
      <Rod a={[TUBE_R[p], y, 0]} b={[r, y, 0]} r={0.0025} seg={10} />
      <Cyl c={[r, (y + PLANE_Y - BODY_R[p]) / 2, 0]} r={0.0018} len={PLANE_Y - BODY_R[p] - y} seg={8} />
      <Ball k={p} r={BODY_R[p]} c={[r, PLANE_Y, 0]} />
      {p === 'saturn' && <group position={[r, PLANE_Y, 0]} rotation={[0.47, 0, 0]}><Hoop k="or-ring" c={[0, 0, 0]} R={BODY_R.saturn * 1.8} r={0.0035} seg={48} /></group>}
      {p === 'jupiter' && [-0.4, 0.2].map((f) => <Hoop key={f} k={`or-band-${f}`} c={[r, PLANE_Y + f * BODY_R.jupiter, 0]} R={BODY_R.jupiter * Math.sqrt(1 - f * f) + 0.0005} r={0.0008} seg={40} />)}
    </Spin>
  );
}

/** Calendar ticks where the Earth arm points on each date: long at the 1st of each month, short on the 10th and 20th. */
const ticks = () => {
  const out: Array<{ c: [number, number, number]; s: [number, number, number]; r?: [number, number, number] }> = [];
  let doy = 0;
  for (const days of MONTHS) {
    for (const [d, major] of [[0, true], [9, false], [19, false]] as const) {
      const a = (LONGITUDE_2026.earth + ((doy + d) / 365.2422) * 360) * (Math.PI / 180);
      const r0 = major ? 0.15 : 0.165;
      const len = 0.18 - r0;
      out.push({ c: [Math.cos(a) * (r0 + len / 2), HOUSING.y1 + 0.0015, -Math.sin(a) * (r0 + len / 2)], s: [len, 0.002, major ? 0.003 : 0.0015], r: [0, a, 0] });
    }
    doy += days;
  }
  return out;
};

export function Orrery() {
  return (
    <group>
      <Part id="base">
        <Turn k="or-base" profile={[[0, 0], [0.34, 0], [0.34, 0.018], [0.325, 0.028], [0.31, 0.05], [0.24, 0.06], [0, 0.06]]} seg={72} />
        <Callout id="base" p={[0.25, 0.05, 0.2]} />
      </Part>
      <Part id="crank">
        <Crank />
        <Callout id="crank" p={[LAYSHAFT[0] + 0.06, 0.08, 0.43]} />
      </Part>
      <Part id="gear-train">
        <GearTrain />
        <Callout id="gear-train" p={[0.15, HOUSING.y1 - 0.03, 0.12]} />
      </Part>
      <Part id="dial">
        <Turn k="or-dial" profile={[[0.145, HOUSING.y1], [0.185, HOUSING.y1], [0.185, HOUSING.y1 + 0.0015], [0.145, HOUSING.y1 + 0.0015]]} seg={72} />
        <M clip geo={boxes('or-ticks', ticks)} />
        <Callout id="dial" p={[0.16, HOUSING.y1 + 0.002, 0.08]} />
      </Part>
      <Part id="arbors">
        <Cyl c={[0, (0.07 + PLANE_Y) / 2, 0]} r={0.003} len={PLANE_Y - 0.07} seg={10} />
        {(['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'earth'] as const).map((p) => (
          <Spin key={p} angle={() => planetAngle(p)}>
            <Cyl c={[0, (GEAR_Y[p] + ARM_Y[p]) / 2, 0]} r={TUBE_R[p]} len={ARM_Y[p] - GEAR_Y[p] + 0.004} seg={20} />
          </Spin>
        ))}
        <Callout id="arbors" p={[0.012, 0.28, 0.012]} />
      </Part>
      <Part id="sun">
        <Ball k="sun" r={0.045} c={[0, PLANE_Y, 0]} />
        {[-0.5, 0, 0.5].map((f) => <Hoop key={f} k={`or-sun-${f}`} c={[0, PLANE_Y + f * 0.045, 0]} R={0.045 * Math.sqrt(1 - f * f) + 0.0005} r={0.0009} seg={48} />)}
        <Callout id="sun" p={[0.02, PLANE_Y + 0.045, 0.02]} />
      </Part>
      {OUTER.map((p) => (
        <Part key={p} id={p}>
          <PlanetArm p={p} />
          <Callout id={p} p={[ORBIT_R[p], PLANE_Y + BODY_R[p], 0]} />
        </Part>
      ))}
      <Part id="tellurion">
        <Tellurion />
        <Callout id="tellurion" p={[ORBIT_R.earth, 0.29, 0]} />
      </Part>
    </group>
  );
}

const planetPart = (p: Exclude<Planet, 'earth'>, index: number, description: string, explode: [number, number, number], stage: [number, number]): PartDef => ({
  id: p, index, name: NAMES[p], en: p[0].toUpperCase() + p.slice(1), role: '公转', material: '彩绘黄铜', description, explode, stage,
});

const PARTS: PartDef[] = [
  { id: 'base', index: 1, name: '底座', en: 'Plinth', role: '支承', material: '胡桃木 / 黄铜', description: '圆形底座，齿轮箱坐在正中间。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'crank', index: 2, name: '摇柄', en: 'Crank', role: '输入', material: '黄铜', description: '摇一圈 = 地球绕太阳一圈 = 一年。按“运转”就是替你摇。', explode: [0, 0, 0.12], stage: [0.86, 0.96] },
  { id: 'gear-train', index: 3, name: '齿轮系', en: 'Gear Train', role: '把一年分给各行星', material: '黄铜', description: '中间轴每年一圈，五对齿轮和一组复式轮系按公转周期带动各行星。点“拆开此组件”看每对齿轮的齿数。', explode: [0, -0.12, 0], stage: [0.76, 0.9] },
  { id: 'dial', index: 4, name: '日历刻度盘', en: 'Calendar Dial', role: '读日期', material: '黄铜', description: '十二个大格是十二个月。地球臂下的小指针在上面走一圈正好一年。', explode: [0, 0.03, 0], stage: [0.7, 0.8] },
  { id: 'arbors', index: 5, name: '同心套管 ×6', en: 'Nested Tubes', role: '各转各的', material: '黄铜管', description: '六根一根套一根的管子，各自由一个齿轮带动、各转各的速度：越往里越长，所以水星的臂最高、地球的臂最低。正中间不转的细杆托着太阳。', explode: [0, 0.18, 0], stage: [0.6, 0.72] },
  { id: 'sun', index: 6, name: '太阳', en: 'Sun', role: '中心', material: '镀金黄铜', description: '固定在中心杆顶上，不转。', explode: [0, 0.14, 0], stage: [0.5, 0.62] },
  planetPart('mercury', 7, '最快：88 天一圈。齿轮 83 / 20，周期 0.2410 年（真实 0.2408 年）。', [0, 0.12, -0.12], [0.36, 0.46]),
  planetPart('venus', 8, '225 天一圈。齿轮 52 / 32，周期 0.6154 年。', [0, 0.1, -0.16], [0.28, 0.38]),
  planetPart('mars', 9, '687 天一圈。齿轮 25 / 47，周期 1.880 年。', [0, 0.06, 0.2], [0.2, 0.3]),
  planetPart('jupiter', 10, '最大的行星，11.86 年一圈。齿轮 7 / 83。', [0.08, 0.04, 0.2], [0.12, 0.22]),
  planetPart('saturn', 11, '戴着光环，29.46 年一圈：慢到要用两级齿轮才能做出来。', [0.1, 0.02, -0.2], [0.04, 0.14]),
  { id: 'tellurion', index: 12, name: '地月仪', en: 'Tellurion', role: '月相 · 四季', material: '—', description: '地球臂上的小机构：月球按朔望月绕地球转，地轴始终倾斜 23.4° 指向同一方向。点“拆开此组件”进去看。', explode: [0, 0.1, 0.24], stage: [0.42, 0.56] },
];

const STEPS: StepDef[] = [
  {
    title: '格物 · 太阳系仪', en: 'Orrery',
    body: '一台桌面太阳系仪：摇柄每转一圈就是一年，水星、金星、地球、火星、木星、土星按真实的公转周期绕太阳转（距离和大小不按比例）。打开时各行星就停在今天它们在天上的真实方位，左栏显示日期和月相。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '剖开齿轮箱：一根中间轴上叠着五个齿轮，各带一根套管；左边还有一根小轴给土星再减一次速。',
    state: { explode: 0, section: true, running: true, select: 'gear-train', focus: null },
  },
  {
    title: '地月仪', en: 'Tellurion',
    body: '地球比别的行星低一层：它的套管在最外面、最短。这样外行星的臂能从地月仪上方越过去。盯住地轴：转一整圈，它始终朝同一方向倾斜。',
    state: { explode: 0, section: false, running: true, select: 'tellurion', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '从外往里取下土星、木星、火星、地月仪、金星、水星和太阳，抽出六根套管，拆下刻度盘、齿轮箱和摇柄。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const orrery: MachineDef = level({
  id: 'orrery',
  unit: 20,
  bounds: [[-0.35, 0, -0.35], [0.35, 0.51, 0.45]],
  name: '太阳系仪',
  en: 'Orrery',
  subtitle: '原创设计 · 摇柄一圈一年 · 地月仪',
  summary: '12 个大件 · 六大行星按真实公转周期转，月相、四季都在里面',
  drawingNo: 'GW-TY-00',
  scale: '1 : 5',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { 'gear-train': 'orrery/gears', tellurion: 'orrery/tellurion' },
  guides: [{ stage: 'arbors', origin: [0, 0.3, 0] }],
  centreLines: [[[0, -0.02, 0], [0, 0.52, 0], 0.045]],
  steps: STEPS,
  camera: { target: [0, 0.25, 0.02], offset: [0.55, 0.62, 1.15], orthoDistance: 5, exploded: { target: [0, 0.3, 0.02], scale: 1.5 } },
  Model: Orrery,
  Driver: OrreryDriver,
  Controls: OrreryControls,
});

export const ORRERY_LEVELS: MachineDef[] = [gearsLevel, tellurionLevel];
