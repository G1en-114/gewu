import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { webShape } from '../../scene/geometry';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Pipe, Plate, Rod, Turn, tube, YZ_X } from '../kit';
import { REDUCTION } from './calc';
import { TowerControls } from './controls';
import { governorSpread, mainShaft, TowerDriver, towerMotion } from './motion';
import { GearX, Geo, rivetRing, sideShape, Slide, SpinX, SpinY, SpinZ } from './shared';

/**
 * 动力层: an inverted vertical compound engine — cylinders on top, crankshaft
 * underneath, as in a steamship. Boiler steam works first in the small
 * high-pressure cylinder, then passes through the receiver into the big
 * low-pressure one; the cranks are set at 90° so it never stops on a dead
 * centre. A 16-tooth pinion on the crankshaft drives a 96-tooth bull gear,
 * whose shaft turns the tower's main vertical shaft once per calculation
 * cycle. A fly-ball governor holds the speed.
 * Crankshaft along x at y = CRANK_Y; origin at the floor centre; metres.
 */

export const CRANK_Y = 0.4;
export const CRANK_R = 0.13;
export const ROD_L = 0.46;
const PISTON_UP = 0.24;
const CYL = { y0: 0.93, y1: 1.27 };
const HP = { x: -0.4, bore: 0.12, wall: 0.035 };
const LP = { x: 0.4, bore: 0.2, wall: 0.04 };
const CHEST_Z = 0.27;
const FLY = { x: 1.15, r: 0.38 };
const PINION_X = -1.0;
const MODULE = 0.01;
const BULL_Y = CRANK_Y + (MODULE * (REDUCTION[0] + REDUCTION[1])) / 2;
export const SHAFT_X = -1.62;
const GOV = { y0: CRANK_Y + 0.09, y1: 1.44 };
const TAU = Math.PI * 2;

/** Crosshead height for a crank angle θ (from top dead centre, turning +y toward +z). */
export function crossheadY(theta: number) {
  const s = CRANK_R * Math.sin(theta);
  return CRANK_Y + CRANK_R * Math.cos(theta) + Math.sqrt(ROD_L * ROD_L - s * s);
}

const hpAngle = () => towerMotion.crank;
const lpAngle = () => towerMotion.crank + Math.PI / 2;

/** One cylinder's moving train: piston, piston rod, crosshead and connecting rod. */
function Train({ x, bore, angle }: { x: number; bore: number; angle: () => number }) {
  return (
    <>
      <Slide offset={() => [0, crossheadY(angle()), 0]}>
        <Box c={[x, 0, 0]} s={[0.1, 0.08, 0.1]} />
        <Cyl c={[x, PISTON_UP / 2, 0]} r={0.02} len={PISTON_UP} seg={12} />
        <Turn k={`tw-en-piston-${bore}`} profile={[[0.02, PISTON_UP - 0.025], [bore - 0.004, PISTON_UP - 0.025], [bore - 0.004, PISTON_UP + 0.025], [0.02, PISTON_UP + 0.025]]} p={[x, 0, 0]} seg={36} />
        {[-1, 1].map((s) => <Box key={s} c={[x + s * 0.06, 0, 0]} s={[0.02, 0.07, 0.12]} />)}
      </Slide>
      <ConRod x={x} angle={angle} />
    </>
  );
}

/** Connecting rod from crank pin to crosshead pin, drawn as a group pivoting at the crosshead. */
function ConRod({ x, angle }: { x: number; angle: () => number }) {
  return (
    <Slide offset={() => [0, crossheadY(angle()), 0]}>
      <SpinX angle={() => {
        const th = angle();
        return Math.asin((CRANK_R * Math.sin(th)) / ROD_L);
      }}>
        <Box c={[x, -ROD_L / 2, 0]} s={[0.04, ROD_L - 0.08, 0.05]} />
        <Cyl c={[x, -ROD_L, 0]} r={0.045} len={0.07} axis="x" seg={20} />
        <Cyl c={[x, 0, 0]} r={0.03} len={0.07} axis="x" seg={16} />
      </SpinX>
    </Slide>
  );
}

