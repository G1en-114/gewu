import type { ReactNode } from 'react';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, Hoop, level, Turn } from '../kit';
import { ARM_Y, BODY_R, EARTH_Y, earthSpin, Gear, moonAngle, ORBIT_R, OrreryControls, OrreryDriver, planetAngle, Spin } from './layout';
import { moduleFor, MOON_TRAIN } from './train';

/**
 * The tellurion on the Earth arm. A large wheel fixed to the gearbox (99)
 * meshes with the Moon's gear (8) at the arm's end, so the Moon goes round
 * 12.375 times a year relative to the Sun–Earth line; a 40–20–40 train keeps
 * the Earth's tilted axis pointing the same way all year, which is what
 * makes the seasons. Drawn in the orrery's coordinates, arm turning with Earth.
 */

const R = ORBIT_R.earth;
const TILT = (23.44 * Math.PI) / 180;
const [FIX, MOON] = MOON_TRAIN;
const M_MOON = moduleFor(FIX, MOON, R);
/** Parallel-keeping train: fixed 40, idler 20, Earth wheel 40. */
const M_PAR = moduleFor(40, 40 + 2 * 20, R);
const Y_PAR = 0.196;
const Y_MOON = 0.206;
const MOON_ORBIT = 0.04;

const earthAngle = () => planetAngle('earth');

/** A sphere of radius r, turned from a half circle. */
export function Ball({ k, r, c = [0, 0, 0] }: { k: string; r: number; c?: [number, number, number] }) {
  const n = 16;
  const arc = Array.from({ length: n + 1 }, (_, i): [number, number] => {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    return [Math.max(0.0002, r * Math.cos(a)), r * Math.sin(a)];
  });
  return <Turn k={`ball-${k}`} profile={[[0, -r], ...arc.slice(1, -1), [0, r]]} p={c} seg={32} />;
}

/** At the end of the arm, turning with it. */
function OnArm({ children }: { children: ReactNode }) {
  return <Spin angle={earthAngle}><group position={[R, 0, 0]}>{children}</group></Spin>;
}

