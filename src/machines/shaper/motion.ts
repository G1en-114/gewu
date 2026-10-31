import { useFrame } from '@react-three/fiber';
import { create } from 'zustand';
import { useStudio } from '../../state';
import { FEED_TEETH, SHA, rockerPhi, strokeArcs, strokeToRadius } from './layout';

/** Ram strokes per minute of the six pulley steps, and the ten cross feeds. */
export const SPEEDS = [14, 20, 28, 40, 56, 80] as const;
export const FEEDS = [0.33, 0.66, 1, 1.66, 2.5, 3.33] as const;

export interface ShaperState {
  speed: number;
  stroke: number;
  feed: number;
  feedOn: boolean;
  set: (patch: Partial<Omit<ShaperState, 'set'>>) => void;
}

export const useShaper = create<ShaperState>((set) => ({
  speed: 28,
  stroke: 630,
  feed: 1.66,
  feedOn: true,
  set: (patch) => set(patch),
}));

/**
 * Everything that moves: crank angle, rocker angle, ram offset, ratchet and
 * table feed. Angular values are radians, lengths millimetres.
 */
export const shaperMotion = {
  crank: 0,
  /** Bull-gear radius on screen; eased toward the stroke setting. */
  radius: 0,
  phi: 0,
  ramDx: 0,
  /** Distance from the rocker pivot to the crank pin (the sliding block). */
  slot: 0,
  /** 0–1 progress through the quick return stroke. */
  returnFrac: 0,
  clapper: 0,
  ratchet: 0,
  tableZ: 0,
  feedTotal: 0,
  cycles: 0,
};

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Angle of the rocker at the start of the cutting stroke (used by the loop). */
export function crankStart(radius: number): number {
  return strokeArcs(radius).start;
}

export function ShaperDriver() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useShaper.getState();
    const running = useStudio.getState().running;
    const m = shaperMotion;
    const targetR = strokeToRadius(st.stroke);
    if (m.radius === 0) m.radius = targetR;
    m.radius += (targetR - m.radius) * (1 - Math.exp(-dt * 5));
    const r = m.radius;

    if (running) {
      m.crank += dt * (Math.PI * 2) * (st.speed / 60);
    }

    const arcs = strokeArcs(r);
    m.phi = rockerPhi(m.crank, r);
    m.ramDx = SHA.crank.l * Math.sin(m.phi);
    // Distance from the pivot to the crank pin along the rocker.
    m.slot = Math.hypot(r * Math.cos(m.crank), SHA.crank.d + r * Math.sin(m.crank));

    // Where in the cutting/return cycle we are: 0 at the start of the cut.
    const raw = ((m.crank - arcs.start) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const onReturn = raw > arcs.cutting;
    const returnFrac = onReturn ? (raw - arcs.cutting) / arcs.returning : 0;
    m.returnFrac = returnFrac;
    // The clapper box lifts out of the cut during the quick return, then drops.
    m.clapper = onReturn ? (smooth((returnFrac - 0.05) / 0.35) - smooth((returnFrac - 0.9) / 0.1)) * 0.2 : 0;

    // Cross feed: the ratchet wheel is pulled one tooth per return stroke.
    const cycles = Math.floor(m.crank / (Math.PI * 2));
    const phase = st.feedOn ? cycles + returnFrac : 0;
    const steps = ((phase % FEED_TEETH) + FEED_TEETH) % FEED_TEETH;
    m.ratchet = steps * ((Math.PI * 2) / FEED_TEETH);
    m.tableZ = steps * st.feed;
    m.feedTotal = st.feedOn ? (cycles + returnFrac) * st.feed : m.feedTotal;
    m.cycles = cycles;
  }, -1);
  return null;
}

/** Ram front end, in machine coordinates, for the tool head and feed rod. */
export function ramFrontX(): number {
  return SHA.pivot.x + shaperMotion.ramDx + SHA.tool.x;
}
