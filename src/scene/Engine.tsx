import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ENGINE } from '../data/machine';
import { motion } from '../state';
import { bedSection, box, cyl, extrude, hexNut, lathe, sphere, stud, webShape } from './geometry';
import { M, Part } from './Part';
import { Callout } from './Overlay';

type Vec3 = [number, number, number];

const AX = ENGINE.axisY;
const CX = ENGINE.crankX;
const HALF_PI = Math.PI / 2;
const ALONG_X: Vec3 = [0, 0, -HALF_PI];
const ALONG_NEG_X: Vec3 = [0, 0, HALF_PI];
const ALONG_Z: Vec3 = [HALF_PI, 0, 0];

/** Crosshead pin x for a crank angle (slider-crank, cylinder on the -x side). */
export function crossheadX(theta: number) {
  const { crankRadius: r, rodLength: l } = ENGINE;
  const s = r * Math.sin(theta);
  return CX + r * Math.cos(theta) - Math.sqrt(l * l - s * s);
}

function Bolt({ p, axis = 'y', flip = false, clip = false }: { p: Vec3; axis?: 'x' | 'y' | 'z'; flip?: boolean; clip?: boolean }) {
  const rotation: Vec3 = axis === 'x' ? (flip ? ALONG_NEG_X : ALONG_X) : axis === 'z' ? (flip ? [-HALF_PI, 0, 0] : ALONG_Z) : flip ? [Math.PI, 0, 0] : [0, 0, 0];
  return (
    <group position={p} rotation={rotation}>
      <M geo={hexNut()} p={[0, 0.035, 0]} clip={clip} />
      <M geo={stud()} p={[0, 0.095, 0]} clip={clip} />
    </group>
  );
}

function boltCircle(count: number, radius: number, offset = Math.PI / count) {
  return Array.from({ length: count }, (_, i) => {
    const a = offset + (i * Math.PI * 2) / count;
    return [Math.cos(a) * radius, Math.sin(a) * radius] as const;
  });
}

function Plinth() {
  return (
    <Part id="plinth" tone={0.55}>
      <M geo={box(9.6, 0.24, 4.3)} p={[-0.85, -0.92, -0.8]} />
      <M geo={box(8.8, 0.8, 2.05)} p={[-0.8, -0.4, -0.025]} />
      <M geo={box(4.0, 0.8, 0.95)} p={[1.6, -0.4, -2.125]} />
      <M geo={box(4.0, 0.1, 0.6)} p={[1.6, -0.75, -1.35]} />
      <Callout id="plinth" p={[-4.7, -0.4, 1.0]} />
    </Part>
  );
}

function Bed() {
  const studs: Vec3[] = [];
  for (let x = -4.3; x <= 2.2; x += 0.72) {
    studs.push([x, 0.1, 0.63], [x, 0.1, -0.63]);
  }
  return (
    <Part id="bed">
      <M geo={extrude('bed', bedSection, 7.0)} p={[-4.6, 0, 0]} r={[0, HALF_PI, 0]} />
      {studs.map((p, i) => <Bolt key={i} p={p} />)}
      {/* cylinder saddle */}
      <M geo={box(1.1, 0.36, 0.84)} p={[-3.5, 0.53, 0]} />
      {/* crosshead guides: support, bottom bar, top bar, end cheeks */}
      <M geo={box(1.5, 0.72, 0.26)} p={[-0.8, 0.71, 0]} />
      <M geo={box(1.66, 0.07, 0.5)} p={[-0.8, 1.11, 0]} />
      <M geo={box(1.66, 0.07, 0.5)} p={[-0.8, 1.49, 0]} />
      {[-1.6, 0.0].flatMap((x) => [-0.22, 0.22].map((z) => <M key={`${x}${z}`} geo={box(0.08, 0.45, 0.06)} p={[x, 1.3, z]} />))}
      {[-1.45, -0.15].map((x) => <Bolt key={x} p={[x, 1.525, 0]} />)}
      {/* main bearing pedestals (caps are their own part) */}
      <M geo={box(0.86, 0.08, 0.38)} p={[CX, 0.39, -0.48]} />
      <M geo={box(0.6, 0.87, 0.32)} p={[CX, 0.865, -0.48]} />
      <M geo={box(0.86, 0.08, 0.38)} p={[CX, 0.04, -2.0]} />
      <M geo={box(0.6, 1.22, 0.32)} p={[CX, 0.69, -2.0]} />
      {[-0.33, 0.33].map((dx) => <Bolt key={dx} p={[CX + dx, 0.43, -0.48]} />)}
      {[-0.33, 0.33].map((dx) => <Bolt key={dx} p={[CX + dx, 0.08, -2.0]} />)}
      <Callout id="bed" p={[-2.2, 0.08, 0.7]} />
    </Part>
  );
}

