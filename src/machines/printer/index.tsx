import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Turn } from '../kit';

/**
 * Bed-slinger FDM printer: the bed moves front–back (Y, along z here), the
 * print head moves left–right on the gantry (X), and two lead screws lift
 * the gantry (Z). Millimetres; y up; layers drawn 2 mm thick.
 */

const BED_Y = 60;
const RAIL_X = 175;
const LAYERS = 20;
const LAYER_H = 2;
const SIDE = 40;
const LAYER_T = 3.2;

export const printMotion = { t: 0 };
export function PrinterDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) printMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}

/** Head X, bed offset and layer for time t: one square perimeter per layer. */
export function printState(t: number) {
  const total = t % (LAYERS * LAYER_T + 3);
  const layer = Math.min(LAYERS, Math.floor(total / LAYER_T));
  const u = (total % LAYER_T) / LAYER_T;
  const h = SIDE / 2;
  const s = (u * 4) % 1;
  const edge = Math.floor(u * 4);
  const corners: Array<[number, number]> = [[-h, -h], [h, -h], [h, h], [-h, h], [-h, -h]];
  const [ax, ay] = corners[edge];
  const [bx, by] = corners[edge + 1];
  const done = layer >= LAYERS;
  return { x: done ? 0 : ax + (bx - ax) * s, y: done ? 60 : ay + (by - ay) * s, layer, z: (done ? LAYERS : layer) * LAYER_H + 1 + (done ? 40 : 0) };
}

function Move({ get, children }: { get: (s: ReturnType<typeof printState>, g: THREE.Group) => void; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) get(printState(printMotion.t), ref.current); });
  return <group ref={ref}>{children}</group>;
}

export function Printer() {
  return (
    <group>
      <Part id="frame">
        <Box c={[0, 10, 0]} s={[380, 20, 300]} />
        {[1, -1].map((s) => <Box key={s} c={[s * (RAIL_X + 18), 220, -20]} s={[20, 400, 40]} />)}
        <Box c={[0, 430, -20]} s={[2 * RAIL_X + 56, 20, 40]} />
        <Callout id="frame" p={[RAIL_X + 30, 300, -20]} />
      </Part>
      <Part id="y-axis">
        {[1, -1].map((s) => <Cyl key={s} c={[s * 60, 30, 0]} r={4} len={300} axis="z" seg={12} />)}
        <Box c={[0, 26, 0]} s={[6, 3, 280]} />
        <Box c={[0, 34, -150]} s={[44, 44, 44]} />
        <Callout id="y-axis" p={[60, 34, 120]} />
      </Part>
      <Part id="bed">
        <Move get={(s, g) => { g.position.z = -s.y; }}>
          <Box c={[0, 44, 0]} s={[230, 6, 230]} />
          <Box c={[0, BED_Y - 3, 0]} s={[220, 6, 220]} />
          {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => <Cyl key={`${a}${b}`} c={[a * 100, 50, b * 100]} r={6} len={8} seg={12} />)}
        </Move>
        <Callout id="bed" p={[-100, BED_Y, 100]} />
      </Part>
      <Part id="print">
        <Move get={(s, g) => { g.position.set(0, BED_Y, -s.y); g.scale.y = Math.max(0.001, s.layer); }}>
          <Box c={[0, LAYER_H / 2, 0]} s={[SIDE, LAYER_H, SIDE]} />
        </Move>
        <Callout id="print" p={[SIDE / 2, BED_Y + 20, SIDE / 2]} />
      </Part>
      <Part id="z-axis">
        {[1, -1].map((s) => (
          <group key={s}>
            <Cyl c={[s * RAIL_X, 215, -20]} r={4} len={370} seg={12} />
            <Box c={[s * RAIL_X, 42, -20]} s={[44, 44, 44]} />
            <Cyl c={[s * (RAIL_X - 14), 215, -20]} r={4} len={370} seg={12} />
          </group>
        ))}
        <Callout id="z-axis" p={[-RAIL_X, 300, -10]} />
      </Part>
      <Part id="gantry">
        <Move get={(s, g) => { g.position.y = s.z; }}>
          <Box c={[0, BED_Y + 52, -20]} s={[2 * RAIL_X + 20, 22, 14]} />
          <Box c={[0, BED_Y + 70, -20]} s={[2 * RAIL_X + 20, 6, 8]} />
          {[1, -1].map((s) => <Box key={s} c={[s * RAIL_X, BED_Y + 58, -20]} s={[48, 48, 40]} />)}
          <Box c={[-RAIL_X - 40, BED_Y + 58, -20]} s={[42, 42, 42]} />
        </Move>
        <Callout id="gantry" p={[RAIL_X - 40, BED_Y + 90, -20]} />
      </Part>
      <Part id="head">
        <Move get={(s, g) => { g.position.set(s.x, s.z, 0); }}>
          <Box c={[0, BED_Y + 56, -2]} s={[50, 60, 22]} />
          <Box c={[0, BED_Y + 30, 0]} s={[22, 14, 22]} />
          <Turn k="pr-nozzle" profile={[[0, 0], [1.5, 0], [5, 8], [5, 18], [0, 18]]} p={[0, BED_Y, 0]} seg={20} />
          <Box c={[30, BED_Y + 30, 0]} s={[8, 30, 30]} />
        </Move>
        <Callout id="head" p={[30, BED_Y + 100, 10]} />
      </Part>
      <Part id="spool">
        <group position={[0, 475, -20]}>
          <Move get={(_, g) => { g.rotation.z = printMotion.t * 0.4; }}>
            <Turn k="pr-spool" profile={[[14, -30], [72, -30], [72, -26], [40, -26], [40, 26], [72, 26], [72, 30], [14, 30]]} axis="z" seg={56} />
          </Move>
        </group>
        <Box c={[0, 450, -20]} s={[20, 40, 20]} />
        <Callout id="spool" p={[90, 560, 0]} />
      </Part>
      <Part id="board">
        <Box c={[RAIL_X - 40, 30, 145]} s={[100, 40, 12]} />
        <Box c={[RAIL_X - 40, 36, 152]} s={[60, 22, 2]} />
        <Callout id="board" p={[RAIL_X - 40, 50, 152]} />
      </Part>
    </group>
  );
}

