import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { coil } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, poly, Turn, XY_Z, YZ_X } from '../kit';

/**
 * Pin-tumbler lock cylinder with five pin stacks. Plug axis along x, front
 * face at x = 0, the key goes in toward −x; pins stand in +y. The shear line
 * is the plug's surface, y = R. Millimetres.
 */

const R = 6.35;
const PINS = [-5, -9, -13, -17, -21];
const PIN_R = 1.4;
const DRIVER = 5;
const CAP = 17;
/** Key cut heights under each pin (top of the blade) for the right key and a wrong one. */
const CUTS = [1.6, 0.4, 2.2, 1.0, 1.9];
const WRONG = [0.6, 1.8, 1.2, 2.2, 0.6];
const KEY_PINS = CUTS.map((c) => R - c);
const REST = -0.6;
const BLADE = 29;

export const useLock = create<{ right: boolean; set: (right: boolean) => void }>((set) => ({ right: true, set: (right) => set({ right }) }));
export const lockMotion = { t: 0 };

/** Height of the blade's top edge at depth u from the shoulder. */
function keyTop(u: number, cuts: number[]) {
  if (u < 0 || u > BLADE) return -Infinity;
  let y = 2.6;
  cuts.forEach((c, i) => { y = Math.min(y, c + Math.abs(u + PINS[i]) * 1.1); });
  if (u > BLADE - 4) y = Math.min(y, -5 + (BLADE - u) * 1.9);
  return y;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const CYCLE = 8;

/** Key travel (0 = fully home) and plug angle through one insert–turn–return–withdraw cycle. */
export function lockState(t: number, right: boolean) {
  const c = t % CYCLE;
  const out = 32 * (1 - smooth(c / 2.2)) + 32 * smooth((c - 6.4) / 1.4);
  let angle = 0;
  if (right) angle = (Math.PI / 2) * (smooth((c - 2.8) / 1.0) - smooth((c - 4.6) / 1.0));
  else if (c > 2.8 && c < 5.6) angle = 0.03 * Math.sin((c - 2.8) * 18) * Math.sin(((c - 2.8) / 2.8) * Math.PI);
  const cuts = right ? CUTS : WRONG;
  const lift = PINS.map((x) => Math.max(REST, keyTop(-x + out, cuts)));
  return { out, angle, lift };
}

export function LockDriver() {
  useFrame((_, dt) => {
    if (useStudio.getState().running) lockMotion.t += Math.min(dt, 0.05);
  }, -1);
  return null;
}

const state = () => lockState(lockMotion.t, useLock.getState().right);

/** A group turned with the plug (about x). */
function WithPlug({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = state().angle; });
  return <group ref={ref}>{children}</group>;
}

/** Blade profile in (x, y): flat bottom, cut top, from the tip to the shoulder, then the bow. */
function keyShape(cuts: number[]) {
  return () => {
    const top: Array<[number, number]> = [];
    for (let u = BLADE; u >= 0; u -= 0.25) top.push([-u, keyTop(u, cuts)]);
    const s = poly([[-BLADE, -5.2], [0, -5.2], [0, -6.5], [4, -6.5], [4, 4.2], [0, 4.2], [0, 2.6], ...top.reverse()])();
    return s;
  };
}

