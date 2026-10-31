import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { create } from 'zustand';
import { useStudio } from '../../state';
import { Plate, XZ_Y } from '../kit';
import { gearShape } from '../../scene/geometry';
import { moonPhase, type Planet, synodicMonthsPerYear, turnsPerYear } from './train';

/**
 * Layout and motion shared by the orrery's levels. Metres, central post on
 * the y axis, ground at y = 0. Tubes nest around the post innermost-first:
 * Mercury, Venus, Mars, Jupiter, Saturn, and Earth outermost so its tellurion
 * can sit low on the shortest tube while the outer planets' arms pass over it.
 */

export const ORDER: Planet[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'earth'];
export const TUBE_R: Record<Planet, number> = { mercury: 0.006, venus: 0.009, mars: 0.012, jupiter: 0.015, saturn: 0.018, earth: 0.021 };
/** Height of each tube's gear inside the gearbox. */
export const GEAR_Y: Record<Planet, number> = { mercury: 0.085, venus: 0.1, mars: 0.115, jupiter: 0.13, saturn: 0.155, earth: 0.172 };
/** Height of each planet's arm above the gearbox. */
export const ARM_Y: Record<Planet, number> = { earth: 0.215, saturn: 0.31, jupiter: 0.33, mars: 0.35, venus: 0.37, mercury: 0.39 };
/** Orbit radius on the instrument (not to scale) and planet radius. */
export const ORBIT_R: Record<Planet, number> = { mercury: 0.07, venus: 0.1, earth: 0.15, mars: 0.2, jupiter: 0.26, saturn: 0.32 };
export const BODY_R: Record<Planet, number> = { mercury: 0.008, venus: 0.012, earth: 0.016, mars: 0.01, jupiter: 0.03, saturn: 0.025 };
/** The planets' common plane, and the Sun at the top of the post. */
export const PLANE_Y = 0.46;
export const HOUSING = { r: 0.19, y0: 0.06, y1: 0.19 };
export const LAYSHAFT: [number, number] = [0.12, 0];
export const LAYSHAFT2: [number, number] = [-0.12, 0];
/** Earth sits lower than the other planets, on its short arm. */
export const EARTH_Y = 0.27;

// ── Motion ───────────────────────────────────────────────

export type Speed = 'slow' | 'mid' | 'fast';
const YEAR_SECONDS: Record<Speed, number> = { slow: 240, mid: 60, fast: 10 };
export const useOrrery = create<{ speed: Speed; set: (s: Speed) => void }>((set) => ({ speed: 'mid', set: (speed) => set({ speed }) }));
/**
 * Where everything stood at 0h UT on 1 January 2026: mean heliocentric
 * longitudes (degrees, from the J2000 mean elements carried forward) and the
 * Moon's age as a fraction of a synodic month (new moon on 20 December 2025).
 */
export const EPOCH = Date.UTC(2026, 0, 1);
export const LONGITUDE_2026: Record<Planet, number> = { mercury: 345.2, venus: 276.7, earth: 100.3, mars: 291.8, jupiter: 103.5, saturn: 7.7 };
const MOON_AGE_2026 = 0.41;
const YEAR_MS = 365.2422 * 86400000;

/** Years since 1 January 2026. It starts at today's date, so the orrery opens on today's sky. */
export const orreryMotion = { years: (Date.now() - EPOCH) / YEAR_MS };

export function OrreryDriver() {
  useFrame((_, raw) => {
    if (useStudio.getState().running) orreryMotion.years += Math.min(raw, 0.05) / YEAR_SECONDS[useOrrery.getState().speed];
  }, -1);
  return null;
}

const TAU = Math.PI * 2;
const deg = Math.PI / 180;
/** Each tube's angle: its longitude, anticlockwise seen from above like the planets themselves (0 along +x). */
export const planetAngle = (p: Planet) => LONGITUDE_2026[p] * deg + TAU * orreryMotion.years * turnsPerYear(p);
export const layshaftAngle = () => -TAU * orreryMotion.years;
/** The Moon's angle from the Sun–Earth line, and Earth's spin (366.24 sidereal days a year). */
export const moonAngle = () => TAU * (MOON_AGE_2026 + orreryMotion.years * synodicMonthsPerYear());
export const earthSpin = () => TAU * orreryMotion.years * 366.2422;

/** Rotates its children about the vertical axis through (x, z) by angle(). */
export function Spin({ at = [0, 0], angle, children }: { at?: [number, number]; angle: () => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.y = angle(); });
  return <group position={[at[0], 0, at[1]]}><group ref={ref}>{children}</group></group>;
}

/** A spur gear with a vertical axis, n teeth of module m, at height y (centred at the group origin). */
export function Gear({ k, n, m, y, t = 0.006 }: { k: string; n: number; m: number; y: number; t?: number }) {
  return <Plate k={`or-gear-${k}`} shape={() => gearShape(n, (m * n) / 2, m * 0.9, 0.003)} depth={t} p={[0, y, 0]} r={XZ_Y} />;
}

// ── Readout ──────────────────────────────────────────────

export const MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function dateOf(years: number) {
  const day = Math.floor((((years % 1) + 1) % 1) * 365);
  let d = day;
  let m = 0;
  while (d >= MONTHS[m]) { d -= MONTHS[m]; m += 1; }
  return { year: 2026 + Math.floor(years), month: m + 1, day: d + 1 };
}

const SPEEDS: Array<[Speed, string]> = [['slow', '一年 4 分钟'], ['mid', '一年 1 分钟'], ['fast', '一年 10 秒']];

export function OrreryControls() {
  const { speed, set } = useOrrery();
  const studio = useStudio((s) => s.set);
  const [now, setNow] = useState(() => orreryMotion.years);
  useEffect(() => {
    const id = window.setInterval(() => setNow(orreryMotion.years), 200);
    return () => window.clearInterval(id);
  }, []);
  const { year, month, day } = dateOf(now);
  return (
    <>
      <div className="strokes gears">
        {SPEEDS.map(([s, label]) => (
          <button key={s} type="button" className={s === speed ? 'is-on' : ''} onClick={() => { set(s); studio({ running: true }); }}>{label}</button>
        ))}
      </div>
      <p className="gear-note">{year} 年 {month} 月 {day} 日 · 月相：{moonPhase(TAU * (MOON_AGE_2026 + now * synodicMonthsPerYear()))}。打开时就是今天的天象；摇柄转一圈 = 地球绕太阳一圈。</p>
    </>
  );
}
