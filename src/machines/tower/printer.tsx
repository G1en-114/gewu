import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, Rod, Turn, YZ_X } from '../kit';
import { DIGITS, digitsOf } from './calc';
import { TowerControls } from './controls';
import { TowerDriver, tw } from './motion';
import { axleFigures, flatFigures, GearX, Geo, sideShape, Slide, SpinX } from './shared';

/**
 * 印字层: eight type wheels on one axle along x, set from the result column
 * by racks, print f(n) onto a paper strip that runs up past their front:
 * a hammer behind the paper presses it onto the type, a ratchet then feeds
 * it one line up onto the take-up roll. The lines on the paper are the
 * values the machine has actually printed. Origin at the floor centre; metres.
 */

const AXLE = { y: 0.42, z: 0 };
const TYPE_R = 0.06;
const GAP = 0.075;
const typeX = (j: number) => ((DIGITS - 1) / 2 - j) * GAP;
const LINE = 0.05;
/** The paper runs behind the type wheels; its printed face looks forward, over the wheels. */
const PAPER_Z = -(TYPE_R + 0.006);
const SUPPLY: [number, number] = [0.2, 0.1];
const TAKEUP: [number, number] = [0.88, 0.1];
const TAU = Math.PI * 2;
const CHEEK = 0.4;

/** The printed strip: the last few lines, sliding up as the paper is fed. */
function Strip() {
  const [lines, setLines] = useState<number[]>([]);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const n = tw.printed.length;
    if (n !== lines.length || tw.printed[n - 1] !== lines[lines.length - 1]) setLines([...tw.printed]);
    // Until this cycle's line is struck, the newest line has already been fed one line up.
    const struck = lines.length === tw.n + 2;
    if (group.current) group.current.position.y = ((struck ? 0 : 1) + (tw.paper - Math.floor(tw.paper))) * LINE;
  });
  const shown = lines.slice(-7);
  return (
    <group ref={group}>
      {shown.map((v, i) => (
        <Geo key={lines.length - shown.length + i} g={flatFigures(`line-${v}`, digitsOf(v).reverse(), 0.03, GAP, 0.004)} p={[0, AXLE.y + (shown.length - 1 - i) * LINE, PAPER_Z + 0.002]} />
      ))}
    </group>
  );
}

