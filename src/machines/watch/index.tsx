import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { BoltSetDef, MachineDef, PartDef, StepDef, Vec3 } from '../types';
import { Box, Cyl, Fastener, level, Pipe, Plate, Turn, XY_Z } from '../kit';

/**
 * A Swiss lever pocket-watch movement of the classic 36 mm, small-seconds
 * layout (in the spirit of the long-lived open-face calibres). Seen from
 * the back: bridges toward the viewer (+z), dial behind. Millimetres; the
 * movement plane is x–y, h is height above the dial side of the main plate,
 * and the section plane z = 0 is the underside of the bridges.
 */

const at = (x: number, y: number, h: number): Vec3 => [x, y, h - 3.6];
const zOf = (h: number) => h - 3.6;
type P2 = readonly [number, number];

/** Wheel centres, meshing on their pitch circles. */
const C: P2 = [0, 0];
const B: P2 = [5.9, 4.32];
const T: P2 = [-3.6, 3.55];
const F: P2 = [-7.35, 2.22];
const E: P2 = [-8.15, -1.55];
const PAL: P2 = [-5.85, -4.32];
const BAL: P2 = [-3.25, -6.82];
const CROWN_WHEEL: P2 = [10.5, 0.9];
const COCK_FOOT: P2 = [-2.6, -14.6];

/** [teeth, pitch radius] of wheel and pinion. */
const TRAIN = {
  barrel: [80, 6.5],
  center: [80, 4.5], centerPinion: [10, 0.81],
  third: [75, 3.6], thirdPinion: [10, 0.56],
  fourth: [80, 3.5], fourthPinion: [8, 0.38],
  escape: [15, 2.4], escapePinion: [8, 0.35],
} as const;

