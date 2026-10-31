import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef, Vec3 } from '../types';
import { Box, Cyl, level, Plate, poly, Rod, roundRect, Turn, XZ_Y, YZ_X } from '../kit';

/**
 * 台式钻床 (bench drill press), the classic 16 mm machine-tool design of the
 * Z4116 family: round 85 mm column, cast base with T-slots, a square table on
 * a bracket, and a headstock holding the quill, the spindle and the motor.
 * The motor shaft is vertical; two five-step cone pulleys and a V-belt set the
 * spindle speed, the three-spoke feed handle turns a pinion that drives the
 * quill rack, and a return spring pulls the spindle back up.
 *
 * Dimensions follow the public Z4116 specification (杭州西湖台钻 Z4116):
 * max drill 16 mm, column Ø85, spindle travel 125 mm, spindle centre to column
 * surface 240 mm, spindle nose to table 297 mm, spindle nose to base 560 mm,
 * spindle taper MT2, table 280 × 300 mm, base 315 × 335 mm, overall height
 * 1127 mm, motor 550 W, 5 spindle speeds 365–3150 r/min.
 * https://www.westlakemachine.com/Chinese/Bs_ProductShow.asp?ArticleID=1438
 *
 * Millimetres. +x is forward, +y up, the ground is y = 0, and the section
 * plane z = 0 contains the column axis, the spindle axis and the pulley axes,
 * so the full section shows the quill in its bore and the belt on its steps.
 */

const COLUMN_R = 42.5;
/** Spindle centre: 240 mm from the column surface, i.e. 282.5 mm from its axis. */
const SPINDLE_X = COLUMN_R + 240;
const BASE_TOP = 55;
const TABLE_TOP = 260;
const HEAD_BOTTOM = 740;
const HEAD_TOP = 1000;
const COVER_BOTTOM = 1000;
const COVER_TOP = 1127;
const NOSE_UP = BASE_TOP + 560;
const TRAVEL = 125;
/** Vertical motor shaft, behind the column; the belt spans to the spindle. */
const MOTOR_X = -140;
const MOTOR_RPM = 1400;
const PULLEY_Y0 = HEAD_TOP;
const STEP_H = 14;
const BELT_HALF = 4;

/**
 * Spindle speeds of the five belt steps, r/min. A matched pair of cone
 * pulleys keeps belt length constant, so the motor pulley radius plus the
 * spindle pulley radius is the same on every step; the radii below are
 * solved from the 1400 r/min motor so each step lands exactly on a speed.
 */
export const SPEEDS = [365, 630, 1100, 1900, 3150] as const;
const BELT_RADII = 140;
export const MOTOR_RADII = SPEEDS.map((rpm) => (BELT_RADII * (rpm / MOTOR_RPM)) / (1 + rpm / MOTOR_RPM));
export const SPINDLE_RADII = SPEEDS.map((rpm) => BELT_RADII / (1 + rpm / MOTOR_RPM));

export const DRILL = { travel: TRAVEL, motorRpm: MOTOR_RPM, speeds: SPEEDS, noseUp: NOSE_UP, tableTop: TABLE_TOP };

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Drill cycle: idle, feed down over 2 s, hold, return, rest; 0–125 mm. */
export const drillFeedTravel = (t: number) => {
  const p = ((t % 7) + 7) % 7;
  return TRAVEL * (smooth((p - 1) / 2) - smooth((p - 3.8) / 1.6));
};

export const useDrill = create<{ step: number; feed: boolean; set: (patch: Partial<{ step: number; feed: boolean }>) => void }>((set) => ({
  step: 2,
  feed: true,
  set: (patch) => set(patch),
}));

export const drillMotion = { t: 0, spin: 0, motorSpin: 0, quill: 0 };

/** Real r/min shown at a calm visual rate: 1/60 of the true angular speed. */
const visual = (rpm: number) => (rpm * Math.PI * 2) / 60 / 60;

export function DrillDriver() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const running = useStudio.getState().running;
    const { step, feed } = useDrill.getState();
    const m = drillMotion;
    const target = running && feed ? drillFeedTravel(m.t) : 0;
    if (running) {
      m.t += dt;
      m.spin += dt * visual(SPEEDS[step]);
      m.motorSpin += dt * visual(MOTOR_RPM);
    }
    m.quill += (target - m.quill) * (1 - Math.exp(-dt * 9));
  }, -1);
  return null;
}