/** A crank throw: two webs and the pin, at x (turning with the shaft). */
function Throw({ x, phase }: { x: number; phase: number }) {
  return (
    <group rotation={[phase, 0, 0]}>
      {[-0.055, 0.035].map((dx) => (
        <Plate key={dx} k="tw-en-web" shape={() => webShape(0.08, 0.055, CRANK_R)} depth={0.02} p={[x + dx, 0, 0]} r={YZ_X} />
      ))}
      <Cyl c={[x, CRANK_R, 0]} r={0.035} len={0.09} axis="x" seg={18} />
    </group>
  );
}

const cylinder = (k: string, c: { x: number; bore: number; wall: number }) => (
  <group>
    <Turn k={`tw-en-cyl-${k}`} profile={tube(c.bore + c.wall, CYL.y0, CYL.y1, c.wall)} p={[c.x, 0, 0]} seg={40} />
    <Turn k={`tw-en-lag-${k}`} profile={[[c.bore + c.wall, CYL.y0 + 0.04], [c.bore + c.wall + 0.012, CYL.y0 + 0.04], [c.bore + c.wall + 0.012, CYL.y1 - 0.04], [c.bore + c.wall, CYL.y1 - 0.04]]} p={[c.x, 0, 0]} seg={40} />
    <Turn k={`tw-en-cover-${k}`} profile={[[0, CYL.y1], [c.bore + c.wall + 0.03, CYL.y1], [c.bore + c.wall + 0.03, CYL.y1 + 0.025], [c.bore * 0.6, CYL.y1 + 0.045], [0, CYL.y1 + 0.045]]} p={[c.x, 0, 0]} seg={40} />
    <Turn k={`tw-en-bottom-${k}`} profile={[[0.022, CYL.y0 - 0.03], [c.bore + c.wall + 0.03, CYL.y0 - 0.03], [c.bore + c.wall + 0.03, CYL.y0], [0.022, CYL.y0]]} p={[c.x, 0, 0]} seg={40} />
    <Turn k={`tw-en-gland-${k}`} profile={[[0.022, CYL.y0 - 0.08], [0.045, CYL.y0 - 0.08], [0.045, CYL.y0 - 0.03], [0.022, CYL.y0 - 0.03]]} p={[c.x, 0, 0]} seg={6} />
    <Geo g={rivetRing(`en-${k}-top`, c.bore + c.wall + 0.018, CYL.y1 + 0.028, 12, 0.016)} p={[c.x, 0, 0]} />
    <Geo g={rivetRing(`en-${k}-bot`, c.bore + c.wall + 0.018, CYL.y0 + 0.003, 12, 0.016)} p={[c.x, 0, 0]} />
  </group>
);

/** Valve travel for a cylinder: the eccentric leads its crank by 90° plus a little lead. */
const valveLift = (angle: () => number) => (): [number, number, number] => [0, 0.03 * Math.cos(angle() + Math.PI / 2 + 0.35), 0];