function Cylinder() {
  return (
    <Part id="cylinder">
      <M
        clip
        geo={lathe('cyl-body', [[0.56, 0], [0.84, 0], [0.84, 0.12], [0.68, 0.12], [0.68, 1.48], [0.84, 1.48], [0.84, 1.6], [0.56, 1.6]])}
        p={[-4.3, AX, 0]}
        r={ALONG_X}
      />
      {[0.46, 1.08].map((y) => (
        <M key={y} clip geo={lathe('cyl-band', [[0.66, 0], [0.705, 0], [0.705, 0.06], [0.66, 0.06]])} p={[-4.3 + y, AX, 0]} r={ALONG_X} />
      ))}
      {/* front cover with stuffing box */}
      <M
        clip
        geo={lathe('front-cover', [[0, 0], [0.84, 0], [0.84, 0.1], [0.32, 0.1], [0.32, 0.16], [0.2, 0.16], [0.2, 0.34], [0.27, 0.34], [0.27, 0.42], [0, 0.42]])}
        p={[-2.7, AX, 0]}
        r={ALONG_X}
      />
      {boltCircle(8, 0.75).map(([y, z], i) => <Bolt key={i} p={[-2.6, AX + y, z]} axis="x" clip />)}
      {[-0.17, 0.17].map((z) => <Bolt key={z} p={[-2.36, AX, z]} axis="x" clip />)}
      {/* steam port pad and drain cocks */}
      <M clip geo={box(0.92, 0.16, 0.56)} p={[-3.5, AX + 0.64, 0]} />
      {[-4.0, -3.0].map((x) => <M key={x} geo={cyl(0.035, 0.035, 0.2, 16)} p={[x, AX - 0.76, 0.12]} />)}
      <Callout id="cylinder" p={[-3.75, AX + 0.12, 0.69]} />
    </Part>
  );
}

function CylinderCover() {
  return (
    <Part id="cylinder-cover">
      <M clip geo={lathe('back-cover', [[0, 0], [0.84, 0], [0.84, 0.1], [0.42, 0.1], [0.36, 0.2], [0, 0.2]])} p={[-4.3, AX, 0]} r={ALONG_NEG_X} />
      {boltCircle(8, 0.75).map(([y, z], i) => <Bolt key={i} p={[-4.4, AX + y, z]} axis="x" flip clip />)}
      <M clip geo={cyl(0.05, 0.05, 0.14, 16)} p={[-4.57, AX, 0]} r={ALONG_X} />
      <Callout id="cylinder-cover" p={[-4.5, AX + 0.5, 0.2]} />
    </Part>
  );
}

function Piston() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    group.current?.position.set(crossheadX(motion.theta) - ENGINE.pistonRodLength, AX, 0);
  });
  return (
    <Part id="piston">
      <group ref={group}>
        <M
          geo={lathe('piston', [[0, -0.15], [0.555, -0.15], [0.555, -0.09], [0.52, -0.09], [0.52, -0.065], [0.555, -0.065], [0.555, 0.065], [0.52, 0.065], [0.52, 0.09], [0.555, 0.09], [0.555, 0.15], [0, 0.15]])}
          r={ALONG_X}
        />
        <M geo={cyl(0.065, 0.065, ENGINE.pistonRodLength, 24)} p={[ENGINE.pistonRodLength / 2, 0, 0]} r={ALONG_X} />
        <M geo={hexNut()} p={[-0.185, 0, 0]} r={ALONG_NEG_X} />
      </group>
      <Callout id="piston" p={[-2.0, AX + 0.07, 0]} />
    </Part>
  );
}

