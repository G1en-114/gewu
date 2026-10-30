import type { MachineDef } from '../types';
import { CAMERA, CENTRE_LINES, GUIDES, NEIGHBOURS, PARTS, STEPS } from './data';
import { Jack, JackDriver } from './Model';

export const jack: MachineDef = {
  id: 'jack',
  bounds: [[-1.5, 0, -1.5], [1.5, 3.72, 1.5]],
  name: '螺旋千斤顶',
  en: 'Screw Jack',
  subtitle: '装配体 · 全剖视',
  summary: '7 个零件 · 方牙螺纹传动 · 纵剖不剖规定',
  drawingNo: 'GW-QJD-00',
  scale: '1 : 2',
  parts: PARTS,
  boltSets: {},
  neighbours: NEIGHBOURS,
  guides: GUIDES,
  centreLines: CENTRE_LINES,
  steps: STEPS,
  camera: CAMERA,
  Model: Jack,
  Driver: JackDriver,
};