export function Printer() {
  return (
    <group>
      <Part id="frame">
        {[-CHEEK, CHEEK].map((x) => (
          <Plate
            key={x}
            k="tw-pr-cheek"
            shape={sideShape([[0.25, 0], [-0.3, 0], [-0.3, 0.3], [-0.13, 0.5], [-0.13, 0.66], [-0.3, 0.76], [-0.3, 0.98], [0.08, 0.98], [0.2, 0.62], [0.24, 0.12]], [[AXLE.z, AXLE.y, 0.03], [PAPER_Z - SUPPLY[1], SUPPLY[0], 0.022], [PAPER_Z - TAKEUP[1], TAKEUP[0], 0.022], [TYPE_R + 0.03, AXLE.y - 0.04, 0.018]])}
            depth={0.04}
            p={[x - 0.02, 0, 0]}
            r={YZ_X}
          />
        ))}
        <Box c={[0, 0.03, 0]} s={[2 * CHEEK + 0.14, 0.06, 0.56]} />
        <Rod a={[-CHEEK, 0.9, 0.05]} b={[CHEEK, 0.9, 0.05]} r={0.014} />
        <Callout id="frame" p={[CHEEK + 0.02, 0.6, 0.12]} />
      </Part>

      <Part id="type-wheels">
        <Cyl c={[0, AXLE.y, AXLE.z]} r={0.012} len={2 * CHEEK + 0.06} axis="x" seg={14} />
        {Array.from({ length: DIGITS }, (_, j) => (
          <SpinX key={j} at={[typeX(j), AXLE.y, AXLE.z]} angle={() => (tw.type[j] * TAU) / 10}>
            <Turn k="tw-pr-type" profile={[[0.012, -0.022], [TYPE_R, -0.022], [TYPE_R, 0.022], [0.012, 0.022]]} axis="x" seg={40} />
            <Geo g={axleFigures('type-read', TYPE_R, 0.03, 0.003, -0.011)} />
            <Geo g={axleFigures('type-print', TYPE_R, 0.03, 0.003, 0.011, Math.PI)} />
          </SpinX>
        ))}
        <Callout id="type-wheels" p={[typeX(0), AXLE.y + TYPE_R, 0.03]} />
      </Part>

      <Part id="racks">
        {Array.from({ length: DIGITS }, (_, j) => (
          <group key={j}>
            <SpinX at={[typeX(j) + 0.03, AXLE.y, AXLE.z]} angle={() => (tw.type[j] * TAU) / 10}>
              <GearX k="pr-set" n={20} m={0.004} x={-0.006} t={0.008} bore={0.012} />
            </SpinX>
            <Slide offset={() => [0, (tw.type[j] % 10) * 0.004, 0]}>
              <Box c={[typeX(j) + 0.03, AXLE.y - 0.2, AXLE.z - 0.045]} s={[0.01, 0.34, 0.012]} />
            </Slide>
          </group>
        ))}
        <Callout id="racks" p={[typeX(6) + 0.03, AXLE.y - 0.25, -0.05]} />
      </Part>

      <Part id="paper">
        <Box c={[0, (SUPPLY[0] + TAKEUP[0]) / 2, PAPER_Z]} s={[2 * CHEEK - 0.16, TAKEUP[0] - SUPPLY[0], 0.002]} />
        <Strip />
        <Callout id="paper" p={[-0.22, 0.75, PAPER_Z + 0.01]} />
      </Part>

      <Part id="rolls">
        {[SUPPLY, TAKEUP].map(([y, r], i) => (
          <SpinX key={i} at={[0, y, PAPER_Z - r]} angle={() => (i ? 1 : -1) * tw.paper * 0.5}>
            <Cyl c={[0, 0, 0]} r={r} len={2 * CHEEK - 0.16} axis="x" seg={28} />
            <Cyl c={[0, 0, 0]} r={0.012} len={2 * CHEEK + 0.06} axis="x" seg={12} />
            <Box c={[0, r * 0.7, 0]} s={[2 * CHEEK - 0.17, 0.004, 0.01]} />
          </SpinX>
        ))}
        <Callout id="rolls" p={[0.2, TAKEUP[0] + TAKEUP[1], PAPER_Z - 0.1]} />
      </Part>

      <Part id="hammer">
        <group position={[0, AXLE.y, 0]}>
          <Slide offset={() => [0, 0, -0.06 * (1 - tw.hammer)]}>
            <Box c={[0, 0, PAPER_Z - 0.03]} s={[2 * CHEEK - 0.18, 0.032, 0.05]} />
            <Box c={[0, 0, PAPER_Z - 0.08]} s={[0.06, 0.06, 0.06]} />
            <Rod a={[0, 0, PAPER_Z - 0.1]} b={[0, -0.3, PAPER_Z - 0.16]} r={0.01} />
          </Slide>
          {[-0.3, 0.3].map((x) => <Box key={x} c={[x, 0, PAPER_Z - 0.08]} s={[0.03, 0.05, 0.14]} />)}
        </group>
        <Callout id="hammer" p={[0.28, AXLE.y - 0.04, PAPER_Z - 0.1]} />
      </Part>

      <Part id="ink">
        <SpinX at={[0, AXLE.y - 0.04, TYPE_R + 0.03]} angle={() => -tw.type.reduce((a, b) => a + b, 0) * 0.3}>
          <Cyl c={[0, 0, 0]} r={0.035} len={2 * CHEEK - 0.1} axis="x" seg={24} />
          <Cyl c={[0, 0, 0]} r={0.01} len={2 * CHEEK + 0.06} axis="x" seg={10} />
        </SpinX>
        <Box c={[0, AXLE.y - 0.12, TYPE_R + 0.07]} s={[2 * CHEEK - 0.08, 0.08, 0.1]} />
        <Callout id="ink" p={[-0.25, AXLE.y - 0.08, TYPE_R + 0.12]} />
      </Part>

      <Part id="feed">
        <SpinX at={[CHEEK + 0.07, TAKEUP[0], PAPER_Z - TAKEUP[1]]} angle={() => tw.paper * (TAU / 24)}>
          <GearX k="pr-ratchet" n={24} m={0.008} x={-0.01} t={0.02} bore={0.012} />
        </SpinX>
        <Rod a={[CHEEK + 0.09, TAKEUP[0] - 0.1, PAPER_Z - TAKEUP[1] - 0.02]} b={[CHEEK + 0.09, 0.08, -0.1]} r={0.008} />
        <Callout id="feed" p={[CHEEK + 0.1, TAKEUP[0] + 0.1, PAPER_Z - 0.1]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'frame', index: 1, name: '机架', en: 'Frame', role: '两片铸铁侧板', material: '铸铁', description: '两片镂空铸铁侧板，托着字轮轴、墨辊和两只纸卷。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'type-wheels', index: 2, name: '字轮组 ×8', en: 'Type Wheels', role: '排出 f(n)', material: '黄铜 · 反字', description: '八个字轮，最高位在左。每个轮缘有两圈数字：左半圈朝前给人读，右半圈错开 180° 是铅字，转到正后方的那个被印上纸。真正的铅字是反字，这里画成正字便于读。', explode: [0, 0.05, 0.4], stage: [0.5, 0.7] },
  { id: 'racks', index: 3, name: '置数齿条', en: 'Setting Racks', role: '跟着 D0 走', material: '钢', description: '每个字轮旁一个小齿轮，由计算核心的结果传送杆经齿条带动：D0 那一位转几格，字轮就转几格。前半拍算完后，字轮在 0.5–0.6 圈之间对好新数。', explode: [0, -0.3, -0.3], stage: [0.6, 0.8] },
  { id: 'paper', index: 4, name: '纸带', en: 'Paper Strip', role: '印出来的表', material: '纸', description: '纸带在字轮后面，从下面的供纸卷往上走，印字面朝前，越过字轮顶就能读到。纸上的数字就是机器真正印出来的 f(0)、f(1)、f(2)……最新的一行在最下面。', explode: [0, 0, -0.6], stage: [0.3, 0.45] },
  { id: 'rolls', index: 5, name: '供纸卷与收纸卷', en: 'Paper Rolls', role: '放纸 · 收纸', material: '木芯', description: '下面放纸、上面收纸。每印一行纸带上走 50 mm。', explode: [0, 0.2, -0.6], stage: [0.2, 0.35] },
  { id: 'hammer', index: 6, name: '压印锤', en: 'Hammer', role: '把纸压上字轮', material: '钢 · 毡垫', description: '一根横条锤从纸背后打过来，把纸压在八个字轮上：一次印出一整行。由凸轮鼓上的压印凸轮控制。', explode: [0, 0, -0.9], stage: [0.08, 0.2] },
  { id: 'ink', index: 7, name: '墨辊与墨槽', en: 'Ink Roller', role: '给字轮上墨', material: '橡胶 · 铸铁', description: '从前下方贴着字轮转，字轮每转一格就沾上新墨。', explode: [0, -0.25, 0.5], stage: [0.36, 0.5] },
  { id: 'feed', index: 8, name: '进纸棘轮', en: 'Feed Ratchet', role: '一次走一行', material: '钢', description: '24 齿棘轮装在收纸卷轴头上，进纸凸轮经拉杆每拍拨它一下，纸带上走一行。', explode: [0.4, 0.1, 0], stage: [0, 0.14] },
];

const STEPS: StepDef[] = [
  {
    title: '印字层', en: 'Printer',
    body: '计算核心算出 f(n+1) 之后，字轮经齿条跟着 D0 转到同样的数字，压印锤一打，整行印上纸；进纸棘轮再把纸带拨上一行。纸上的每一行都是机器真正算出来的值。',
    state: { explode: 0, section: false, running: true, select: 'type-wheels', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆下进纸棘轮和压印锤，取下纸卷和纸带，抽出墨辊，再取下字轮组和置数齿条。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const printerLevel: MachineDef = level({
  id: 'tower/printer',
  parent: 'tower',
  unit: 9,
  bounds: [[-CHEEK - 0.1, 0, -0.28], [CHEEK + 0.1, 0.98, 0.3]],
  name: '印字层',
  en: 'Printer',
  subtitle: '子组件 · 八个字轮 · 压印 · 进纸',
  summary: '8 种零件：字轮组、置数齿条、纸带、压印锤、墨辊、进纸棘轮……',
  drawingNo: 'GW-TG-05',
  scale: '1 : 4',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'hammer', origin: [0, AXLE.y, PAPER_Z - 0.05] }],
  centreLines: [[[-CHEEK - 0.1, AXLE.y, AXLE.z], [CHEEK + 0.1, AXLE.y, AXLE.z], TYPE_R]],
  steps: STEPS,
  camera: {
    target: [0, 0.48, 0],
    offset: [1.2, 0.8, 2.4],
    orthoDistance: 4,
    exploded: { target: [0, 0.5, 0.2], scale: 1.5 },
  },
  Model: Printer,
  Driver: TowerDriver,
  Controls: TowerControls,
});