/** Vertical slide with the quill (moves down by the feed travel). */
function Slide({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.y = -drillMotion.quill;
  });
  return <group ref={ref}>{children}</group>;
}

/** Turn about the vertical spindle axis (spindle, chuck and drill). */
function SpindleSpin({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = drillMotion.spin;
  });
  return <group ref={ref} position={[SPINDLE_X, 0, 0]}>{children}</group>;
}

/** Turn the motor cone pulley about its own vertical axis. */
function MotorSpin({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = drillMotion.motorSpin;
  });
  return <group ref={ref} position={[MOTOR_X, 0, 0]}>{children}</group>;
}

/** Five-step V-groove cone pulley, radius per step, from h0 upward. */
function stepProfile(radii: number[]): Array<[number, number]> {
  const profile: Array<[number, number]> = [[0, PULLEY_Y0]];
  radii.forEach((r, i) => {
    const y = PULLEY_Y0 + i * STEP_H;
    profile.push([r, y], [r, y + 3], [r - 5, y + STEP_H / 2], [r, y + STEP_H - 3], [r, y + STEP_H]);
  });
  profile.push([0, PULLEY_Y0 + radii.length * STEP_H]);
  return profile;
}

/** Centre of the belt on step i (the groove sits mid-step). */
const beltCentre = (i: number) => PULLEY_Y0 + i * STEP_H + STEP_H / 2;

/**
 * The flat belt as one closed band around the two vertical-axis pulleys.
 * The band is the outer tangent loop of the two circles, drawn as a shape
 * in the (x, −z) plane and extruded up through the belt height.
 */
function beltShape(motorR: number, spindleR: number) {
  const C = SPINDLE_X - MOTOR_X;
  const nx = (motorR - spindleR) / C;
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
  const c1: [number, number] = [SPINDLE_X, 0];
  const c2: [number, number] = [MOTOR_X, 0];
  const T1a: [number, number] = [c1[0] + spindleR * nx, c1[1] + spindleR * nz];
  const T1b: [number, number] = [c1[0] + spindleR * nx, c1[1] - spindleR * nz];
  const T2a: [number, number] = [c2[0] + motorR * nx, c2[1] + motorR * nz];
  const T2b: [number, number] = [c2[0] + motorR * nx, c2[1] - motorR * nz];
  const angle = (c: [number, number], p: [number, number]) => Math.atan2(p[1] - c[1], p[0] - c[0]);

  const wrap = (c: [number, number], r: number, a0: number, a1: number, through: number): Array<[number, number]> => {
    const norm = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const ccw = norm(a1 - a0);
    const cw = Math.PI * 2 - ccw;
    const dist = (a: number, b: number) => {
      const d = Math.abs(norm(a - b));
      return Math.min(d, Math.PI * 2 - d);
    };
    const sweep = dist(norm(a0 + ccw / 2), through) <= dist(norm(a0 - cw / 2), through) ? ccw : -cw;
    const points: Array<[number, number]> = [];
    for (let i = 1; i < 24; i += 1) {
      const a = a0 + (sweep * i) / 24;
      points.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
    }
    return points;
  };

  const outer: Array<[number, number]> = [];
  const inner: Array<[number, number]> = [];
  const add = (p: [number, number], nx: number, nz: number) => {
    outer.push([p[0] + BELT_HALF * nx, p[1] + BELT_HALF * nz]);
    inner.push([p[0] - BELT_HALF * nx, p[1] - BELT_HALF * nz]);
  };

  // top run: spindle tangent → motor tangent, normal is the +z common normal
  add(T1a, nx, nz);
  add(T2a, nx, nz);
  // around the motor pulley (the rear side)
  for (const p of wrap(c2, motorR, angle(c2, T2a), angle(c2, T2b), Math.PI)) {
    add(p, (p[0] - c2[0]) / motorR, (p[1] - c2[1]) / motorR);
  }
  add(T2b, nx, -nz);
  add(T1b, nx, -nz);
  // around the spindle pulley (the front side)
  for (const p of wrap(c1, spindleR, angle(c1, T1b), angle(c1, T1a), 0)) {
    add(p, (p[0] - c1[0]) / spindleR, (p[1] - c1[1]) / spindleR);
  }

  const shape = new THREE.Shape();
  const toPlane = (p: [number, number]): [number, number] => [p[0], -p[1]];
  shape.moveTo(...toPlane(outer[0]));
  for (const p of outer.slice(1)) shape.lineTo(...toPlane(p));
  shape.closePath();
  const hole = new THREE.Path();
  const reversed = [...inner].reverse();
  hole.moveTo(...toPlane(reversed[0]));
  for (const p of reversed.slice(1)) hole.lineTo(...toPlane(p));
  hole.closePath();
  shape.holes.push(hole);
  return () => shape;
}