export function Engine() {
  return (
    <group>
      <Part id="bedplate">
        <Box c={[0.12, 0.05, 0]} s={[2.5, 0.1, 0.62]} />
        {[-0.75, 0, 0.75, 1.35].map((x) => (
          <Plate key={x} k="tw-en-pedestal" shape={sideShape([[-0.16, 0.1], [0.16, 0.1], [0.08, CRANK_Y - 0.02], [0.08, CRANK_Y + 0.05], [-0.08, CRANK_Y + 0.05], [-0.08, CRANK_Y - 0.02]], [[0, CRANK_Y, 0.04]])} depth={0.1} p={[x - 0.05, 0, 0]} r={YZ_X} />
        ))}
        <Plate k="tw-en-pedestal-p" shape={sideShape([[-0.16, 0.1], [0.16, 0.1], [0.08, CRANK_Y - 0.02], [0.08, CRANK_Y + 0.05], [-0.08, CRANK_Y + 0.05], [-0.08, CRANK_Y - 0.02]], [[0, CRANK_Y, 0.04]])} depth={0.08} p={[PINION_X - 0.14, 0, 0]} r={YZ_X} />
        <Callout id="bedplate" p={[-0.75, 0.12, 0.3]} />
      </Part>

      <Part id="columns">
        {[HP, LP].map((c) => (
          <group key={c.x}>
            {[-1, 1].map((sx) => [-1, 1].map((sz) => (
              <Rod key={`${sx}${sz}`} a={[c.x + sx * 0.17, 0.1, sz * 0.22]} b={[c.x + sx * 0.14, CYL.y0 - 0.03, sz * 0.12]} r={0.022} />
            )))}
            {[-1, 1].map((sx) => <Box key={sx} c={[c.x + sx * 0.075, (0.66 + 1.06) / 2, 0]} s={[0.02, 0.4, 0.12]} />)}
            <Box c={[c.x, 0.64, 0]} s={[0.36, 0.03, 0.14]} />
          </group>
        ))}
        <Callout id="columns" p={[LP.x + 0.17, 0.5, 0.2]} />
      </Part>

      <Part id="hp-cyl">
        {cylinder('hp', HP)}
        <Callout id="hp-cyl" p={[HP.x, CYL.y1 + 0.03, 0.12]} />
      </Part>

      <Part id="lp-cyl">
        {cylinder('lp', LP)}
        <Callout id="lp-cyl" p={[LP.x + 0.1, CYL.y1 + 0.03, 0.16]} />
      </Part>

      <Part id="hp-train">
        <Train x={HP.x} bore={HP.bore} angle={hpAngle} />
        <Callout id="hp-train" p={[HP.x, 0.8, 0.06]} />
      </Part>

      <Part id="lp-train">
        <Train x={LP.x} bore={LP.bore} angle={lpAngle} />
        <Callout id="lp-train" p={[LP.x, 0.75, 0.06]} />
      </Part>

      <Part id="crankshaft">
        <SpinX at={[0, CRANK_Y, 0]} angle={hpAngle}>
          <Cyl c={[0.15, 0, 0]} r={0.04} len={2.6} axis="x" seg={20} />
          <Throw x={HP.x} phase={0} />
          <Throw x={LP.x} phase={Math.PI / 2} />
        </SpinX>
        <Callout id="crankshaft" p={[0.2, CRANK_Y + 0.05, 0.06]} />
      </Part>

      <Part id="flywheel">
        <SpinX at={[FLY.x, CRANK_Y, 0]} angle={hpAngle}>
          <Turn k="tw-en-rim" profile={[[FLY.r - 0.06, -0.06], [FLY.r, -0.06], [FLY.r, 0.06], [FLY.r - 0.06, 0.06]]} axis="x" seg={64} />
          <Turn k="tw-en-hub" profile={[[0.04, -0.07], [0.09, -0.07], [0.09, 0.07], [0.04, 0.07]]} axis="x" seg={24} />
          {Array.from({ length: 6 }, (_, i) => (
            <group key={i} rotation={[(i * TAU) / 6, 0, 0]}>
              <Box c={[0, (FLY.r + 0.03) / 2, 0]} s={[0.04, FLY.r - 0.12, 0.05]} />
            </group>
          ))}
        </SpinX>
        <Callout id="flywheel" p={[FLY.x + 0.06, CRANK_Y + FLY.r, 0.1]} />
      </Part>

      <Part id="valve-gear">
        {[{ c: HP, a: hpAngle }, { c: LP, a: lpAngle }].map(({ c, a }) => (
          <group key={c.x}>
            <SpinX at={[c.x + 0.12, CRANK_Y, 0]} angle={() => a() + Math.PI / 2 + 0.35}>
              {[0, 0.05].map((dx) => <Cyl key={dx} c={[dx, 0.03, 0]} r={0.075} len={0.03} axis="x" seg={24} />)}
            </SpinX>
            <Slide offset={valveLift(a)}>
              <Rod a={[c.x + 0.145, CRANK_Y + 0.08, 0.02]} b={[c.x + 0.145, 0.78, CHEST_Z - 0.04]} r={0.012} />
              <Plate k="tw-en-link" shape={sideShape([[CHEST_Z - 0.09, 0.74], [CHEST_Z - 0.04, 0.73], [CHEST_Z + 0.01, 0.74], [CHEST_Z + 0.01, 0.78], [CHEST_Z - 0.04, 0.77], [CHEST_Z - 0.09, 0.78]])} depth={0.025} p={[c.x + 0.13, 0, 0]} r={YZ_X} />
              <Rod a={[c.x, 0.78, CHEST_Z]} b={[c.x, CYL.y0 + 0.05, CHEST_Z]} r={0.012} />
            </Slide>
          </group>
        ))}
        <Rod a={[-0.5, 0.86, CHEST_Z + 0.08]} b={[0.6, 0.86, CHEST_Z + 0.08]} r={0.015} />
        <Rod a={[0.6, 0.86, CHEST_Z + 0.08]} b={[0.75, 1.2, CHEST_Z + 0.1]} r={0.014} />
        <Callout id="valve-gear" p={[LP.x + 0.15, 0.78, CHEST_Z]} />
      </Part>

      <Part id="valve-chests">
        {[HP, LP].map((c) => (
          <group key={c.x}>
            <Box c={[c.x, (CYL.y0 + CYL.y1) / 2, CHEST_Z - 0.02]} s={[0.18, CYL.y1 - CYL.y0 + 0.02, 0.025]} />
            <Box c={[c.x, (CYL.y0 + CYL.y1) / 2, CHEST_Z + 0.06]} s={[0.18, CYL.y1 - CYL.y0 + 0.02, 0.02]} />
            {[-1, 1].map((s) => <Box key={s} c={[c.x + s * 0.08, (CYL.y0 + CYL.y1) / 2, CHEST_Z + 0.02]} s={[0.02, CYL.y1 - CYL.y0 + 0.02, 0.06]} />)}
            <Box c={[c.x, CYL.y1 + 0.01, CHEST_Z + 0.02]} s={[0.18, 0.02, 0.1]} />
            <Box c={[c.x, (CYL.y0 + CYL.y1) / 2, (CHEST_Z - 0.04 + c.bore + c.wall) / 2]} s={[0.12, 0.2, CHEST_Z - 0.04 - c.bore - c.wall + 0.02]} />
            <Slide offset={valveLift(c.x < 0 ? hpAngle : lpAngle)}>
              <Box c={[c.x, (CYL.y0 + CYL.y1) / 2, CHEST_Z + 0.015]} s={[0.12, 0.11, 0.04]} />
            </Slide>
          </group>
        ))}
        <Callout id="valve-chests" p={[LP.x, CYL.y1 - 0.05, CHEST_Z + 0.08]} />
      </Part>

      <Part id="receiver">
        <Pipe k="tw-en-receiver" pts={[[HP.x, CYL.y1 + 0.02, CHEST_Z + 0.02], [HP.x, CYL.y1 + 0.12, CHEST_Z + 0.04], [0, CYL.y1 + 0.16, CHEST_Z + 0.06], [LP.x, CYL.y1 + 0.12, CHEST_Z + 0.04], [LP.x, CYL.y1 + 0.02, CHEST_Z + 0.02]]} r={0.05} />
        <Pipe k="tw-en-exhaust" pts={[[LP.x + 0.08, CYL.y0 + 0.05, CHEST_Z + 0.06], [LP.x + 0.3, CYL.y0, CHEST_Z + 0.1], [0.95, 0.6, 0.35], [0.95, 0.05, 0.4]]} r={0.06} />
        <Callout id="receiver" p={[0, CYL.y1 + 0.2, CHEST_Z + 0.06]} />
      </Part>

      <Part id="governor">
        <SpinY at={[0, 0, 0]} angle={() => towerMotion.crank * 1.5}>
          <Cyl c={[0, (GOV.y0 + GOV.y1) / 2, 0]} r={0.014} len={GOV.y1 - GOV.y0} seg={12} />
          <Turn k="tw-en-govbevel" profile={[[0.014, 0], [0.06, 0], [0.04, 0.035], [0.014, 0.035]]} p={[0, GOV.y0 + 0.035, 0]} axis="-y" seg={24} />
          {[-1, 1].map((s) => <GovernorArm key={s} side={s} />)}
          <Slide offset={() => [0, 0.06 * governorSpread(), 0]}>
            <Turn k="tw-en-sleeve" profile={[[0.014, 1.2], [0.035, 1.2], [0.035, 1.24], [0.014, 1.24]]} seg={20} />
          </Slide>
        </SpinY>
        <Turn k="tw-en-govbevel2" profile={[[0.04, 0], [0.07, 0], [0.05, 0.03], [0.04, 0.03]]} p={[-0.07, CRANK_Y, 0]} axis="x" seg={24} />
        <Callout id="governor" p={[0.05, GOV.y1, 0.05]} />
      </Part>

      <Part id="throttle">
        <group position={[HP.x, CYL.y1 + 0.13, CHEST_Z + 0.02]}>
          <Turn k="tw-en-valvebody" profile={[[0, -0.06], [0.06, -0.06], [0.07, 0], [0.06, 0.06], [0, 0.06]]} axis="z" seg={24} />
          <Cyl c={[0, 0.1, 0]} r={0.01} len={0.12} seg={8} />
          <SpinZ angle={() => -0.4 + 0.5 * governorSpread()}>
            <Box c={[0.1, 0, 0]} s={[0.2, 0.014, 0.014]} />
          </SpinZ>
        </group>
        <Rod a={[HP.x + 0.2, CYL.y1 + 0.24, CHEST_Z + 0.02]} b={[0.03, 1.22, 0]} r={0.008} />
        <Pipe k="tw-en-inlet" pts={[[HP.x - 0.07, CYL.y1 + 0.13, CHEST_Z + 0.02], [HP.x - 0.3, CYL.y1 + 0.12, CHEST_Z], [-0.95, 1.0, -0.2], [-0.95, 0.1, -0.45], [-0.95, -0.05, -0.45]]} r={0.04} />
        <Callout id="throttle" p={[HP.x - 0.05, CYL.y1 + 0.2, CHEST_Z + 0.06]} />
      </Part>

      <Part id="reduction">
        <SpinX at={[PINION_X, CRANK_Y, 0]} angle={hpAngle}>
          <GearX k="en-pinion" n={REDUCTION[0]} m={MODULE} x={-0.04} t={0.08} bore={0.04} />
        </SpinX>
        <SpinX at={[PINION_X, BULL_Y, 0]} angle={() => -mainShaft()}>
          <GearX k="en-bull" n={REDUCTION[1]} m={MODULE} x={-0.03} t={0.06} bore={0.04} />
          <Turn k="tw-en-bullhub" profile={[[0.04, -0.06], [0.1, -0.06], [0.1, 0.06], [0.04, 0.06]]} axis="x" seg={24} />
        </SpinX>
        <Callout id="reduction" p={[PINION_X, BULL_Y + 0.3, 0.2]} />
      </Part>

      <Part id="layshaft">
        <SpinX at={[0, BULL_Y, 0]} angle={() => -mainShaft()}>
          <Cyl c={[(PINION_X + 0.1 + SHAFT_X + 0.02) / 2, 0, 0]} r={0.035} len={PINION_X + 0.1 - SHAFT_X - 0.02} axis="x" seg={16} />
          <Turn k="tw-en-lsbevel" profile={[[0.035, 0], [0.12, 0], [0.08, 0.07], [0.035, 0.07]]} p={[SHAFT_X + 0.08, 0, 0]} axis="-x" seg={32} />
        </SpinX>
        <Plate k="tw-en-ls-bracket" shape={sideShape([[-0.12, 0.1], [0.12, 0.1], [0.06, BULL_Y + 0.06], [-0.06, BULL_Y + 0.06]], [[0, BULL_Y, 0.04]])} depth={0.06} p={[-1.35, 0, 0]} r={YZ_X} />
        <Callout id="layshaft" p={[-1.35, BULL_Y + 0.08, 0.06]} />
      </Part>
    </group>
  );
}

