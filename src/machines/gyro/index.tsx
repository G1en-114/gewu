import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, Hoop, level, Turn } from '../kit';

/**
 * Gyroscope in a two-axis gimbal on a stand. The stand is carried round and
 * tipped; the outer ring turns about the stand's z axis, the inner ring about
 * the outer ring's x axis, the rotor spins about the inner ring's y axis —
 * and stays pointing straight up. Centimetres; gimbal centre at the origin.
 */

const R_OUT = 9;
const R_IN = 7.2;

export const gyroMotion = { t: 0 };
export function GyroDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) gyroMotion.t += Math.min(dt, 0.05); }, -1);
  return null;
}

/** Stand attitude as Ry(yaw) · Rx(pitch) · Rz(roll). */
export function attitude(t: number) {
  return { yaw: t * 0.35, pitch: 0.45 * Math.sin(t * 0.5), roll: 0.35 * Math.sin(t * 0.37 + 1) };
}

function Stage({ k, children }: { k: 'stand' | 'outer' | 'inner' | 'rotor'; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const a = attitude(gyroMotion.t);
    if (k === 'stand') g.rotation.set(a.pitch, a.yaw, a.roll, 'YXZ');
    // Each ring undoes one turn of the stand, innermost last.
    if (k === 'outer') g.rotation.z = -a.roll;
    if (k === 'inner') g.rotation.x = -a.pitch;
    if (k === 'rotor') g.rotation.y = -a.yaw + gyroMotion.t * 9;
  });
  return <group ref={ref}>{children}</group>;
}

export function Gyroscope() {
  return (
    <group position={[0, 16, 0]}>
      <Stage k="stand">
        <Part id="base">
          <Turn k="gy-base" profile={[[0, -16], [8, -16], [8, -14.5], [3, -13], [0, -13]]} seg={48} />
          <Cyl c={[0, -12, 0]} r={1.4} len={3} seg={20} />
          <Callout id="base" p={[7, -15, 3]} />
        </Part>
        <Part id="fork">
          <Box c={[0, -10.6, 0]} s={[2.2, 1.2, 2 * R_OUT + 3]} />
          {[1, -1].map((s) => <Box key={s} c={[0, -5, s * (R_OUT + 1)]} s={[1.6, 12, 1.2]} />)}
          {[1, -1].map((s) => <Cyl key={s} c={[0, 0, s * (R_OUT + 0.4)]} r={0.5} len={1.2} axis="z" seg={12} />)}
          <Callout id="fork" p={[0, -6, R_OUT + 1.5]} />
        </Part>
        <Stage k="outer">
          <Part id="outer">
            <Hoop k="gy-outer" c={[0, 0, 0]} R={R_OUT} r={0.55} seg={72} />
            {[1, -1].map((s) => <Cyl key={s} c={[s * (R_OUT - 0.6), 0, 0]} r={0.45} len={1.2} axis="x" seg={12} />)}
            <Callout id="outer" p={[R_OUT * 0.7, 0, R_OUT * 0.7]} />
          </Part>
          <Stage k="inner">
            <Part id="inner">
              <group rotation={[Math.PI / 2, 0, 0]}><Hoop k="gy-inner" c={[0, 0, 0]} R={R_IN} r={0.45} seg={64} /></group>
              {[1, -1].map((s) => <Cyl key={s} c={[0, s * (R_IN - 0.5), 0]} r={0.4} len={1} seg={12} />)}
              <Callout id="inner" p={[R_IN * 0.7, R_IN * 0.7, 0]} />
            </Part>
            <Stage k="rotor">
              <Part id="rotor">
                <Turn k="gy-rotor" profile={[[0.6, -1.2], [5.6, -1.2], [6.2, -0.6], [6.2, 0.6], [5.6, 1.2], [0.6, 1.2]]} seg={64} />
                {[0, 1, 2, 3].map((i) => <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}><Box c={[3.5, 1.25, 0]} s={[3, 0.1, 0.6]} /></group>)}
                <Callout id="rotor" p={[5, 1.4, 2]} />
              </Part>
              <Part id="axle">
                <Cyl c={[0, 0, 0]} r={0.35} len={2 * R_IN} seg={12} />
                <Turn k="gy-arrow" profile={[[0, 0], [0.9, 0], [0, 2.4]]} p={[0, R_IN + 0.8, 0]} seg={16} />
                <Callout id="axle" p={[0.5, R_IN + 2, 0.5]} />
              </Part>
            </Stage>
          </Stage>
        </Stage>
      </Stage>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'base', index: 1, name: '底座', en: 'Base', role: '被晃动的“载体”', material: '黄铜', description: '代表飞机或船：演示里它不停转圈、前后左右摇晃。', explode: [0, -8, 0], stage: [0.84, 0.96] },
  { id: 'fork', index: 2, name: '支架', en: 'Stand Fork', role: '支承外环', material: '黄铜', description: '两端的轴承托住外环，外环可绕这根轴转。', explode: [0, -4, 0], stage: [0.7, 0.84] },
  { id: 'outer', index: 3, name: '外环', en: 'Outer Gimbal', role: '第一自由度', material: '铝合金', description: '绕支架的轴转；它上面又以垂直方向的轴托着内环。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'inner', index: 4, name: '内环', en: 'Inner Gimbal', role: '第二自由度', material: '铝合金', description: '绕外环上的轴转；它再托着转子的轴。三根轴两两垂直，转子就可以朝向任意方向。', explode: [12, 0, 0], stage: [0.4, 0.56] },
  { id: 'rotor', index: 5, name: '转子', en: 'Rotor', role: '高速旋转', material: '钢', description: '质量集中在外缘的重飞轮。转得越快，角动量越大，越“不愿意”改变指向——这就是定轴性。', explode: [0, 14, 0], stage: [0.12, 0.28] },
  { id: 'axle', index: 6, name: '转轴与指针', en: 'Spin Axle', role: '标出指向', material: '钢', description: '箭头标出转子轴的方向：无论底座怎么转，它始终朝上。', explode: [0, 24, 0], stage: [0, 0.14] },
];

const STEPS: StepDef[] = [
  {
    title: '陀螺仪', en: 'Gyroscope',
    body: '看那根箭头：底座在转圈、在摇晃，外环和内环跟着自动转动，高速旋转的转子却始终指向正上方。这叫定轴性。',
    state: { explode: 0, section: false, running: true, select: 'axle', focus: null },
  },
  {
    title: '万向支架', en: 'Gimbals',
    body: '两层环加一个支架，三根轴两两垂直，转子和底座之间就不能互相传递转动。飞机的姿态仪、早期火箭和潜艇的惯性导航，都靠读出这些环相对机身转了多少来知道自己的姿态。',
    state: { explode: 0, section: false, running: true, select: 'inner', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '取下转轴和转子，再拆内环、外环和支架。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const gyro: MachineDef = level({
  id: 'gyro',
  unit: 0.2,
  bounds: [[-10, 0, -10.5], [10, 26, 10.5]],
  name: '陀螺仪',
  en: 'Gimballed Gyroscope',
  subtitle: '装配体 · 两环万向支架 · 定轴性',
  summary: '6 种零件 · 底座乱晃，转子指向不变',
  drawingNo: 'GW-TL-00',
  scale: '1 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'rotor', origin: [0, 16, 0] }],
  centreLines: [[[0, 0, 0], [0, 28, 0]]],
  steps: STEPS,
  camera: { target: [0, 14, 0], offset: [36, 26, 62], orthoDistance: 260, exploded: { target: [0, 20, 0], scale: 1.4 } },
  Model: Gyroscope,
  Driver: GyroDriver,
});
