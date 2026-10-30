import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { box, coil, cyl, extrude, gearShape, lathe, outline, webShape } from '../../scene/geometry';
import { M, Part } from '../../scene/Part';
import { ALONG_NEG_X, ALONG_X, ALONG_Z, Bolt, HALF_PI } from '../../scene/parts';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import { HEAD_SCREWS, ICE, VALVE_SCREWS } from './data';
import { camAngle, crankPin, exhaustLift, iceMotion, intakeLift, rockerAngle, useIce, wristPinX } from './motion';

const Y = ICE.axisY;
const [CAM_X, CAM_Y] = ICE.cam;
const VX = ICE.valveX;
const VZ = ICE.valveZ;
const [PIVOT_X, PIVOT_Y] = ICE.pivot;

export function IceDriver() {
  useFrame((_, rawDt) => {
    if (!useStudio.getState().running) return;
    iceMotion.theta += Math.min(rawDt, 0.05) * useIce.getState().speed * Math.PI * 2;
  }, -1);
  return null;
}

function Base() {
  return (
    <Part id="base" tone={0.55}>
      {/* L-shaped plate; the outline is drawn in (x, -z) and laid flat. */}
      <M
        clip
        geo={extrude('ice-base', outline([[-2.25, -1.6], [5.875, -1.6], [5.875, 1.09], [1.94, 1.09], [1.94, 3.34], [-2.25, 3.34]]), 0.375)}
        r={[-HALF_PI, 0, 0]}
      />
      <Callout id="base" p={[-1.6, 0.35, 1.3]} />
    </Part>
  );
}

function SideFrame() {
  return (
    <Part id="side-frame">
      <M
        clip
        geo={extrude('ice-side-frame', outline(
          [[-0.875, 0.375], [4.75, 0.375], [4.75, 1.625], [1.25, 1.625], [0.53, 2.875], [-0.875, 2.875]],
          [[0, Y, 0.25], [CAM_X, CAM_Y, 0.125]],
        ), 0.3125)}
        p={[0, 0, -1.0]}
      />
      <Callout id="side-frame" p={[3.3, 1.2, -0.7]} />
    </Part>
  );
}

function Support() {
  return (
    <Part id="support">
      <M
        clip
        geo={extrude('ice-support', outline([[-0.875, 0.375], [1.25, 0.375], [1.25, 1.78], [0.72, 2.875], [-0.875, 2.875]], [[0, Y, 0.25]]), 0.3125)}
        p={[0, 0, -2.9]}
      />
      <Callout id="support" p={[-0.6, 2.75, -2.75]} />
    </Part>
  );
}

function HeadFrame() {
  // T-shaped plate in (u = -z, y), extruded along +x.
  const t = outline([[-0.19, 0.375], [0.69, 0.375], [0.69, 3.125], [-0.81, 3.125], [-0.81, 1.625], [-0.19, 1.625]], [[0, Y, 0.5]]);
  const front = outline([[-0.19, 0.375], [0.69, 0.375], [0.69, 3.125], [-0.81, 3.125], [-0.81, 1.625], [-0.19, 1.625]], [[0, Y, 0.17]]);
  return (
    <Part id="head-frame">
      <M clip geo={extrude('ice-head-rear', t, 0.5)} p={[4.0, 0, 0]} r={[0, HALF_PI, 0]} />
      <M clip geo={extrude('ice-head-front', front, 0.25)} p={[4.5, 0, 0]} r={[0, HALF_PI, 0]} />
      {HEAD_SCREWS.map(([y, z], i) => <Bolt key={i} p={[4.75, Y + y, z]} axis="x" set="head-screws" clip />)}
      <Callout id="head-frame" p={[4.6, 3.0, 0.5]} />
    </Part>
  );
}

/** Cylinder profile from the crank end: plain barrel, five fins, flange, spigot. */
function cylinderProfile(): Array<[number, number]> {
  const pts: Array<[number, number]> = [[0.4375, 0], [0.5625, 0]];
  for (let i = 0; i < 5; i += 1) {
    const y = 0.8125 + i * 0.1875;
    pts.push([0.5625, y], [0.75, y], [0.75, y + 0.09375], [0.5625, y + 0.09375]);
  }
  pts.push([0.5625, 1.75], [0.75, 1.75], [0.75, 2.0], [0.5, 2.0], [0.5, 2.5], [0.4375, 2.5]);
  return pts;
}