function bowShape() {
  const s = new THREE.Shape();
  s.absarc(13, -1, 9.5, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.absarc(17, -1, 2.6, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

/** Plug cross-section (y, z): a circle with the keyway and the pin slot cut up through the top. */
function plugSection() {
  const a = Math.asin(1.5 / R);
  const arc = Array.from({ length: 41 }, (_, i): [number, number] => {
    const t = a + (i / 40) * (Math.PI * 2 - 2 * a);
    return [R * Math.cos(t), R * Math.sin(t)];
  });
  return poly([...arc, [3, -1.5], [3, -1.05], [-5.5, -1.05], [-5.5, 1.05], [3, 1.05], [3, 1.5]]);
}

/** Front face of the plug (y, z) with the keyway through it. */
function faceShape() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 7.4, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.moveTo(-5.5, -1.05);
  h.lineTo(3, -1.05);
  h.lineTo(3, 1.05);
  h.lineTo(-5.5, 1.05);
  h.closePath();
  s.holes.push(h);
  return s;
}

/** Housing ring round the plug (y, z), open at the top where the pins pass. */
function housingRing() {
  const ao = Math.asin(1.5 / 9.2);
  const ai = Math.asin(1.5 / (R + 0.05));
  const outer = Array.from({ length: 41 }, (_, i): [number, number] => {
    const t = ao + (i / 40) * (Math.PI * 2 - 2 * ao);
    return [9.2 * Math.cos(t), 9.2 * Math.sin(t)];
  });
  const inner = Array.from({ length: 41 }, (_, i): [number, number] => {
    const t = Math.PI * 2 - ai - (i / 40) * (Math.PI * 2 - 2 * ai);
    return [(R + 0.05) * Math.cos(t), (R + 0.05) * Math.sin(t)];
  });
  return poly([...outer, ...inner]);
}

/** Spans of x between the pin chambers, front to back. */
const BETWEEN: Array<[number, number]> = [[-1.5, PINS[0] + 1.5], ...PINS.slice(1).map((x, i): [number, number] => [PINS[i] - 1.5, x + 1.5]), [PINS[4] - 1.5, -30]];

function KeyPins() {
  const refs = useRef<Array<THREE.Group | null>>([]);
  useFrame(() => {
    const s = state();
    refs.current.forEach((g, i) => { if (g) g.position.y = s.lift[i]; });
  });
  return (
    <>
      {PINS.map((x, i) => (
        <group key={x} ref={(g) => { refs.current[i] = g; }}>
          <Turn k={`key-pin-${i}`} profile={[[0, 0], [0.5, 0.15], [PIN_R, 0.9], [PIN_R, KEY_PINS[i]], [0, KEY_PINS[i]]]} p={[x, 0, 0]} seg={24} />
        </group>
      ))}
    </>
  );
}

/** Driver pins and springs ride on the key pins (they stay in the housing when the plug turns). */
function useDriverHeights() {
  return () => {
    const s = state();
    // When the plug turns, the driver pins sit on its surface at the shear line.
    return s.lift.map((l, i) => (Math.abs(s.angle) > 0.2 ? R : l + KEY_PINS[i]));
  };
}

function DriverPins() {
  const refs = useRef<Array<THREE.Group | null>>([]);
  const heights = useDriverHeights();
  useFrame(() => { heights().forEach((h, i) => { const g = refs.current[i]; if (g) g.position.y = h; }); });
  return (
    <>
      {PINS.map((x, i) => (
        <group key={x} ref={(g) => { refs.current[i] = g; }}>
          <Cyl c={[x, DRIVER / 2, 0]} r={PIN_R} len={DRIVER} seg={24} />
        </group>
      ))}
    </>
  );
}

function Springs() {
  const refs = useRef<Array<THREE.Group | null>>([]);
  const heights = useDriverHeights();
  useFrame(() => {
    heights().forEach((h, i) => {
      const g = refs.current[i];
      if (!g) return;
      const bottom = h + DRIVER;
      g.position.y = bottom;
      g.scale.y = Math.max(0.2, (CAP - bottom) / 6);
    });
  });
  return (
    <>
      {PINS.map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <group ref={(g) => { refs.current[i] = g; }}>
            <M clip geo={coil('lock-spring', 1.05, 0.18, 6, 7)} />
          </group>
        </group>
      ))}
    </>
  );
}

function Key() {
  const ref = useRef<THREE.Group>(null);
  const right = useLock((s) => s.right);
  useFrame(() => { if (ref.current) ref.current.position.x = state().out; });
  return (
    <group ref={ref}>
      <Plate k={right ? 'key-right' : 'key-wrong'} shape={keyShape(right ? CUTS : WRONG)} depth={1.9} p={[0, 0, -0.95]} r={XY_Z} />
      <Plate k="key-bow" shape={bowShape} depth={2.6} p={[0, 0, -1.3]} r={XY_Z} />
    </group>
  );
}

