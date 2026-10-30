import * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { PartDef, StepDef, Vec3 } from '../types';
import { Box, Cyl, Hoop, level, Pipe, Plate, poly, Rod, roundFrame, Turn, XY_Z, XZ_Y, YZ_X } from '../kit';
import { Engine } from './engine';
import { FrontAxle } from './frontAxle';
import { RearAxle } from './rearAxle';
import { Wheel } from './wheel';

/**
 * Ford Model T touring car, 1917–1925 style. Origin on the ground under the
 * front axle; x forward, y up, z to the right (left-hand drive at −z).
 * 100 in wheelbase, 56 in track, 30 in wheels. Inches.
 */

const WHEELBASE = 100;
const TRACK = 28;
const AXLE_Y = 15;
const ENGINE_AT: Vec3 = [-13, 17.5, 0];
const FLOOR = 25.5;
/** Steering column: bottom (above the pitman arm) and top (under the wheel). */
const COL0: Vec3 = [-20, 20, -12];
const COL1: Vec3 = [-42, 46, -13];

function railShape(side: 1 | -1) {
  const pts: Array<[number, number]> = [[21.2, 13], [21.2, 14.6], [25.2, 14.6], [25.2, 13], [25.0, 13], [25.0, 14.4], [21.4, 14.4], [21.4, 13]];
  return poly(pts.map(([y, z]): [number, number] => [y, side * z]));
}

/** Hood: an arch in (y, z), open underneath. */
function hoodShape() {
  const arch = (w: number, top: number, r: number) => {
    const pts: Array<[number, number]> = [[24.5, -w], [top - r, -w]];
    for (let i = 1; i < 8; i += 1) {
      const a = Math.PI - (i / 8) * (Math.PI / 2);
      pts.push([top - r + r * Math.sin(a), -w + r + r * Math.cos(a)]);
    }
    pts.push([top, -w + r], [top, w - r]);
    for (let i = 1; i < 8; i += 1) {
      const a = Math.PI / 2 - (i / 8) * (Math.PI / 2);
      pts.push([top - r + r * Math.sin(a), w - r + r * Math.cos(a)]);
    }
    pts.push([top - r, w], [24.5, w]);
    return pts;
  };
  return poly([...arch(10.8, 44, 3), ...arch(10.65, 43.85, 2.85).reverse()]);
}

/** Fender: an arc band over a wheel with a skirt to the running board, in (x, y). */
function fenderShape(cx: number, from: number, to: number, skirt: Array<[number, number]>) {
  const arc = (r: number, a0: number, a1: number) => Array.from({ length: 21 }, (_, i): [number, number] => {
    const a = ((a0 + ((a1 - a0) * i) / 20) * Math.PI) / 180;
    return [cx + r * Math.cos(a), AXLE_Y + r * Math.sin(a)];
  });
  return poly([...arc(16.6, from, to), ...skirt, ...arc(16.3, to, from)]);
}

const SIDE: Array<[number, number]> = [[-33, FLOOR], [-115, FLOOR], [-118.5, FLOOR + 2.5], [-119.5, 37], [-117, 42.5], [-96, 42.5], [-90, 41], [-33, 41]];

function SteeringWheel() {
  const dir = new THREE.Vector3(...COL1).sub(new THREE.Vector3(...COL0)).normalize();
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
  const top = new THREE.Vector3(...COL1).addScaledVector(dir, 1.6);
  return (
    <group position={[top.x, top.y, top.z]} rotation={[e.x, e.y, e.z]}>
      <Hoop k="steering-wheel" c={[0, 0, 0]} R={7.5} r={0.5} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return <Rod key={i} a={[0, -0.6, 0]} b={[7.3 * Math.cos(a), 0, 7.3 * Math.sin(a)]} r={0.35} />;
      })}
      <Cyl c={[0, -1.6, 0]} r={2} len={2.4} />
      <Rod a={[0, -2.2, 1.8]} b={[0, -2.2, 6.5]} r={0.15} />
      <Rod a={[0, -2.2, -1.8]} b={[0, -2.2, -6.5]} r={0.15} />
    </group>
  );
}

