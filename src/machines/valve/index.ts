import type { MachineDef } from '../types';
import { BOLT_SETS, CAMERA, CENTRE_LINES, GUIDES, NEIGHBOURS, PARTS, STEPS } from './data';
import { Valve, ValveDriver } from './Model';

export const valve: MachineDef = {
  id: 'valve',
  bounds: [[-2.35, 0.05, -1.15], [1.55, 3.2, 2.35]],
  name: '球阀',
  en: 'Ball Valve',
  subtitle: '装配体 · 全剖视',
  summary: '9 种零件 · 转 90° 开关 · 填料密封',
  drawingNo: 'GW-QF-00',
  scale: '1 : 1',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: NEIGHBOURS,
  guides: GUIDES,
  centreLines: CENTRE_LINES,
  steps: STEPS,
  camera: CAMERA,
  Model: Valve,
  Driver: ValveDriver,
};