/** Convex hull round a set of circles, as a shape in the movement plane. */
function hull(circles: Array<[number, number, number]>, holes: Array<[number, number, number]> = []) {
  return () => {
    const pts: Array<[number, number]> = [];
    for (const [x, y, r] of circles) for (let i = 0; i < 48; i += 1) pts.push([x + r * Math.cos((i / 48) * Math.PI * 2), y + r * Math.sin((i / 48) * Math.PI * 2)]);
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower: Array<[number, number]> = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    const upper: Array<[number, number]> = [];
    for (const p of [...pts].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    const ring = [...lower.slice(0, -1), ...upper.slice(0, -1)];
    const s = new THREE.Shape();
    s.moveTo(...ring[0]);
    ring.slice(1).forEach((p) => s.lineTo(...p));
    s.closePath();
    for (const [x, y, r] of holes) {
      const h = new THREE.Path();
      h.absarc(x, y, r, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    return s;
  };
}

/** A wheel: toothed rim with spoked crossings cut out (watchmakers' "crossings"). */
function wheel(teeth: number, pr: number, add: number, hub: number, arms: number) {
  return () => {
    const s = gearShape(teeth, pr, add, hub * 0.35);
    const inner = pr - add * 1.25 - Math.max(0.35, pr * 0.1);
    if (inner > hub + 0.4) {
      const gap = 0.3 / inner;
      for (let i = 0; i < arms; i += 1) {
        const a0 = (i / arms) * Math.PI * 2 + Math.max(gap, 0.18);
        const a1 = ((i + 1) / arms) * Math.PI * 2 - Math.max(gap, 0.18);
        const h = new THREE.Path();
        h.absarc(0, 0, inner, a1, a0, true);
        h.absarc(0, 0, hub, a0 + 0.12, a1 - 0.12, false);
        h.closePath();
        s.holes.push(h);
      }
    }
    return s;
  };
}

/** Flat spiral (mainspring, hairspring) as a pipe in the plane at height h. */
function spiral(r0: number, r1: number, turns: number, h: number, [cx, cy]: P2) {
  const n = Math.round(turns * 40);
  return Array.from({ length: n + 1 }, (_, i): Vec3 => {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    return at(cx + r * Math.cos(a), cy + r * Math.sin(a), h);
  });
}

/* ── Motion ───────────────────────────────────────── */

export const watchMotion = { t: 0 };
/** Balance period (slow motion: a real one beats 2.5 times a second). */
const PERIOD = 1.4;
const AMPLITUDE = 3.6;

export function WatchDriver() {
  useFrame((_, dt) => {
    if (useStudio.getState().running) watchMotion.t += Math.min(dt, 0.05);
  }, -1);
  return null;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** Everything follows from the balance: each pass through its centre releases half a tooth. */
export function watchState(t: number) {
  const beats = (2 * t) / PERIOD;
  const n = Math.floor(beats);
  const p = smooth((beats - n) / 0.1);
  const escape = -((n + p) * Math.PI * 2) / 30;
  const side = (k: number) => (k % 2 === 0 ? 1 : -1);
  return {
    balance: AMPLITUDE * Math.sin((Math.PI * 2 * t) / PERIOD),
    pallet: 0.16 * (side(n - 1) + (side(n) - side(n - 1)) * p),
    escape,
    fourth: -escape / (TRAIN.fourth[0] / TRAIN.escapePinion[0]),
    get third() { return -this.fourth / (TRAIN.third[0] / TRAIN.fourthPinion[0]); },
    get center() { return -this.third / (TRAIN.center[0] / TRAIN.thirdPinion[0]); },
    get barrel() { return -this.center / (TRAIN.barrel[0] / TRAIN.centerPinion[0]); },
  };
}

type Key = 'balance' | 'pallet' | 'escape' | 'fourth' | 'third' | 'center' | 'barrel' | 'hour';

/** A group in the plane at (x, y) turning about z with one of the watch's angles. */
function Turning({ c, k, children }: { c: P2; k: Key; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const s = watchState(watchMotion.t);
    ref.current.rotation.z = k === 'hour' ? s.center / 12 : s[k];
  });
  return <group position={[c[0], c[1], 0]}><group ref={ref}>{children}</group></group>;
}

/** Wheel with its pinion and arbor, centred at the origin of a Turning group. */
function Wheel({ k, wheelT, pinion, h, arms = 4, arbor = [1.6, 5.0] }: { k: string; wheelT: readonly [number, number]; pinion?: readonly [number, number]; h: number; arms?: number; arbor?: [number, number] }) {
  const [teeth, pr] = wheelT;
  const add = (2 * pr) / teeth;
  return (
    <>
      <Plate k={`w-${k}`} shape={wheel(teeth, pr, add, Math.min(0.7, pr * 0.22), arms)} depth={0.22} p={[0, 0, zOf(h)]} r={XY_Z} />
      {pinion && <Plate k={`p-${k}`} shape={() => gearShape(pinion[0], pinion[1], (2 * pinion[1]) / pinion[0], 0.12)} depth={0.9} p={[0, 0, zOf(1.75)]} r={XY_Z} />}
      <Cyl c={[0, 0, zOf((arbor[0] + arbor[1]) / 2)]} r={0.16} len={arbor[1] - arbor[0]} axis="z" seg={12} />
    </>
  );
}

const JEWEL = (c: P2, h: number) => <Cyl c={at(c[0], c[1], h + 0.15)} r={0.42} len={0.3} axis="z" seg={20} />;

export function Movement() {
  return (
    <group>
      <Part id="plate">
        <Plate k="plate" shape={hull([[0, 0, 18]], [[CROWN_WHEEL[0] + 2.5, 0, 0.6]])} depth={1.6} p={[0, 0, zOf(0)]} r={XY_Z} />
        <Callout id="plate" p={at(12, -11, 1.6)} />
      </Part>

      <Part id="barrel">
        <Turning c={B} k="barrel">
          <Turn k="barrel-drum" profile={[[1.2, 0], [5.8, 0], [5.8, 1.4], [5.55, 1.4], [5.55, 0.2], [1.2, 0.2]]} p={[0, 0, zOf(1.7)]} axis="z" seg={64} />
          <Plate k="barrel-teeth" shape={() => gearShape(80, 6.5, 0.16, 5.6)} depth={0.3} p={[0, 0, zOf(1.75)]} r={XY_Z} />
          <Turn k="barrel-cover" profile={[[1.0, 0], [5.55, 0], [5.55, 0.12], [1.0, 0.12]]} p={[0, 0, zOf(3.1)]} axis="z" seg={64} />
          <Cyl c={[0, 0, zOf(3.4)]} r={0.9} len={3.6} axis="z" seg={20} />
        </Turning>
        <Pipe k="mainspring" pts={spiral(1.3, 5.4, 7, 2.5, B)} r={0.12} seg={6} />
        <Callout id="barrel" p={at(B[0] + 4, B[1] + 3, 3.3)} />
      </Part>

      <Part id="center">
        <Turning c={C} k="center"><Wheel k="center" wheelT={TRAIN.center} pinion={TRAIN.centerPinion} h={1.95} arbor={[-1.0, 5.0]} /></Turning>
        <Callout id="center" p={at(2.2, -2.6, 2.2)} />
      </Part>
      <Part id="third">
        <Turning c={T} k="third"><Wheel k="third" wheelT={TRAIN.third} pinion={TRAIN.thirdPinion} h={2.25} /></Turning>
        <Callout id="third" p={at(T[0] - 1, T[1] + 2.6, 2.4)} />
      </Part>
      <Part id="fourth">
        <Turning c={F} k="fourth"><Wheel k="fourth" wheelT={TRAIN.fourth} pinion={TRAIN.fourthPinion} h={1.9} arbor={[-1.0, 5.0]} /></Turning>
        <Callout id="fourth" p={at(F[0] - 2.4, F[1] + 2, 2.1)} />
      </Part>
      <Part id="escape">
        <Turning c={E} k="escape"><Wheel k="escape" wheelT={TRAIN.escape} pinion={TRAIN.escapePinion} h={2.4} arms={3} /></Turning>
        <Callout id="escape" p={at(E[0] - 2, E[1] - 1.6, 2.6)} />
      </Part>

      <Part id="pallet">
        <Turning c={PAL} k="pallet">
          {/* lever toward the balance with the fork; arms toward the escape wheel with the two pallet stones */}
          <group rotation={[0, 0, Math.atan2(BAL[1] - PAL[1], BAL[0] - PAL[0])]}>
            <Box c={[1.55, 0, zOf(2.75)]} s={[3.1, 0.34, 0.18]} />
            <Box c={[3.2, 0.32, zOf(2.75)]} s={[0.5, 0.18, 0.18]} />
            <Box c={[3.2, -0.32, zOf(2.75)]} s={[0.5, 0.18, 0.18]} />
          </group>
          <group rotation={[0, 0, Math.atan2(E[1] - PAL[1], E[0] - PAL[0])]}>
            <Box c={[1.3, 0, zOf(2.75)]} s={[0.5, 3.0, 0.18]} />
            <Box c={[1.85, 1.45, zOf(2.75)]} s={[0.7, 0.24, 0.32]} r={[0, 0, 0.5]} />
            <Box c={[1.85, -1.45, zOf(2.75)]} s={[0.7, 0.24, 0.32]} r={[0, 0, -0.5]} />
          </group>
          <Cyl c={[0, 0, zOf(2.9)]} r={0.14} len={2.4} axis="z" seg={10} />
        </Turning>
        <Callout id="pallet" p={at((PAL[0] + BAL[0]) / 2, (PAL[1] + BAL[1]) / 2, 2.8)} />
      </Part>

      <Part id="balance">
        <Turning c={BAL} k="balance">
          <Turn k="balance-rim" profile={[[4.15, 0], [4.6, 0], [4.6, 0.5], [4.15, 0.5]]} p={[0, 0, zOf(2.85)]} axis="z" seg={72} />
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
              <Box c={[2.15, 0, zOf(3.0)]} s={[4.1, 0.4, 0.2]} />
            </group>
          ))}
          {Array.from({ length: 12 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 6 + Math.PI / 12]}>
              <Cyl c={[4.8, 0, zOf(3.1)]} r={0.18} len={0.4} axis="x" seg={8} />
            </group>
          ))}
          <Cyl c={[0, 0, zOf(3.2)]} r={0.18} len={3.6} axis="z" seg={12} />
          <Turn k="roller" profile={[[0.18, 0], [0.85, 0], [0.85, 0.2], [0.18, 0.2]]} p={[0, 0, zOf(2.6)]} axis="z" seg={28} />
          <Cyl c={[0.65, 0, zOf(2.5)]} r={0.08} len={0.3} axis="z" seg={8} />
        </Turning>
        <Callout id="balance" p={at(BAL[0] - 4.2, BAL[1] - 2.8, 3.3)} />
      </Part>

      <Part id="hairspring">
        <Pipe k="hairspring" pts={spiral(0.6, 2.9, 12, 3.55, BAL)} r={0.035} seg={5} />
        <Callout id="hairspring" p={at(BAL[0] + 1.6, BAL[1] + 2.2, 3.6)} />
      </Part>

      <Part id="barrel-bridge">
        <Plate k="barrel-bridge" shape={hull([[B[0], B[1], 7.0], [CROWN_WHEEL[0], CROWN_WHEEL[1], 2.6]], [[B[0], B[1], 0.95]])} depth={1.4} p={[0, 0, zOf(3.7)]} r={XY_Z} />
        {[[B[0] + 4.6, B[1] + 4.2], [B[0] - 5.6, B[1] + 2.4]].map(([x, y]) => <Fastener key={x} p={at(x, y, 5.1)} dir="z" set="barrel-screws" d={0.9} len={1.6} />)}
        <Callout id="barrel-bridge" p={at(B[0] + 1, B[1] + 6.5, 5)} />
      </Part>

      <Part id="train-bridge">
        <Plate k="train-bridge" shape={hull([[C[0], C[1], 1.6], [T[0], T[1], 1.5], [F[0], F[1], 1.6], [E[0], E[1], 1.4]])} depth={1.2} p={[0, 0, zOf(3.7)]} r={XY_Z} />
        {[C, T, F, E].map((c, i) => <group key={i}>{JEWEL(c, 4.9)}</group>)}
        {[[-1.2, 2.0], [-9.0, 0.6]].map(([x, y]) => <Fastener key={x} p={at(x, y, 4.9)} dir="z" set="train-screws" d={0.9} len={1.4} />)}
        <Callout id="train-bridge" p={at(-5, 5, 4.8)} />
      </Part>

      <Part id="pallet-bridge">
        <Plate k="pallet-bridge" shape={hull([[PAL[0], PAL[1], 1.0], [PAL[0] - 1.8, PAL[1] - 1.6, 1.0]])} depth={1.0} p={[0, 0, zOf(3.7)]} r={XY_Z} />
        {JEWEL(PAL, 4.7)}
        <Fastener p={at(PAL[0] - 1.8, PAL[1] - 1.6, 4.7)} dir="z" set="pallet-screws" d={0.8} len={1.2} />
        <Callout id="pallet-bridge" p={at(PAL[0] - 2.6, PAL[1] - 2.2, 4.6)} />
      </Part>

      <Part id="cock">
        <Plate k="cock" shape={hull([[BAL[0], BAL[1], 2.4], [COCK_FOOT[0], COCK_FOOT[1], 2.2]])} depth={1.1} p={[0, 0, zOf(4.2)]} r={XY_Z} />
        <Plate k="cock-foot" shape={hull([[COCK_FOOT[0], COCK_FOOT[1], 2.2]])} depth={2.6} p={[0, 0, zOf(1.6)]} r={XY_Z} />
        {JEWEL(BAL, 5.3)}
        <Box c={at(BAL[0] + 2.6, BAL[1] + 1.4, 5.4)} s={[5.2, 0.4, 0.15]} r={[0, 0, 0.5]} />
        <Fastener p={at(COCK_FOOT[0], COCK_FOOT[1], 5.3)} dir="z" set="cock-screw" d={1.0} len={2.4} />
        <Callout id="cock" p={at(COCK_FOOT[0] + 2, COCK_FOOT[1] + 1, 5.4)} />
      </Part>

      <Part id="keyless">
        <Plate k="ratchet" shape={() => gearShape(60, 4.2, 0.14, 0.9)} depth={0.4} p={[B[0], B[1], zOf(5.1)]} r={XY_Z} />
        <Plate k="crown-wheel" shape={() => gearShape(24, 1.5, 0.12, 0.3)} depth={0.4} p={[CROWN_WHEEL[0], CROWN_WHEEL[1], zOf(5.1)]} r={XY_Z} />
        <Box c={at(B[0] - 3.2, B[1] + 2.6, 5.2)} s={[2.4, 0.5, 0.25]} r={[0, 0, -0.7]} />
        <Callout id="keyless" p={at(B[0] - 1, B[1] + 1, 5.4)} />
      </Part>

      <Part id="crown">
        <Cyl c={at(14.6, 0, 0.8)} r={0.45} len={8} axis="x" seg={16} />
        <Plate k="crown-knurl" shape={() => gearShape(30, 2.5, 0.15, 0.4)} depth={2.6} p={at(18.8, 0, 0.8)} r={[0, Math.PI / 2, 0]} />
        <Callout id="crown" p={at(20, 2.6, 0.8)} />
      </Part>

      <Part id="dial">
        <Plate k="dial" shape={hull([[0, 0, 17.6]], [[0, 0, 0.6], [F[0], F[1], 0.4]])} depth={0.35} p={[0, 0, zOf(-0.55)]} r={XY_Z} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <Box key={i} c={at(15.4 * Math.cos(a), 15.4 * Math.sin(a), -0.62)} s={[i % 3 === 0 ? 2.4 : 1.4, 0.4, 0.12]} r={[0, 0, a]} />;
        })}
        <Turn k="subdial" profile={[[2.9, 0], [3.1, 0], [3.1, 0.1], [2.9, 0.1]]} p={at(F[0], F[1], -0.66)} axis="z" seg={40} />
        <Callout id="dial" p={at(-12, -11, -0.6)} />
      </Part>

      <Part id="hands">
        <Turning c={C} k="hour"><Box c={[0, 4.2, zOf(-0.85)]} s={[0.7, 8.4, 0.12]} /></Turning>
        <Turning c={C} k="center"><Box c={[0, 6.4, zOf(-1.05)]} s={[0.45, 12.8, 0.12]} /></Turning>
        <Turning c={F} k="fourth"><Box c={[0, 1.1, zOf(-0.85)]} s={[0.2, 3.2, 0.1]} /></Turning>
        <Cyl c={at(0, 0, -1.0)} r={0.6} len={0.4} axis="z" seg={20} />
        <Callout id="hands" p={at(1, 8, -1.2)} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'plate', index: 1, name: '主夹板', en: 'Main Plate', role: '底板', material: '镀铑黄铜', description: '机芯的“地基”：所有轮子的下轴承都装在它上面，一面朝表盘，一面装各个夹板。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'dial', index: 2, name: '表盘', en: 'Dial', role: '读时', material: '黄铜 / 珐琅', description: '小秒针在 9 点位：秒轮（四轮）的轴直接穿出表盘。', explode: [0, -15.1, -21.6], stage: [0.86, 0.94] },
  { id: 'hands', index: 3, name: '指针', en: 'Hands', role: '指示', material: '烤蓝钢', description: '分针装在中心轮轴上，时针经跨轮减速 12 倍，秒针装在秒轮轴上。', explode: [0, -25.2, -36], stage: [0.8, 0.88] },
  { id: 'barrel', index: 4, name: '条盒与发条', en: 'Barrel & Mainspring', role: '储能', material: '黄铜 / 合金钢', description: '盒子里卷着一条长长的钢发条。上弦把它卷紧，它慢慢放松，推动条盒外圈的 80 个齿转动，能走约 40 多小时。', explode: [0, 13.9, 19.8], stage: [0.7, 0.78] },
  { id: 'center', index: 5, name: '中心轮（二轮）', en: 'Centre Wheel', role: '带动分针', material: '黄铜 / 钢', description: '一小时转一圈，轴伸到表盘那面装分针。', explode: [0, 4.5, 6.5], stage: [0.76, 0.82] },
  { id: 'third', index: 6, name: '三轮', en: 'Third Wheel', role: '传动', material: '黄铜 / 钢', description: '承上启下的过渡轮。每一级都是大齿轮带小齿轴，转速一级级升高。', explode: [0, 6.5, 9.4], stage: [0.72, 0.78] },
  { id: 'fourth', index: 7, name: '秒轮（四轮）', en: 'Fourth Wheel', role: '带动秒针', material: '黄铜 / 钢', description: '一分钟转一圈，轴上装小秒针。', explode: [0, 9, 13], stage: [0.68, 0.74] },
  { id: 'escape', index: 8, name: '擒纵轮', en: 'Escape Wheel', role: '一格一格放行', material: '钢', description: '15 个棒头齿。它被擒纵叉卡住、放开、再卡住，所以秒针是一跳一跳走的，每次只放过半个齿。', explode: [0, 12.1, 17.3], stage: [0.64, 0.7] },
  { id: 'pallet', index: 9, name: '擒纵叉', en: 'Pallet Fork', role: '卡住 · 给冲量', material: '钢 / 红宝石', description: '像一把锚：两颗红宝石叉瓦轮流卡住擒纵轮；另一头的叉口被摆轮上的圆盘钉拨动，同时把擒纵轮的推力传回摆轮，让它一直摆下去。', explode: [0, 15.1, 21.6], stage: [0.43, 0.5] },
  { id: 'balance', index: 10, name: '摆轮', en: 'Balance Wheel', role: '计时基准', material: '铍青铜', description: '在游丝的弹力下来回摆动，周期极稳定，是手表的“钟摆”。真实机芯每秒摆 5 次（这里放慢了）。轮缘上的螺钉用来调平衡。', explode: [0, 22.7, 32.4], stage: [0.26, 0.36] },
  { id: 'hairspring', index: 11, name: '游丝', en: 'Hairspring', role: '回复力', material: '恒弹性合金', description: '比头发还细的扁平螺旋弹簧，一端连摆轮轴，一端固定在摆轮夹板上。它的长度决定走快走慢。', explode: [0, 26.5, 37.8], stage: [0.24, 0.32] },
  { id: 'barrel-bridge', index: 12, name: '条盒夹板', en: 'Barrel Bridge', role: '支承条盒', material: '镀铑黄铜', description: '压住条盒轴的上端，上面装着上弦用的棘轮和小钢轮。', explode: [0, 21.4, 30.6], stage: [0.5, 0.58] },
  { id: 'train-bridge', index: 13, name: '轮系夹板', en: 'Train Bridge', role: '支承轮系', material: '镀铑黄铜', description: '中心轮、三轮、秒轮、擒纵轮的上轴承都在这块夹板上，红色的是宝石轴承。', explode: [0, 17.6, 25.2], stage: [0.58, 0.66] },
  { id: 'pallet-bridge', index: 14, name: '擒纵叉夹板', en: 'Pallet Bridge', role: '支承擒纵叉', material: '镀铑黄铜', description: '一块小夹板，单独压住擒纵叉的轴。', explode: [0, 18.9, 27], stage: [0.37, 0.45] },
  { id: 'cock', index: 15, name: '摆轮夹板', en: 'Balance Cock', role: '支承摆轮 · 快慢针', material: '镀铑黄铜', description: '只用一颗螺钉固定的悬臂，方便单独取下摆轮。上面那根细长的就是快慢针，拨动它改变游丝有效长度来调快慢。', explode: [0, 30.2, 43.2], stage: [0.15, 0.24] },
  { id: 'keyless', index: 16, name: '棘轮与小钢轮', en: 'Ratchet & Crown Wheel', role: '上弦', material: '钢', description: '转动表冠，小钢轮带动棘轮给条盒轴上弦；棘爪卡住棘轮不让发条倒退。', explode: [0, 35.3, 50.4], stage: [0.06, 0.14] },
  { id: 'crown', index: 17, name: '表冠与柄轴', en: 'Crown & Stem', role: '上弦 · 拨针', material: '钢', description: '按进去拧是上弦，拔出来拧是调时间。拆机芯第一步就是把柄轴抽出来。', explode: [12, 0, 0], stage: [0, 0.08] },
];

