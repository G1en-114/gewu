import type { BoltSetDef, CameraDef, GuideDef, PartDef, StepDef, Vec3 } from '../types';

/**
 * Smartphone after Apple's published references for the iPhone 15:
 * the accessory dimensional drawing (outline, buttons, ports, camera
 * plateau) and the Self Service Repair manual's internal view, exploded
 * view (21 parts, numbered as there) and screw chart. Internal sizes are
 * read off those pictures, so they are approximate.
 *
 * Layout is given in millimetres as on the drawings, looking at the back:
 * u across from the left edge, v down from the top, y up from the display
 * face. World units are centimetres: the phone lies on its display with
 * the top end toward −x and the left edge (camera side) toward the viewer.
 */
export const PHONE = {
  width: 71.63,
  length: 147.64,
  thickness: 7.81,
  corner: 10,
  /** Frame wall; the glass panels sit inside it. */
  wall: 1.0,
  /** Midplate between the display and the internals. */
  midplate: [1.6, 2.3] as const,
  /** Back glass, camera plateau top, camera ring top. */
  back: [7.0, 7.81] as const,
  plateau: 9.66,
  ringTop: 11.29,
  /** Lens centres (u, v) and the MagSafe centre (product centre). */
  ultraWide: [12.73, 12.73] as const,
  wide: [25.64, 25.64] as const,
  flash: [27.32, 11.06] as const,
  centre: [35.81, 73.82] as const,
  /** Height of the bottom-edge features (port, screws, grilles). */
  portY: 3.91,
};

const S = 0.1;
export const X = (v: number) => (v - PHONE.centre[1]) * S;
export const Z = (u: number) => (PHONE.centre[0] - u) * S;
/** World point from drawing coordinates in mm. */
export const at = (u: number, v: number, y: number): Vec3 => [X(v), y * S, Z(u)];

