import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { coil } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Turn, TO } from '../kit';

/**
 * Retractable ballpoint pen: the click mechanism is a rotating cam riding on
 * ribs inside the barrel. Axis along x, writing tip at x = 0, button at the
 * +x end; millimetres.
 */

const RIBS = 8;
/** Seconds per click; each click turns the cam by half a rib pitch. */
const CLICK = 2.2;

export const penMotion = { t: 0 };
export function PenDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) penMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** Button travel, cam angle and refill position through the click cycle. */
export function penState(t: number) {
  const n = Math.floor(t / CLICK);
  const c = (t % CLICK) / CLICK;
  const press = smooth(c / 0.3) - smooth((c - 0.45) / 0.3);
  const turn = smooth((c - 0.2) / 0.5);
  const out = n % 2 === 0;
  // After this click the cam locks on a short rib (writing) or drops into a long channel (retracted).
  const rest = (k: number) => (k % 2 === 0 ? 0 : 3.5);
  const settled = rest(n + 1);
  const before = rest(n);
  const refill = Math.max(press * 4.5, before + (settled - before) * smooth((c - 0.55) / 0.35));
  return {
    button: -press * 5,
    cam: ((n + turn) * Math.PI) / RIBS,
    refill: out ? refill : refill,
  };
}

function Moving({ k, children }: { k: 'button' | 'refill' | 'cam'; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const s = penState(penMotion.t);
    if (k === 'cam') {
      ref.current.rotation.x = s.cam;
      ref.current.position.x = -s.refill;
    } else if (k === 'button') ref.current.position.x = Math.min(s.button, -s.refill + 0.5);
    else ref.current.position.x = -s.refill;
  });
  return <group ref={ref}>{children}</group>;
}

