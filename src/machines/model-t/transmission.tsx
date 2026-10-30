import { M, Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { coil, gearShape } from '../../scene/geometry';
import type { PartDef, StepDef } from '../types';
import { Cyl, level, Plate, Turn, TO, YZ_X } from '../kit';

/**
 * Model T planetary transmission. Axis along x; x = 0 is the flywheel's rear
 * face (the triple gears' pins stand out of it), the drums run back toward −x.
 */

const PIN_R = 2.9;
/** Triple gear sections: [front x, length, pitch radius] — front meshes the driven gear. */
const SECTIONS: Array<[number, number, number]> = [[-0.2, 1.0, 1.1], [-1.3, 0.9, 0.95], [-2.3, 0.9, 0.8]];
const TRIPLES = [0, 1, 2].map((i) => Math.PI / 2 + (i * Math.PI * 2) / 3);

/** A spur gear about the x axis, front face at x, extending back. */
function Gear({ k, x, pr, teeth, bore, len, c = [0, 0] }: { k: string; x: number; pr: number; teeth: number; bore: number; len: number; c?: [number, number] }) {
  return <Plate k={k} shape={() => gearShape(teeth, pr, 0.09, bore)} depth={len} p={[x - len, c[0], c[1]]} r={YZ_X} />;
}

/** Drum: front web from the sleeve out to the rim, rim running back. */
const drum = (x0: number, len: number, hub: number): Array<[number, number]> => [
  [hub, 0], [3.85, 0], [3.85, len], [3.7, len], [3.7, 0.18], [hub, 0.18],
].map(([r, h]): [number, number] => [r, h + x0]);

export function Transmission() {
  return (
    <group>
      <Part id="triples">
        {TRIPLES.map((a, i) => {
          const c: [number, number] = [PIN_R * Math.cos(a), PIN_R * Math.sin(a)];
          return (
            <group key={i}>
              {SECTIONS.map(([x, len, pr], s) => (
                <Gear key={s} k={`triple-${s}`} x={x} pr={pr} teeth={Math.round(pr * 13)} bore={0.36} len={len} c={c} />
              ))}
              <Cyl c={[-1.7, c[0], c[1]]} r={0.34} len={3.4} axis="x" seg={16} />
            </group>
          );
        })}
        <Callout id="triples" p={[-1, 4, 0.5]} />
      </Part>
      <Part id="brake-drum">
        <Gear k="sun-driven" x={-0.2} pr={PIN_R - 1.1} teeth={Math.round((PIN_R - 1.1) * 13)} bore={0.9} len={1.0} />
        <Cyl c={[-5.2, 0, 0]} r={1.1} len={8.0} axis="x" />
        <Turn k="brake-drum" profile={drum(-9.2, 2.4, 1.1)} axis="x" seg={56} />
        <Callout id="brake-drum" p={[-8, 3.9, 1.5]} />
      </Part>
      <Part id="low-drum">
        <Gear k="sun-low" x={-1.3} pr={PIN_R - 0.95} teeth={Math.round((PIN_R - 0.95) * 13)} bore={1.15} len={0.9} />
        <Cyl c={[-4.2, 0, 0]} r={1.35} len={4.8} axis="x" />
        <Turn k="low-drum" profile={drum(-6.6, 1.4, 1.35)} axis="x" seg={56} />
        <Callout id="low-drum" p={[-6, 3.9, 2.2]} />
      </Part>
      <Part id="reverse-drum">
        <Gear k="sun-reverse" x={-2.3} pr={PIN_R - 0.8} teeth={Math.round((PIN_R - 0.8) * 13)} bore={1.4} len={0.9} />
        <Cyl c={[-3.9, 0, 0]} r={1.6} len={2.2} axis="x" />
        <Turn k="reverse-drum" profile={drum(-5.0, 1.4, 1.6)} axis="x" seg={56} />
        <Callout id="reverse-drum" p={[-4.3, 3.9, 3]} />
      </Part>
      <Part id="discs">
        {Array.from({ length: 11 }, (_, i) => (
          <Turn
            key={i}
            k={i % 2 ? 'disc-in' : 'disc-out'}
            profile={i % 2 ? [[1.25, 0], [3.0, 0], [3.0, 0.12], [1.25, 0.12]] : [[1.6, 0], [3.45, 0], [3.45, 0.12], [1.6, 0.12]]}
            p={[-7.15 - i * 0.17, 0, 0]}
            axis="x"
            seg={48}
          />
        ))}
        <Callout id="discs" p={[-8.2, 2.6, 1]} />
      </Part>
      <Part id="spring">
        <M clip geo={coil('mt-clutch-spring', 0.95, 0.13, 1.9, 6)} p={[-9.5, 0, 0]} r={TO['-x']} />
        <Callout id="spring" p={[-10.5, 1.2, 0.6]} />
      </Part>
      <Part id="shaft">
        <Cyl c={[-5.6, 0, 0]} r={0.7} len={13.2} axis="x" />
        <Turn k="clutch-hub" profile={[[0.7, 0], [1.2, 0], [1.2, 2.0], [0.7, 2.0]]} p={[-9.0, 0, 0]} axis="x" />
        <Turn k="push-ring" profile={[[0.7, 0], [1.5, 0], [1.5, 0.3], [0.7, 0.3]]} p={[-11.6, 0, 0]} axis="x" />
        <Callout id="shaft" p={[-11.8, 0.8, 0.4]} />
      </Part>
      <Part id="bands">
        {[-4.3, -5.9, -8.0].map((x, i) => (
          <group key={x}>
            <Turn k={`band-${i}`} profile={[[3.88, -0.55], [4.02, -0.55], [4.02, 0.55], [3.88, 0.55]]} p={[x, 0, 0]} axis="x" seg={64} />
            <Cyl c={[x, 4.25, 0.45]} r={0.22} len={0.5} />
            <Cyl c={[x, 4.25, -0.45]} r={0.22} len={0.5} />
          </group>
        ))}
        <Callout id="bands" p={[-5.9, 4.6, -1]} />
      </Part>
    </group>
  );
}

const PARTS: PartDef[] = [
  { id: 'triples', index: 1, name: '三联齿轮', en: 'Triple Gears', role: '行星轮', material: '钢', description: '三组“三联”齿轮装在飞轮后面的三根销上，随飞轮公转。每组三段齿轮分别和从动齿轮、低速齿轮、倒档齿轮啮合。', explode: [6, 0, 0], stage: [0.12, 0.28] },
  { id: 'brake-drum', index: 2, name: '制动鼓（离合鼓）', en: 'Brake Drum & Driven Gear', role: '高档 · 脚制动', material: '铸铁', description: '最后面的鼓：前端是从动齿轮，鼓内装离合器片。踩制动踏板时外面的制动带抱住它，车就停下——T 型车的脚刹在变速器里。', explode: [-10, 0, 0], stage: [0.56, 0.72] },
  { id: 'low-drum', index: 3, name: '低速鼓', en: 'Slow-Speed Drum', role: '一档', material: '铸铁', description: '踩下低速踏板，制动带抱住这个鼓，它的齿轮不能转，三联齿轮就被迫绕着它滚动，输出轴以约 1/2.75 的速度转动。', explode: [-3, -9, 0], stage: [0.68, 0.84] },
  { id: 'reverse-drum', index: 4, name: '倒档鼓', en: 'Reverse Drum', role: '倒档', material: '铸铁', description: '踩倒档踏板抱住它，齿轮比关系使输出轴反转。T 型车只有两个前进档和一个倒档，全靠脚踩。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'discs', index: 5, name: '离合器片', en: 'Clutch Discs', role: '高档直接挡', material: '钢', description: '一叠内外交替的钢片，泡在机油里。弹簧压紧它们时，整个变速器锁成一体，飞轮直接带动输出轴——这就是高档。', explode: [-10, 7, 0], stage: [0.44, 0.6] },
  { id: 'spring', index: 6, name: '离合器弹簧', en: 'Clutch Spring', role: '压紧离合器', material: '弹簧钢', description: '平时把离合器片压紧（高档）。踩离合踏板一半是空挡，踩到底是低速档。', explode: [-14, -6, 0], stage: [0.28, 0.42] },
  { id: 'shaft', index: 7, name: '输出轴', en: 'Driven Shaft', role: '向后传动', material: '钢', description: '穿过各个鼓的中心，后端接万向节和传动轴，把动力送往后桥。轴上的毂带着内离合器片。', explode: [-22, 0, 0], stage: [0.36, 0.52] },
  { id: 'bands', index: 8, name: '制动带', en: 'Bands', role: '抱住各鼓', material: '钢带 / 摩擦衬', description: '三条带子分别对应倒档、制动、低速三个踏板，脚踩时收紧抱住对应的鼓。', explode: [0, 6, 0], stage: [0, 0.14] },
];

const STEPS: StepDef[] = [
  {
    title: '行星变速器', en: 'Planetary Transmission',
    body: 'T 型车没有换档杆：三个踏板通过三条制动带分别抱住三个鼓，配合离合器得到高档、低速和倒档。三联齿轮就是“行星”，从动齿轮等是“太阳”。',
    state: { explode: 0, section: false, running: false, select: null, focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '剖开看套在一起的三层套筒：最里是从动齿轮连制动鼓，中间连低速鼓，外层连倒档鼓；后部鼓里是离合器片和弹簧。',
    state: { explode: 0, section: true, running: false, select: 'low-drum', focus: null },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '松开制动带，取下三联齿轮，抽出输出轴和离合器，再依次取下制动鼓、低速鼓，剩下倒档鼓。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const transmissionLevel = level({
  id: 'model-t/transmission',
  parent: 'model-t/engine',
  unit: 0.5,
  bounds: [[-12.3, -4.6, -4.1], [0, 4.6, 4.1]],
  name: '行星变速器',
  en: 'Planetary Transmission',
  subtitle: '子组件 · 两进一退 · 踏板操纵',
  summary: '8 种零件：三联齿轮、三个鼓、离合器片、制动带…',
  drawingNo: 'GW-T-12',
  scale: '1 : 2',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [
    { stage: 'shaft', origin: [-12.2, 0, 0] },
    { stage: 'brake-drum', origin: [-9.2, 3.85, 0] },
    { stage: 'triples', origin: [0, PIN_R, 0] },
  ],
  centreLines: [[[-14, 0, 0], [2, 0, 0], 4.3]],
  steps: STEPS,
  camera: { target: [-6, 0, 0], offset: [26, 20, 34], orthoDistance: 140, exploded: { target: [-12, 0, 0], scale: 1.7 } },
  Model: Transmission,
});