/** One fly-ball arm, swinging out with speed. */
function GovernorArm({ side }: { side: number }) {
  return (
    <group position={[0, GOV.y1 - 0.03, 0]}>
      <SpinZ angle={() => side * (0.35 + 0.6 * governorSpread())}>
        <Box c={[0, -0.09, 0]} s={[0.012, 0.18, 0.012]} />
        <Turn k="tw-en-ball" profile={Array.from({ length: 13 }, (_, i): [number, number] => {
          const a = -Math.PI / 2 + (i / 12) * Math.PI;
          return [Math.max(0.0001, 0.04 * Math.cos(a)), -0.2 + 0.04 * Math.sin(a)];
        })} seg={20} />
      </SpinZ>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'bedplate', index: 1, name: '机座与主轴承', en: 'Bedplate', role: '托曲轴', material: '铸铁', description: '整块铸铁机座，五个主轴承座托着曲轴；整台机器约 4 吨，都压在这层楼板的大梁上。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'columns', index: 2, name: '立柱与十字头导板', en: 'Columns & Guides', role: '把汽缸架高', material: '锻钢', description: '每个汽缸下面四根斜撑立柱，中间两块导板夹着十字头，让活塞杆只能上下走。', explode: [0, 0, 0.6], stage: [0.62, 0.76] },
  { id: 'hp-cyl', index: 3, name: '高压缸', en: 'HP Cylinder', role: '新蒸汽先在这里做功', material: '铸铁 · 木条包覆', description: '缸径 240 mm。6 bar 的新蒸汽先进这里膨胀做功，出来时压力只剩约 2 bar，再进低压缸。外面包着木条保温。', explode: [0, 0.75, 0], stage: [0.2, 0.34] },
  { id: 'lp-cyl', index: 4, name: '低压缸', en: 'LP Cylinder', role: '用余压再做一次功', material: '铸铁 · 木条包覆', description: '缸径 400 mm，比高压缸大得多：压力低了，要更大的活塞才能出同样的力。两缸各出一半功——这就是复式（双胀）蒸汽机。', explode: [0, 0.85, 0], stage: [0.24, 0.38] },
  { id: 'hp-train', index: 5, name: '高压活塞连杆组', en: 'HP Piston & Rods', role: '往复 → 旋转', material: '锻钢', description: '活塞、活塞杆、十字头、连杆一条线：活塞上下 260 mm（曲柄半径 130 mm），连杆 460 mm。', explode: [-0.3, 0.3, 0.55], stage: [0.36, 0.5] },
  { id: 'lp-train', index: 6, name: '低压活塞连杆组', en: 'LP Piston & Rods', role: '往复 → 旋转', material: '锻钢', description: '和高压侧一样的连杆组，曲柄比高压侧落后 90°：一个在死点时另一个正好在中途，所以从任何位置都能起动。', explode: [0.3, 0.3, 0.55], stage: [0.4, 0.54] },
  { id: 'crankshaft', index: 7, name: '曲轴', en: 'Crankshaft', role: '两个曲拐相差 90°', material: '锻钢', description: '两个曲拐相差 90°。曲轴一端是飞轮，另一端是 16 齿小齿轮——它转 6 圈，主竖轴转 1 圈，机器算完一行。', explode: [0, -0.15, 0.85], stage: [0.7, 0.84] },
  { id: 'flywheel', index: 8, name: '飞轮', en: 'Flywheel', role: '抹平每一冲程的起伏', material: '铸铁', description: 'Ø760 mm，六根辐条。两缸的推力一冲程一冲程地来，飞轮把它抹平，计算核心才转得均匀。', explode: [0.55, 0, 0], stage: [0.08, 0.2] },
  { id: 'valve-gear', index: 9, name: '斯蒂芬森配汽机构', en: 'Stephenson Valve Gear', role: '决定何时进汽', material: '钢', description: '曲轴上每缸一对偏心轮，经偏心杆和弧形连杆推动阀杆。偏心轮比曲拐超前 90° 多一点（超前角），活塞到死点前就提前开汽。扳动换向杆还能让机器反转。', explode: [0, -0.1, 0.5], stage: [0.5, 0.64] },
  { id: 'valve-chests', index: 10, name: '滑阀箱', en: 'Valve Chests', role: '轮流开两端汽口', material: '铸铁', description: '每缸前面一个阀箱，里面的 D 形滑阀上下滑，轮流把蒸汽送进活塞上方和下方，并放走另一边的乏汽。剖开可以看到滑阀。', explode: [0, 0.2, 0.45], stage: [0.3, 0.44] },
  { id: 'receiver', index: 11, name: '中间接收管与排汽管', en: 'Receiver & Exhaust', role: '高压 → 低压 → 烟囱', material: '紫铜管', description: '高压缸排出的蒸汽经顶上这根弯管进低压缸；低压缸的乏汽从排汽管往下、通到锅炉烟囱里喷出，顺便给炉火抽风。', explode: [0, 0.6, 0.25], stage: [0.12, 0.26] },
  { id: 'governor', index: 12, name: '离心调速器', en: 'Fly-ball Governor', role: '稳住转速', material: '钢 · 黄铜球', description: '曲轴经锥齿轮带动竖轴，两只飞球转得越快张得越开，抬起套筒、经拉杆关小节流阀；慢了就开大。左栏换压力时看它张合。', explode: [0, 0.45, -0.3], stage: [0.04, 0.16] },
  { id: 'throttle', index: 13, name: '节流阀与进汽管', en: 'Throttle & Steam Inlet', role: '控制进汽量', material: '青铜', description: '锅炉来的蒸汽从楼板下上来，经节流阀进高压阀箱。阀门开度由调速器的拉杆决定。', explode: [-0.3, 0.45, 0.2], stage: [0, 0.12] },
  { id: 'reduction', index: 14, name: '减速齿轮 16 / 96', en: 'Reduction Gears', role: '6 : 1', material: '铸钢', description: '曲轴上 16 齿小齿轮带动 96 齿大齿轮，模数 10。蒸汽机要 45 r/min 才转得稳，而计算一行要 8 秒，减速 6 倍正好。', explode: [-0.25, 0.1, 0.6], stage: [0.56, 0.7] },
  { id: 'layshaft', index: 15, name: '取力轴与锥齿轮', en: 'Layshaft & Bevel', role: '交给主竖轴', material: '钢', description: '大齿轮轴伸到塔的左后角，用一对锥齿轮把转动拐上去，交给贯穿全塔的主竖轴。', explode: [-0.4, 0.2, 0], stage: [0.6, 0.74] },
];

const STEPS: StepDef[] = [
  {
    title: '动力层', en: 'Engine Floor',
    body: '倒立式双胀蒸汽机：汽缸在上、曲轴在下，像轮船里的那样。新蒸汽先进小的高压缸，再经接收管进大的低压缸，一份蒸汽用两次。两个曲拐差 90°，从任何位置都能起动。曲轴转 6 圈，主竖轴转 1 圈，计算核心算完一行。',
    state: { explode: 0, section: false, running: true, select: 'lp-cyl', focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '沿中线剖开：看两个活塞一上一下错开、阀箱里的滑阀上下拉。左栏切到高压，调速器的飞球张开，节流阀关小一些。',
    state: { explode: 0, section: true, running: true, select: 'valve-chests', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先拆节流阀、调速器和接收管，吊走两个汽缸，抽出活塞连杆组，拆配汽机构、减速齿轮和飞轮，最后抬出曲轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const engineLevel: MachineDef = level({
  id: 'tower/engine',
  parent: 'tower',
  unit: 4,
  bounds: [[-1.7, 0, -0.5], [1.4, 1.46, 0.5]],
  name: '动力层',
  en: 'Engine Floor',
  subtitle: '子组件 · 倒立式双胀蒸汽机 · 45 r/min',
  summary: '15 种零件：高低压两缸、斯蒂芬森配汽、离心调速器、16 / 96 减速……',
  drawingNo: 'GW-TG-02',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'lp-cyl', origin: [LP.x, CYL.y1, 0] }, { stage: 'hp-cyl', origin: [HP.x, CYL.y1, 0] }],
  centreLines: [[[-1.7, CRANK_Y, 0], [1.4, CRANK_Y, 0], 0.04], [[HP.x, 0.5, 0], [HP.x, 1.4, 0], HP.bore], [[LP.x, 0.5, 0], [LP.x, 1.4, 0], LP.bore]],
  steps: STEPS,
  camera: {
    target: [-0.1, 0.72, 0],
    offset: [2.4, 2.0, 5.6],
    orthoDistance: 8,
    exploded: { target: [-0.1, 0.9, 0.3], scale: 1.4 },
  },
  Model: Engine,
  Driver: TowerDriver,
  Controls: TowerControls,
});