function Base() {
  return (
    <Part id="base">
      <Plate k="dr-base" shape={roundRect(-110, -157.5, 225, 157.5, 14)} depth={BASE_TOP} p={[0, 0, 0]} r={XZ_Y} />
      <Turn k="dr-base-boss" profile={[[0, BASE_TOP], [70, BASE_TOP], [70, BASE_TOP + 20], [0, BASE_TOP + 20]]} p={[0, 0, 0]} axis="y" />
      {[-95, 0, 95].map((z) => (
        <Box key={z} c={[55, BASE_TOP + 0.4, z]} s={[250, 0.8, 18]} />
      ))}
      {[[-70, -120], [-70, 120], [180, -120], [180, 120]].map(([x, z], i) => (
        <Turn key={i} k={`dr-base-hole-${i}`} profile={[[6, 0], [11, 0], [11, 0.9], [6, 0.9]]} p={[x, BASE_TOP, z]} axis="y" />
      ))}
      <Callout id="base" p={[180, 40, 120]} />
    </Part>
  );
}

function Column() {
  return (
    <Part id="column">
      <Cyl c={[0, (BASE_TOP + HEAD_TOP - 10) / 2, 0]} r={COLUMN_R} len={HEAD_TOP - BASE_TOP - 10} seg={40} />
      <Turn k="dr-column-cap" profile={[[0, HEAD_TOP - 12], [COLUMN_R, HEAD_TOP - 12], [COLUMN_R, HEAD_TOP - 10], [0, HEAD_TOP - 10]]} />
      <Callout id="column" p={[30, 520, 42]} />
    </Part>
  );
}

function TableBracket() {
  return (
    <Part id="bracket">
      <Turn k="dr-bracket-sleeve" profile={[[COLUMN_R + 0.5, 160], [70, 160], [70, 224], [COLUMN_R + 0.5, 224]]} />
      <Box c={[80, 210, 0]} s={[180, 28, 96]} />
      <Turn k="dr-bracket-pad" profile={[[0, 196], [46, 196], [46, 224], [0, 224]]} p={[SPINDLE_X - 40, 0, 0]} />
      <Cyl c={[140, 208, 66]} r={6} len={150} axis="x" seg={14} />
      <Cyl c={[212, 208, 66]} r={11} len={26} axis="x" seg={16} />
      <Callout id="bracket" p={[120, 205, 72]} />
    </Part>
  );
}

function Table() {
  return (
    <Part id="table">
      <Plate k="dr-table" shape={roundRect(115, -150, 395, 150, 12, [[SPINDLE_X, 0, 15]])} depth={36} p={[0, TABLE_TOP - 36, 0]} r={XZ_Y} />
      <Box c={[255, TABLE_TOP, -80]} s={[240, 1, 16]} />
      <Box c={[255, TABLE_TOP, 80]} s={[240, 1, 16]} />
      <Box c={[320, TABLE_TOP, 0]} s={[16, 1, 244]} />
      <Box c={[255, TABLE_TOP - 18, -150]} s={[244, 4, 2]} />
      <Box c={[255, TABLE_TOP - 18, 150]} s={[244, 4, 2]} />
      <Callout id="table" p={[370, 272, 100]} />
    </Part>
  );
}