export const PARTS: PartDef[] = [
  {
    id: 'back-glass', index: 1, name: '后盖玻璃', en: 'Back Glass', role: '背面外壳 · 无线充电', material: '彩色玻璃 / 铜线圈 / 钕磁铁',
    description: '整块玻璃，镜头凸台和镜头保护圈都在上面。内侧贴着 MagSafe 无线充电线圈和一圈磁铁，用来吸附充电器和配件。',
    explode: [0, 8.5, 0], stage: [0.04, 0.13],
  },
  {
    id: 'back-adhesive', index: 2, name: '后盖胶', en: 'Back Glass Adhesive', role: '粘接 · 防水', material: '压敏胶',
    description: '沿中框一圈的胶条，把后盖粘在中框上并起防水作用。拆后盖要先加热使它变软。',
    explode: [0, 6.6, 0], stage: [0.08, 0.15],
  },
  {
    id: 'cowl-upper', index: 3, name: '主板护盖（上）', en: 'Logic Board Cowling', role: '压住排线接头', material: '不锈钢片',
    description: '压在摄像头和原深感摄像头的排线接头上，防止接头松脱，同时起屏蔽作用。',
    explode: [-0.4, 5.6, -0.8], stage: [0.19, 0.25],
  },
  {
    id: 'cowl-lower', index: 4, name: '主板护盖（下）', en: 'Logic Board Cowling', role: '压住电池接头', material: '不锈钢片',
    description: '压住电池排线的接头。维修时第一步就是卸下它，断开电池接头，让整机断电。',
    explode: [0.4, 5.6, -1.2], stage: [0.2, 0.26],
  },
  {
    id: 'truedepth', index: 5, name: '原深感摄像头', en: 'TrueDepth Camera', role: '前置拍照 · 面容识别', material: '模组',
    description: '藏在屏幕顶部“灵动岛”下面：前置摄像头、点阵投影器和红外摄像头。点阵投影器投出上万个红外点，红外摄像头读取后算出脸部的立体形状。',
    explode: [-2.6, 4.2, 0.4], stage: [0.3, 0.39],
  },
  {
    id: 'grille', index: 6, name: '听筒防尘网', en: 'Top Speaker Grille', role: '防尘', material: '金属网',
    description: '贴在屏幕上沿的听筒出声缝后面，挡住灰尘。',
    explode: [-1.2, 3.4, 0.2], stage: [0.37, 0.44],
  },
  {
    id: 'camera', index: 7, name: '后置双摄', en: 'Rear Camera', role: '主摄 + 超广角', material: '模组',
    description: '大的是 4800 万像素主摄（带传感器位移防抖），小的是超广角。两个模组装在同一个支架上，各有一根排线接到主板。',
    explode: [-2.0, 4.6, 1.2], stage: [0.26, 0.35],
  },
  {
    id: 'antenna', index: 8, name: '后盖天线', en: 'Back Glass 2 Antenna', role: '毫米波天线', material: '模组',
    description: '毫米波 5G 天线模组，只有支持毫米波的机型（美版）才有。',
    explode: [-1.2, 5.0, -1.8], stage: [0.24, 0.3],
  },
  {
    id: 'top-speaker', index: 9, name: '听筒扬声器', en: 'Top Speaker', role: '通话 · 立体声', material: '模组',
    description: '打电话时贴耳听的声音从这里来；外放时和底部扬声器组成立体声。',
    explode: [-2.4, 4.0, -1.4], stage: [0.33, 0.41],
  },
  {
    id: 'bottom-speaker', index: 10, name: '底部扬声器', en: 'Bottom Speaker', role: '外放', material: '模组',
    description: '带一个密封音腔的扬声器，声音从底边的一排小孔出去。音腔越大低音越好，所以它占了不小的空间。',
    explode: [1.8, 3.2, 1.4], stage: [0.5, 0.58],
  },
  {
    id: 'dock-flex', index: 11, name: '尾插排线', en: 'Dock Flex Cable', role: 'USB-C 接口', material: '柔性电路板 / 不锈钢',
    description: 'USB-C 接口连着一条长排线，沿底边和侧边绕到主板。充电、数据和底部的麦克风信号都走这条线。',
    explode: [2.6, 2.2, 0.3], stage: [0.58, 0.66],
  },
  {
    id: 'battery', index: 12, name: '电池', en: 'Battery', role: '供电', material: '锂离子聚合物',
    description: '占了机身一半面积的软包锂电池，约 3349 mAh。上沿是保护电路板和排线；下面靠几条可拉伸的易拉胶粘在中板上，拉出胶条就能取下。',
    explode: [0, 4.0, 0.9], stage: [0.4, 0.5],
  },
  {
    id: 'taptic', index: 13, name: '线性马达', en: 'Taptic Engine', role: '触感反馈', material: '模组',
    description: '里面是一块由线圈推动、来回往复的质量块，比旋转偏心马达更快、更干脆，用来模拟“按下”的手感。',
    explode: [1.2, 3.4, -1.2], stage: [0.46, 0.54],
  },
  {
    id: 'mic', index: 14, name: '主麦克风', en: 'Main Microphone', role: '收音', material: 'MEMS 麦克风',
    description: '对准底边的两个小孔收音，打电话时主要靠它。',
    explode: [2.4, 2.8, -0.6], stage: [0.54, 0.6],
  },
  {
    id: 'logic-board', index: 15, name: '主板', en: 'Logic Board', role: '处理器 · 存储 · 基带', material: '多层电路板',
    description: '上下两层电路板叠成“三明治”，中间用一圈转接板连接，面积小、元件多。上层是 A16 处理器和内存，各接头都插在下层的伸出部分上。',
    explode: [0, 3.4, -1.9], stage: [0.62, 0.72],
  },
  {
    id: 'enclosure', index: 16, name: '中框', en: 'Enclosure', role: '骨架 · 天线', material: '铝合金',
    description: '一体铣出的铝中框，中间的中板把屏幕和内部零件隔开。侧面有按键，底边有 USB-C 口、扬声器孔、麦克风孔和两颗五角螺钉。',
    explode: [0, 0, 0], stage: [1, 1],
  },
  {
    id: 'als-cowl', index: 17, name: '感应器排线护盖', en: 'ALS / Proximity Connector Cowling', role: '压住接头', material: '不锈钢片',
    description: '在屏幕一侧，压住环境光和距离感应器的排线接头。',
    explode: [-0.6, -1.2, -0.8], stage: [0.86, 0.94],
  },
  {
    id: 'display-cowl', index: 18, name: '屏幕排线护盖', en: 'Display Connector Cowling', role: '压住接头', material: '不锈钢片',
    description: '在屏幕一侧，压住屏幕排线的接头。屏幕排线穿过中板上的方孔接到主板。',
    explode: [0.4, -1.2, -0.8], stage: [0.86, 0.94],
  },
  {
    id: 'display-adhesive', index: 19, name: '屏幕胶', en: 'Display Adhesive', role: '粘接 · 防水', material: '泡棉胶',
    description: '屏幕和中框之间的一圈胶，和后盖胶一起让整机达到 IP68 防水。',
    explode: [0, -2.4, 0], stage: [0.76, 0.88],
  },
  {
    id: 'display', index: 20, name: '显示屏', en: 'Display', role: '显示 · 触控', material: '超瓷晶玻璃 / OLED',
    description: '表面是盖板玻璃，下面贴着 OLED 屏和触控层。顶部的药丸形开孔就是“灵动岛”，原深感摄像头透过它工作。',
    explode: [0, -4.6, 0], stage: [0.72, 0.86],
  },
  {
    id: 'sim', index: 21, name: 'SIM 卡托', en: 'SIM Tray', role: '装 SIM 卡', material: '铝 / 不锈钢',
    description: '用取卡针顶侧面的小孔弹出。卡托外圈有密封圈防水。',
    explode: [0, 0, -2.8], stage: [0, 0.05],
  },
];