export function PrinterControls() {
  const [s, setS] = useState({ layer: 0 });
  useEffect(() => {
    const id = window.setInterval(() => setS({ layer: printState(printMotion.t).layer }), 150);
    return () => window.clearInterval(id);
  }, []);
  const done = s.layer >= LAYERS;
  return (
    <>
      <div className="strokes">
        <span className="is-on">{done ? '打印完成' : `第 ${s.layer + 1} 层`}</span>
        <b>{Math.round((Math.min(s.layer, LAYERS) / LAYERS) * 100)}%</b>
      </div>
      <p className="gear-note">喷头沿 X 走、热床沿 Y 走，两者合起来画出一层的轮廓；每层画完，Z 轴把横梁抬高一层（真实层厚 0.2 mm，这里放大成 2 mm）。</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'frame', index: 1, name: '机架', en: 'Frame', role: '骨架', material: '铝型材', description: '底座加一个门形立柱，刚度决定了打印件的精度。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'y-axis', index: 2, name: 'Y 轴', en: 'Y Axis', role: '前后移动热床', material: '钢 / 橡胶同步带', description: '步进电机通过同步带拉着热床在两根光轴上前后滑。', explode: [0, -60, 0], stage: [0.72, 0.86] },
  { id: 'bed', index: 3, name: '热床', en: 'Heated Bed', role: '承托 · 加热', material: '铝板 / 弹簧钢板', description: '加热到 60℃ 左右，让第一层牢牢粘住；四角的旋钮用来调平。', explode: [0, 40, 120], stage: [0.5, 0.64] },
  { id: 'print', index: 4, name: '打印件', en: 'Print', role: '成品', material: 'PLA 塑料', description: '一层一层堆起来——这就是“增材制造”。', explode: [0, 120, 180], stage: [0, 0.12] },
  { id: 'z-axis', index: 5, name: 'Z 轴丝杠', en: 'Z Lead Screws', role: '升降横梁', material: '钢', description: '两侧各一个步进电机带一根丝杠，每层结束把横梁精确抬高一层厚度。', explode: [0, 0, -80], stage: [0.62, 0.76] },
  { id: 'gantry', index: 6, name: 'X 轴横梁', en: 'X Gantry', role: '承载打印头', material: '铝型材', description: '横跨两根立柱，上面装着 X 轴电机和同步带。', explode: [0, 140, -40], stage: [0.36, 0.5] },
  { id: 'head', index: 7, name: '打印头', en: 'Print Head', role: '熔化 · 挤出', material: '铝 / 黄铜', description: '上面的挤出机齿轮把塑料丝往下送，下面的加热块把它熔到 200℃ 左右，从 0.4 mm 的黄铜喷嘴挤出来；侧面的风扇让刚挤出的塑料马上冷却定型。', explode: [0, 200, 60], stage: [0.2, 0.34] },
  { id: 'spool', index: 8, name: '耗材盘', en: 'Filament Spool', role: '供料', material: 'PLA 丝', description: '1.75 mm 粗的塑料丝绕在盘上，随打印慢慢放出。', explode: [0, 120, 0], stage: [0.1, 0.22] },
  { id: 'board', index: 9, name: '主板与屏幕', en: 'Controller', role: '读 G 代码', material: '—', description: '读取切片软件生成的 G 代码，指挥每个电机走多少步、喷头多热、风扇多快。', explode: [60, 0, 80], stage: [0.84, 0.96] },
];

const STEPS: StepDef[] = [
  {
    title: '3D 打印机', en: 'FDM Printer',
    body: '三个方向的运动合起来：喷头左右走（X），热床前后走（Y），一层画完横梁抬高一层（Z）。看台面上的方块一层层长高，左栏显示打印进度。',
    state: { explode: 0, section: false, running: true, select: 'head', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '取下打印件和耗材盘，拆打印头和 X 横梁，再拆热床、Z 轴、Y 轴和主板。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const printer: MachineDef = level({
  id: 'printer',
  unit: 0.012,
  bounds: [[-RAIL_X - 62, 0, -150], [RAIL_X + 28, 600, 160]],
  name: '3D 打印机',
  en: 'FDM 3D Printer',
  subtitle: '整机 · 热床平移式 · 三轴联动',
  summary: '9 种零件 · 三轴联动，打印件一层层长高',
  drawingNo: 'GW-DY-00',
  scale: '1 : 5',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'head', origin: [0, BED_Y + 56, 0] }],
  centreLines: [[[0, 0, 0], [0, 140, 0]]],
  steps: STEPS,
  camera: { target: [0, 280, 0], offset: [560, 380, 1200], orthoDistance: 3200, exploded: { target: [0, 280, 30], scale: 1.3 } },
  Model: Printer,
  Driver: PrinterDriver,
  Controls: PrinterControls,
});