function Head() {
  return (
    <Part id="head">
      <Plate
        k="dr-head"
        shape={roundRect(-70, -105, 385, 105, 16, [[SPINDLE_X, 0, 36], [0, 0, 44]])}
        depth={HEAD_TOP - HEAD_BOTTOM}
        p={[0, HEAD_BOTTOM, 0]}
        r={XZ_Y}
      />
      <Turn k="dr-head-nose" profile={[[35, 700], [62, 700], [62, HEAD_BOTTOM], [35, HEAD_BOTTOM]]} p={[SPINDLE_X, 0, 0]} />
      {[1, -1].map((s) => (
        <Box key={s} c={[-130, 975, s * 60]} s={[120, 50, 40]} />
      ))}
      <Box c={[-70, 880, 0]} s={[20, 40, 210]} />
      {[1, -1].map((s) => (
        <Box key={s} c={[160, 900, s * 103]} s={[320, 6, 4]} />
      ))}
      <Box c={[392, 850, -52]} s={[16, 46, 34]} />
      <Cyl c={[402, 850, -52]} r={7} len={6} axis="x" seg={12} />
      {[[-26, 880], [330, 810], [330, 940]].map(([x, y], i) => (
        <Cyl key={i} c={[x, y, 103]} r={10} len={6} axis="z" seg={6} />
      ))}
      <Callout id="head" p={[350, 930, 80]} />
    </Part>
  );
}

/** Hood cross-section in the (y, z) plane: rounded top, side walls, open bottom. */
const HOOD_Z = 122;
const HOOD_R = 22;
const HOOD_T = 10;
const HOOD_BOTTOM = COVER_BOTTOM;
const HOOD_TOP = 1127;

function hoodProfile(): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const arc = (cy: number, cz: number, radius: number, a0: number, a1: number) => {
    for (let i = 1; i <= 6; i += 1) {
      const a = a0 + ((a1 - a0) * i) / 6;
      points.push([cy + radius * Math.cos(a), cz + radius * Math.sin(a)]);
    }
  };
  const innerZ = HOOD_Z - HOOD_T;
  const innerTop = HOOD_TOP - HOOD_T;
  const outerCentreY = HOOD_TOP - HOOD_R;
  points.push([HOOD_BOTTOM, -HOOD_Z]);
  points.push([outerCentreY, -HOOD_Z]);
  arc(outerCentreY, -HOOD_Z + HOOD_R, HOOD_R, -Math.PI / 2, 0);
  points.push([HOOD_TOP, HOOD_Z - HOOD_R]);
  arc(outerCentreY, HOOD_Z - HOOD_R, HOOD_R, 0, Math.PI / 2);
  points.push([HOOD_BOTTOM, HOOD_Z]);
  points.push([HOOD_BOTTOM, innerZ]);
  points.push([outerCentreY, innerZ]);
  arc(outerCentreY, HOOD_Z - HOOD_R, HOOD_R - HOOD_T, Math.PI / 2, 0);
  points.push([innerTop, -(HOOD_Z - HOOD_R)]);
  arc(outerCentreY, -(HOOD_Z - HOOD_R), HOOD_R - HOOD_T, 0, -Math.PI / 2);
  points.push([HOOD_BOTTOM, -innerZ]);
  return points;
}

function Cover() {
  return (
    <Part id="cover">
      <Plate k="dr-cover-shell" shape={poly(hoodProfile())} depth={676} p={[-262, 0, 0]} r={YZ_X} />
      <Plate k="dr-cover-front" shape={poly(hoodProfile())} depth={12} p={[402, 0, 0]} r={YZ_X} />
      <Plate k="dr-cover-back" shape={poly(hoodProfile())} depth={12} p={[-262, 0, 0]} r={YZ_X} />
      <Callout id="cover" p={[400, 1113, 90]} />
    </Part>
  );
}

function Motor() {
  return (
    <Part id="motor">
      <Cyl c={[MOTOR_X, 880, 0]} r={60} len={140} seg={32} />
      {Array.from({ length: 9 }, (_, i) => (
        <Cyl key={i} c={[MOTOR_X, 815 + i * 15, 0]} r={66} len={3} seg={32} />
      ))}
      <Box c={[MOTOR_X, 890, 66]} s={[52, 42, 24]} />
      <Cyl c={[MOTOR_X, 975, 0]} r={10} len={50} seg={16} />
      <Cyl c={[MOTOR_X, 948, 0]} r={72} len={8} seg={32} />
      <Callout id="motor" p={[-195, 900, 55]} />
    </Part>
  );
}

function MotorPulley() {
  return (
    <Part id="motor-pulley">
      <MotorSpin>
        <Turn k="dr-motor-pulley" profile={stepProfile(MOTOR_RADII)} seg={56} />
        <Cyl c={[0, 985, 0]} r={18} len={30} seg={20} />
      </MotorSpin>
      <Callout id="motor-pulley" p={[-150, 1060, 60]} />
    </Part>
  );
}