export function ModelT() {
  return (
    <group>
      <Part id="frame">
        {([1, -1] as const).map((s) => (
          <Plate key={s} k={`rail-${s}`} shape={railShape(s)} depth={122} p={[-116, 0, 0]} r={YZ_X} />
        ))}
        <Box c={[0.25, 23.6, 0]} s={[3.5, 3.2, 29.2]} />
        <Box c={[-100, 24.1, 0]} s={[4, 2.2, 29.2]} />
        <Box c={[-38, 22.2, 0]} s={[2, 2, 29.2]} />
        {[-1, 1].map((s) => (
          <group key={s}>
            {[-30, -55, -75].map((x) => <Box key={x} c={[x, 21.05, s * 18.8]} s={[1.5, 0.5, 8.4]} />)}
            <Box c={[-20, 19.5, s * 11]} s={[2, 1, 5]} />
          </group>
        ))}
        <Callout id="frame" p={[-80, 25.2, 14]} />
      </Part>

      <Part id="front-axle">
        <group position={[0, AXLE_Y, 0]}><FrontAxle /></group>
        <Callout id="front-axle" p={[0, 13, -10]} />
      </Part>
      <Part id="rear-axle">
        <group position={[-WHEELBASE, AXLE_Y, 0]} rotation={[0, 0, 0.0397]}><RearAxle /></group>
        <Callout id="rear-axle" p={[-100, 21, -6]} />
      </Part>
      {([['wheel-fl', 0, -1], ['wheel-fr', 0, 1], ['wheel-rl', -WHEELBASE, -1], ['wheel-rr', -WHEELBASE, 1]] as const).map(([id, x, s]) => (
        <Part key={id} id={id}>
          <group position={[x, AXLE_Y, s * TRACK]} rotation={[0, -s * (Math.PI / 2), 0]}><Wheel /></group>
          <Callout id={id} p={[x, AXLE_Y + 15, s * (TRACK + 2)]} />
        </Part>
      ))}

      <Part id="engine">
        <group position={ENGINE_AT}><Engine /></group>
        <Callout id="engine" p={[-14, 32, -4]} />
      </Part>

      <Part id="radiator">
        <Plate k="radiator-shell" shape={roundFrame(24, -11, 47, 11, 2.5, 2)} depth={0.6} p={[4.4, 0, 0]} r={YZ_X} />
        <Box c={[3.2, 35, 0]} s={[2.4, 18, 18]} />
        {Array.from({ length: 18 }, (_, i) => <Box key={i} c={[4.42, 35, -8.5 + i]} s={[0.08, 18, 0.25]} />)}
        <Box c={[3.2, 45.5, 0]} s={[2.8, 3, 18]} />
        <Box c={[3.2, 25, 0]} s={[2.8, 2, 18]} />
        <Cyl c={[3.2, 47.7, 0]} r={0.9} len={1.4} />
        <Cyl c={[3.2, 48.6, 0]} r={1.2} len={0.4} />
        {[-1, 1].map((s) => <Box key={s} c={[3.2, 24, s * 10]} s={[2, 1, 2]} />)}
        <Pipe k="upper-hose" pts={[[-2.2, 33, 0.8], [-0.5, 38.5, 0.8], [1.8, 43.5, 0.8]]} r={0.9} />
        <Pipe k="lower-hose" pts={[[1.8, 25.5, -5], [-3, 25, -5.5], [-8, 25.5, -4.4]]} r={0.8} />
        <Callout id="radiator" p={[5, 42, 8]} />
      </Part>

      <Part id="hood">
        <Plate k="hood" shape={hoodShape()} depth={25.5} p={[-24, 0, 0]} r={YZ_X} />
        <Cyl c={[-11.25, 44.1, 0]} r={0.25} len={25.5} axis="x" seg={10} />
        <Callout id="hood" p={[-12, 44, 6]} />
      </Part>

      <Part id="body">
        <Box c={[-24.25, (FLOOR + 44) / 2, 0]} s={[0.5, 44 - FLOOR, 28]} />
        {[-1, 1].map((s) => (
          <Box key={s} c={[-28.75, (FLOOR + 44) / 2, s * 18]} s={[11.67, 44 - FLOOR, 0.4]} r={[0, -s * 0.755, 0]} />
        ))}
        <Plate k="cowl-top" shape={poly([[-24.5, -14], [-24.5, 14], [-33, 22], [-33, -22]])} depth={0.4} p={[0, 43.6, 0]} r={XZ_Y} />
        <Plate k="body-side" shape={poly(SIDE)} depth={0.4} p={[0, 0, 21.6]} r={XY_Z} />
        <Plate k="body-side" shape={poly(SIDE)} depth={0.4} p={[0, 0, -22]} r={XY_Z} />
        <Box c={[-119.3, 34, 0]} s={[0.5, 17, 43.6]} />
        <Box c={[-77.75, FLOOR + 0.25, 0]} s={[81.5, 0.5, 43.6]} />
        <Box c={[-30.7, 29, 0]} s={[13, 0.5, 43]} r={[0, 0, -0.35]} />
        <Box c={[-33, 39, 0]} s={[0.5, 6, 43]} />
        {/* fuel tank under the front seat */}
        <Cyl c={[-56, 31, 0]} r={5.2} len={38} axis="z" />
        <Box c={[-48.2, 31.5, 0]} s={[0.4, 12, 43]} />
        <Box c={[-56, 38.2, 0]} s={[16, 3.6, 42]} />
        <Box c={[-64.5, 44, 0]} s={[3, 12, 42]} r={[0, 0, 0.12]} />
        <Box c={[-103, 30.5, 0]} s={[17, 9.5, 43]} />
        <Box c={[-102, 37, 0]} s={[16, 3.6, 42]} />
        <Box c={[-111.5, 44, 0]} s={[3, 13, 42]} r={[0, 0, 0.15]} />
        <Cyl c={[-113.5, 50.8, 0]} r={1.6} len={43} axis="z" />
        {[-1, 1].flatMap((s) => [-45, -82].map((x) => <Box key={`${s}:${x}`} c={[x, 38, s * 22.1]} s={[1.4, 0.3, 0.4]} />))}
        <Callout id="body" p={[-90, 42, 18]} />
      </Part>

      <Part id="windshield">
        {[-1, 1].map((s) => <Cyl key={s} c={[-33.5, 56, s * 21.5]} r={0.5} len={24} />)}
        {[44.5, 56.2, 68].map((y) => <Cyl key={y} c={[-33.5, y, 0]} r={0.45} len={43} axis="z" seg={12} />)}
        <Box c={[-33.5, 50.35, 0]} s={[0.15, 11.2, 42]} />
        <Box c={[-33.5, 62.1, 0]} s={[0.15, 11.4, 42]} />
        <Callout id="windshield" p={[-33.5, 66, 10]} />
      </Part>

      <Part id="fenders">
        {[-1, 1].map((s) => (
          <group key={s}>
            <Plate k="fender-front" shape={fenderShape(0, 20, 160, [[-19.5, 21.9], [-19.5, 21.5]])} depth={5.6} p={[0, 0, s > 0 ? 25.2 : -30.8]} r={XY_Z} />
            <Plate k="fender-rear" shape={fenderShape(-WHEELBASE, 165, 15, [[-82, 21.5], [-82, 21.9]])} depth={5.6} p={[0, 0, s > 0 ? 25.2 : -30.8]} r={XY_Z} />
            <Box c={[-50.75, 21.6, s * 27.25]} s={[62.5, 0.6, 8.5]} />
          </group>
        ))}
        <Callout id="fenders" p={[-50, 22, 30]} />
      </Part>

      <Part id="steering">
        <Rod a={COL0} b={COL1} r={0.9} />
        <SteeringWheel />
        <Rod a={COL0} b={[-19, 16.5, -12.5]} r={0.45} />
        <Rod a={[-19, 16.5, -12.5]} b={[-6, 13.8, -23.5]} r={0.45} />
        <Callout id="steering" p={[-42, 52, -13]} />
      </Part>

      <Part id="lamps">
        {[-1, 1].map((s) => (
          <group key={s}>
            <Turn k="headlamp" profile={[[0, 0], [2.6, 0.3], [3.5, 1.4], [3.5, 3.6], [0, 3.8]]} p={[0.5, 37, s * 15]} axis="x" />
            <Hoop k="headlamp-rim" c={[4.3, 37, s * 15]} R={3.5} r={0.22} axis="x" />
            <Rod a={[2.5, 33.6, s * 15]} b={[2.5, 24.5, s * 12.5]} r={0.35} />
            <Turn k="cowl-lamp" profile={[[0, 0], [1.6, 0.2], [2, 1.2], [2, 2.6], [0, 2.8]]} p={[-28.5, 39, s * 18.6]} axis="x" />
          </group>
        ))}
        <Turn k="tail-lamp" profile={[[0, 0], [1.4, 0.2], [1.7, 1.0], [1.7, 2.2], [0, 2.4]]} p={[-120, 30, -15]} axis="-x" />
        <Callout id="lamps" p={[4, 41, 16]} />
      </Part>

      <Part id="exhaust">
        <Pipe k="exhaust-pipe" pts={[[-12.5, 24.1, 8.8], [-15, 19.5, 10], [-30, 18.6, 9.5], [-52, 18.6, 8.5]]} r={0.8} />
        <Cyl c={[-61, 18.6, 8.5]} r={3} len={18} axis="x" />
        <Pipe k="tail-pipe" pts={[[-70, 18.6, 8.5], [-84, 17.5, 9.5], [-94, 17, 10]]} r={0.7} />
        <Callout id="exhaust" p={[-61, 21.6, 10]} />
      </Part>
    </group>
  );
}

