import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { box, cyl, extrude, gearShape, lathe } from '../../scene/geometry';
import { M, Part } from '../../scene/Part';
import { ALONG_X, ALONG_Z, Bolt, HALF_PI } from '../../scene/parts';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import { COVER_SCREWS, PUMP } from './data';

const { lowerY: Y1, upperY: Y2, chamberR, outerR, width, shaftR, teeth, pitchR, module } = PUMP;
const HALF = width / 2;

/** Driving shaft angle; the driven gear turns the other way, half a tooth out of phase. */
export const pumpMotion = { angle: 0 };

export function PumpDriver() {
  useFrame((_, rawDt) => {
    if (useStudio.getState().running) pumpMotion.angle += Math.min(rawDt, 0.05) * 1.6;
  }, -1);
  return null;
}

/** Outline of the body and covers in (u = −z, y): two half circles joined by straight sides. */
function stadium() {
  const s = new THREE.Shape();
  s.absarc(0, Y1, outerR, Math.PI, Math.PI * 2, false);
  s.absarc(0, Y2, outerR, 0, Math.PI, false);
  s.closePath();
  return s;
}

/** The gear chamber: two intersecting tip circles. */
function chamber() {
  const half = Math.atan2((Y2 - Y1) / 2, Math.sqrt(chamberR ** 2 - ((Y2 - Y1) / 2) ** 2));
  const p = new THREE.Path();
  p.absarc(0, Y1, chamberR, Math.PI - half, Math.PI * 2 + half, false);
  p.absarc(0, Y2, chamberR, -half, Math.PI + half, false);
  return p;
}

function bodyShape() {
  const s = stadium();
  s.holes.push(chamber());
  return s;
}

function coverShape() {
  const s = stadium();
  for (const y of [Y1, Y2]) {
    const h = new THREE.Path();
    h.absarc(0, y, shaftR + 0.01, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return s;
}

function Body() {
  return (
    <Part id="body">
      <M clip geo={extrude('pump-body', bodyShape, width)} p={[-HALF, 0, 0]} r={[0, HALF_PI, 0]} />
      <M clip geo={box(width, 0.2, 3.0)} p={[0, 0.1, 0]} />
      {/* outlet (front) and inlet (back) bosses */}
      <M clip geo={lathe('pump-port', [[0.16, 0], [0.32, 0], [0.32, 0.5], [0.16, 0.5]], 40)} p={[0, 1.8, 0.85]} r={ALONG_Z} />
      <M clip geo={lathe('pump-port', [[0.16, 0], [0.32, 0], [0.32, 0.5], [0.16, 0.5]], 40)} p={[0, 1.8, -0.85]} r={[-HALF_PI, 0, 0]} />
      <Callout id="body" p={[0, 0.6, 1.0]} />
    </Part>
  );
}

function LeftCover() {
  return (
    <Part id="left-cover">
      <M clip geo={extrude('pump-cover', coverShape, 0.3)} p={[-HALF - 0.3, 0, 0]} r={[0, HALF_PI, 0]} />
      {COVER_SCREWS.map(([z, y], i) => <Bolt key={i} p={[-HALF - 0.3, y, z]} axis="x" flip set="left-screws" clip />)}
      <Callout id="left-cover" p={[-0.75, Y2 + 0.6, 0.3]} />
    </Part>
  );
}

function RightCover() {
  return (
    <Part id="right-cover">
      <M clip geo={extrude('pump-cover', coverShape, 0.3)} p={[HALF, 0, 0]} r={[0, HALF_PI, 0]} />
      {/* stuffing-box boss round the driving shaft */}
      <M clip geo={lathe('pump-boss', [[0.3, 0], [0.45, 0], [0.45, 0.45], [0.3, 0.45]], 48)} p={[HALF + 0.3, Y2, 0]} r={ALONG_X} />
      {COVER_SCREWS.map(([z, y], i) => <Bolt key={i} p={[HALF + 0.3, y, z]} axis="x" set="right-screws" clip />)}
      <Callout id="right-cover" p={[0.75, Y1 - 0.5, 0.4]} />
    </Part>
  );
}

/** Rotates about the shaft axis (x). */
function useSpin(driven: boolean) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = driven ? -pumpMotion.angle + Math.PI / teeth : pumpMotion.angle;
  });
  return ref;
}

function GearShaft({ y, to, driven }: { y: number; to: number; driven: boolean }) {
  const spin = useSpin(driven);
  const from = -HALF - 0.25;
  return (
    <group position={[0, y, 0]}>
      <group ref={spin}>
        <M geo={extrude('pump-gear', () => gearShape(teeth, pitchR, module, shaftR), width - 0.02)} p={[-HALF + 0.01, 0, 0]} r={[0, HALF_PI, 0]} />
        <M geo={cyl(shaftR, shaftR, to - from, 40)} p={[(from + to) / 2, 0, 0]} r={ALONG_X} />
      </group>
    </group>
  );
}

function DriveShaft() {
  return (
    <Part id="drive-shaft">
      <GearShaft y={Y2} to={2.25} driven={false} />
      <Callout id="drive-shaft" p={[1.35, Y2 + 0.15, 0.1]} />
    </Part>
  );
}

function DrivenShaft() {
  return (
    <Part id="driven-shaft">
      <GearShaft y={Y1} to={HALF + 0.25} driven />
      <Callout id="driven-shaft" p={[0, Y1 - 0.3, 0.5]} />
    </Part>
  );
}

function Packing() {
  return (
    <Part id="packing">
      <M clip geo={lathe('pump-packing', [[0.2, 0], [0.3, 0], [0.3, 0.3], [0.2, 0.3]], 40)} p={[HALF + 0.45, Y2, 0]} r={ALONG_X} />
      <Callout id="packing" p={[1.0, Y2 + 0.35, 0]} />
    </Part>
  );
}

function Gland() {
  return (
    <Part id="gland">
      <M
        clip
        geo={lathe('pump-gland', [[0.45, 0], [0.56, 0], [0.56, 0.4], [0.2, 0.4], [0.2, 0.15], [0.45, 0.15]], 6)}
        p={[HALF + 0.6, Y2, 0]}
        r={ALONG_X}
      />
      <Callout id="gland" p={[1.2, Y2 + 0.5, 0.2]} />
    </Part>
  );
}

function DriveGear() {
  const spin = useSpin(false);
  return (
    <Part id="drive-gear">
      <group position={[0, Y2, 0]}>
        <group ref={spin}>
          <M clip geo={extrude('pump-drive-gear', () => gearShape(22, 0.88, 0.08, shaftR), 0.3)} p={[1.6, 0, 0]} r={[0, HALF_PI, 0]} />
          <M clip geo={lathe('pump-washer', [[0.2, 0], [0.34, 0], [0.34, 0.04], [0.2, 0.04]], 32)} p={[1.9, 0, 0]} r={ALONG_X} />
          <M clip geo={lathe('pump-nut', [[0.2, 0], [0.3, 0], [0.3, 0.2], [0.2, 0.2]], 6)} p={[1.94, 0, 0]} r={ALONG_X} />
        </group>
        <Callout id="drive-gear" p={[1.75, 0.8, 0.2]} />
      </group>
    </Part>
  );
}

export function Pump() {
  return (
    <group>
      <Body />
      <LeftCover />
      <RightCover />
      <DriveShaft />
      <DrivenShaft />
      <Packing />
      <Gland />
      <DriveGear />
    </group>
  );
}
