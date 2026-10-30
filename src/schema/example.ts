import type { MechanismSceneSpec, PartSpec, JointSpec, StepSpec } from './scene';

/**
 * Small, deterministic Watt governor scene used when no model/CAD backend is
 * available yet.  It is also a useful contract fixture for UI development.
 */
export const WATT_GOVERNOR_SCENE: MechanismSceneSpec = {
  version: '1.0',
  id: 'watt-governor-demo',
  title: '瓦特离心调速器',
  summary: '通过旋转主轴带动飞球升降，演示转速与套筒位置的机械关系。',
  source: 'template',
  units: { length: 'scene', angle: 'deg' },
  parts: [
    {
      id: 'base', name: '底座', kind: 'base', role: '固定机构',
      material: 'cast-iron', dimensions: { radius: 2.6, height: 0.45 }, position: [0, 0, 0],
    },
    {
      id: 'boiler', name: '蒸汽箱', kind: 'body', role: '承载主轴',
      material: 'copper', dimensions: { length: 3.2, radius: 1.1 }, position: [-0.35, 1.35, 0],
    },
    {
      id: 'governor-spindle', name: '调速主轴', kind: 'shaft', role: '传递旋转运动',
      material: 'steel', dimensions: { length: 4.1, radius: 0.12 }, position: [0.5, 3.45, 0],
    },
    {
      id: 'governor-arms', name: '调速臂', kind: 'link', role: '将旋转转换为升降',
      material: 'steel', dimensions: { length: 1.6, radius: 0.06 }, position: [0.5, 4.65, 0],
    },
    {
      id: 'governor-balls', name: '离心球', kind: 'weight', role: '感知转速',
      material: 'cast-iron', dimensions: { radius: 0.3 }, position: [0.5, 4.65, 0],
    },
    {
      id: 'governor-collar', name: '滑动套筒', kind: 'slider', role: '输出调速位移',
      material: 'brass', dimensions: { radius: 0.35, height: 0.45 }, position: [0.5, 3.9, 0],
    },
    {
      id: 'flywheel', name: '飞轮', kind: 'wheel', role: '平滑转速',
      material: 'cast-iron', dimensions: { radius: 1.55, depth: 0.3 }, position: [0.85, 1.2, 0],
    },
    {
      id: 'crank', name: '曲柄', kind: 'link', role: '产生偏心运动',
      material: 'steel', dimensions: { radius: 0.48, length: 0.9 }, position: [0.85, 1.2, 0],
    },
    {
      id: 'connecting-rod', name: '连杆', kind: 'link', role: '连接曲柄与蒸汽机构',
      material: 'steel', dimensions: { length: 1.75, radius: 0.08 }, position: [0.85, 2.2, 0],
    },
  ],
  joints: [
    { id: 'spindle-fixed', name: '主轴固定', type: 'revolute', parent: 'base', child: 'governor-spindle', anchor: [0.5, 1.15, 0], axis: [0, 1, 0] },
    { id: 'arm-pivot', name: '调速臂铰接', type: 'revolute', parent: 'governor-spindle', child: 'governor-arms', anchor: [0.5, 4.55, 0], axis: [0, 0, 1] },
    { id: 'ball-pivot', name: '离心球铰接', type: 'spherical', parent: 'governor-arms', child: 'governor-balls', anchor: [1.65, 4.65, 0] },
    { id: 'collar-slide', name: '套筒滑动', type: 'prismatic', parent: 'governor-spindle', child: 'governor-collar', anchor: [0.5, 3.9, 0], axis: [0, 1, 0], limits: { min: 3.2, max: 4.8 } },
    { id: 'flywheel-axle', name: '飞轮转轴', type: 'revolute', parent: 'base', child: 'flywheel', anchor: [0.85, 1.2, 0], axis: [0, 0, 1] },
    { id: 'crank-pin', name: '曲柄销', type: 'revolute', parent: 'flywheel', child: 'crank', anchor: [1.2, 1.2, 0], axis: [0, 0, 1] },
  ],
  steps: [
    { id: 'step-idle', label: '静止状态', description: '查看底座、主轴和套筒的装配关系。', durationMs: 1200, focusPartIds: ['base', 'governor-spindle', 'governor-collar'], state: { rpm: 0, explode: 0 } },
    { id: 'step-drive', label: '开始旋转', description: '主轴带动调速臂和离心球旋转。', durationMs: 1800, focusPartIds: ['governor-spindle', 'governor-arms', 'governor-balls'], state: { rpm: 120, explode: 0 } },
    { id: 'step-regulate', label: '套筒上移', description: '转速升高时离心球外张，套筒沿主轴上移。', durationMs: 1800, focusPartIds: ['governor-balls', 'governor-collar'], state: { rpm: 240, collarHeight: 4.35, explode: 0 } },
    { id: 'step-explode', label: '分解查看', description: '将主要零件错开，便于观察装配关系。', durationMs: 1500, focusPartIds: ['flywheel', 'crank', 'connecting-rod'], state: { rpm: 0, explode: 1 } },
  ],
  parameters: { rpm: 120, governorAngle: 24, explode: 0 },
  metadata: { template: 'watt-governor', educational: true },
};

export function cloneWattGovernorScene(): MechanismSceneSpec {
  // Parsers should not share mutable arrays with the template.
  return {
    ...WATT_GOVERNOR_SCENE,
    parts: WATT_GOVERNOR_SCENE.parts.map(clonePart),
    joints: WATT_GOVERNOR_SCENE.joints.map((joint) => ({ ...joint, anchor: joint.anchor ? [...joint.anchor] as [number, number, number] : undefined, axis: joint.axis ? [...joint.axis] as [number, number, number] : undefined, limits: joint.limits ? { ...joint.limits } : undefined })),
    steps: WATT_GOVERNOR_SCENE.steps.map((step) => ({ ...step, focusPartIds: step.focusPartIds ? [...step.focusPartIds] : undefined, state: step.state ? { ...step.state } : undefined })),
    parameters: WATT_GOVERNOR_SCENE.parameters ? { ...WATT_GOVERNOR_SCENE.parameters } : undefined,
    metadata: WATT_GOVERNOR_SCENE.metadata ? { ...WATT_GOVERNOR_SCENE.metadata } : undefined,
  };
}

function clonePart(part: PartSpec): PartSpec {
  return {
    ...part,
    position: part.position ? [...part.position] as [number, number, number] : undefined,
    rotation: part.rotation ? [...part.rotation] as [number, number, number] : undefined,
    dimensions: part.dimensions ? { ...part.dimensions } : undefined,
    metadata: part.metadata ? { ...part.metadata } : undefined,
  };
}

export type { JointSpec, StepSpec };