function Cylinder() {
  return (
    <Part id="cylinder">
      <M clip geo={lathe('ice-cylinder', cylinderProfile(), 72)} p={[2.0, Y, 0]} r={ALONG_X} />
      {/* drip oiler on top of the barrel */}
      <M clip geo={lathe('ice-oiler', [[0.05, 0], [0.09, 0], [0.09, 0.18], [0.16, 0.2], [0.16, 0.42], [0.05, 0.42]], 32)} p={[2.4, Y + 0.54, 0]} />
      <Callout id="cylinder" p={[2.9, Y + 0.7, 0.2]} />
    </Part>
  );
}

function Piston() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = wristPinX(iceMotion.theta);
  });
  return (
    <Part id="piston">
      <group ref={ref} position={[3.6, Y, 0]}>
        <M
          clip
          geo={lathe('ice-piston', [
            [0.375, -0.4375], [0.4375, -0.4375], [0.4375, 0.2], [0.39, 0.2], [0.39, 0.29], [0.4375, 0.29], [0.4375, 0.38],
            [0.39, 0.38], [0.39, 0.47], [0.4375, 0.47], [0.4375, 0.5625], [0, 0.5625], [0, 0.3125], [0.375, 0.3125],
          ], 56)}
          r={ALONG_X}
        />
        <M clip geo={cyl(0.094, 0.094, 0.74, 24)} r={ALONG_Z} />
        <Callout id="piston" p={[0.2, 0.3, 0.2]} />
      </group>
    </Part>
  );
}

function ConRod() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const [px, py] = crankPin(iceMotion.theta);
    const wx = wristPinX(iceMotion.theta);
    g.position.set(px, Y + py, 0);
    g.rotation.z = Math.atan2(-py, wx - px);
  });
  return (
    <Part id="conrod">
      <group ref={ref}>
        <M clip geo={lathe('ice-rod-big', [[0.14, -0.156], [0.28, -0.156], [0.28, 0.156], [0.14, 0.156]], 40)} r={ALONG_Z} />
        <M clip geo={lathe('ice-rod-small', [[0.094, -0.156], [0.1875, -0.156], [0.1875, 0.156], [0.094, 0.156]], 32)} p={[ICE.rod, 0, 0]} r={ALONG_Z} />
        <M clip geo={box(ICE.rod - 0.42, 0.2, 0.25)} p={[ICE.rod / 2 + 0.04, 0, 0]} />
        <Callout id="conrod" p={[1.4, 0.1, 0.12]} />
      </group>
    </Part>
  );
}

function useCrankTurn() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = iceMotion.theta;
  });
  return ref;
}

function Crankshaft() {
  const turn = useCrankTurn();
  return (
    <Part id="crankshaft">
      <group position={[0, Y, 0]}>
        <group ref={turn}>
          <M clip geo={cyl(0.156, 0.156, 3.25, 32)} p={[0, 0, -2.095]} r={ALONG_Z} />
          <M clip geo={cyl(0.25, 0.25, 0.2175, 32)} p={[0, 0, -0.578]} r={ALONG_Z} />
          <M clip geo={extrude('ice-web', () => webShape(0.3125, 0.25, 0.625), 0.3125)} p={[0, 0, -0.47]} />
          <M clip geo={cyl(0.14, 0.14, 0.4, 24)} p={[0.625, 0, 0.044]} r={ALONG_Z} />
          {/* crank pin grease cup */}
          <M clip geo={cyl(0.156, 0.156, 0.15, 6)} p={[0.625, 0, 0.32]} r={ALONG_Z} />
          <M clip geo={cyl(0.17, 0.17, 0.1, 24)} p={[0.625, 0, 0.445]} r={ALONG_Z} />
          {/* belt pulley on the outboard end */}
          <M
            clip
            geo={lathe('ice-pulley', [[0.156, 0], [0.6, 0], [0.6, 0.05], [0.42, 0.2], [0.6, 0.35], [0.6, 0.4], [0.156, 0.4]], 56)}
            p={[0, 0, -3.65]}
            r={ALONG_Z}
          />
        </group>
        <Callout id="crankshaft" p={[0.3, -0.7, 0.4]} />
      </group>
    </Part>
  );
}

