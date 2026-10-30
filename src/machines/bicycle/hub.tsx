import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { create } from 'zustand';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, Turn, XY_Z } from '../kit';

/**
 * Rear hub with a pawl-and-ratchet freehub. Axle along z, drive side +z,
 * millimetres. The cassette slides onto the freehub body (it belongs to
 * the bicycle, not to this hub).
 */

export const useHub = create<{ coasting: boolean; set: (coasting: boolean) => void }>((set) => ({ coasting: false, set: (coasting) => set({ coasting }) }));
/** Shell (wheel) and freehub body angles about z. */
export const hubMotion = { shell: 0, body: 0 };
const PAWLS = 3;
const TEETH = 36;

export function HubDriver() {
  useFrame((_, rawDt) => {
    if (!useStudio.getState().running) return;
    const dt = Math.min(rawDt, 0.05);
    hubMotion.shell += dt * 1.2;
    if (!useHub.getState().coasting) hubMotion.body = hubMotion.shell;
  }, -1);
  return null;
}

function Turning({ k, children }: { k: keyof typeof hubMotion; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = -hubMotion[k]; });
  return <group ref={ref}>{children}</group>;
}

/** Pawls lie flat when the ratchet overruns them and stand up to drive. */
function Pawl({ i }: { i: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const slip = hubMotion.shell - hubMotion.body;
    // Coasting: each tooth that passes lifts the pawl and lets it drop — the click.
    const phase = ((slip * TEETH) / (Math.PI * 2) + i / PAWLS) % 1;
    ref.current.rotation.z = useHub.getState().coasting ? 0.15 + 0.25 * Math.max(0, Math.sin(phase * Math.PI)) : 0.45;
  });
  const a = (i / PAWLS) * Math.PI * 2;
  return (
    <group rotation={[0, 0, a]}>
      <group position={[0, 15.5, 33]}>
        <group ref={ref}><Box c={[3.5, 0, 0]} s={[7, 2.2, 5]} /></group>
      </group>
    </group>
  );
}

export function RearHub() {
  return (
    <group>
      <Part id="axle">
        <Cyl c={[0, 0, 0]} r={5} len={146} axis="z" seg={16} />
        {[1, -1].map((s) => <Cyl key={s} c={[0, 0, s * 66]} r={9} len={6} axis="z" seg={6} />)}
        <Callout id="axle" p={[0, 6, 75]} />
      </Part>
      <Part id="shell">
        <Turning k="shell">
          <Turn k="hub-shell" profile={[[13, -34], [16, -34], [16, -30], [31, -30], [31, -26], [18, -24], [18, 22], [31, 24], [31, 28], [24, 28], [24, 38], [20.5, 38], [20.5, 30], [13, 28]]} axis="z" seg={48} />
          {Array.from({ length: 16 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i / 16) * Math.PI * 2 + (i % 2 ? 0.2 : 0)]}>
              <Cyl c={[0, 27, i % 2 ? 26 : -28]} r={1.3} len={4} axis="z" seg={8} />
            </group>
          ))}
          {/* ratchet teeth cut inside the drive-side end of the shell */}
          {Array.from({ length: TEETH }, (_, i) => (
            <group key={i} rotation={[0, 0, (i / TEETH) * Math.PI * 2]}>
              <Box c={[0.8, 20.2, 33]} s={[2.6, 1.4, 6]} r={[0, 0, 0.5]} />
            </group>
          ))}
        </Turning>
        <Callout id="shell" p={[0, 32, -10]} />
      </Part>
      <Part id="bearings">
        {[-30, 25].map((z) => <Turn key={z} k="hub-bearing" profile={[[5.2, 0], [13, 0], [13, 7], [5.2, 7]]} p={[0, 0, z]} axis="z" seg={32} />)}
        <Callout id="bearings" p={[0, 10, -30]} />
      </Part>
      <Part id="body">
        <Turning k="body">
          <Plate k="freehub-splines" shape={() => gearShape(9, 16.5, 1.6, 5.5)} depth={32} p={[0, 0, 36]} r={XY_Z} />
          <Turn k="freehub-core" profile={[[5.5, 28], [15, 28], [15, 37], [5.5, 37]]} axis="z" seg={40} />
        </Turning>
        <Callout id="body" p={[0, 18, 60]} />
      </Part>
      <Part id="pawls">
        <Turning k="body">{Array.from({ length: PAWLS }, (_, i) => <Pawl key={i} i={i} />)}</Turning>
        <Callout id="pawls" p={[8, 14, 36]} />
      </Part>
      <Part id="lockring">
        <Plate k="lockring" shape={() => gearShape(12, 15, 1.2, 6)} depth={4} p={[0, 0, 68]} r={XY_Z} />
        <Callout id="lockring" p={[0, 16, 72]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'shell', index: 1, name: '花鼓壳', en: 'Hub Shell', role: '连辐条 · 转动', material: '铝合金', description: '两边的法兰上打孔挂辐条，整个车轮就绕着它转。右端里面一圈斜齿就是棘轮。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'body', index: 2, name: '塔基', en: 'Freehub Body', role: '装飞轮', material: '钢 / 铝', description: '外面有花键，飞轮（齿片组）套在上面；链条拉动飞轮，飞轮带动塔基。', explode: [0, 0, 70], stage: [0.42, 0.56] },
  { id: 'pawls', index: 3, name: '棘爪', en: 'Pawls', role: '单向传力', material: '钢', description: '装在塔基上的三个小爪，被弹簧顶起。蹬车时它们卡进棘轮齿，把塔基的转动传给花鼓壳；不蹬时轮子比塔基转得快，棘轮齿把爪一个个压下去——“咔咔咔”就是这个声音。', explode: [0, 0, 44], stage: [0.5, 0.64] },
  { id: 'axle', index: 4, name: '花鼓轴', en: 'Axle', role: '不转的轴', material: '铬钼钢', description: '两头卡在车架的勾爪上，自己不转，轮子绕它转。', explode: [0, 0, -150], stage: [0.62, 0.76] },
  { id: 'bearings', index: 5, name: '轴承', en: 'Bearings', role: '减小摩擦', material: '钢', description: '两个密封轴承把花鼓壳支撑在轴上。', explode: [0, -40, 0], stage: [0.76, 0.9] },
  { id: 'lockring', index: 6, name: '锁环', en: 'Lockring', role: '锁住飞轮', material: '钢', description: '拧在塔基末端，把飞轮压紧。', explode: [0, 0, 60], stage: [0, 0.14] },
];