function SpindlePulley() {
  return (
    <Part id="spindle-pulley">
      <SpindleSpin>
        <Turn k="dr-spindle-pulley" profile={stepProfile(SPINDLE_RADII)} seg={72} />
      </SpindleSpin>
      <Callout id="spindle-pulley" p={[330, 1088, 50]} />
    </Part>
  );
}

function Belt() {
  const step = useDrill((s) => s.step);
  const motorR = MOTOR_RADII[step] - 2;
  const spindleR = SPINDLE_RADII[step] - 2;
  return (
    <Part id="belt">
      <Plate k={`dr-belt-${step}`} shape={beltShape(motorR, spindleR)} depth={12} p={[0, beltCentre(step) - 6, 0]} r={XZ_Y} />
      <Callout id="belt" p={[60, beltCentre(step) + 8, 30]} />
    </Part>
  );
}

function QuillSpindle() {
  return (
    <Part id="quill-spindle">
      <Slide>
        <Turn k="dr-quill" profile={[[17, 640], [33, 640], [33, 900], [17, 900]]} p={[SPINDLE_X, 0, 0]} seg={48} />
        <Turn k="dr-quill-collar" profile={[[33, 900], [38, 900], [38, 918], [33, 918]]} p={[SPINDLE_X, 0, 0]} seg={48} />
        {Array.from({ length: 7 }, (_, i) => (
          <Box key={i} c={[SPINDLE_X + 35, 648 + i * 14, 0]} s={[8, 6, 12]} />
        ))}
        <SpindleSpin>
          <Cyl c={[0, 850, 0]} r={16} len={470} seg={28} />
          <Turn k="dr-spindle-nose" profile={[[0, 615], [16, 615], [16, 628], [22, 636], [22, 645], [0, 645]]} seg={36} />
        </SpindleSpin>
      </Slide>
      <Callout id="quill-spindle" p={[308, 690, 42]} />
    </Part>
  );
}

function Chuck() {
  return (
    <Part id="chuck">
      <Slide>
        <SpindleSpin>
          <Turn k="dr-chuck" profile={[[0, 538], [18, 538], [30, 546], [34, 556], [34, 596], [26, 604], [26, 615], [0, 615]]} seg={48} />
          {Array.from({ length: 18 }, (_, i) => (
            <group key={i} rotation={[0, (i / 18) * Math.PI * 2, 0]}>
              <Box c={[34, 576, 0]} s={[3, 16, 3]} />
            </group>
          ))}
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
              <Box c={[14, 540, 0]} s={[12, 22, 6]} r={[0, 0, 0.16]} />
            </group>
          ))}
        </SpindleSpin>
      </Slide>
      <Callout id="chuck" p={[313, 585, 42]} />
    </Part>
  );
}

function Drill() {
  return (
    <Part id="drill">
      <Slide>
        <SpindleSpin>
          <Cyl c={[0, 472, 0]} r={8} len={130} seg={20} />
          {[0, 1].map((i) => (
            <group key={i} rotation={[0, Math.PI * i, 0]}>
              <Box c={[5.5, 470, 0]} s={[3, 116, 8]} r={[0, 0, 0.12]} />
            </group>
          ))}
          <Cyl c={[0, 401, 0]} r={8} r2={0} len={12} seg={20} />
        </SpindleSpin>
      </Slide>
      <Callout id="drill" p={[300, 455, 26]} />
    </Part>
  );
}

/** Three-spoke feed handle on the pinion shaft, on the camera side of the head. */
function FeedHandle() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = -drillMotion.quill / 18;
  });
  const spokes = [90, 210, 330].map((deg) => (deg * Math.PI) / 180);
  return (
    <Part id="feed-handle">
      <group ref={ref} position={[SPINDLE_X + 51, 850, 105]}>
        <Turn k="dr-feed-hub" profile={[[0, 0], [28, 0], [28, 16], [0, 16]]} axis="z" seg={32} />
        <Cyl c={[0, 0, 54]} r={10} len={92} axis="z" seg={16} />
        {spokes.map((a, i) => {
          const dir: Vec3 = [Math.cos(a), Math.sin(a), 0];
          const from: Vec3 = [dir[0] * 18, dir[1] * 18, 88];
          const to: Vec3 = [dir[0] * 118, dir[1] * 118, 88];
          const gripFrom: Vec3 = [dir[0] * 104, dir[1] * 104, 88];
          const gripTo: Vec3 = [dir[0] * 156, dir[1] * 156, 88];
          return (
            <group key={i}>
              <Rod a={from} b={to} r={8} seg={14} />
              <Rod a={gripFrom} b={gripTo} r={13} seg={16} />
            </group>
          );
        })}
      </group>
      <Callout id="feed-handle" p={[360, 800, 190]} />
    </Part>
  );
}