export const BOLT_SETS: Record<string, BoltSetDef> = {
  'upper-cowl-screws': { owner: 'cowl-upper', distance: 0.8, stage: [0.16, 0.19] },
  'lower-cowl-screws': { owner: 'cowl-lower', distance: 0.8, stage: [0.165, 0.2] },
  'camera-screws': { owner: 'camera', distance: 0.8, stage: [0.23, 0.26] },
  'taptic-screws': { owner: 'taptic', distance: 0.8, stage: [0.43, 0.46] },
  'speaker-screws': { owner: 'bottom-speaker', distance: 0.8, stage: [0.47, 0.5] },
  'dock-screws': { owner: 'dock-flex', distance: 0.8, stage: [0.55, 0.58] },
  pentalobes: { owner: 'display', distance: 0.9, stage: [0.67, 0.71] },
  'cowl-screws': { owner: 'display-cowl', distance: 0.8, stage: [0.83, 0.86] },
};

/** Screw seats (u, v, y) per set, from the repair manual's screw chart. */
export const SCREWS: Record<string, Array<[number, number, number]>> = {
  'upper-cowl-screws': [[47.5, 33.5, 4.45], [65.5, 26.5, 4.45], [65.5, 33.5, 4.45]],
  'lower-cowl-screws': [[52.5, 38.5, 6.25], [66, 38.5, 6.25], [66, 52.5, 6.25]],
  'camera-screws': [[6.3, 35.6, 3.0], [36.8, 19.5, 3.0], [12.6, 5.0, 3.0]],
  'taptic-screws': [[49.6, 129.2, 6.0], [67.2, 132, 6.0]],
  'speaker-screws': [[4.1, 131, 5.6], [4.1, 142, 5.6], [26.8, 137, 5.6]],
  'dock-screws': [[27.6, 141.5, 2.8], [43.3, 141.5, 2.8]],
  'cowl-screws': [[55, 95, 1.32], [63, 105, 1.32]],
};
/** The two pentalobe screws in the bottom edge, either side of the port. */
export const PENTALOBES = [28.89, 42.74];

