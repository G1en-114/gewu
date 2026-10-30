/** Contracts for the horizontal mill-engine study. */

export type MachinePartId =
  | 'plinth'
  | 'bed'
  | 'cylinder'
  | 'cylinder-cover'
  | 'piston'
  | 'valve-chest'
  | 'crosshead'
  | 'connecting-rod'
  | 'crankshaft'
  | 'main-bearing'
  | 'flywheel'
  | 'governor';

export type ScenePoint = [number, number, number];

export interface MachinePartDescriptor {
  id: MachinePartId;
  /** 1-based drawing index; also the ink part id used by the line renderer. */
  index: number;
  name: string;
  en: string;
  role: string;
  material: string;
  description: string;
  /** Direction and distance the part travels in the exploded view. */
  explode: ScenePoint;
  /** Where its callout leader lands, in the part's local (un-exploded) frame. */
  anchor: ScenePoint;
}

export interface EngineGeometry {
  /** Height of the cylinder / crank axis above the plinth. */
  axisY: number;
  /** Crank centre along the engine axis. */
  crankX: number;
  crankRadius: number;
  rodLength: number;
  /** Distance from crosshead pin to piston centre. */
  pistonRodLength: number;
  flywheelRadius: number;
  flywheelZ: number;
  governor: ScenePoint;
}

export type ViewMode = 'perspective' | 'elevation' | 'plan';

/** Close-up camera framings used by the study steps. */
export type FocusId = 'cylinder' | 'linkage' | 'governor';
