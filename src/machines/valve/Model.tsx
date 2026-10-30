import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { box, cyl, lathe, sphere } from '../../scene/geometry';
import { M, Part } from '../../scene/Part';
import { ALONG_X, Bolt } from '../../scene/parts';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import { FLANGE_BOLTS, VALVE } from './data';

const AX = VALVE.axisY;

/** Quarter-turn cycle: open, turn shut, hold, turn open. phi = 0 open, π/2 closed. */
export const valveMotion = { phi: 0, t: 0 };

const HOLD = 1.6;
const TURN = 1.4;

export function ValveDriver() {
  useFrame((_, rawDt) => {
    if (!useStudio.getState().running) return;
    const m = valveMotion;
    m.t = (m.t + Math.min(rawDt, 0.05)) % ((HOLD + TURN) * 2);
    const ease = (x: number) => x * x * (3 - 2 * x);
    const t = m.t;
    let k: number;
    if (t < HOLD) k = 0;
    else if (t < HOLD + TURN) k = ease((t - HOLD) / TURN);
    else if (t < HOLD * 2 + TURN) k = 1;
    else k = 1 - ease((t - HOLD * 2 - TURN) / TURN);
    m.phi = k * (Math.PI / 2);
  }, -1);
  return null;
}

function useTurn() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = valveMotion.phi;
  });
  return ref;
}

/** Ball profile: the sphere between the two ends of its through-bore. */
function ballProfile(): Array<[number, number]> {
  const { ballR: R, bore } = VALVE;
  const half = Math.sqrt(R * R - bore * bore);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 24; i += 1) {
    const x = -half + (2 * half * i) / 24;
    pts.push([Math.sqrt(Math.max(bore * bore, R * R - x * x)), x]);
  }
  return pts;
}

function Body() {
  return (
    <Part id="body">
      <M
        clip
        geo={lathe('valve-body', [
          [0.45, -1.5], [1.1, -1.5], [1.1, -1.3], [0.8, -1.3], [0.95, -0.9], [0.98, -0.3], [0.98, 0.3], [0.88, 0.55],
          [1.15, 0.55], [1.15, 0.75], [0.82, 0.75], [0.82, 0.65], [0.78, 0.65], [0.78, -0.36], [0.66, -0.36], [0.66, -0.8], [0.45, -0.8],
        ], 96)}
        p={[0, AX, 0]}
        r={ALONG_X}
      />
      {/* neck: stem bore, packing box and the gland seat */}
      <M
        clip
        geo={lathe('valve-neck', [[0.16, 0.8], [0.42, 0.8], [0.42, 1.3], [0.5, 1.3], [0.5, 1.42], [0.28, 1.42], [0.28, 1.2], [0.16, 1.2]], 64)}
        p={[0, AX, 0]}
      />
      <Callout id="body" p={[-0.6, AX - 0.9, 0.3]} />
    </Part>
  );
}

function Bonnet() {
  return (
    <Part id="bonnet">
      <M
        clip
        geo={lathe('valve-bonnet', [
          [0.66, 0.65], [0.8, 0.65], [0.8, 0.75], [1.15, 0.75], [1.15, 0.95], [0.7, 0.95], [0.7, 1.35], [1.1, 1.35], [1.1, 1.55],
          [0.45, 1.55], [0.45, 0.8], [0.66, 0.8],
        ], 96)}
        p={[0, AX, 0]}
        r={ALONG_X}
      />
      <Callout id="bonnet" p={[1.15, AX + 0.75, 0.3]} />
    </Part>
  );
}

function Studs() {
  return (
    <Part id="studs">
      {FLANGE_BOLTS.map(([y, z], i) => <Bolt key={i} p={[0.95, AX + y, z]} axis="x" set="bonnet-nuts" />)}
      <Callout id="studs" p={[1.0, AX + 0.69, 0.69]} />
    </Part>
  );
}

function Ball() {
  const turn = useTurn();
  return (
    <Part id="ball">
      <group position={[VALVE.ballX, AX, 0]}>
        <group ref={turn}>
          <M clip geo={lathe('valve-ball', ballProfile(), 64)} r={ALONG_X} />
          {/* slot for the stem's tongue */}
          <M clip geo={box(0.12, 0.1, 0.38)} p={[0, VALVE.ballR - 0.07, 0]} />
        </group>
        <Callout id="ball" p={[0, -0.5, 0.45]} />
      </group>
    </Part>
  );
}

function Seats() {
  return (
    <Part id="seats">
      <M clip geo={lathe('valve-seat-l', [[0.45, -0.8], [0.66, -0.8], [0.66, -0.36], [0.62, -0.366], [0.54, -0.47], [0.45, -0.562]], 64)} p={[0, AX, 0]} r={ALONG_X} />
      <M clip geo={lathe('valve-seat-r', [[0.45, 0.562], [0.54, 0.47], [0.62, 0.366], [0.66, 0.36], [0.66, 0.8], [0.45, 0.8]], 64)} p={[0, AX, 0]} r={ALONG_X} />
      <Callout id="seats" p={[0.66, AX - 0.5, 0]} />
    </Part>
  );
}

function Stem() {
  const turn = useTurn();
  return (
    <Part id="stem">
      <group ref={turn}>
        <M geo={cyl(0.15, 0.15, 1.18, 32)} p={[0, AX + 1.19, 0]} />
        <M geo={box(0.1, 0.16, 0.34)} p={[0, AX + 0.68, 0]} />
        <M geo={cyl(0.2, 0.2, 0.08, 32)} p={[0, AX + 0.84, 0]} />
        <M geo={box(0.24, 0.2, 0.24)} p={[0, AX + 1.88, 0]} />
      </group>
      <Callout id="stem" p={[0.15, AX + 1.62, 0]} />
    </Part>
  );
}

function Packing() {
  return (
    <Part id="packing">
      <M clip geo={lathe('valve-packing', [[0.16, 1.2], [0.28, 1.2], [0.28, 1.34], [0.16, 1.34]], 48)} p={[0, AX, 0]} />
      <Callout id="packing" p={[-0.28, AX + 1.27, 0]} />
    </Part>
  );
}

function Gland() {
  return (
    <Part id="gland">
      <M clip geo={lathe('valve-gland', [[0.16, 1.34], [0.28, 1.34], [0.28, 1.42], [0.4, 1.42], [0.4, 1.56], [0.16, 1.56]], 48)} p={[0, AX, 0]} />
      <Callout id="gland" p={[-0.4, AX + 1.5, 0.1]} />
    </Part>
  );
}

function Handle() {
  const turn = useTurn();
  return (
    <Part id="handle">
      <group position={[0, AX + 1.88, 0]}>
        <group ref={turn}>
          <M geo={box(0.46, 0.14, 0.46)} />
          <M geo={box(1.95, 0.08, 0.2)} p={[-1.2, 0, 0]} />
          <M geo={sphere(0.12)} p={[-2.2, 0, 0]} />
          <Callout id="handle" p={[-1.5, 0.05, 0.1]} />
        </group>
      </group>
    </Part>
  );
}

export function Valve() {
  return (
    <group>
      <Body />
      <Bonnet />
      <Studs />
      <Ball />
      <Seats />
      <Stem />
      <Packing />
      <Gland />
      <Handle />
    </group>
  );
}