function ValveChest() {
  return (
    <Part id="valve-chest">
      <M clip geo={box(0.9, 0.4, 0.66)} p={[-3.5, AX + 0.92, 0]} />
      <M clip geo={box(1.0, 0.08, 0.76)} p={[-3.5, AX + 1.16, 0]} />
      {[-3.92, -3.5, -3.08].flatMap((x) => [-0.3, 0.3].map((z) => <Bolt key={`${x}${z}`} p={[x, AX + 1.2, z]} clip />))}
      {/* valve spindle and gland on the crank side */}
      <M geo={lathe('valve-gland', [[0, 0], [0.12, 0], [0.12, 0.08], [0.08, 0.08], [0.08, 0.22], [0, 0.22]], 40)} p={[-3.05, AX + 0.92, 0]} r={ALONG_X} />
      <M geo={cyl(0.03, 0.03, 0.9, 16)} p={[-2.7, AX + 0.92, 0]} r={ALONG_X} />
      {/* steam pipe, throttle valve and elbow */}
      <M geo={cyl(0.13, 0.13, 0.05, 32)} p={[-3.5, AX + 1.225, 0]} />
      <M geo={cyl(0.085, 0.085, 0.5, 32)} p={[-3.5, AX + 1.45, 0]} />
      <M geo={sphere(0.17)} p={[-3.5, AX + 1.6, 0]} />
      <M geo={cyl(0.03, 0.03, 0.3, 12)} p={[-3.5, AX + 1.6, 0.25]} r={ALONG_Z} />
      <M geo={lathe('handwheel', [[0.1, -0.015], [0.14, -0.015], [0.14, 0.015], [0.1, 0.015]], 40)} p={[-3.5, AX + 1.6, 0.4]} r={ALONG_Z} />
      <M geo={cyl(0.085, 0.085, 0.3, 32)} p={[-3.5, AX + 1.85, 0]} />
      <M geo={cyl(0.13, 0.13, 0.05, 32)} p={[-3.5, AX + 2.0, 0]} />
      <Callout id="valve-chest" p={[-3.5, AX + 2.02, 0.1]} />
    </Part>
  );
}

function Crosshead() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    group.current?.position.set(crossheadX(motion.theta), AX, 0);
  });
  return (
    <Part id="crosshead">
      <group ref={group}>
        <M geo={box(0.44, 0.24, 0.3)} />
        <M geo={box(0.5, 0.035, 0.34)} p={[0, 0.1375, 0]} />
        <M geo={box(0.5, 0.035, 0.34)} p={[0, -0.1375, 0]} />
        <M geo={cyl(0.06, 0.06, 0.42, 24)} r={ALONG_Z} />
        <M geo={cyl(0.1, 0.1, 0.14, 24)} p={[-0.29, 0, 0]} r={ALONG_X} />
        <Callout id="crosshead" p={[0, 0.155, 0.17]} />
      </group>
    </Part>
  );
}

function ConnectingRod() {
  const group = useRef<THREE.Group>(null);
  const L = ENGINE.rodLength;
  useFrame(() => {
    const x = crossheadX(motion.theta);
    const px = CX + ENGINE.crankRadius * Math.cos(motion.theta);
    const py = AX + ENGINE.crankRadius * Math.sin(motion.theta);
    if (group.current) {
      group.current.position.set(x, AX, 0);
      group.current.rotation.z = Math.atan2(py - AX, px - x);
    }
  });
  return (
    <Part id="connecting-rod">
      <group ref={group}>
        <M geo={cyl(0.12, 0.12, 0.2, 32)} r={ALONG_Z} />
        <M geo={cyl(0.1, 0.07, L - 0.42, 28)} p={[0.1 + (L - 0.42) / 2, 0, 0]} r={ALONG_X} s={[1, 1, 0.72]} />
        <M geo={box(0.2, 0.44, 0.22)} p={[L - 0.3, 0, 0]} />
        <M geo={cyl(0.2, 0.2, 0.22, 40)} p={[L, 0, 0]} r={ALONG_Z} />
        {[-1, 1].map((s) => <Bolt key={s} p={[L - 0.3, s * 0.22, 0]} flip={s < 0} />)}
        <Callout id="connecting-rod" p={[L * 0.55, 0.06, 0.08]} />
      </group>
    </Part>
  );
}