export function Lock() {
  return (
    <group>
      <Part id="housing">
        <Plate k="housing-ring" shape={housingRing()} depth={30} p={[-30, 0, 0]} r={YZ_X} />
        {[1, -1].map((s) => <Box key={s} c={[-15, 11.5, s * 2.72]} s={[30, 11, 2.56]} />)}
        {BETWEEN.map(([x0, x1]) => <Box key={x0} c={[(x0 + x1) / 2, 11.6, 0]} s={[x0 - x1, 10.8, 3.0]} />)}
        <Callout id="housing" p={[-26, 14, 4]} />
      </Part>
      <Part id="cap">
        <Box c={[-15, CAP + 0.5, 0]} s={[30, 1, 5.6]} />
        <Callout id="cap" p={[-8, CAP + 1, 2.8]} />
      </Part>
      <Part id="springs">
        <Springs />
        <Callout id="springs" p={[-13, 14, 1.2]} />
      </Part>
      <Part id="drivers">
        <DriverPins />
        <Callout id="drivers" p={[-17, 9, 1.4]} />
      </Part>
      <Part id="plug">
        <WithPlug>
          <Plate k="plug" shape={plugSection()} depth={31} p={[-31, 0, 0]} r={YZ_X} />
          {BETWEEN.map(([x0, x1]) => <Box key={x0} c={[(x0 + x1) / 2, 4.6, 0]} s={[x0 - x1, 3.2, 3.0]} />)}
          <Plate k="plug-face" shape={faceShape} depth={1.2} p={[0, 0, 0]} r={YZ_X} />
        </WithPlug>
        <Callout id="plug" p={[-28, -6, 3]} />
      </Part>
      <Part id="key-pins">
        <WithPlug><KeyPins /></WithPlug>
        <Callout id="key-pins" p={[-9, 3, 1.4]} />
      </Part>
      <Part id="key">
        <WithPlug><Key /></WithPlug>
        <Callout id="key" p={[14, 8.5, 1.3]} />
      </Part>
      <Part id="cam">
        <WithPlug>
          <Box c={[-32.2, -4.5, 0]} s={[1.6, 9, 4]} />
          <Cyl c={[-31.6, 0, 0]} r={3} len={1.2} axis="x" seg={24} />
        </WithPlug>
        <Callout id="cam" p={[-33, -8, 2]} />
      </Part>
      <Part id="clip">
        <Turn k="clip" profile={[[R - 0.4, 0], [7.6, 0], [7.6, 0.6], [R - 0.4, 0.6]]} p={[-31, 0, 0]} axis="-x" seg={40} />
        <Callout id="clip" p={[-31.4, 7.4, 1]} />
      </Part>
    </group>
  );
}