export function Tellurion() {
  return (
    <group>
      <Part id="arm">
        <Spin angle={earthAngle}>
          <Turn k="tl-hub" profile={[[0.021, ARM_Y.earth - 0.008], [0.03, ARM_Y.earth - 0.008], [0.03, ARM_Y.earth + 0.008], [0.021, ARM_Y.earth + 0.008]]} seg={32} />
          <Box c={[(0.03 + R + 0.015) / 2, ARM_Y.earth, 0]} s={[R - 0.015, 0.008, 0.016]} />
          <Box c={[R * 0.85, ARM_Y.earth - 0.012, 0]} s={[0.004, 0.024, 0.004]} />
        </Spin>
        <Callout id="arm" p={[R * 0.5, ARM_Y.earth + 0.004, 0.01]} />
      </Part>
      <Part id="moon-wheel">
        <Gear k="tl-fix99" n={FIX} m={M_MOON} y={Y_MOON} t={0.004} />
        <Callout id="moon-wheel" p={[0.1, Y_MOON + 0.004, 0.08]} />
      </Part>
      <Part id="moon-gear">
        <OnArm>
          <Spin angle={moonAngle}>
            <Gear k="tl-moon8" n={MOON} m={M_MOON} y={Y_MOON} t={0.004} />
            <Turn k="tl-moon-tube" profile={[[0.0045, Y_MOON], [0.006, Y_MOON], [0.006, EARTH_Y + 0.03], [0.0045, EARTH_Y + 0.03]]} seg={16} />
            <Box c={[MOON_ORBIT / 2, EARTH_Y + 0.03, 0]} s={[MOON_ORBIT, 0.004, 0.006]} />
            <Cyl c={[MOON_ORBIT, EARTH_Y + 0.02, 0]} r={0.0015} len={0.02} seg={8} />
          </Spin>
        </OnArm>
        <Callout id="moon-gear" p={[R, Y_MOON + 0.004, 0.02]} />
      </Part>
      <Part id="moon">
        <OnArm>
          <Spin angle={moonAngle}><Ball k="moon" r={0.006} c={[MOON_ORBIT, EARTH_Y + 0.006, 0]} /></Spin>
        </OnArm>
        <Callout id="moon" p={[R + MOON_ORBIT, EARTH_Y + 0.012, 0]} />
      </Part>
      <Part id="parallel">
        <Gear k="tl-fix40" n={40} m={M_PAR} y={Y_PAR} t={0.004} />
        <Spin angle={earthAngle}>
          <Spin at={[R / 2, 0]} angle={() => earthAngle() * 2}><Gear k="tl-idl20" n={20} m={M_PAR} y={Y_PAR} t={0.004} /></Spin>
        </Spin>
        <OnArm><Spin angle={() => -earthAngle()}><Gear k="tl-earth40" n={40} m={M_PAR} y={Y_PAR} t={0.004} /></Spin></OnArm>
        <Callout id="parallel" p={[0.03, Y_PAR + 0.003, 0.05]} />
      </Part>
      <Part id="axis">
        <OnArm>
          <Spin angle={() => -earthAngle()}>
            <Cyl c={[0, (Y_PAR + EARTH_Y - 0.03) / 2, 0]} r={0.003} len={EARTH_Y - 0.03 - Y_PAR} seg={10} />
            <group position={[0, EARTH_Y, 0]} rotation={[0, 0, TILT]}>
              <Cyl c={[0, 0, 0]} r={0.0012} len={BODY_R.earth * 2 + 0.016} seg={8} />
              <Box c={[0.022, 0, 0]} s={[0.003, 0.05, 0.003]} />
              <Box c={[0.011, -0.024, 0]} s={[0.022, 0.003, 0.003]} />
              <Box c={[0.011, 0.024, 0]} s={[0.022, 0.003, 0.003]} />
            </group>
          </Spin>
        </OnArm>
        <Callout id="axis" p={[R + 0.02, EARTH_Y + 0.02, 0.01]} />
      </Part>
      <Part id="earth">
        <OnArm>
          <Spin angle={() => -earthAngle()}>
            <group position={[0, EARTH_Y, 0]} rotation={[0, 0, TILT]}>
              <Spin angle={earthSpin}>
                <Ball k="earth" r={BODY_R.earth} />
                <Hoop k="tl-equator" c={[0, 0, 0]} R={BODY_R.earth} r={0.0006} seg={40} />
                <Hoop k="tl-meridian" c={[0, 0, 0]} R={BODY_R.earth} r={0.0006} axis="x" seg={40} />
              </Spin>
            </group>
          </Spin>
        </OnArm>
        <Callout id="earth" p={[R, EARTH_Y + BODY_R.earth, 0.01]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'arm', index: 1, name: '地球臂', en: 'Earth Arm', role: '一年一圈', material: '黄铜', description: '装在最外层的套管上，每年绕太阳一圈。臂下那根小指针指着齿轮箱顶上的日历盘，读出今天几月几日。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'moon-wheel', index: 2, name: '固定月轮 99 齿', en: 'Fixed Moon Wheel', role: '不转的参照', material: '黄铜', description: '固定在齿轮箱的套筒上，永远不转。地球臂带着月球齿轮绕着它走，就像行星齿轮绕着太阳轮。', explode: [0, -0.05, 0], stage: [0.7, 0.86] },
  { id: 'moon-gear', index: 3, name: '月球齿轮与月臂', en: 'Moon Gear & Arm', role: '朔望月', material: '黄铜', description: '8 齿，直接和 99 齿的固定月轮啮合：地球臂每转一圈，它相对地球臂转 99 / 8 = 12.375 圈——一年 12.375 个朔望月（真实 12.37 个），月相因此准确地轮换。', explode: [0.06, 0.04, 0], stage: [0.4, 0.56] },
  { id: 'moon', index: 4, name: '月球', en: 'Moon', role: '卫星', material: '象牙白漆', description: '月臂末端的小球。转到太阳和地球之间是新月，转到地球背后是满月。左栏实时显示月相。', explode: [0.08, 0.06, 0], stage: [0.2, 0.36] },
  { id: 'parallel', index: 5, name: '平行保持轮系', en: 'Parallel Train', role: '地轴方向不变', material: '黄铜', description: '固定 40 齿 → 惰轮 20 齿 → 地球轮 40 齿：两次啮合、1:1，正好抵消地球臂的转动，所以无论转到哪里，地轴都指向同一个方向。', explode: [0, -0.04, 0.06], stage: [0.56, 0.72] },
  { id: 'axis', index: 6, name: '地轴支架', en: 'Axis Fork', role: '倾斜 23.4°', material: '黄铜', description: '把地球的自转轴斜着撑起 23.44°。因为倾斜方向一年不变，太阳一会儿直射北半球、一会儿直射南半球——这就是四季。', explode: [0.02, 0.05, 0.04], stage: [0.12, 0.26] },
  { id: 'earth', index: 7, name: '地球', en: 'Earth', role: '自转', material: '彩绘黄铜', description: '绕斜着的地轴自转，一年 366.24 圈（恒星日）。慢速档下可以看清它转。', explode: [0, 0.08, 0], stage: [0, 0.14] },
];

const STEPS: StepDef[] = [
  {
    title: '地月仪', en: 'Tellurion',
    body: '地球臂一边绕太阳转，一边带着两组小齿轮：一组让月球一年转 12.375 个朔望月，另一组让地轴始终朝同一方向倾斜 23.4°。用左栏调速，看月相和日期变化。',
    state: { explode: 0, section: false, running: true, select: 'parallel', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '取下地球、地轴支架和月球，再拆月臂和两组齿轮，剩下地球臂和固定月轮。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const tellurionLevel: MachineDef = level({
  id: 'orrery/tellurion',
  parent: 'orrery',
  unit: 30,
  bounds: [[-0.15, 0.19, -0.15], [0.2, 0.31, 0.15]],
  name: '地月仪',
  en: 'Tellurion',
  subtitle: '子组件 · 朔望月 · 地轴 23.4°',
  summary: '7 种零件：固定月轮、月球齿轮、平行保持轮系、地轴、地球、月球',
  drawingNo: 'GW-TY-02',
  scale: '2 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [],
  centreLines: [[[0, 0.18, 0], [0, 0.24, 0], 0.03]],
  steps: STEPS,
  camera: { target: [0.06, 0.235, 0], offset: [0.3, 0.26, 0.5], orthoDistance: 3, exploded: { target: [0.07, 0.25, 0], scale: 1.5 } },
  Model: Tellurion,
  Driver: OrreryDriver,
  Controls: OrreryControls,
});
