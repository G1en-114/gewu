import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Rod, Turn } from '../kit';
import { shaperMotion, ShaperDriver } from './motion';

/**
 * Shaper tool head, hanging under the front end of the ram. The swivel base
 * turns ±60°; the vertical slide feeds the tool down through 120 mm; the
 * clapper box lifts the tool on the return stroke so it does not drag.
 * Local origin at the mounting face under the ram, +y up (the head hangs
 * into −y). Millimetres.
 */

/** Clapper box: pivots about z so the tool lifts on the quick return. */
function Clapper({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = -shaperMotion.clapper;
  });
  return <group ref={ref} position={[0, -110, 0]}>{children}</group>;
}

/** Vertical slide, shown at the middle of its 120 mm travel. */
function Slide({ children }: { children: ReactNode }) {
  return <group position={[0, -40, 0]}>{children}</group>;
}

export function ToolHead() {
  return (
    <group>
      <Part id="swivel">
        <Box c={[0, -22, 0]} s={[220, 44, 180]} />
        <Cyl c={[0, -22, 0]} r={64} len={200} axis="z" seg={36} />
        <Box c={[0, -6, 0]} s={[190, 14, 130]} />
        {Array.from({ length: 13 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <Box key={i} c={[70 * Math.sin(a), -22 + 70 * Math.cos(a), 99]} s={[4, 14, 2]} r={[0, 0, a]} />;
        })}
        {[1, -1].map((s) => (
          <Box key={s} c={[88, -2, s * 58]} s={[26, 14, 26]} />
        ))}
        <Callout id="swivel" p={[120, -18, 70]} />
      </Part>

      <Slide>
        <Part id="slide">
          <Box c={[0, -58, 0]} s={[150, 110, 150]} />
          {[1, -1].map((s) => (
            <Box key={s} c={[0, -58, s * 82]} s={[130, 110, 18]} />
          ))}
          <Callout id="slide" p={[-96, -36, 90]} />
        </Part>

        <Part id="screw">
          <Cyl c={[0, -60, 82]} r={12} len={140} />
          <Turn k="th-screw-thread" profile={[[12, -118], [17, -118], [17, -84], [12, -84]]} p={[0, 0, 82]} axis="y" seg={24} />
          <Callout id="screw" p={[0, -100, 112]} />
        </Part>

        <Part id="dial">
          <Cyl c={[0, -2, 82]} r={28} len={12} />
          {Array.from({ length: 20 }, (_, i) => (
            <group key={i} rotation={[0, (i / 20) * Math.PI * 2, 0]}>
              <Box c={[0, -2, 100]} s={[2.5, 9, 2.5]} />
            </group>
          ))}
          <Callout id="dial" p={[38, -2, 94]} />
        </Part>

        <Part id="handle">
          <Turn k="th-handle" profile={[[0, 76], [54, 76], [54, 94], [0, 94]]} axis="z" p={[0, -16, 0]} seg={36} />
          {[0, 1, 2].map((i) => (
            <Rod key={i} a={[0, -16, 86]} b={[42 * Math.cos((i * Math.PI * 2) / 3), -16 + 42 * Math.sin((i * Math.PI * 2) / 3), 86]} r={7} seg={10} />
          ))}
          <Rod a={[-26, -16, 98]} b={[-56, -16, 98]} r={9} seg={12} />
          <Callout id="handle" p={[-66, -16, 104]} />
        </Part>

        <Part id="clamp">
          <Rod a={[78, -44, 22]} b={[126, -14, 22]} r={9} seg={10} />
          <Rod a={[126, -14, 22]} b={[158, 0, 22]} r={12} seg={14} />
          <Callout id="clamp" p={[136, 18, 40]} />
        </Part>

        <Clapper>
          <Part id="clapper">
            <Box c={[0, -20, 0]} s={[150, 40, 100]} />
            <Cyl c={[0, 0, 0]} r={15} len={130} axis="z" seg={16} />
            <Box c={[0, -42, 0]} s={[110, 12, 110]} />
            <Callout id="clapper" p={[80, -26, 56]} />
          </Part>
          <Part id="tool">
            <Box c={[0, -52, 0]} s={[28, 64, 34]} />
            <Box c={[0, -18, 0]} s={[44, 24, 40]} />
            <Callout id="tool" p={[24, -76, 26]} />
          </Part>
          <Part id="tool-clamp">
            {[1, -1].map((s) => (
              <Box key={s} c={[0, -10, s * 42]} s={[130, 14, 24]} />
            ))}
            <Rod a={[58, -4, 52]} b={[100, 8, 54]} r={8} seg={10} />
            <Callout id="tool-clamp" p={[92, 12, 64]} />
          </Part>
        </Clapper>
      </Slide>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'swivel', index: 1, name: '转盘（刀架座）', en: 'Swivel Base', role: '回转 ±60°', material: 'HT200 灰铸铁', description: '用 T 形螺栓装在滑枕前端，松开后可带动整个刀架在垂直面内回转 ±60°，用来刨斜面、燕尾面。圆周上有刻度。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'slide', index: 2, name: '滑板', en: 'Vertical Slide', role: '垂直进刀', material: 'HT200 灰铸铁', description: '装在转盘的燕尾导轨里，垂直行程 120 mm。转动手轮经丝杠让它上下移动，吃刀深度就靠它调。', explode: [0, 160, 0], stage: [0.7, 0.84] },
  { id: 'screw', index: 3, name: '进给丝杠', en: 'Down-Feed Screw', role: '把转动变移动', material: '45 钢', description: '垂直丝杠：手轮转一圈，滑板走一个螺距（这里按 4 mm）。丝杠和螺母之间的间隙磨损后可以调整。', explode: [120, 100, 200], stage: [0.58, 0.7] },
  { id: 'dial', index: 4, name: '刻度盘', en: 'Graduated Dial', role: '读进刀量', material: '铝 / 钢', description: '手轮上面的刻度盘，一圈分成 100 格；螺距 4 mm 时每格就是 0.04 mm 的吃刀量。', explode: [140, 160, 150], stage: [0.48, 0.6] },
  { id: 'handle', index: 5, name: '进刀手轮', en: 'Down-Feed Handwheel', role: '手动进刀', material: '铸铁 / 塑料', description: '三个手柄的进刀手轮，松开锁紧手柄就能转动，经丝杠让滑板带着刨刀下降吃刀。', explode: [180, 120, 240], stage: [0.38, 0.5] },
  { id: 'clamp', index: 6, name: '锁紧手柄', en: 'Slide Clamp', role: '锁住滑板', material: '45 钢', description: '调好吃刀量后扳紧，把滑板锁在转盘上，刨削时的切削力就不会让它往上退。', explode: [180, 220, 120], stage: [0.28, 0.4] },
  { id: 'clapper', index: 7, name: '拍板（刀夹座）', en: 'Clapper Box', role: '返回时抬刀', material: 'HT200 灰铸铁', description: '铰在滑板下端，只能朝一个方向抬。切削行程中它被压在工件上不动；返回行程时被掀起十几度，刨刀贴着工件滑回来，不刮伤已加工面。', explode: [0, -80, 220], stage: [0.18, 0.3] },
  { id: 'tool', index: 8, name: '刨刀', en: 'Shaping Tool', role: '切削', material: '高速钢 / 硬质合金', description: '20 × 30 mm 的刀柄夹在拍板里，刀尖朝下。刨床是单刃间断切削，回程不切削，所以刀尖寿命比连续切削的刀具好。', explode: [0, -160, 160], stage: [0.08, 0.18] },
  { id: 'tool-clamp', index: 9, name: '刀夹压板与螺钉', en: 'Tool Clamp', role: '夹紧刨刀', material: '45 钢', description: '两块压板和螺钉把刨刀压在拍板的槽里。刀尖伸出长度要短，悬伸越长越容易让刀、产生振动。', explode: [0, -200, 0], stage: [0.02, 0.1] },
];

const STEPS: StepDef[] = [
  {
    title: '刀架', en: 'Tool Head',
    body: '刀架挂在滑枕前端：上面是转盘，中间是滑板，下面是会抬起的拍板。刨削时滑板锁紧，拍板被压住；返回时拍板抬起让刀。',
    state: { explode: 0, section: false, running: true, select: 'clapper', focus: null },
  },
  {
    title: '吃刀与抬刀', en: 'Cut & Lift',
    body: '转动手轮，丝杠让滑板下降吃刀；切削行程拍板贴住工件，返回行程拍板绕铰点掀起约十几度，刨刀滑回来不碰已加工面。',
    state: { explode: 0, section: true, running: true, select: 'clapper', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '松开刀夹压板取下刨刀；拆拍板铰轴，取下拍板；再拆手轮、刻度盘和丝杠，把滑板从转盘的燕尾槽里抽出来。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const toolHeadLevel: MachineDef = level({
  id: 'shaper/tool-head',
  parent: 'shaper',
  unit: 0.05,
  bounds: [[-200, -330, -200], [210, 30, 240]],
  name: '刀架',
  en: 'Tool Head',
  subtitle: '子组件 · 转盘 ±60° · 垂直行程 120 mm',
  summary: '9 种零件 · 转盘、滑板和会抬起的拍板，会动',
  drawingNo: 'GW-BC-02',
  scale: '1 : 3',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'clapper', origin: [0, -180, 0] }],
  centreLines: [[[0, -300, 0], [0, 30, 0], 60]],
  steps: STEPS,
  camera: {
    target: [0, -120, 40],
    offset: [760, 560, 1250],
    orthoDistance: 2400,
    exploded: { target: [0, -100, 60], scale: 1.4 },
  },
  Model: ToolHead,
  Driver: ShaperDriver,
});