function Crankshaft() {
  const group = useRef<THREE.Group>(null);
  const r = ENGINE.crankRadius;
  useFrame(() => {
    if (group.current) group.current.rotation.z = motion.theta;
  });
  return (
    <Part id="crankshaft">
      <group position={[CX, AX, 0]}>
        <group ref={group}>
          <M geo={extrude('web', () => webShape(0.38, 0.17, r), 0.14)} p={[0, 0, -0.27]} />
          <M geo={cyl(0.075, 0.075, 0.27, 24)} p={[r, 0, 0]} r={ALONG_Z} />
          <M geo={cyl(0.12, 0.12, 2.13, 40)} p={[0, 0, -1.335]} r={ALONG_Z} />
          {[-0.7, -1.78, -2.22].map((z) => <M key={z} geo={cyl(0.17, 0.17, 0.06, 40)} p={[0, 0, z]} r={ALONG_Z} />)}
          {/* eccentric sheave for the valve gear, and the governor pulley */}
          <M geo={cyl(0.3, 0.3, 0.1, 48)} p={[0.12, 0, -0.8]} r={ALONG_Z} />
          <M geo={lathe('pulley', [[0.12, -0.05], [0.22, -0.05], [0.2, 0], [0.22, 0.05], [0.12, 0.05]], 48)} p={[0, 0, BELT_Z]} r={ALONG_Z} />
        </group>
        <Callout id="crankshaft" p={[0, 0.12, -0.9]} />
      </group>
    </Part>
  );
}

function BearingCaps() {
  return (
    <Part id="main-bearing">
      {[-0.48, -2.0].map((z) => (
        <group key={z} position={[CX, AX, z]}>
          <M geo={box(0.66, 0.18, 0.34)} p={[0, 0.09, 0]} />
          <M geo={lathe('bearing-arch', [[0, 0], [0.2, 0], [0.2, 0.34], [0, 0.34]], 48)} p={[0, 0.0, -0.17]} r={ALONG_Z} s={[1, 1, 1]} />
          <M geo={cyl(0.05, 0.06, 0.12, 20)} p={[0, 0.24, 0]} />
          <M geo={sphere(0.035)} p={[0, 0.315, 0]} />
          {[-0.25, 0.25].map((x) => <Bolt key={x} p={[x, 0.18, 0]} />)}
        </group>
      ))}
      <Callout id="main-bearing" p={[CX + 0.3, AX + 0.18, -2.0]} />
    </Part>
  );
}

function Flywheel() {
  const spin = useRef<THREE.Group>(null);
  const R = ENGINE.flywheelRadius;
  useFrame(() => {
    if (spin.current) spin.current.rotation.z = motion.theta;
  });
  return (
    <Part id="flywheel">
      <group position={[CX, AX, ENGINE.flywheelZ]}>
        <group ref={spin}>
          <M
            geo={lathe('rim', [[R - 0.26, -0.17], [R, -0.17], [R, 0.17], [R - 0.26, 0.17]], 128)}
            r={ALONG_Z}
          />
          <M geo={lathe('rim-bead', [[R - 0.36, -0.08], [R - 0.25, -0.08], [R - 0.25, 0.08], [R - 0.36, 0.08]], 128)} r={ALONG_Z} />
          <M geo={lathe('hub', [[0.12, -0.24], [0.3, -0.24], [0.36, -0.12], [0.36, 0.12], [0.3, 0.24], [0.12, 0.24]], 48)} r={ALONG_Z} />
          {Array.from({ length: 6 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
              <M geo={cyl(0.055, 0.085, R - 0.62, 20)} p={[0, 0.34 + (R - 0.62) / 2, 0]} s={[1, 1, 0.66]} />
            </group>
          ))}
          <M geo={box(0.08, 0.06, 0.5)} p={[0, 0.15, 0]} />
        </group>
        <Callout id="flywheel" p={[R * 0.7, R * 0.72, 0.17]} />
      </group>
    </Part>
  );
}

/** Plane shared by the crankshaft pulley and the governor pulley. */
const BELT_Z = -0.98;

/** The two straight runs of an open belt between the crank and governor pulleys. */
function beltRuns(): Array<[THREE.Vector2, THREE.Vector2]> {
  const c1 = new THREE.Vector2(ENGINE.governor[0], ENGINE.governor[1] + 1.9);
  const c2 = new THREE.Vector2(CX, AX);
  const r1 = 0.15;
  const r2 = 0.21;
  const d = c2.clone().sub(c1);
  const u = d.clone().normalize();
  const perp = new THREE.Vector2(-u.y, u.x);
  const cosB = (r1 - r2) / d.length();
  const sinB = Math.sqrt(1 - cosB * cosB);
  return [1, -1].map((side) => {
    const n = u.clone().multiplyScalar(cosB).addScaledVector(perp, side * sinB);
    return [c1.clone().addScaledVector(n, r1), c2.clone().addScaledVector(n, r2)];
  });
}