const PARTS_RAW: Array<Omit<PartDef, 'index'>> = [
  { id: 'frame', name: '车架', en: 'Frame', role: '骨架', material: '钒钢槽钢', description: '两根槽钢纵梁加几道横梁，发动机、车身、前后桥都挂在它上面。两副横置钢板弹簧把车架托在前后桥上。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'engine', name: '动力总成', en: 'Engine & Transmission', role: '动力', material: '铸铁 / 钢', description: '四缸发动机、飞轮磁电机和行星变速器连成一体，三点悬挂在车架上。点“拆开此组件”进入发动机。', explode: [0, 16, 0], stage: [0.46, 0.58], deep: [-27, -3.5, 110] },
  { id: 'front-axle', name: '前桥', en: 'Front Axle', role: '承重 · 转向', material: '钒钢', description: '工字形前轴、转向节、横拉杆和径向杆，上面一副横置钢板弹簧。可继续拆开。', explode: [12, -4, 0], stage: [0.7, 0.8], deep: [48, 4, 105] },
  { id: 'rear-axle', name: '后桥', en: 'Rear Axle', role: '驱动 · 承重', material: '钢', description: '差速器、半轴、扭力管和横置钢板弹簧。可继续拆开，差速器还能再拆。', explode: [-16, -3, 0], stage: [0.76, 0.88], deep: [-14, 3, 190] },
  { id: 'wheel-fl', name: '左前轮', en: 'Wheel, Front Left', role: '行驶 · 转向', material: '木 / 钢 / 橡胶', description: '前轮 30 × 3 英寸。木辐条炮车轮：12 根辐条、钢轮辋、钳入式轮胎。可继续拆开。', explode: [0, 0, -18], stage: [0.56, 0.64], deep: [0, 0, 236] },
  { id: 'wheel-fr', name: '右前轮', en: 'Wheel, Front Right', role: '行驶 · 转向', material: '木 / 钢 / 橡胶', description: '和左前轮相同。可继续拆开。', explode: [0, 0, 18], stage: [0.58, 0.66], deep: [35, 0, 144] },
  { id: 'wheel-rl', name: '左后轮', en: 'Wheel, Rear Left', role: '驱动', material: '木 / 钢 / 橡胶', description: '后轮 30 × 3½ 英寸，轮毂装在半轴外端的制动鼓上。可继续拆开。', explode: [0, 0, -18], stage: [0.6, 0.68], deep: [170, 0, 236] },
  { id: 'wheel-rr', name: '右后轮', en: 'Wheel, Rear Right', role: '驱动', material: '木 / 钢 / 橡胶', description: '和左后轮相同。可继续拆开。', explode: [0, 0, 18], stage: [0.62, 0.7], deep: [205, 0, 144] },
  { id: 'radiator', name: '散热器', en: 'Radiator', role: '冷却', material: '铜 / 黄铜', description: '竖直的管片式散热器。没有水泵：热水从缸盖上升进上水箱，冷却后从下水箱流回缸体。', explode: [18, 6, 0], stage: [0.06, 0.14] },
  { id: 'hood', name: '发动机罩', en: 'Hood', role: '遮盖', material: '钢板', description: '中间一根铰链，两侧可以掀开。', explode: [0, 28, 0], stage: [0, 0.08] },
  { id: 'body', name: '车身', en: 'Touring Body', role: '载人', material: '钢板 / 木框', description: '五座敞篷旅行车身：前围、前后座椅，前座下面是 10 加仑的油箱，燃油靠重力流到化油器。', explode: [0, 30, 0], stage: [0.2, 0.3] },
  { id: 'windshield', name: '风挡', en: 'Windshield', role: '挡风', material: '玻璃 / 钢框', description: '上下两块玻璃，上面一块可以翻开通风。', explode: [-10, 36, 0], stage: [0.14, 0.22] },
  { id: 'fenders', name: '挡泥板与踏板', en: 'Fenders & Running Boards', role: '挡泥 · 上下车', material: '钢板', description: '前后四块挡泥板和两侧的踏脚板连成一体。', explode: [0, 18, 0], stage: [0.28, 0.36] },
  { id: 'steering', name: '转向机', en: 'Steering', role: '转向', material: '钢 / 木', description: '方向盘下的小盒子里是行星齿轮减速；转向柱下端的转向摇臂经直拉杆推动左转向节。方向盘下两根小手柄是油门和点火提前。', explode: [-2, 6, -26], stage: [0.34, 0.42] },
  { id: 'lamps', name: '灯具', en: 'Lamps', role: '照明', material: '钢 / 黄铜', description: '两只电头灯（由飞轮磁电机供电）、前围两侧的煤油侧灯和一只尾灯。', explode: [14, 22, 0], stage: [0.1, 0.18] },
  { id: 'exhaust', name: '排气管与消声器', en: 'Exhaust & Muffler', role: '排气 · 消声', material: '钢', description: '从右侧排气歧管接出，经车底的消声器向后排出。', explode: [0, 3, 12], stage: [0.4, 0.48] },
];

const PARTS: PartDef[] = PARTS_RAW.map((p, i) => ({ ...p, index: i + 1 }));

const STEPS: StepDef[] = [
  {
    title: '整车', en: 'Touring Car',
    body: 'T 型车（1908–1927）共造了约 1500 万辆，是第一款流水线大量生产的汽车。轴距 100 英寸，轮距 56 英寸，约 20 马力，最高约 70 km/h。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '底盘', en: 'Chassis',
    body: '拿掉车身、发动机罩和挡泥板，就是底盘：车架、动力总成、前后桥和四个车轮。动力经扭力管里的传动轴送到后桥。',
    state: { explode: 0.37, section: false, running: false, select: 'engine', focus: null },
  },
  {
    title: '完全拆解', en: 'Teardown',
    body: '按拆车顺序：发动机罩 → 散热器 → 灯 → 风挡 → 车身 → 挡泥板 → 转向机 → 排气 → 动力总成 → 车轮 → 前后桥，最后剩下车架。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '带 ▸ 的零件本身也是组件：选中后点“拆开此组件”就进去继续拆。比如 整车 › 动力总成 › 活塞连杆组，或 整车 › 后桥 › 差速器。用标题上方的路径返回上一级。',
    state: { explode: 0, section: false, running: false, select: 'engine', focus: null },
  },
];

export const carLevel = level({
  id: 'model-t',
  unit: 0.1,
  bounds: [[-121, 0, -31], [19, 69, 31]],
  name: 'T 型车',
  en: 'Ford Model T (1917–25 Touring)',
  subtitle: '整车 · 可逐级拆解到零件',
  summary: '16 个大件，动力总成、前后桥、车轮可再拆，最深三级',
  drawingNo: 'GW-T-00',
  scale: '1 : 10',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: {
    engine: 'model-t/engine',
    'front-axle': 'model-t/front-axle',
    'rear-axle': 'model-t/rear-axle',
    'wheel-fl': 'model-t/wheel',
    'wheel-fr': 'model-t/wheel',
    'wheel-rl': 'model-t/wheel',
    'wheel-rr': 'model-t/wheel',
  },
  guides: [
    { stage: 'body', origin: [-75, 42, 0] },
    { stage: 'hood', origin: [-11, 44, 0] },
    { stage: 'engine', origin: [-13, 31, 0] },
    { stage: 'radiator', origin: [5, 35, 0] },
  ],
  centreLines: [
    [[0, AXLE_Y, -34], [0, AXLE_Y, 34]],
    [[-WHEELBASE, AXLE_Y, -34], [-WHEELBASE, AXLE_Y, 34]],
  ],
  steps: STEPS,
  camera: { target: [-52, 26, 0], offset: [120, 110, 260], orthoDistance: 950, exploded: { target: [-50, 40, 0], scale: 1.6 }, deep: { target: [-20, 25, 100], scale: 2.35 } },
  Model: ModelT,
});

