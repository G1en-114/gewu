import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, Turn, YZ_X } from '../kit';
import { CAMS } from './calc';
import { TowerControls } from './controls';
import { mainShaft, TowerDriver, tw } from './motion';
import { camShape, sideShape, Slide, SpinX } from './shared';

/**
 * 时序凸轮鼓: the programme of the whole machine, cut into steel. Eight cams
 * on one shaft that turns once per cycle with the main shaft; each cam's
 * profile is generated from the same timing function that moves the part it
 * controls, so the follower lifts exactly when that part has to move.
 * Shaft along x at the origin; metres.
 */

export const CAM_X = (i: number) => -0.95 + i * 0.27;
export const CAM_R0 = 0.085;
export const CAM_LIFT = 0.045;
const CAM_T = 0.04;
const TAU = Math.PI * 2;
/** Follower roller resting on top of the cam (+y). */
const ROLLER = 0.022;
export const ROD_TOP = 0.42;

/** The radius of cam i at local angle θ (from +y toward +z): the follower on top reads lift at uc = −θ / 2π. */
const camRadius = (i: number) => (th: number) => {
  const uc = (((-th / TAU) % 1) + 1) % 1;
  return CAM_R0 + CAM_LIFT * CAMS[i].lift(uc);
};

export const followerLift = (i: number) => CAM_LIFT * CAMS[i].lift(tw.uc);

