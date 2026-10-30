import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, poly, Turn, XY_Z } from '../kit';

/**
 * 0–25 mm outside micrometer. Anvil face at x = 0, the spindle advancing
 * along +x is withdrawn by the reading L; 0.5 mm pitch, 50 thimble divisions.
 * Millimetres.
 */

const PITCH = 0.5;
const SLEEVE: [number, number] = [36, 64];
const ZERO = 38;

export const micMotion = { t: 0 };
export function MicDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) micMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}
/** Gap between the anvil and spindle faces. */
export const reading = (t: number) => 12.5 + 10.5 * Math.sin(t * 0.25);

function Moving({ turn, children }: { turn?: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const L = reading(micMotion.t);
    ref.current.position.x = L;
    if (turn) ref.current.rotation.x = -(L / PITCH) * Math.PI * 2;
  });
  return <group ref={ref}>{children}</group>;
}

const FRAME = poly([[-14, 7], [-14, -24], [-7, -34], [40, -34], [47, -24], [47, 7], [34, 7], [34, -20], [30, -25], [-3, -25], [-6, -20], [-6, 7]]);

export function Micrometer() {
  return (
    <group>
      <Part id="frame">
        <Plate k="mi-frame" shape={FRAME} depth={10} p={[0, 0, -5]} r={XY_Z} />
        <Box c={[16, -30, 5.4]} s={[30, 6, 0.8]} />
        <Callout id="frame" p={[10, -30, 6]} />
      </Part>
      <Part id="anvil">
        <Cyl c={[-4, 0, 0]} r={3.2} len={8} axis="x" seg={24} />
        <Callout id="anvil" p={[-3, 3.4, 2]} />
      </Part>
      <Part id="spindle">
        <Moving turn>
          <Cyl c={[18, 0, 0]} r={3.2} len={36} axis="x" seg={24} />
        </Moving>
        <Callout id="spindle" p={[24, 3.4, 2]} />
      </Part>
      <Part id="sleeve">
        <Cyl c={[(SLEEVE[0] + SLEEVE[1]) / 2 + 6, 0, 0]} r={4.6} len={SLEEVE[1] - SLEEVE[0]} axis="x" seg={32} />
        <Box c={[ZERO + 6 + 12.5, 4.62, 0]} s={[25, 0.12, 0.25]} />
        {Array.from({ length: 51 }, (_, i) => {
          const full = i % 2 === 0;
          const x = ZERO + 6 + i * 0.5;
          return <Box key={i} c={[x, full ? 4.9 : 4.3, 0]} s={[0.15, full ? (i % 10 === 0 ? 1.4 : 0.9) : 0.7, 0.2]} />;
        })}
        <Callout id="sleeve" p={[ZERO + 18, 6, 2]} />
      </Part>
      <Part id="thimble">
        <Moving turn>
          <Turn k="mi-thimble" profile={[[4.7, ZERO + 6], [6.2, ZERO + 6], [8, ZERO + 9], [8, ZERO + 34], [4.7, ZERO + 34]]} axis="x" seg={50} />
          {Array.from({ length: 50 }, (_, i) => (
            <group key={i} rotation={[(i / 50) * Math.PI * 2, 0, 0]}>
              <Box c={[ZERO + 7.2 + (i % 5 === 0 ? 0.6 : 0), 6.9, 0]} s={[i % 5 === 0 ? 2.6 : 1.4, 0.12, 0.18]} r={[0, 0, -0.75]} />
            </group>
          ))}
          {Array.from({ length: 24 }, (_, i) => (
            <group key={i} rotation={[(i / 24) * Math.PI * 2, 0, 0]}>
              <Box c={[ZERO + 26, 8.05, 0]} s={[14, 0.2, 0.4]} />
            </group>
          ))}
        </Moving>
        <Callout id="thimble" p={[ZERO + 26, 9, 3]} />
      </Part>
      <Part id="ratchet">
        <Moving turn>
          <Cyl c={[ZERO + 39, 0, 0]} r={4.6} len={10} axis="x" seg={20} />
          {Array.from({ length: 16 }, (_, i) => (
            <group key={i} rotation={[(i / 16) * Math.PI * 2, 0, 0]}><Box c={[ZERO + 40, 4.7, 0]} s={[7, 0.3, 0.5]} /></group>
          ))}
        </Moving>
        <Callout id="ratchet" p={[ZERO + 40, 6, 2]} />
      </Part>
      <Part id="lock">
        <Box c={[40.5, 9, 0]} s={[4, 4, 6]} />
        <Box c={[40.5, 12, 0]} s={[2, 4, 2]} />
        <Callout id="lock" p={[41, 13, 2]} />
      </Part>
    </group>
  );
}

