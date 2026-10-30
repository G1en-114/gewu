import type { MachineDef } from '../types';
import { BOLT_SETS, CAMERA, CENTRE_LINES, GUIDES, NEIGHBOURS, PARTS, STEPS } from './data';
import { Pump, PumpDriver } from './Model';

export const pump: MachineDef = {
  id: 'pump',
  bounds: [[-0.75, 0, -1.5], [2.3, 3.55, 1.5]],
  name: '齿轮油泵',
  en: 'Gear Oil Pump',
  subtitle: '装配体 · 全剖视',
  summary: '8 种零件 · 齿轮啮合 · 填料密封',
  drawingNo: 'GW-CB-00',
  scale: '1 : 1',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: NEIGHBOURS,
  guides: GUIDES,
  centreLines: CENTRE_LINES,
  steps: STEPS,
  camera: CAMERA,
  Model: Pump,
  Driver: PumpDriver,
};
