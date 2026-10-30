import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { box, cyl, extrude, lathe, outline, squareThread } from '../../scene/geometry';
import { M, Part } from '../../scene/Part';
import { ALONG_X, ALONG_Z, Bolt, HALF_PI } from '../../scene/parts';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import { PLATE_SCREWS, VISE } from './data';

const Y = VISE.axisY;

/** Jaw position and screw angle; the jaw opens and closes while running. */
export const viseMotion = { t: 0, jaw: VISE.jawMid, angle: 0 };

export function ViseDriver() {
  useFrame((_, rawDt) => {
    if (!useStudio.getState().running) return;
    const m = viseMotion;
    m.t += Math.min(rawDt, 0.05) * 0.5;
    m.jaw = VISE.jawMid + VISE.jawTravel * Math.sin(m.t);
    m.angle = ((m.jaw - VISE.jawMid) / VISE.pitch) * Math.PI * 2;
  }, -1);
  return null;
}

/** Group that rides with the movable jaw. */
function useJaw() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = viseMotion.jaw;
  });
  return ref;
}

/** End wall in (u = -z, y), extruded along +x with the screw bore. */
const wall = (top: number) => outline([[-0.9, 0.15], [0.9, 0.15], [0.9, top], [-0.9, top]], [[0, Y, 0.17]]);

function Body() {
  return (
    <Part id="body">
      <M clip geo={box(4.4, 0.15, 1.8)} p={[0, 0.075, 0]} />
      {[1.15, -1.15].map((z) => <M key={z} clip geo={box(0.9, 0.15, 0.5)} p={[0, 0.075, z]} />)}
      {[0.575, -0.575].map((z) => <M key={z} clip geo={box(3.5, 0.6, 0.65)} p={[-0.15, 0.45, z]} />)}
      <M clip geo={extrude('vise-left-wall', wall(0.75), 0.3)} p={[-2.2, 0, 0]} r={[0, HALF_PI, 0]} />
      <M clip geo={extrude('vise-fixed-jaw', wall(1.5), 0.6)} p={[1.6, 0, 0]} r={[0, HALF_PI, 0]} />
      <Callout id="body" p={[-1.2, 0.6, 0.9]} />
    </Part>
  );
}

function Plates() {
  const jaw = useJaw();
  return (
    <Part id="plates">
      <M clip geo={box(0.08, 0.45, 1.6)} p={[1.56, 1.175, 0]} />
      {PLATE_SCREWS.map(([y, z], i) => <Bolt key={i} p={[1.52, 1.175 + y, z]} axis="x" flip set="plate-screws" clip />)}
      <group ref={jaw}>
        <M clip geo={box(0.08, 0.45, 1.6)} p={[0.44, 1.175, 0]} />
        {PLATE_SCREWS.map(([y, z], i) => <Bolt key={i} p={[0.48, 1.175 + y, z]} axis="x" set="plate-screws" clip />)}
      </group>
      <Callout id="plates" p={[1.55, 1.4, 0.7]} />
    </Part>
  );
}

function Jaw() {
  const jaw = useJaw();
  return (
    <Part id="jaw">
      <group ref={jaw}>
        <M clip geo={box(0.8, 0.75, 1.8)} p={[0, 1.125, 0]} />
        <Callout id="jaw" p={[-0.3, 1.3, 0.9]} />
      </group>
    </Part>
  );
}

function Nut() {
  const jaw = useJaw();
  return (
    <Part id="nut">
      <group ref={jaw}>
        <M clip geo={box(0.5, 0.58, 0.45)} p={[0, 0.46, 0]} />
        <Callout id="nut" p={[0.2, 0.3, 0.2]} />
      </group>
    </Part>
  );
}

function JawScrew() {
  const jaw = useJaw();
  return (
    <Part id="jaw-screw">
      <group ref={jaw}>
        <M geo={cyl(0.14, 0.14, 0.95, 32)} p={[0, 1.025, 0]} />
        <M geo={lathe('vise-jaw-screw-head', [[0, 0], [0.3, 0], [0.3, 0.09], [0.26, 0.12], [0, 0.12]], 56)} p={[0, 1.5, 0]} />
        <Callout id="jaw-screw" p={[0.1, 1.6, 0.2]} />
      </group>
    </Part>
  );
}

function useScrewTurn() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = viseMotion.angle;
  });
  return ref;
}

function Screw() {
  const turn = useScrewTurn();
  const { threadMinor, threadMajor, pitch, threadFrom, threadTo } = VISE;
  const length = threadTo - threadFrom;
  return (
    <Part id="screw">
      <group position={[0, Y, 0]}>
        <group ref={turn}>
          <M geo={cyl(threadMinor, threadMinor, length, 40)} p={[(threadFrom + threadTo) / 2, 0, 0]} r={ALONG_X} />
          <M geo={squareThread('vise', threadMinor - 0.005, threadMajor, pitch, length, 40)} p={[threadFrom, 0, 0]} r={ALONG_X} />
          {/* left journal, shoulder and square end; right journal */}
          <M geo={cyl(0.15, 0.15, 0.3, 40)} p={[-2.05, 0, 0]} r={ALONG_X} />
          <M geo={cyl(0.26, 0.26, 0.1, 48)} p={[-2.33, 0, 0]} r={ALONG_X} />
          <M geo={box(0.37, 0.24, 0.24)} p={[-2.565, 0, 0]} />
          <M geo={cyl(0.14, 0.14, 0.85, 40)} p={[2.025, 0, 0]} r={ALONG_X} />
        </group>
        <Callout id="screw" p={[-1.2, 0.05, 0.12]} />
      </group>
    </Part>
  );
}

function Ring() {
  const turn = useScrewTurn();
  return (
    <Part id="ring">
      <group position={[0, Y, 0]}>
        <group ref={turn}>
          <M clip geo={lathe('vise-ring', [[0.14, 0], [0.28, 0], [0.28, 0.16], [0.14, 0.16]], 48)} p={[2.24, 0, 0]} r={ALONG_X} />
          <M geo={cyl(0.035, 0.03, 0.62, 16)} p={[2.32, 0, 0]} r={ALONG_Z} />
        </group>
        <Callout id="ring" p={[2.35, 0.25, 0.1]} />
      </group>
    </Part>
  );
}

function Washers() {
  const washer = (key: string, x: number, w: number) => (
    <M clip geo={lathe(key, [[0.15, 0], [0.3, 0], [0.3, w], [0.15, w]], 48)} p={[x, Y, 0]} r={ALONG_X} />
  );
  return (
    <Part id="washers">
      {washer('vise-washer-l', -2.28, 0.08)}
      {washer('vise-washer-r', 2.2, 0.04)}
      <Callout id="washers" p={[-2.3, Y + 0.3, 0.1]} />
    </Part>
  );
}

export function Vise() {
  return (
    <group>
      <Body />
      <Plates />
      <Jaw />
      <Nut />
      <JawScrew />
      <Screw />
      <Ring />
      <Washers />
    </group>
  );
}