export const NEIGHBOURS: Record<string, string[]> = {
  'back-glass': ['back-glass', 'back-adhesive'],
  'back-adhesive': ['back-glass', 'back-adhesive'],
  'cowl-upper': ['upper-cowl-screws', 'cowl-upper'],
  'cowl-lower': ['lower-cowl-screws', 'cowl-lower'],
  camera: ['camera-screws', 'camera'],
  truedepth: ['truedepth', 'grille'],
  taptic: ['taptic-screws', 'taptic'],
  'bottom-speaker': ['speaker-screws', 'bottom-speaker'],
  'dock-flex': ['dock-screws', 'dock-flex'],
  display: ['pentalobes', 'display', 'display-adhesive'],
  'display-cowl': ['cowl-screws', 'display-cowl', 'als-cowl'],
  'als-cowl': ['cowl-screws', 'display-cowl', 'als-cowl'],
};

export const GUIDES: GuideDef[] = [
  { stage: 'back-glass', origin: at(55, 110, 7.81) },
  { stage: 'camera', origin: at(25.64, 25.64, 6.9) },
  { stage: 'truedepth', origin: at(34, 9, 4.4) },
  { stage: 'battery', origin: at(27, 83, 6.45) },
  { stage: 'logic-board', origin: at(60, 66, 6.3) },
  { stage: 'taptic', origin: at(58.5, 128, 6.2) },
  { stage: 'bottom-speaker', origin: at(15, 137, 6.3) },
  { stage: 'dock-flex', origin: at(35.81, 146.6, 5.58) },
  { stage: 'sim', origin: at(71.6, 110.7, 3.9) },
  { stage: 'display', origin: at(35.81, 140, 0) },
  ...Object.entries(SCREWS).flatMap(([set, seats]) =>
    seats.map(([u, v, y]): GuideDef => ({ stage: set, origin: at(u, v, y), axis: set === 'cowl-screws' ? [0, -1, 0] : [0, 1, 0] }))),
  ...PENTALOBES.map((u): GuideDef => ({ stage: 'pentalobes', origin: at(u, PHONE.length, PHONE.portY), axis: [1, 0, 0] })),
];

export const CENTRE_LINES: Array<[Vec3, Vec3, number?]> = [
  [at(...PHONE.ultraWide, 4), at(...PHONE.ultraWide, 13), 0.95],
  [at(...PHONE.wide, 4), at(...PHONE.wide, 13), 0.95],
  [at(...PHONE.centre, 5.5), at(...PHONE.centre, 9.5), 2.6],
  [at(PHONE.centre[0], 132, PHONE.portY), at(PHONE.centre[0], 152, PHONE.portY)],
];

export const STEPS: StepDef[] = [
  {
    title: '整机', en: 'Assembly',
    body: '背面朝上平放。外形依官方尺寸图：长 147.6、宽 71.6、厚 7.8 mm。镜头凸台高出后盖 1.85 mm，镜头圈再高出 1.6 mm。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '打开后盖', en: 'Inside',
    body: '后盖取下后就是官方“内部视图”的样子：左边一大块是电池，右边窄条是主板，顶部是双摄和原深感摄像头，底部是扬声器、USB-C 口和线性马达。',
    state: { explode: 0.155, section: false, running: false, select: 'battery', focus: 'inside' },
  },
  {
    title: '层叠剖视', en: 'Section',
    body: '沿中线剖开看厚度方向：屏幕 — 中板 — 电池 / 主板 — 无线充电线圈 — 后盖。7.8 mm 里叠了五层，主板做成上下两层的“三明治”也是为了省面积。',
    state: { explode: 0, section: true, running: false, select: 'battery', focus: 'stack' },
  },
  {
    title: '完全拆解', en: 'Teardown',
    body: '按维修手册的顺序：退卡托 → 加热揭后盖 → 拆护盖、断电池 → 摄像头、原深感、听筒 → 拉胶条取电池 → 马达、扬声器、麦克风、尾插 → 主板 → 从正面取下屏幕。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const CAMERA: CameraDef = {
  target: [0, 0.4, 0],
  offset: [10, 14, 26],
  orthoDistance: 95,
  exploded: { target: [0, 2.0, 0], scale: 1.45 },
  foci: {
    inside: { target: [0, 0.6, 0], scale: 0.9 },
    stack: { target: [3.2, 0.4, 0], scale: 0.22 },
  },
};