/** Pick the right or a wrong key; the readout says whether the plug can turn. */
export function LockControls() {
  const { right, set } = useLock();
  const studio = useStudio((s) => s.set);
  return (
    <>
      <div className="strokes gears">
        <button type="button" className={right ? 'is-on' : ''} onClick={() => { set(true); studio({ running: true }); }}>正确钥匙</button>
        <button type="button" className={right ? '' : 'is-on'} onClick={() => { set(false); studio({ running: true }); }}>错误钥匙</button>
      </div>
      <p className="gear-note">
        {right
          ? '五对弹子的分界都被顶到剪切线上，锁芯和锁壳之间没有东西挡着——能转。'
          : '有的弹子顶得太高、有的不够高，总有弹子横跨剪切线把锁芯卡住——只能晃一下。'}
      </p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'housing', index: 1, name: '锁壳', en: 'Housing (Shell)', role: '固定 · 装上弹子', material: '黄铜', description: '装在门上不动的外壳。上方一排孔装着上弹子和弹簧，下面的圆孔里是锁芯。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'plug', index: 2, name: '锁芯', en: 'Plug', role: '转动开锁', material: '黄铜', description: '能在锁壳里转动的圆柱，中间是钥匙槽，上方一排孔装下弹子。锁芯表面和锁壳孔壁之间那条缝就是“剪切线”。', explode: [-36, 0, 0], stage: [0.46, 0.6] },
  { id: 'key', index: 3, name: '钥匙', en: 'Key', role: '顶起弹子', material: '镍白铜', description: '齿的深浅（齿花）正好对应每个下弹子的长度：插到底时把每一对弹子的分界都顶到剪切线上。', explode: [16, 0, 0], stage: [0, 0.1] },
  { id: 'key-pins', index: 4, name: '下弹子', en: 'Key Pins', role: '读出钥匙齿形', material: '黄铜', description: '五颗长短不一的下弹子，底部是尖的，踩在钥匙齿上。不同的长短组合就是这把锁的“密码”。', explode: [-36, -11, 0], stage: [0.46, 0.66] },
  { id: 'drivers', index: 5, name: '上弹子', en: 'Driver Pins', role: '挡住锁芯', material: '黄铜 / 钢', description: '五颗等长的上弹子，被弹簧压下来。没有钥匙时它们一半在锁壳、一半伸进锁芯，把锁芯卡住。', explode: [0, 9, 0], stage: [0.26, 0.36] },
  { id: 'springs', index: 6, name: '弹簧', en: 'Springs', role: '把弹子压下', material: '不锈钢', description: '把上、下弹子一起往下压，钥匙拔出后弹子马上回到锁住的位置。', explode: [0, 13, 0], stage: [0.18, 0.28] },
  { id: 'cap', index: 7, name: '封片', en: 'Pin Chamber Cap', role: '封住弹子孔', material: '黄铜', description: '封住弹子孔的顶部，给弹簧一个支点。', explode: [0, 17, 0], stage: [0.1, 0.2] },
  { id: 'cam', index: 8, name: '拨片', en: 'Cam / Tailpiece', role: '带动锁舌', material: '钢', description: '装在锁芯尾部，锁芯一转，它就拨动门里的锁舌。', explode: [-10, 0, 0], stage: [0.4, 0.48] },
  { id: 'clip', index: 9, name: '卡簧', en: 'Retaining Clip', role: '防止锁芯抽出', material: '弹簧钢', description: '卡在锁芯尾部的槽里，让锁芯只能转、不能从前面拔出来。', explode: [-6, 0, 0], stage: [0.34, 0.42] },
];

const STEPS: StepDef[] = [
  {
    title: '弹子锁', en: 'Pin Tumbler Lock',
    body: '家里门锁最常见的锁芯。看钥匙插进去时，上方一排弹子随齿形上上下下；插到底后锁芯转了 90°，再转回、拔出。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
    apply: () => useLock.getState().set(true),
  },
  {
    title: '剪切线', en: 'The Shear Line',
    body: '剖开看：每个孔里是一颗下弹子、一颗上弹子、一根弹簧。正确的钥匙把每对弹子的分界都顶到锁芯表面那条线上，锁芯就能转；转动时下弹子跟锁芯走，上弹子留在锁壳里。',
    state: { explode: 0, section: true, running: true, select: 'key-pins', focus: null },
    apply: () => useLock.getState().set(true),
  },
  {
    title: '错误的钥匙', en: 'Wrong Key',
    body: '换一把齿花不同的钥匙：有的弹子被顶过了头（上弹子越线进锁芯），有的顶不到位（下弹子露出锁芯），锁芯怎么拧都只能晃一下。',
    state: { explode: 0, section: true, running: true, select: 'drivers', focus: null },
    apply: () => useLock.getState().set(false),
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拔出钥匙，拆封片、弹簧和上弹子，取下卡簧和拨片，从后面推出锁芯，下弹子随之落下。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const lock: MachineDef = level({
  id: 'lock',
  unit: 0.2,
  bounds: [[-34, -10, -9.2], [26, 18, 9.2]],
  name: '弹子锁',
  en: 'Pin Tumbler Lock',
  subtitle: '装配体 · 五弹子锁芯',
  summary: '9 种零件 · 钥匙顶起弹子到剪切线，锁芯才能转',
  drawingNo: 'GW-SS-00',
  scale: '2 : 1',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [
    { stage: 'plug', origin: [-31, 0, 0] },
    { stage: 'key', origin: [0, -1, 0] },
    { stage: 'cap', origin: [-15, CAP + 1, 0] },
  ],
  centreLines: [[[-38, 0, 0], [30, 0, 0], 9.6], ...PINS.map((x): [[number, number, number], [number, number, number]] => [[x, -2, 0], [x, CAP + 2, 0]])],
  steps: STEPS,
  camera: { target: [-6, 3, 0], offset: [52, 46, 120], orthoDistance: 140, exploded: { target: [-12, 4, 0], scale: 1.35 } },
  Model: Lock,
  Driver: LockDriver,
  Controls: LockControls,
});