function DepthStop() {
  return (
    <Part id="depth-stop">
      <Cyl c={[400, 770, 60]} r={6} len={260} seg={14} />
      <Cyl c={[400, 906, 60]} r={12} len={16} seg={20} />
      <Turn k="dr-depth-ring" profile={[[6, 712], [17, 712], [17, 728], [6, 728]]} p={[400, 0, 60]} />
      <Cyl c={[400, 720, 82]} r={7} len={40} axis="z" seg={12} />
      <Box c={[392, 880, 60]} s={[25, 24, 44]} />
      <Callout id="depth-stop" p={[408, 700, 68]} />
    </Part>
  );
}

export function BenchDrill() {
  return (
    <group>
      <Base />
      <Column />
      <TableBracket />
      <Table />
      <Head />
      <Cover />
      <Motor />
      <MotorPulley />
      <SpindlePulley />
      <Belt />
      <QuillSpindle />
      <Chuck />
      <Drill />
      <FeedHandle />
      <DepthStop />
    </group>
  );
}

export function DrillControls() {
  const { step, feed, set } = useDrill();
  const studio = useStudio((s) => s.set);
  const [reading, setReading] = useState({ quill: 0 });
  useEffect(() => {
    const id = window.setInterval(() => setReading({ quill: drillMotion.quill }), 120);
    return () => window.clearInterval(id);
  }, []);
  const choose = (i: number) => {
    set({ step: i });
    studio({ running: true, selected: 'spindle-pulley' });
  };
  return (
    <>
      <div className="strokes gears">
        {SPEEDS.map((rpm, i) => (
          <button key={rpm} type="button" className={i === step ? 'is-on' : ''} onClick={() => choose(i)}>{i + 1}档</button>
        ))}
        <button type="button" className={feed ? 'is-on' : ''} onClick={() => { set({ feed: !feed }); studio({ running: true }); }}>进给</button>
      </div>
      <div className="gauges">
        <span>主轴 <b>{SPEEDS[step]}</b> r/min</span>
        <span className="gauge-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (reading.quill / TRAVEL) * 100)}%` }} /></span>
        <span>进给 <b>{reading.quill.toFixed(0)}</b> mm</span>
      </div>
      <p className="gear-note">电机 1400 r/min 定速；三角带换到另一对台阶，主轴就是 365–3150 r/min 五档转速。</p>
    </>
  );
}