const STEPS: StepDef[] = [
  {
    title: '后花鼓', en: 'Rear Hub',
    body: '自行车不蹬脚踏也能往前滑，靠的就是花鼓里的棘轮机构：只能单向传力。',
    state: { explode: 0, section: true, running: true, select: 'pawls', focus: null },
    apply: () => useHub.getState().set(false),
  },
  {
    title: '蹬与滑', en: 'Drive & Coast',
    body: '用左栏切换。蹬踏：棘爪立起卡住棘轮齿，塔基和花鼓壳一起转。滑行：塔基不动，花鼓壳照转，棘轮齿从棘爪背上滑过，把它一次次压下又弹起。',
    state: { explode: 0, section: true, running: true, select: 'pawls', focus: null },
    apply: () => useHub.getState().set(true),
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拧下锁环，抽出塔基，棘爪随之露出；再退出花鼓轴、取下轴承。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

/** Drive or coast; the pawls show what is happening. */
export function HubControls() {
  const { coasting, set } = useHub();
  const studio = useStudio((s) => s.set);
  return (
    <>
      <div className="strokes gears">
        <button type="button" className={coasting ? '' : 'is-on'} onClick={() => { set(false); studio({ running: true }); }}>蹬踏</button>
        <button type="button" className={coasting ? 'is-on' : ''} onClick={() => { set(true); studio({ running: true }); }}>滑行</button>
      </div>
      <p className="gear-note">{coasting ? '塔基停住、车轮照转：棘爪被棘轮齿一次次压下，咔、咔、咔。' : '棘爪卡在棘轮齿上：塔基转多少，车轮就转多少。'}</p>
    </>
  );
}

export const hubLevel: MachineDef = level({
  id: 'bicycle/rear-hub',
  parent: 'bicycle',
  unit: 0.1,
  bounds: [[-73, -31, -31], [73, 31, 31]],
  name: '后花鼓',
  en: 'Rear Hub & Freehub',
  subtitle: '子组件 · 棘爪单向离合',
  summary: '6 种零件：花鼓壳、塔基、棘爪、轴、轴承、锁环',
  drawingNo: 'GW-ZXC-21',
  scale: '2 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'body', origin: [68, 0, 0] }, { stage: 'axle', origin: [-73, 0, 0] }],
  centreLines: [[[-90, 0, 0], [150, 0, 0], 34]],
  steps: STEPS,
  camera: { target: [20, 0, 0], offset: [130, 110, 250], orthoDistance: 900, exploded: { target: [40, 0, 0], scale: 1.6 } },
  // Turned so the axle lies along x and the section cuts through it.
  Model: () => <group rotation={[0, Math.PI / 2, 0]}><RearHub /></group>,
  Driver: HubDriver,
  Controls: HubControls,
});
