import type { MachineDef } from '../types';
import { EngineBackdrop } from './Backdrop';
import { EngineControls, EngineToggles } from './Controls';
import { BOLT_SETS, CAMERA, CENTRE_LINES, GUIDES, NEIGHBOURS, PARTS, STEPS } from './data';
import { EngineDriver } from './Driver';
import { Engine } from './Model';

export const engine: MachineDef = {
  id: 'engine',
  name: '卧式单缸蒸汽机',
  en: 'Horizontal Mill Engine · c. 1850',
  subtitle: '综合展示',
  summary: '13 个零件 · 曲柄连杆、配汽机构、离心调速',
  drawingNo: 'GW-ME-001',
  scale: '1 : 20',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: NEIGHBOURS,
  guides: GUIDES,
  centreLines: CENTRE_LINES,
  steps: STEPS,
  camera: CAMERA,
  Model: Engine,
  Driver: EngineDriver,
  Controls: EngineControls,
  Toggles: EngineToggles,
  Backdrop: EngineBackdrop,
};
