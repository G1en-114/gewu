import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStudio } from '../../state';
import { overlayLine } from '../../scene/Overlay';
import { OVERLAY_LAYER } from '../../scene/InkRenderer';
import { partOffset } from '../../scene/explode';
import { ENGINE } from './data';
import { governedOpening, phiForRpm } from './kinematics';
import { engineMotion, useEngine } from './motion';

/** Full-throttle steam torque and full-load drag, in rpm-equivalent units. */
const STEAM = 72;
const LOAD = 48;

/**
 * A deliberately simple engine: steam torque scales with the throttle
 * opening, the load and friction pull speed down. With the governor linked,
 * the throttle closes as the balls fly out, which holds the speed near
 * ~25 rpm whatever the load; unlinked, speed follows the load.
 */
export function EngineDriver() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { running } = useStudio.getState();
    const { load, governor } = useEngine.getState();
    const m = engineMotion;
    const opening = !running ? 0 : governor ? governedOpening(m.phi) : 1;
    m.throttle += (opening - m.throttle) * (1 - Math.exp(-dt * 6));
    m.rpm = Math.max(0, m.rpm + (STEAM * m.throttle - LOAD * load - m.rpm) * 0.7 * dt);
    const omega = (m.rpm / 60) * Math.PI * 2;
    m.theta = (m.theta + omega * dt) % (Math.PI * 2);
    m.spin = (m.spin + omega * 1.6 * dt) % (Math.PI * 2);
    // The balls lag the shaft a little, which is what makes real governors hunt.
    m.phi += (phiForRpm(m.rpm) - m.phi) * (1 - Math.exp(-dt * 1.6));
  }, -1);
  return <FlywheelArrow />;
}

/** Rust rotation arrow beside the flywheel rim, travelling with the flywheel. */
function FlywheelArrow() {
  const { scene } = useThree();
  const arrow = useMemo(() => {
    const R = ENGINE.flywheelRadius + 0.32;
    const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);
    const a0 = 0.32;
    const a1 = 1.02;
    const arc = Array.from({ length: 41 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / 40;
      return v(Math.cos(a) * R, Math.sin(a) * R);
    });
    const head = (a: number, dir: number) => {
      const tip = v(Math.cos(a) * R, Math.sin(a) * R);
      const tangent = v(-Math.sin(a), Math.cos(a)).multiplyScalar(dir);
      const normal = v(Math.cos(a), Math.sin(a));
      return [tip.clone().addScaledVector(tangent, -0.16).addScaledVector(normal, 0.07), tip, tip.clone().addScaledVector(tangent, -0.16).addScaledVector(normal, -0.07)];
    };
    const group = new THREE.Group();
    const solid = { dashed: false, opacity: 0.9 };
    group.add(overlayLine(arc, solid), overlayLine(head(a1, 1), solid), overlayLine(head(a0, -1), solid));
    group.traverse((o) => o.layers.set(OVERLAY_LAYER));
    return group;
  }, []);
  useEffect(() => {
    scene.add(arrow);
    return () => { scene.remove(arrow); };
  }, [scene, arrow]);
  const offset = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    partOffset('flywheel', offset);
    arrow.position.set(ENGINE.crankX, ENGINE.axisY, ENGINE.flywheelZ).add(offset);
  });
  return null;
}
