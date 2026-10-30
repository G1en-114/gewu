import type { MachineDef } from '../types';
import { BOLT_SETS, CAMERA, CENTRE_LINES, GUIDES, NEIGHBOURS, PARTS, STEPS } from './data';
import { Phone } from './Model';

export const iphone: MachineDef = {
  id: 'iphone',
  bounds: [[-7.42, 0, -3.65], [7.42, 1.13, 3.65]],
  name: '智能手机',
  en: 'Smartphone (iPhone 15)',
  subtitle: '装配体 · 依 Apple 官方尺寸图与维修手册',
  summary: '21 种零件 · 按官方爆炸图编号，附螺钉，可逐层拆解',
  drawingNo: 'GW-SJ-00',
  scale: '1 : 1',
  parts: PARTS,
  boltSets: BOLT_SETS,
  neighbours: NEIGHBOURS,
  guides: GUIDES,
  centreLines: CENTRE_LINES,
  steps: STEPS,
  camera: CAMERA,
  Model: Phone,
};