const PARTS: PartDef[] = [
  {
    id: 'base', index: 1, name: '底座', en: 'Base', role: '支承 · 固定工件', material: 'HT200 灰铸铁',
    description: '315 × 335 mm 的铸铁底座，台面有三条 T 形槽用来固定工件和夹具，立柱坐在中间的凸台上。整机 129 kg，重心全压在这块底座上。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'column', index: 2, name: '立柱', en: 'Column', role: '导轨 · 承重', material: '铸铁 · 磨光',
    description: 'Ø85 mm 的圆形立柱，表面磨光。主轴箱和圆形工作台都套在它上面，整机 1127 mm 高，立柱是唯一的竖直基准。',
    explode: [0, 540, 0], stage: [0.84, 0.96],
  },
  {
    id: 'table', index: 3, name: '工作台', en: 'Table', role: '放工件', material: 'HT200 灰铸铁',
    description: '280 × 300 mm 的方形铸铁台面，中间有让钻头穿过的孔，表面有 T 形槽。松开锁紧手柄可以升降、还可以绕立柱转到旁边。',
    explode: [360, 0, 0], stage: [0.6, 0.72],
  },
  {
    id: 'bracket', index: 4, name: '工作台支架', en: 'Table Bracket', role: '锁紧 · 升降', material: 'HT200 灰铸铁',
    description: '套在立柱上的抱箍，前端托住工作台；锁紧手柄把抱箍夹紧在立柱上。松开后靠立柱里的齿条和手摇小齿轮升降台面。',
    explode: [-160, 200, 0], stage: [0.72, 0.84],
  },
  {
    id: 'head', index: 5, name: '主轴箱', en: 'Headstock', role: '装主轴 · 装电机', material: 'HT200 灰铸铁',
    description: '整台钻床的心脏：前面是磨过的套筒孔，套筒在里面上下滑动；后面装电机，顶上装皮带罩。箱体套在立柱顶端，靠剖开面可以看见孔里的套筒。',
    explode: [700, 400, 0], stage: [0.5, 0.64],
  },
  {
    id: 'cover', index: 6, name: '皮带罩', en: 'Belt Guard', role: '防护', material: '钢板',
    description: '罩住两只五级塔轮和三角带。换挡、调整皮带松紧都要先掀开（或拆下）它——安全第一，皮带和带轮不许露在外面转。',
    explode: [420, 420, 0], stage: [0, 0.12],
  },
  {
    id: 'motor', index: 7, name: '电机', en: 'Motor', role: '动力', material: '铸铁 · 绕组',
    description: '550 W 单相/三相电机，立式安装在主轴箱后面，转速 1400 r/min（4 极）。机身外面一圈散热片，尾巴上是接线盒和风罩。',
    explode: [-460, 0, 0], stage: [0.26, 0.38],
  },
  {
    id: 'motor-pulley', index: 8, name: '电机塔轮', en: 'Motor Cone Pulley', role: '主动轮', material: '铸铁 · 45 钢',
    description: '五级塔轮，装在电机轴上。每一级台阶直径不同，和主轴塔轮配对使用，两轮半径之和保持不变，所以换挡后三角带长度刚好。',
    explode: [-360, 160, 0], stage: [0.2, 0.3],
  },
  {
    id: 'spindle-pulley', index: 9, name: '主轴塔轮', en: 'Spindle Cone Pulley', role: '从动轮', material: '铸铁',
    description: '五级塔轮，装在主轴顶端，和电机塔轮成对。电机转 1400 r/min 不变，两轮半径比一变，主轴就是 365、630、1100、1900、3150 r/min 五档。',
    explode: [780, 340, 200], stage: [0.24, 0.34],
  },
  {
    id: 'belt', index: 10, name: '三角带', en: 'V-Belt', role: '传递动力', material: '橡胶 · 帘布芯',
    description: '开口三角带，套在同一级台阶的两只塔轮上。皮带断面积小、能塞进 V 形槽里，不打滑；换挡时把它整圈挪到另一对台阶上。',
    explode: [-420, 300, 0], stage: [0.1, 0.2],
  },
  {
    id: 'quill-spindle', index: 11, name: '主轴套筒与主轴', en: 'Quill & Spindle', role: '旋转 · 进给', material: '45 钢 · 调质',
    description: '套筒 Ø66 mm，在主轴箱的孔里滑动，行程 125 mm；主轴在套筒里靠轴承支承着转，下端是 MT2 锥孔，装钻夹头。套筒侧面有齿条，由进给手柄的小齿轮驱动。',
    explode: [0, -140, 0], stage: [0.42, 0.54],
  },
  {
    id: 'chuck', index: 12, name: '钻夹头', en: 'Drill Chuck', role: '夹钻头', material: '钢 · 淬火',
    description: '三爪钻夹头，夹持范围 3–16 mm。锥柄插进主轴的 MT2 锥孔里，靠摩擦力传动；拧外圈，三只爪子同时收拢或张开。',
    explode: [0, -220, 0], stage: [0.36, 0.48],
  },
  {
    id: 'drill', index: 13, name: '麻花钻', en: 'Twist Drill', role: '切削', material: '高速钢 HSS',
    description: 'Ø16 mm 高速钢麻花钻，两条螺旋槽把切屑卷出来，钻尖 118°。转速和进给要配好：转太快烧钻头，进给太猛钻头会折。',
    explode: [0, -260, 0], stage: [0.32, 0.44],
  },
  {
    id: 'feed-handle', index: 14, name: '进给手柄', en: 'Feed Handle', role: '手动进给', material: '钢 · 塑料手柄',
    description: '三爪手柄，转动时小齿轮拨动套筒上的齿条，主轴下行。手松开后回位卷簧把它拉回最高处；手柄转一圈，主轴走约 113 mm。',
    explode: [420, 120, 260], stage: [0.26, 0.38],
  },
  {
    id: 'depth-stop', index: 15, name: '深度限位', en: 'Depth Stop', role: '定深', material: '45 钢',
    description: '一根带刻度的限位杆，锁紧环先调到想要的深度再锁住。主轴下行到那个位置，限位环顶住主轴箱，钻头就不会再往下钻——批量钻孔靠它保证深度一致。',
    explode: [520, -40, 240], stage: [0.16, 0.28],
  },
];