/** The live reading, broken down the way it is read off the instrument. */
export function MicControls() {
  const [L, setL] = useState(12.5);
  useEffect(() => {
    const id = window.setInterval(() => setL(reading(micMotion.t)), 100);
    return () => window.clearInterval(id);
  }, []);
  const main = Math.floor(L / PITCH + 1e-6) * PITCH;
  const fine = Math.round((L - main) * 100) / 100;
  return (
    <>
      <div className="strokes">
        <span>主尺 {main.toFixed(1)}</span>
        <span>微分筒 {fine.toFixed(2)}</span>
        <b>{(main + fine).toFixed(2)} mm</b>
      </div>
      <p className="gear-note">先读套筒上露出的刻线（每格 0.5 mm），再读微分筒对准基准线的格数 × 0.01 mm，两者相加。</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'frame', index: 1, name: '尺架', en: 'Frame', role: '刚性骨架', material: '锻钢 / 隔热板', description: 'C 形尺架要非常刚硬，测量时不能变形。侧面贴着隔热板，防止手温让尺架热胀影响读数。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'anvil', index: 2, name: '测砧', en: 'Anvil', role: '固定测量面', material: '硬质合金', description: '固定不动的一端测量面，研磨得极平。', explode: [-10, 0, 0], stage: [0.7, 0.84] },
  { id: 'spindle', index: 3, name: '测微螺杆', en: 'Spindle', role: '活动测量面', material: '合金钢', description: '后半段是螺距 0.5 mm 的精密螺纹：转一圈，测量面前进或后退 0.5 mm。', explode: [-18, -14, 0], stage: [0.56, 0.7] },
  { id: 'sleeve', index: 4, name: '固定套筒（主尺）', en: 'Sleeve', role: '读整数和半毫米', material: '钢', description: '基准线上方每格 1 mm，下方错开半格，所以每格代表 0.5 mm。', explode: [0, 14, 0], stage: [0.42, 0.56] },
  { id: 'thimble', index: 5, name: '微分筒', en: 'Thimble', role: '读百分之一毫米', material: '钢', description: '圆周刻 50 格，转一圈正好对应螺杆前进 0.5 mm，所以一格就是 0.01 mm——把直线的微小位移“放大”成了一圈的转动。', explode: [24, 0, 0], stage: [0.24, 0.4] },
  { id: 'ratchet', index: 6, name: '测力装置（棘轮）', en: 'Ratchet Stop', role: '恒定测力', material: '钢', description: '最后用它拧：测量面接触工件后，棘轮打滑“咔咔”响，保证每次压紧的力都一样，读数才可靠。', explode: [36, 0, 0], stage: [0.08, 0.22] },
  { id: 'lock', index: 7, name: '锁紧装置', en: 'Spindle Lock', role: '锁住读数', material: '钢', description: '拨一下就把螺杆锁住，取下千分尺后读数不会变。', explode: [0, 14, 8], stage: [0, 0.1] },
];

const STEPS: StepDef[] = [
  {
    title: '外径千分尺', en: 'Micrometer',
    body: '精度 0.01 mm，比游标卡尺高一个量级。秘密在一根螺距 0.5 mm 的精密螺杆：微分筒转一圈，测量面只走 0.5 mm。左栏实时演示读数。',
    state: { explode: 0, section: false, running: true, select: 'thimble', focus: null },
  },
  {
    title: '剖开看螺杆', en: 'Inside',
    body: '剖开：测微螺杆贯穿尺架和套筒，微分筒套在套筒外面，和螺杆连成一体一起转、一起进退。',
    state: { explode: 0, section: true, running: true, select: 'spindle', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拨开锁紧装置，拧下测力装置，取下微分筒，旋出测微螺杆，再拆套筒和测砧。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const micrometer: MachineDef = level({
  id: 'micrometer',
  unit: 0.12,
  bounds: [[-14, -34, -9], [ZERO + 45 + 23, 14, 9]],
  name: '外径千分尺',
  en: 'Outside Micrometer',
  subtitle: '装配体 · 0–25 mm · 分度值 0.01',
  summary: '7 种零件 · 螺旋放大原理，实时读数',
  drawingNo: 'GW-QF-01',
  scale: '2 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'thimble', origin: [ZERO + 30, 0, 0] }],
  centreLines: [[[-18, 0, 0], [ZERO + 72, 0, 0], 8]],
  steps: STEPS,
  camera: { target: [44, -8, 0], offset: [24, 60, 250], orthoDistance: 650, exploded: { target: [40, -6, 0], scale: 1.3 } },
  Model: Micrometer,
  Driver: MicDriver,
  Controls: MicControls,
});
