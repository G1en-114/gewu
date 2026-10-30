/**
 * Versioned, renderer-agnostic protocol for a mechanism scene.
 *
 * The protocol deliberately describes mechanism intent (parts, constraints and
 * teaching steps), rather than Three.js objects.  A renderer can map these
 * records to meshes, SVG paths, or a future CAD adapter.
 */

export type SceneVector3 = [number, number, number];

export type SceneSource = 'prompt' | 'drawing-placeholder' | 'template';

export type LengthUnit = 'mm' | 'cm' | 'm' | 'scene';
export type AngleUnit = 'deg' | 'rad';

export interface SceneUnits {
  length: LengthUnit;
  angle: AngleUnit;
}

export type PartKind =
  | 'base'
  | 'body'
  | 'shaft'
  | 'link'
  | 'wheel'
  | 'weight'
  | 'piston'
  | 'bearing'
  | 'slider'
  | 'custom';

/** A renderable or selectable mechanism component. */
export interface PartSpec {
  id: string;
  name: string;
  kind: PartKind;
  /** What this part contributes to the mechanism, for UI explanations. */
  role?: string;
  material?: string;
  /** Renderer-neutral dimensions (for example radius, length, width). */
  dimensions?: Record<string, number>;
  position?: SceneVector3;
  rotation?: SceneVector3;
  color?: string;
  visible?: boolean;
  metadata?: Record<string, unknown>;
}

export type JointType =
  | 'fixed'
  | 'revolute'
  | 'prismatic'
  | 'slider'
  | 'spherical'
  | 'universal';

/** A kinematic constraint between two parts. */
export interface JointSpec {
  id: string;
  name: string;
  type: JointType;
  parent: string;
  child: string;
  anchor?: SceneVector3;
  axis?: SceneVector3;
  limits?: {
    min?: number;
    max?: number;
  };
  metadata?: Record<string, unknown>;
}

/** A short, inspectable teaching/animation step in the mechanism sequence. */
export interface StepSpec {
  id: string;
  label: string;
  description: string;
  durationMs?: number;
  focusPartIds?: string[];
  /** State values are intentionally open-ended for renderer-specific controls. */
  state?: Record<string, number | string | boolean>;
}

export interface MechanismSceneSpec {
  /** Protocol revision, not the scene revision displayed in the UI. */
  version: '1.0';
  id: string;
  title: string;
  summary: string;
  source: SceneSource;
  units: SceneUnits;
  parts: PartSpec[];
  joints: JointSpec[];
  steps: StepSpec[];
  /** Numeric controls such as arm length, speed, or crank phase. */
  parameters?: Record<string, number | string | boolean>;
  metadata?: Record<string, unknown>;
}

export interface SceneParseOptions {
  /** Preserve the user's wording in metadata for the input panel. */
  includeInputMetadata?: boolean;
  /** Optional title override supplied by the UI. */
  title?: string;
}

export interface DrawingPlaceholderInput {
  fileName?: string;
  mimeType?: string;
  /** A local object URL or data URL; never fetched by the placeholder parser. */
  source?: string;
  description?: string;
}

export type DrawingInput = string | DrawingPlaceholderInput;