const BOLT_SETS: Record<string, BoltSetDef> = {
  'cock-screw': { owner: 'cock', distance: 4, stage: [0.12, 0.16] },
  'pallet-screws': { owner: 'pallet-bridge', distance: 4, stage: [0.34, 0.38] },
  'barrel-screws': { owner: 'barrel-bridge', distance: 4, stage: [0.47, 0.51] },
  'train-screws': { owner: 'train-bridge', distance: 4, stage: [0.55, 0.59] },
};

const STEPS: StepDef[] = [
  {
    title: '机械表机芯', en: 'Lever Movement',
    body: '没有电池：发条储能，一串齿轮升速传下去，最后由擒纵机构和摆轮把能量一份一份放出来。摆轮每摆一次，秒针就跳一下。',
    state: { explode: 0, section: false, running: true, select: null, focus: null },
  },
  {
    title: '揭开夹板', en: 'Under the Bridges',
    body: '剖到夹板底面：条盒 → 中心轮 → 三轮 → 秒轮 → 擒纵轮，大齿轮带小齿轴，转速一级级升高。条盒一天约转 4 圈，擒纵轮一分钟约转 10 圈。',
    state: { explode: 0, section: true, running: true, select: 'third', focus: null },
  },
  {
    title: '擒纵机构', en: 'Escapement',
    body: '盯住这三件：摆轮摆过中间时，圆盘钉拨动擒纵叉，叉瓦放开擒纵轮半个齿；擒纵轮趁机推一下叉瓦，叉再把这股推力还给摆轮。“嘀嗒”声就是这样来的。',
    state: { explode: 0, section: true, running: true, select: 'pallet', focus: 'escapement' },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '抽出柄轴，拆棘轮，卸摆轮夹板取下摆轮和游丝，再拆擒纵叉、条盒夹板、轮系夹板，取出各轮和条盒，最后从另一面取下指针和表盘。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const watch: MachineDef = level({
  id: 'watch',
  unit: 0.3,
  bounds: [[-18, -18, -4.4], [22.5, 18, 2.0]],
  name: '机械表机芯',
  en: 'Mechanical Watch Movement',
  subtitle: '装配体 · 瑞士杠杆擒纵 · 小秒针',
  summary: '17 种零件 · 发条、轮系、擒纵叉、摆轮游丝，可看它走动',
  drawingNo: 'GW-JX-00',
  scale: '3 : 1',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: {
    balance: ['cock-screw', 'cock', 'hairspring', 'balance'],
    pallet: ['pallet-screws', 'pallet-bridge', 'pallet'],
  },
  guides: [
    { stage: 'cock', origin: at(BAL[0], BAL[1], 5.3) },
    { stage: 'balance', origin: at(BAL[0], BAL[1], 3.35) },
    { stage: 'train-bridge', origin: at(T[0], T[1], 4.8) },
    { stage: 'hands', origin: at(0, 0, -1.2) },
  ],
  centreLines: [[at(0, 0, -3), at(0, 0, 7), 4.8], [at(BAL[0], BAL[1], -1), at(BAL[0], BAL[1], 7), 5]],
  steps: STEPS,
  camera: {
    target: [0, -1, -1],
    offset: [62, 54, 72],
    orthoDistance: 300,
    exploded: { target: [0, 12, 14], scale: 1.55 },
    foci: { escapement: { target: at(-5.6, -4.2, 2.5), scale: 0.55 } },
  },
  Model: Movement,
  Driver: WatchDriver,
});
