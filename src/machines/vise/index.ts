import type { MachineDef } from '../types';
import { BOLT_SETS, CAMERA, CENTRE_LINES, GUIDES, NEIGHBOURS, PARTS, STEPS } from './data';
import { Vise, ViseDriver } from './Model';

export const vise: MachineDef = {
  id: 'vise',
  bounds: [[-2.75, 0, -1.4], [2.45, 1.62, 1.4]],
  name: '机用虎钳',
  en: 'Machine Vise',
  subtitle: '装配体 · 全剖视',
  summary: '8 种零件 · 螺旋传动 · 导轨滑动',
  drawingNo: 'GW-HQ-00',
  scale: '1 : 2',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: NEIGHBOURS,
  guides: GUIDES,
  centreLines: CENTRE_LINES,
  steps: STEPS,
  camera: CAMERA,
  Model: Vise,
  Driver: ViseDriver,
};