const STEPS: StepDef[] = [
  {
    title: '台式钻床', en: 'Bench Drill',
    body: 'Z4116 台式钻床，最大钻孔 16 mm。电机经两只五级塔轮和三角带带动主轴转，转进给手柄让套筒带着主轴下行 125 mm，在工件上钻一个孔。左栏可以换挡、停进给，随时看主轴转速和进给深度。',
    state: { explode: 0, section: false, running: true, select: 'chuck', focus: null },
  },
  {
    title: '皮带传动', en: 'Belt Drive',
    body: '剖开看：电机立着装在主轴箱后面，轴上是一只五级塔轮；主轴顶端是配对的另一只。三角带套在同一级台阶上，两轮半径比一变，主轴转速就跟着变——最低 365、最高 3150 r/min。',
    state: { explode: 0, section: true, running: true, select: 'belt', focus: 'drive' },
  },
  {
    title: '进给与定深', en: 'Feed & Depth',
    body: '三爪手柄转一圈，小齿轮拨动套筒齿条，主轴走约 113 mm；松手后回位卷簧把主轴拉回去。右边的限位杆先调好位置锁紧，主轴下行到那儿就被顶住，深度每次都一样。',
    state: { explode: 0, section: false, running: true, select: 'feed-handle', focus: 'feed' },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '顺序是反的装配：先拆皮带罩和三角带，取下电机和两只塔轮；再卸钻头、钻夹头、主轴套筒；然后把主轴箱吊离立柱，取工作台和支架，最后把立柱从底座上拔出来。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const drill: MachineDef = level({
  id: 'drill',
  unit: 0.01,
  bounds: [[-262, 0, -160], [414, 1127, 160]],
  name: '台式钻床',
  en: 'Bench Drill Press',
  subtitle: '装配体 · Z4116 · 最大钻孔 16 mm',
  summary: '15 种零件 · 五级塔轮 365–3150 r/min，主轴进给钻孔会动',
  drawingNo: 'GW-ZT-00',
  scale: '1 : 8',
  parts: PARTS,
  boltSets: {},
  neighbours: {
    cover: ['cover', 'belt'],
    head: ['head', 'feed-handle', 'depth-stop'],
    table: ['table', 'bracket'],
    'quill-spindle': ['quill-spindle', 'chuck', 'drill'],
    'motor-pulley': ['motor-pulley', 'belt'],
  },
  guides: [
    { stage: 'cover', origin: [300, 1127, 0] },
    { stage: 'head', origin: [SPINDLE_X, 900, 0] },
    { stage: 'table', origin: [255, 260, 0] },
    { stage: 'bracket', origin: [60, 210, 0] },
    { stage: 'motor', origin: [MOTOR_X, 900, 0] },
  ],
  centreLines: [
    [[SPINDLE_X, 380, 0], [SPINDLE_X, 1090, 0]],
    [[0, 0, 0], [0, 1010, 0]],
    [[MOTOR_X, 960, 0], [MOTOR_X, 1005, 0]],
  ],
  steps: STEPS,
  camera: {
    target: [80, 560, 0],
    offset: [1500, 1050, 2300],
    orthoDistance: 3000,
    exploded: { target: [240, 780, 30], scale: 1.45 },
    foci: {
      drive: { target: [SPINDLE_X - 80, 980, 0], scale: 1.05 },
      feed: { target: [SPINDLE_X + 40, 820, 80], scale: 0.82 },
    },
  },
  Model: BenchDrill,
  Driver: DrillDriver,
  Controls: DrillControls,
});

