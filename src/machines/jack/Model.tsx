import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { box, cyl, lathe, sphere, squareThread } from '../../scene/geometry';
import { M, Part } from '../../scene/Part';
import { ALONG_X, ALONG_Z } from '../../scene/parts';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import { JACK } from './data';

/** Screw angle and lift, advanced while the jack is "running" (cranked up and down). */
export const jackMotion = { angle: 0, lift: 0.25, dir: 1 };

const Y = JACK.screwY;

/** Cranks the screw up through its stroke and back down. */
export function JackDriver() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (!useStudio.getState().running) return;
    const m = jackMotion;
    const turnRate = 1.6;
    m.angle += m.dir * turnRate * dt;
    m.lift += (m.dir * turnRate * dt * JACK.pitch) / (Math.PI * 2);
    if (m.lift >= JACK.stroke) { m.lift = JACK.stroke; m.dir = -1; }
    if (m.lift <= 0) { m.lift = 0; m.dir = 1; }
  }, -1);
  return null;
}

/** Follows the screw: lift always, rotation only when asked (the cap rises without turning). */
function useScrewPose(turn: boolean) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.y = Y + jackMotion.lift;
    ref.current.rotation.y = turn ? jackMotion.angle : 0;
  });
  return ref;
}

function Base() {
  return (
    <Part id="base">
      <M
        clip
        geo={lathe('jack-base', [[1.15, 0], [1.5, 0], [1.5, 0.2], [1.28, 0.28], [0.72, 2.05], [0.72, 2.3], [0.48, 2.3], [0.48, 1.45], [0.36, 1.45], [0.36, 1.3], [1.13, 0.18]], 96)}
      />
      <Callout id="base" p={[1.1, 0.9, 0.3]} />
    </Part>
  );
}

function Nut() {
  return (
    <Part id="nut">
      <M clip geo={lathe('jack-nut', [[0.355, 1.45], [0.47, 1.45], [0.47, 2.3], [0.62, 2.3], [0.62, 2.42], [0.355, 2.42]], 72)} />
      <Callout id="nut" p={[-0.6, 2.42, 0.1]} />
    </Part>
  );
}

function Screw() {
  const pose = useScrewPose(true);
  const { threadMinor, threadMajor, pitch, threadLength } = JACK;
  return (
    <Part id="screw">
      <group ref={pose}>
        <M geo={cyl(threadMinor, threadMinor, threadLength, 48)} p={[0, threadLength / 2, 0]} />
        <M geo={squareThread('jack', threadMinor - 0.005, threadMajor, pitch, threadLength)} />
        <M
          geo={lathe('jack-screw-head', [
            [0, 1.9], [0.3, 1.9], [0.3, 2.0], [0.42, 2.0], [0.45, 2.04], [0.45, 2.41], [0.42, 2.45],
            [0.24, 2.45], [0.24, 2.5], [0.18, 2.5], [0.18, 2.56], [0.24, 2.56], [0.27, 2.62],
            [0.25, 2.67], [0.2, 2.71], [0.12, 2.745], [0, 2.76],
          ], 72)}
        />
        {/* the two cross holes for the tommy bar */}
        <M geo={cyl(0.1, 0.1, 0.915, 32)} p={[0, 2.22, 0]} r={ALONG_X} />
        <M geo={cyl(0.1, 0.1, 0.915, 32)} p={[0, 2.22, 0]} r={ALONG_Z} />
        <Callout id="screw" p={[-0.33, 1.2, 0.1]} />
      </group>
    </Part>
  );
}

function Bar() {
  const pose = useScrewPose(true);
  return (
    <Part id="bar">
      <group ref={pose}>
        <M geo={cyl(0.085, 0.085, 2.6, 24)} p={[0, 2.22, 0]} r={ALONG_X} />
        {[-1, 1].map((s) => <M key={s} geo={sphere(0.12)} p={[s * 1.32, 2.22, 0]} />)}
        <Callout id="bar" p={[1.0, 2.3, 0]} />
      </group>
    </Part>
  );
}

function TopCap() {
  const pose = useScrewPose(false);
  return (
    <Part id="top-cap">
      <group ref={pose}>
        <M
          clip
          geo={lathe('jack-cap', [
            [0, 2.77], [0.2, 2.73], [0.28, 2.65], [0.28, 2.47], [0.52, 2.47], [0.56, 2.51], [0.56, 2.89],
            [0.52, 2.95], [0.44, 2.95], [0.44, 2.91], [0.38, 2.91], [0.38, 2.95], [0.28, 2.95], [0.28, 2.91],
            [0.22, 2.91], [0.22, 2.95], [0, 2.95],
          ], 72)}
        />
        <Callout id="top-cap" p={[-0.45, 2.95, 0.1]} />
      </group>
    </Part>
  );
}

function SetScrew() {
  return (
    <Part id="set-screw">
      <M geo={cyl(0.055, 0.055, 0.3, 20)} p={[0.475, 2.27, 0]} />
      <M geo={box(0.12, 0.025, 0.022)} p={[0.475, 2.42, 0]} />
      <Callout id="set-screw" p={[0.48, 2.42, 0]} />
    </Part>
  );
}

function CapScrew() {
  const pose = useScrewPose(false);
  return (
    <Part id="cap-screw">
      <group ref={pose}>
        <M geo={cyl(0.045, 0.045, 0.4, 16)} p={[0, 2.53, 0.37]} r={ALONG_Z} />
        <M geo={cyl(0.065, 0.065, 0.03, 20)} p={[0, 2.53, 0.575]} r={ALONG_Z} />
        <M geo={box(0.022, 0.1, 0.02)} p={[0, 2.53, 0.59]} />
        <Callout id="cap-screw" p={[0, 2.53, 0.58]} />
      </group>
    </Part>
  );
}

export function Jack() {
  return (
    <group>
      <Base />
      <Nut />
      <Screw />
      <Bar />
      <TopCap />
      <SetScrew />
      <CapScrew />
    </group>
  );
}