export function Pen() {
  return (
    <group>
      <Part id="lower">
        <Turn k="pen-lower" profile={[[1.0, 0.5], [1.6, 0.5], [5.2, 22], [5.2, 76], [4.4, 76], [4.4, 24], [3.0, 12], [2.4, 10], [2.4, 8], [1.0, 5]]} axis="x" seg={40} />
        {Array.from({ length: 9 }, (_, i) => <Turn key={i} k="pen-grip" profile={[[5.2, 0], [5.6, 0.4], [5.6, 1.4], [5.2, 1.8]]} p={[26 + i * 2.6, 0, 0]} axis="x" seg={40} />)}
        <Callout id="lower" p={[40, 5.5, 2]} />
      </Part>
      <Part id="upper">
        <Turn k="pen-upper" profile={[[4.4, 74], [5.3, 74], [5.3, 132], [4.6, 135], [3.9, 135], [3.9, 128], [4.4, 126]]} axis="x" seg={40} />
        {Array.from({ length: RIBS }, (_, i) => {
          const a = (i / RIBS) * Math.PI * 2;
          const long = i % 2 === 0;
          return (
            <group key={i} rotation={[a, 0, 0]}>
              <Box c={[long ? 109 : 116, 4.15, 0]} s={[long ? 28 : 14, 0.6, 1.0]} />
            </group>
          );
        })}
        <Callout id="upper" p={[100, 5.5, 2]} />
      </Part>
      <Part id="clip">
        <Box c={[118, 6.3, 0]} s={[34, 0.8, 3.2]} />
        <Box c={[132, 5.6, 0]} s={[4, 2, 3.2]} />
        <Box c={[101.5, 5.7, 0]} s={[2, 1.2, 3.2]} />
        <Callout id="clip" p={[112, 7, 1.6]} />
      </Part>
      <Part id="refill">
        <Moving k="refill">
          <Cyl c={[56, 0, 0]} r={1.6} len={104} axis="x" seg={20} />
          <Turn k="pen-tip" profile={[[0, -2.2], [0.35, -2.4], [1.0, 0.5], [1.6, 4], [0, 4]]} axis="x" seg={20} />
          <Turn k="pen-ball" profile={[[0, -2.75], [0.25, -2.65], [0.35, -2.4], [0.25, -2.15], [0, -2.05]]} axis="x" seg={16} />
          <Turn k="pen-flange" profile={[[1.6, 21], [2.6, 21], [2.6, 22.2], [1.6, 22.2]]} axis="x" seg={20} />
          <Turn k="pen-ink" profile={[[0, 30], [1.25, 30], [1.25, 96], [0, 96]]} axis="x" seg={16} />
        </Moving>
        <Callout id="refill" p={[70, 1.6, 1]} />
      </Part>
      <Part id="spring">
        <M clip geo={coil('pen-spring', 2.3, 0.22, 12, 9)} p={[10, 0, 0]} r={TO.x} />
        <Callout id="spring" p={[15, 2.6, 1]} />
      </Part>
      <Part id="cam">
        <Moving k="cam">
          <Turn k="pen-cam" profile={[[0, 108], [3.2, 108], [3.2, 120], [2.2, 121], [0, 121]]} axis="x" seg={32} />
          {Array.from({ length: RIBS / 2 }, (_, i) => (
            <group key={i} rotation={[(i / (RIBS / 2)) * Math.PI * 2 + Math.PI / RIBS, 0, 0]}>
              <Box c={[111, 3.55, 0]} s={[6, 0.8, 1.4]} />
              <Box c={[114.5, 3.55, 0.35]} s={[1.6, 0.8, 1.4]} r={[0.6, 0, 0]} />
            </group>
          ))}
          {Array.from({ length: RIBS }, (_, i) => (
            <group key={i} rotation={[(i / RIBS) * Math.PI * 2, 0, 0]}>
              <Box c={[121.2, 2.2, 0]} s={[1.6, 1.4, 1.6]} r={[0, 0, 0.7]} />
            </group>
          ))}
        </Moving>
        <Callout id="cam" p={[114, 3.8, 1.5]} />
      </Part>
      <Part id="button">
        <Moving k="button">
          <Turn k="pen-plunger" profile={[[0, 122], [2.9, 122], [2.9, 139], [3.7, 139], [3.7, 150], [3.2, 151.5], [0, 151.5]]} axis="x" seg={32} />
          {Array.from({ length: RIBS }, (_, i) => (
            <group key={i} rotation={[(i / RIBS) * Math.PI * 2 + Math.PI / RIBS, 0, 0]}>
              <Box c={[121.6, 3.2, 0]} s={[1.6, 1.2, 1.4]} r={[0, 0, -0.7]} />
            </group>
          ))}
        </Moving>
        <Callout id="button" p={[146, 3.8, 1.5]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'upper', index: 1, name: '上笔杆', en: 'Upper Barrel', role: '外壳 · 内肋', material: '塑料', description: '内壁一圈 8 条纵向肋，长短相间。转子卡在短肋顶上时笔尖伸出，落进长肋之间的槽里时笔尖缩回。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'lower', index: 2, name: '下笔杆', en: 'Lower Barrel', role: '握持 · 笔尖导向', material: '塑料 / 橡胶', description: '和上笔杆拧在一起，前端收窄成笔尖口，里面一个台阶顶住弹簧。', explode: [-40, 0, 0], stage: [0.12, 0.26] },
  { id: 'refill', index: 3, name: '笔芯', en: 'Refill', role: '书写', material: '塑料管 / 黄铜 / 钨钢球', description: '管子里是黏稠的油墨，前端黄铜笔头里嵌着一颗约 0.7 mm 的小钢球，边滚边把墨带到纸上。', explode: [-20, -12, 0], stage: [0.42, 0.58] },
  { id: 'spring', index: 4, name: '弹簧', en: 'Spring', role: '把笔芯往回推', material: '不锈钢', description: '套在笔芯前端，一直把笔芯往笔杆里推；只有转子卡在短肋上时笔尖才留在外面。', explode: [-30, -6, 0], stage: [0.26, 0.4] },
  { id: 'cam', index: 5, name: '转子', en: 'Rotating Cam', role: '一按一转', material: '塑料', description: '整个机构的核心：侧面四个凸块骑在笔杆的肋上，顶端一圈斜齿。被按钮推下时斜齿让它转过半格，所以它交替落在“短肋（伸出）”和“长槽（缩回）”两种位置上。', explode: [22, 0, 0], stage: [0.62, 0.78] },
  { id: 'button', index: 6, name: '按钮', en: 'Plunger', role: '按压', material: '塑料', description: '底端也是一圈斜齿，与转子的齿错开半齿。按下去时斜面推着转子转。', explode: [34, 0, 0], stage: [0.5, 0.64] },
  { id: 'clip', index: 7, name: '笔夹', en: 'Clip', role: '夹在口袋上', material: '钢 / 塑料', description: '靠自身弹性夹住口袋布。', explode: [0, 9, 0], stage: [0, 0.12] },
];

const STEPS: StepDef[] = [
  {
    title: '按动圆珠笔', en: 'Retractable Pen',
    body: '每按一下，笔尖伸出或缩回。剖开看后端：按钮推着转子往前走，斜齿让转子转过半格；松手后弹簧把它推回，它要么卡在短肋上（笔尖留在外面），要么滑进长槽（笔尖收回）。',
    state: { explode: 0, section: true, running: true, select: 'cam', focus: 'click' },
  },
  {
    title: '整支笔', en: 'Whole Pen',
    body: '一支笔七个零件。真正“记住”状态的只有转子转到了哪儿——这是一种不用电的机械存储。',
    state: { explode: 0, section: true, running: true, select: null, focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拧下下笔杆，取出弹簧和笔芯；从后面拔出按钮和转子。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const pen: MachineDef = level({
  id: 'pen',
  unit: 0.075,
  bounds: [[-3, -6, -6], [152, 7, 6]],
  name: '按动圆珠笔',
  en: 'Retractable Ballpoint Pen',
  subtitle: '装配体 · 旋转凸轮锁止',
  summary: '7 种零件 · 一按一转的凸轮机构，会动',
  drawingNo: 'GW-BI-00',
  scale: '1 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'refill', origin: [0, 0, 0] }],
  centreLines: [[[-8, 0, 0], [158, 0, 0], 6]],
  steps: STEPS,
  camera: { target: [75, 0, 0], offset: [-30, 85, 250], orthoDistance: 1300, exploded: { target: [75, 0, 0], scale: 1.25 }, foci: { click: { target: [118, 0, 0], scale: 0.32 } } },
  Model: Pen,
  Driver: PenDriver,
});
