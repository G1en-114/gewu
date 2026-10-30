import type { MachineDef } from '../types';
import { IceControls } from './Controls';
import { BOLT_SETS, CAMERA, CENTRE_LINES, GUIDES, NEIGHBOURS, PARTS, STEPS } from './data';
import { Ice, IceDriver } from './Model';

export const ice: MachineDef = {
  id: 'ice',
  bounds: [[-2.25, 0, -3.72], [5.875, 4.25, 1.6]],
  name: '四冲程汽油机',
  en: 'Four-Stroke Petrol Engine',
  subtitle: '装配体 · 依 Webster 图纸',
  summary: '15 种零件 · 曲柄连杆、2:1 正时、凸轮摇臂配气',
  drawingNo: 'GW-NRJ-00',
  scale: '1 : 1',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: NEIGHBOURS,
  guides: GUIDES,
  centreLines: CENTRE_LINES,
  steps: STEPS,
  camera: CAMERA,
  Model: Ice,
  Driver: IceDriver,
  Controls: IceControls,
};