function Strip({ a, b }: { a: THREE.Vector2; b: THREE.Vector2 }) {
  const length = a.distanceTo(b);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return <M geo={box(1, 0.02, 0.07)} p={[(a.x + b.x) / 2, (a.y + b.y) / 2, BELT_Z]} r={[0, 0, angle]} s={[length, 1, 1]} />;
}

function Governor() {
  const arms = useRef<Array<THREE.Group | null>>([]);
  const links = useRef<Array<THREE.Group | null>>([]);
  const sleeve = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const belt = useRef<THREE.Group>(null);
  const TOP = 3.7;
  const ARM = 0.95;
  const LINK = 0.46;
  useFrame(() => {
    // The belt only makes sense while the governor sits on its column.
    if (belt.current) belt.current.visible = motion.explode < 0.03;
    const phi = motion.phi;
    if (head.current) head.current.rotation.y = motion.spin;
    [-1, 1].forEach((s, i) => {
      arms.current[i]?.rotation.set(0, 0, s * phi);
      const link = links.current[i];
      if (link) {
        link.position.set(s * (0.05 + LINK * Math.sin(phi)), TOP - LINK * Math.cos(phi), 0);
        link.rotation.set(0, 0, -s * phi);
      }
    });
    sleeve.current?.position.set(0, TOP - 2 * LINK * Math.cos(phi), 0);
  });
  return (
    <Part id="governor">
      <group position={ENGINE.governor}>
        <M geo={lathe('gov-column', [[0, 0], [0.24, 0], [0.24, 0.06], [0.15, 0.1], [0.09, 0.3], [0.07, 1.6], [0.1, 1.7], [0.1, 1.78], [0, 1.78]], 48)} />
        <M geo={box(0.3, 0.24, 0.3)} p={[0, 1.9, 0]} />
        <M geo={cyl(0.035, 0.035, 0.42, 16)} p={[0, 1.9, -0.21]} r={ALONG_Z} />
        <M geo={lathe('gov-pulley', [[0.03, -0.04], [0.16, -0.04], [0.14, 0], [0.16, 0.04], [0.03, 0.04]], 40)} p={[0, 1.9, BELT_Z - ENGINE.governor[2]]} r={ALONG_Z} />
        {[-1, 1].map((s) => <Bolt key={s} p={[s * 0.16, 0.06, 0]} />)}
        <group ref={head}>
          <M geo={cyl(0.035, 0.035, 1.82, 16)} p={[0, 2.93, 0]} />
          <M geo={lathe('gov-finial', [[0, 0], [0.09, 0], [0.09, 0.07], [0.05, 0.12], [0.06, 0.22], [0, 0.3]], 32)} p={[0, TOP - 0.03, 0]} />
          {[-1, 1].map((s, i) => (
            <group key={s}>
              <group ref={(g) => { arms.current[i] = g; }} position={[s * 0.05, TOP, 0]}>
                <M geo={cyl(0.024, 0.024, ARM, 12)} p={[0, -ARM / 2, 0]} />
                <M geo={sphere(0.2)} p={[0, -ARM - 0.14, 0]} />
                <M geo={cyl(0.03, 0.03, 0.09, 12)} r={ALONG_Z} />
              </group>
              <group ref={(g) => { links.current[i] = g; }}>
                <M geo={cyl(0.018, 0.018, LINK, 12)} p={[0, -LINK / 2, 0]} />
                <M geo={cyl(0.026, 0.026, 0.08, 12)} r={ALONG_Z} />
              </group>
            </group>
          ))}
          <group ref={sleeve}>
            <M geo={lathe('gov-sleeve', [[0.035, -0.09], [0.09, -0.09], [0.09, -0.03], [0.065, -0.03], [0.065, 0.02], [0.09, 0.02], [0.09, 0.09], [0.035, 0.09]], 40)} />
          </group>
        </group>
        <Callout id="governor" p={[0, TOP + 0.3, 0]} />
      </group>
      <group ref={belt}>
        {beltRuns().map(([a, b], i) => <Strip key={i} a={a} b={b} />)}
      </group>
    </Part>
  );
}

export function Engine() {
  return (
    <group>
      <Plinth />
      <Bed />
      <Cylinder />
      <CylinderCover />
      <Piston />
      <ValveChest />
      <Crosshead />
      <ConnectingRod />
      <Crankshaft />
      <BearingCaps />
      <Flywheel />
      <Governor />
    </group>
  );
}
