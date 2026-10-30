import { create } from 'zustand';

/** Engine-only controls: load on the shaft, and whether the governor works the throttle. */
export const useEngine = create<{ load: number; governor: boolean; set: (p: Partial<{ load: number; governor: boolean }>) => void }>((set) => ({
  load: 0.5,
  governor: true,
  set: (patch) => set(patch),
}));

/** Per-frame engine state, advanced by the engine's Driver. */
export const engineMotion = {
  /** Crank angle. */
  theta: 0.6,
  /** Governor arm angle from vertical, radians. */
  phi: 0.26,
  /** Governor head rotation. */
  spin: 0,
  /** Shaft speed and throttle opening produced by the simple engine model. */
  rpm: 0,
  throttle: 1,
};