function Flywheel() {
  const turn = useCrankTurn();
  const web = () => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 1.4, 0, Math.PI * 2, false);
    for (let i = 0; i < 3; i += 1) {
      const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * 0.8125, Math.sin(a) * 0.8125, 0.375, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    const bore = new THREE.Path();
    bore.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
    s.holes.push(bore);
    return s;
  };
  return (
    <Part id="flywheel">
      <group position={[0, Y, 0]}>
        <group ref={turn}>
          <M clip geo={lathe('ice-fly-rim', [[1.375, 0], [1.875, 0], [1.875, 1.125], [1.375, 1.125]], 96)} p={[0, 0, -2.5]} r={ALONG_Z} />
          <M clip geo={extrude('ice-fly-web', web, 0.25)} p={[0, 0, -2.0625]} />
          <M clip geo={lathe('ice-fly-hub', [[0.156, 0], [0.3125, 0], [0.3125, 0.75], [0.156, 0.75]], 40)} p={[0, 0, -2.31]} r={ALONG_Z} />
          <M clip geo={cyl(0.25, 0.25, 0.31, 32)} p={[0, 0, -1.405]} r={ALONG_Z} />
          <M clip geo={extrude('ice-drive-gear', () => gearShape(24, 0.375, 0.031, 0.156), 0.125)} p={[0, 0, -1.25]} />
        </group>
        <Callout id="flywheel" p={[-1.3, 1.3, -1.4]} />
      </group>
    </Part>
  );
}

function CamGear() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = camAngle(iceMotion.theta);
  });
  return (
    <Part id="camgear">
      <group position={[CAM_X, CAM_Y, 0]}>
        <group ref={ref}>
          <M clip geo={extrude('ice-cam-gear', () => gearShape(48, 0.75, 0.031, 0.125), 0.125)} p={[0, 0, -1.25]} />
          <M clip geo={cyl(0.125, 0.125, 2.55, 24)} p={[0, 0, -0.025]} r={ALONG_Z} />
          <M clip geo={extrude('ice-cam', () => webShape(0.2755, 0.12, 0.244), 0.185)} p={[0, 0, VZ - 0.0925]} />
        </group>
        <Callout id="camgear" p={[-0.2, -0.3, 1.25]} />
      </group>
    </Part>
  );
}

const ROCKER_SPRING_X = 0.75;

function Rocker() {
  const arm = useRef<THREE.Group>(null);
  const spring = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = rockerAngle(iceMotion.theta);
    if (arm.current) arm.current.rotation.z = a;
    // Spring from the base plate up to the underside of the arm.
    const top = PIVOT_Y - 0.0625 - Math.tan(a) * (PIVOT_X - ROCKER_SPRING_X);
    if (spring.current) spring.current.scale.y = (top - 0.375) / 0.5;
  });
  return (
    <Part id="rocker">
      {/* pedestal and pivot pin */}
      <M clip geo={box(0.32, 0.6, 0.16)} p={[PIVOT_X, 0.675, VZ - 0.2]} />
      <M clip geo={cyl(0.06, 0.06, 0.42, 20)} p={[PIVOT_X, PIVOT_Y, VZ - 0.04]} r={ALONG_Z} />
      <group position={[PIVOT_X, PIVOT_Y, VZ]}>
        <group ref={arm}>
          <M clip geo={box(4.52, 0.125, 0.22)} p={[0.06, 0, 0]} />
          {/* tappet screw and lock nut under the exhaust valve */}
          <M clip geo={cyl(0.056, 0.056, 0.3, 16)} p={[VX - PIVOT_X, 0.21, 0]} />
          <M clip geo={cyl(0.1, 0.1, 0.06, 6)} p={[VX - PIVOT_X, 0.09, 0]} />
        </group>
      </group>
      <group ref={spring} position={[ROCKER_SPRING_X, 0.375, VZ]}>
        <M clip geo={coil('ice-rocker-spring', 0.08, 0.014, 0.5, 6)} />
      </group>
      <Callout id="rocker" p={[1.4, 0.95, VZ + 0.1]} />
    </Part>
  );
}