export function CamDrum({ shaftFrom = -1.25 }: { shaftFrom?: number }) {
  return (
    <group>
      <Part id="frame">
        {[-1.12, -0.12, 1.02].map((x) => (
          <group key={x}>
            <Plate k="tw-cam-pedestal" shape={sideShape([[-0.14, -0.2], [0.14, -0.2], [0.07, -0.02], [0.05, 0.05], [-0.05, 0.05], [-0.07, -0.02]], [[0, 0, 0.022]])} depth={0.05} p={[x - 0.025, 0, 0]} r={YZ_X} />
          </group>
        ))}
        <Box c={[-0.05, -0.22, 0]} s={[2.3, 0.04, 0.34]} />
        <Box c={[-0.05, ROD_TOP - 0.06, -0.13]} s={[2.3, 0.03, 0.04]} />
        {[-1.12, 1.02].map((x) => <Box key={x} c={[x, (ROD_TOP - 0.22) / 2 - 0.1, -0.13]} s={[0.04, ROD_TOP + 0.02, 0.04]} />)}
        <Callout id="frame" p={[1.02, 0.05, 0.12]} />
      </Part>

      <Part id="shaft">
        <SpinX angle={mainShaft}>
          <Cyl c={[(shaftFrom + 1.15) / 2, 0, 0]} r={0.022} len={1.15 - shaftFrom} axis="x" seg={16} />
          <Turn k="tw-cam-bevel" profile={[[0.022, 0], [0.09, 0], [0.06, 0.05], [0.022, 0.05]]} p={[shaftFrom + 0.05, 0, 0]} axis="-x" seg={32} />
        </SpinX>
        <Callout id="shaft" p={[shaftFrom + 0.1, 0.06, 0.06]} />
      </Part>

      {CAMS.map((cam, i) => (
        <Part key={cam.id} id={cam.id}>
          <SpinX angle={mainShaft}>
            <Plate k={`tw-cam-${cam.id}`} shape={camShape(camRadius(i), 240, 0.022)} depth={CAM_T} p={[CAM_X(i) - CAM_T / 2, 0, 0]} r={YZ_X} />
            <Turn k="tw-cam-boss" profile={[[0.022, -CAM_T / 2 - 0.012], [0.04, -CAM_T / 2 - 0.012], [0.04, CAM_T / 2 + 0.012], [0.022, CAM_T / 2 + 0.012]]} p={[CAM_X(i), 0, 0]} axis="x" seg={6} />
          </SpinX>
          <Callout id={cam.id} p={[CAM_X(i), -CAM_R0, 0.06]} />
        </Part>
      ))}

      <Part id="followers">
        {CAMS.map((cam, i) => (
          <Slide key={cam.id} offset={() => [0, followerLift(i), 0]}>
            <Cyl c={[CAM_X(i), CAM_R0 + ROLLER, 0]} r={ROLLER} len={0.026} axis="x" seg={18} />
            <Box c={[CAM_X(i) - 0.022, CAM_R0 + ROLLER, 0]} s={[0.008, 0.05, 0.03]} />
            <Box c={[CAM_X(i) + 0.022, CAM_R0 + ROLLER, 0]} s={[0.008, 0.05, 0.03]} />
            <Box c={[CAM_X(i), CAM_R0 + ROLLER + 0.03, 0]} s={[0.052, 0.012, 0.03]} />
            <Cyl c={[CAM_X(i), (CAM_R0 + ROLLER + 0.03 + ROD_TOP) / 2, 0]} r={0.009} len={ROD_TOP - CAM_R0 - ROLLER - 0.03} seg={10} />
          </Slide>
        ))}
        <Callout id="followers" p={[CAM_X(7), ROD_TOP - 0.02, 0.02]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'frame', index: 1, name: '轴承座与导向架', en: 'Pedestals & Guides', role: '托轴 · 导推杆', material: '铸铁', description: '三个轴承座托住凸轮轴；上面一根导向横梁，八根推杆从它的孔里穿上去。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'shaft', index: 2, name: '凸轮轴与锥齿轮', en: 'Camshaft & Bevel', role: '一圈 = 一行', material: '钢', description: '左端锥齿轮和主竖轴啮合，1 : 1：主竖轴转一圈，凸轮轴也转一圈，机器算完一行、印完一行。', explode: [0, -0.25, -0.35], stage: [0.8, 0.95] },
  ...CAMS.map((cam, i): PartDef => ({
    id: cam.id,
    index: 3 + i,
    name: cam.name,
    en: cam.en,
    role: i < 6 ? (i < 3 ? '前半拍' : '后半拍') : '印字',
    material: '淬火钢',
    description: `${cam.what}凸轮轮廓就是按这件事的时间表车出来的：基圆 Ø170 mm，最高抬起 45 mm。`,
    explode: [0, 0, 0.32 + (i % 2) * 0.2],
    stage: [0.2 + i * 0.07, 0.34 + i * 0.07],
  })),
  { id: 'followers', index: 11, name: '滚子推杆 ×8', en: 'Roller Followers', role: '把凸轮变成拉杆动作', material: '钢', description: '每个凸轮顶上一根带滚子的推杆，凸轮转到高处就把它顶起，经上面的拉杆去开锁、接离合、打压印锤、拨棘轮。', explode: [0, 0.4, 0], stage: [0, 0.18] },
];

const STEPS: StepDef[] = [
  {
    title: '时序凸轮鼓', en: 'Cam Drum',
    body: '整台机器的“程序”：八个凸轮装在一根轴上，每行转一圈。左边三个管前半拍（解锁、加法、进位 A），中间三个管后半拍，右边两个管印字和进纸。每个凸轮的轮廓都是用控制那件事的时间函数生成的，所以推杆抬起的时刻就是零件该动的时刻。',
    state: { explode: 0, section: false, running: true, select: 'carry-a', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先提起八根推杆，再把八个凸轮从轴上依次退下，最后抽出凸轮轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const camsLevel: MachineDef = level({
  id: 'tower/cams',
  parent: 'tower/program',
  unit: 4.6,
  bounds: [[-1.25, -0.24, -0.17], [1.15, ROD_TOP + 0.04, 0.17]],
  name: '时序凸轮鼓',
  en: 'Cam Drum',
  subtitle: '子组件 · 八个凸轮 · 一圈一行',
  summary: '11 种零件：八个凸轮按时间函数车出轮廓，推杆准时抬起',
  drawingNo: 'GW-TG-41',
  scale: '1 : 6',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'followers', origin: [CAM_X(4), ROD_TOP, 0] }],
  centreLines: [[[-1.3, 0, 0], [1.2, 0, 0], CAM_R0]],
  steps: STEPS,
  camera: {
    target: [-0.05, 0.08, 0],
    offset: [1.2, 1.3, 3.4],
    orthoDistance: 6,
    exploded: { target: [-0.05, 0.14, 0.2], scale: 1.3 },
  },
  Model: () => <CamDrum />,
  Driver: TowerDriver,
  Controls: TowerControls,
});