function Valves() {
  const intake = useRef<THREE.Group>(null);
  const exhaust = useRef<THREE.Group>(null);
  const intakeSpring = useRef<THREE.Group>(null);
  const exhaustSpring = useRef<THREE.Group>(null);
  useFrame(() => {
    const li = intakeLift(iceMotion.theta);
    const le = exhaustLift(iceMotion.theta);
    if (intake.current) intake.current.position.y = -li;
    if (exhaust.current) exhaust.current.position.y = le;
    // Intake spring: guide boss top (2.775) up to the retainer; exhaust: retainer up to the boss (1.975).
    if (intakeSpring.current) intakeSpring.current.scale.y = (0.13 - li) / 0.13;
    if (exhaustSpring.current) {
      exhaustSpring.current.position.y = 1.515 + le;
      exhaustSpring.current.scale.y = (0.46 - le) / 0.46;
    }
  });
  const block = (h: number, y: number) => <M clip geo={box(1.0, h, 0.625)} p={[VX, y, VZ]} />;
  return (
    <Part id="valves">
      <group>
        {block(0.125, 2.5625)}
        {block(0.25, 2.375)}
        {block(0.125, 2.1875)}
        {/* guide bosses */}
        <M clip geo={cyl(0.1, 0.1, 0.15, 24)} p={[VX, 2.7, VZ]} />
        <M clip geo={cyl(0.1, 0.1, 0.15, 24)} p={[VX, 2.05, VZ]} />
        {/* intake valve, opening downward */}
        <group ref={intake}>
          <M clip geo={cyl(0.12, 0.12, 0.035, 28)} p={[VX, 2.4825, VZ]} />
          <M clip geo={cyl(0.04, 0.04, 0.5, 12)} p={[VX, 2.73, VZ]} />
          <M clip geo={cyl(0.1, 0.1, 0.03, 24)} p={[VX, 2.92, VZ]} />
        </group>
        <group ref={intakeSpring} position={[VX, 2.775, VZ]}>
          <M clip geo={coil('ice-intake-spring', 0.075, 0.008, 0.13, 5)} />
        </group>
        {/* exhaust valve, pushed up by the rocker */}
        <group ref={exhaust}>
          <M clip geo={cyl(0.12, 0.12, 0.035, 28)} p={[VX, 2.2675, VZ]} />
          <M clip geo={cyl(0.04, 0.04, 0.96, 12)} p={[VX, 1.79, VZ]} />
          <M clip geo={cyl(0.1, 0.1, 0.03, 24)} p={[VX, 1.5, VZ]} />
        </group>
        <group ref={exhaustSpring} position={[VX, 1.515, VZ]}>
          <M clip geo={coil('ice-exhaust-spring', 0.085, 0.013, 0.46, 8)} />
        </group>
        {VALVE_SCREWS.map(([x, y], i) => <Bolt key={i} p={[VX + x, Y + y, VZ + 0.3125]} axis="z" set="valve-screws" clip />)}
      </group>
      <Callout id="valves" p={[VX + 0.3, 2.9, VZ + 0.2]} />
    </Part>
  );
}

function Carb() {
  return (
    <Part id="carb">
      <M
        clip
        geo={lathe('ice-venturi', [[0.06, 0], [0.11, 0], [0.11, 0.25], [0.13, 0.3], [0.21, 0.62], [0.17, 0.62], [0.08, 0.32], [0.06, 0.25]], 40)}
        p={[5.0, 2.5625, VZ]}
        r={ALONG_X}
      />
      {/* needle valve and knurled knob */}
      <M clip geo={cyl(0.035, 0.035, 0.3, 12)} p={[5.18, 2.75, VZ]} />
      <M clip geo={cyl(0.075, 0.075, 0.09, 20)} p={[5.18, 2.93, VZ]} />
      <Callout id="carb" p={[5.4, 2.7, VZ]} />
    </Part>
  );
}

function SparkPlug() {
  return (
    <Part id="spark">
      <group position={[4.55, Y, 0]} rotation={ALONG_X}>
        <M clip geo={cyl(0.17, 0.17, 0.2, 24)} p={[0, 0.1, 0]} />
        <M clip geo={cyl(0.21, 0.21, 0.17, 6)} p={[0, 0.3, 0]} />
        <M clip geo={lathe('ice-insulator', [[0, 0], [0.12, 0], [0.12, 0.08], [0.1, 0.12], [0.1, 0.42], [0.06, 0.48], [0, 0.48]], 32)} p={[0, 0.385, 0]} />
        <M clip geo={cyl(0.05, 0.05, 0.14, 12)} p={[0, 0.93, 0]} />
      </group>
      <Callout id="spark" p={[5.2, Y + 0.12, 0]} />
    </Part>
  );
}

function ExhaustPipe() {
  return (
    <Part id="exhaust">
      <M clip geo={lathe('ice-exhaust', [[0.07, 0], [0.1, 0], [0.1, 1.2], [0.17, 1.4], [0.14, 1.4], [0.07, 1.22]], 32)} p={[4.0, 2.1875, VZ]} r={ALONG_NEG_X} />
      <Callout id="exhaust" p={[3.0, 2.0, VZ + 0.1]} />
    </Part>
  );
}

export function Ice() {
  return (
    <group>
      <Base />
      <SideFrame />
      <Support />
      <HeadFrame />
      <Cylinder />
      <Piston />
      <ConRod />
      <Crankshaft />
      <Flywheel />
      <CamGear />
      <Rocker />
      <Valves />
      <Carb />
      <SparkPlug />
      <ExhaustPipe />
    </group>
  );
}
