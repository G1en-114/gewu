import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { create } from 'zustand';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { gearShape } from '../../scene/geometry';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef, Vec3 } from '../types';
import { ArcTurn, Box, Cyl, level, Plate, roundFrame, roundRect, Turn, YZ_X } from '../kit';

/**
 * Five-speed manual gearbox of the classic layshaft kind: input and output
 * shafts in line along x (y = 0), the countershaft below (y = −70), the
 * reverse idler off to the side. Module 2.5 spur gears on a 70 mm centre
 * distance (real boxes use helical gears; spur keeps the teeth readable).
 * Millimetres.
 */

const M = 2.5;
const pr = (teeth: number) => (teeth * M) / 2;
const CS: Vec3 = [0, -70, 0];
/** Constant-mesh pair: input gear / countershaft drive gear. */
const CONST = { x: 62, main: 23, counter: 33 };
/** Speeds: [name, x, main teeth, counter teeth, synchroniser, sleeve direction]. */
const SPEEDS = {
  1: { x: 212, main: 40, counter: 16, sync: 's12', dir: 1 },
  2: { x: 160, main: 36, counter: 20, sync: 's12', dir: -1 },
  3: { x: 112, main: 30, counter: 26, sync: 's34', dir: 1 },
  5: { x: 290, main: 20, counter: 36, sync: 's5r', dir: 1 },
} as const;
const REVERSE = { x: 240, main: 34, counter: 16, idler: 12 };
/** Idler centre: touching the reverse gear on the main shaft and the countershaft gear. */
const IDLER: [number, number] = (() => {
  const a = pr(REVERSE.main) + pr(REVERSE.idler);
  const b = pr(REVERSE.counter) + pr(REVERSE.idler);
  const y = (b * b - a * a - 70 * 70) / 140;
  return [y, Math.sqrt(a * a - y * y)];
})();
const SYNCS = { s34: 88, s12: 186, s5r: 265 } as const;

export type Gear = 'N' | '1' | '2' | '3' | '4' | '5' | 'R';
export const useGearbox = create<{ gear: Gear; set: (gear: Gear) => void }>((set) => ({ gear: 'N', set: (gear) => set({ gear }) }));

const K = CONST.main / CONST.counter;
/** Output speed relative to the input for each gear. */
export const RATIO: Record<Gear, number> = {
  N: 0,
  1: K * (SPEEDS[1].counter / SPEEDS[1].main),
  2: K * (SPEEDS[2].counter / SPEEDS[2].main),
  3: K * (SPEEDS[3].counter / SPEEDS[3].main),
  4: 1,
  5: K * (SPEEDS[5].counter / SPEEDS[5].main),
  R: -K * (REVERSE.counter / REVERSE.main),
};

/** Where each sleeve goes (−1 toward the front, +1 toward the back, 0 neutral) in each gear. */
const SLEEVE: Record<Gear, Record<keyof typeof SYNCS, number>> = {
  N: { s34: 0, s12: 0, s5r: 0 },
  1: { s34: 0, s12: 1, s5r: 0 },
  2: { s34: 0, s12: -1, s5r: 0 },
  3: { s34: 1, s12: 0, s5r: 0 },
  4: { s34: -1, s12: 0, s5r: 0 },
  5: { s34: 0, s12: 0, s5r: 1 },
  R: { s34: 0, s12: 0, s5r: -1 },
};
/** Lever tilt in the H gate: [across (−left), along (+forward)]. */
const GATE: Record<Gear, [number, number]> = { N: [0, 0], 1: [-1, 1], 2: [-1, -1], 3: [0, 1], 4: [0, -1], 5: [1, 1], R: [1, -1] };

export const boxMotion = { input: 0, output: 0, s34: 0, s12: 0, s5r: 0, across: 0, along: 0 };

export function GearboxDriver() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { gear } = useGearbox.getState();
    const m = boxMotion;
    const k = 1 - Math.exp(-dt * 6);
    (Object.keys(SYNCS) as Array<keyof typeof SYNCS>).forEach((s) => { m[s] += (SLEEVE[gear][s] - m[s]) * k; });
    m.across += (GATE[gear][0] - m.across) * k;
    m.along += (GATE[gear][1] - m.along) * k;
    if (!useStudio.getState().running) return;
    m.input += dt * 2.2;
    m.output += dt * 2.2 * RATIO[gear];
  }, -1);
  return null;
}

/** Angle of every rotating member, from the input angle. */
function angles() {
  const t = boxMotion.input;
  const counter = -t * K;
  const free = (main: number, cnt: number) => -counter * (cnt / main);
  return {
    input: t,
    counter,
    output: boxMotion.output,
    g1: free(SPEEDS[1].main, SPEEDS[1].counter),
    g2: free(SPEEDS[2].main, SPEEDS[2].counter),
    g3: free(SPEEDS[3].main, SPEEDS[3].counter),
    g5: free(SPEEDS[5].main, SPEEDS[5].counter),
    reverse: counter * (REVERSE.counter / REVERSE.main),
    idler: -counter * (REVERSE.counter / REVERSE.idler),
  };
}
type Spin = keyof ReturnType<typeof angles>;

/** A group turning about x (through a point in y–z) with one of the box's members. */
function Spinning({ k, at = [0, 0], children }: { k: Spin; at?: [number, number]; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.x = angles()[k]; });
  return <group position={[0, at[0], at[1]]}><group ref={ref}>{children}</group></group>;
}

/** Sliding with a synchroniser sleeve. */
function Sliding({ s, children }: { s: keyof typeof SYNCS; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.position.x = boxMotion[s] * 9; });
  return <group ref={ref}>{children}</group>;
}

/** Spur gear about x, centred at x, face width w. */
function Gear({ k, x, teeth, bore, w = 18 }: { k: string; x: number; teeth: number; bore: number; w?: number }) {
  return <Plate k={`gb-${k}`} shape={() => gearShape(teeth, pr(teeth), M, bore)} depth={w} p={[x - w / 2, 0, 0]} r={YZ_X} />;
}

/** Free gear on the output shaft with its dog-clutch ring facing the synchroniser. */
function FreeGear({ k, x, teeth, dir }: { k: string; x: number; teeth: number; dir: number }) {
  return (
    <>
      <Gear k={k} x={x} teeth={teeth} bore={15} />
      <Plate k="gb-dog" shape={() => gearShape(28, 22, 1.4, 15)} depth={5} p={[x - dir * 9 - (dir > 0 ? 5 : 0), 0, 0]} r={YZ_X} />
    </>
  );
}

function Synchroniser({ s }: { s: keyof typeof SYNCS }) {
  const x = SYNCS[s];
  return (
    <>
      <Spinning k="output"><Turn k="gb-hub" profile={[[14, x - 8], [24, x - 8], [24, x + 8], [14, x + 8]]} axis="x" seg={40} /></Spinning>
      <Sliding s={s}>
        <Spinning k="output">
          <Turn k="gb-sleeve" profile={[[24, x - 11], [33, x - 11], [33, x - 3], [30, x - 3], [30, x + 3], [33, x + 3], [33, x + 11], [24, x + 11]]} axis="x" seg={48} />
        </Spinning>
      </Sliding>
    </>
  );
}

const RAILS: Record<keyof typeof SYNCS, number> = { s34: 0, s12: -20, s5r: 20 };

function Forks() {
  return (
    <>
      {(Object.keys(SYNCS) as Array<keyof typeof SYNCS>).map((s) => (
        <group key={s}>
          <Cyl c={[170, 60, RAILS[s]]} r={5} len={260} axis="x" seg={16} />
          <Sliding s={s}>
            <ArcTurn k="gb-fork" profile={[[33.5, -3], [40, -3], [40, 3], [33.5, 3]]} p={[SYNCS[s], 0, 0]} axis="x" phi0={Math.PI * 1.15} phiLen={Math.PI * 0.7} />
            <Box c={[SYNCS[s], 50, RAILS[s] / 2]} s={[8, 20, Math.abs(RAILS[s]) + 10]} />
            <Box c={[SYNCS[s], 60, RAILS[s]]} s={[18, 14, 14]} />
          </Sliding>
        </group>
      ))}
    </>
  );
}

function Lever() {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.set(boxMotion.across * 0.22, 0, -boxMotion.along * 0.28); });
  return (
    <group position={[175, 78, 0]}>
      <Turn k="gb-boot" profile={[[0, 0], [22, 0], [12, 16], [0, 18]]} seg={32} />
      <group ref={ref}>
        <Cyl c={[0, 70, 0]} r={4} len={140} seg={16} />
        <Turn k="gb-knob" profile={[[0, -12], [9, -8], [13, 2], [10, 12], [0, 15]]} p={[0, 150, 0]} seg={32} />
      </group>
    </group>
  );
}

export function Gearbox() {
  return (
    <group>
      <Part id="case">
        <Plate k="gb-case" shape={roundFrame(-130, -64, 64, 64, 40, 5)} depth={285} p={[25, 0, 0]} r={YZ_X} />
        <Plate k="gb-front-wall" shape={roundRect(-130, -64, 64, 64, 40, [[0, 0, 22], [-70, 0, 20]])} depth={8} p={[25, 0, 0]} r={YZ_X} />
        <Plate k="gb-rear-wall" shape={roundRect(-130, -64, 64, 64, 40, [[0, 0, 20], [-70, 0, 20]])} depth={8} p={[302, 0, 0]} r={YZ_X} />
        <Turn k="gb-bell" profile={[[150, -50], [154, -50], [70, 20], [66, 20]]} axis="x" seg={72} />
        <Callout id="case" p={[60, -125, 50]} />
      </Part>
      <Part id="cover">
        <Box c={[175, 66, 0]} s={[110, 8, 70]} />
        <Callout id="cover" p={[130, 70, 30]} />
      </Part>
      <Part id="lever">
        <Lever />
        <Callout id="lever" p={[175, 230, 10]} />
      </Part>
      <Part id="forks">
        <Forks />
        <Callout id="forks" p={[60, 62, 20]} />
      </Part>
      <Part id="input">
        <Spinning k="input">
          <Cyl c={[20, 0, 0]} r={15} len={110} axis="x" seg={24} />
          <Gear k="input" x={CONST.x} teeth={CONST.main} bore={10} w={20} />
          <Plate k="gb-dog" shape={() => gearShape(28, 22, 1.4, 15)} depth={5} p={[CONST.x + 10, 0, 0]} r={YZ_X} />
        </Spinning>
        <Callout id="input" p={[-20, 20, 10]} />
      </Part>
      <Part id="counter">
        <Spinning k="counter" at={[CS[1], 0]}>
          <Cyl c={[165, 0, 0]} r={16} len={270} axis="x" seg={24} />
          <Gear k="cs-const" x={CONST.x} teeth={CONST.counter} bore={10} w={20} />
          {Object.entries(SPEEDS).map(([n, g]) => <Gear key={n} k={`cs-${n}`} x={g.x} teeth={g.counter} bore={10} />)}
          <Gear k="cs-rev" x={REVERSE.x} teeth={REVERSE.counter} bore={10} w={14} />
        </Spinning>
        <Callout id="counter" p={[140, -110, 30]} />
      </Part>
      <Part id="output">
        <Spinning k="output"><Cyl c={[205, 0, 0]} r={14} len={260} axis="x" seg={24} /></Spinning>
        <Callout id="output" p={[320, 20, 10]} />
      </Part>
      {([['gear1', 1, 'g1'], ['gear2', 2, 'g2'], ['gear3', 3, 'g3'], ['gear5', 5, 'g5']] as const).map(([id, n, spin]) => (
        <Part key={id} id={id}>
          <Spinning k={spin}><FreeGear k={`main-${n}`} x={SPEEDS[n].x} teeth={SPEEDS[n].main} dir={-SPEEDS[n].dir} /></Spinning>
          <Callout id={id} p={[SPEEDS[n].x, pr(SPEEDS[n].main) + 4, 8]} />
        </Part>
      ))}
      <Part id="reverse">
        <Spinning k="reverse"><FreeGear k="main-r" x={REVERSE.x} teeth={REVERSE.main} dir={1} /></Spinning>
        <Spinning k="idler" at={IDLER}>
          <Gear k="idler" x={REVERSE.x} teeth={REVERSE.idler} bore={6} w={14} />
          <Cyl c={[REVERSE.x, 0, 0]} r={6} len={40} axis="x" seg={12} />
        </Spinning>
        <Callout id="reverse" p={[REVERSE.x, IDLER[0], IDLER[1] + 15]} />
      </Part>
      {(['s34', 's12', 's5r'] as const).map((s) => (
        <Part key={s} id={s}>
          <Synchroniser s={s} />
          <Callout id={s} p={[SYNCS[s], 34, 10]} />
        </Part>
      ))}
    </group>
  );
}

const GEARS: Array<[Gear, string]> = [['N', '空档'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['R', '倒']];
const HELD: Record<Gear, string | null> = { N: null, 1: 'gear1', 2: 'gear2', 3: 'gear3', 4: 's34', 5: 'gear5', R: 'reverse' };
const NOTE: Record<Gear, string> = {
  N: '所有接合套都在中间：输出轴上的齿轮只是空转，动力传不出去。',
  1: '1-2 档同步器向后推，把一档齿轮锁在输出轴上：大齿轮配中间轴最小齿轮，减速最多、力最大。',
  2: '1-2 档同步器向前推，锁住二档齿轮。',
  3: '3-4 档同步器向后推，锁住三档齿轮。',
  4: '3-4 档同步器向前推，直接把输入轴和输出轴锁在一起：直接档，1 : 1，不经过中间轴。',
  5: '5 档同步器向后推：中间轴上的大齿轮带输出轴上的小齿轮——超速档，输出比输入还快。',
  R: '经过一个惰轮多换一次方向，输出轴反转。',
};

/** Pick a gear: the fork slides its sleeve, the lever moves in the H gate. */
export function GearboxControls() {
  const { gear, set } = useGearbox();
  const studio = useStudio((s) => s.set);
  const r = RATIO[gear];
  return (
    <>
      <div className="strokes gears">
        {GEARS.map(([g, label]) => (
          <button key={g} type="button" className={g === gear ? 'is-on' : ''} onClick={() => { set(g); studio({ running: true, selected: HELD[g], explode: 0 }); }}>{label}</button>
        ))}
        <b>{r === 0 ? '—' : `${(1 / r).toFixed(2)} : 1`}</b>
      </div>
      <p className="gear-note">{NOTE[gear]}</p>
    </>
  );
}

const PARTS: PartDef[] = [
  { id: 'case', index: 1, name: '壳体', en: 'Gearbox Case', role: '支承 · 储油', material: '铝合金', description: '前面是和离合器相连的钟形罩，里面装着三根轴和齿轮油。', explode: [0, -40, -440], stage: [0.12, 0.24] },
  { id: 'cover', index: 2, name: '顶盖', en: 'Top Cover', role: '封住换档机构', material: '铝合金', description: '变速杆从这里伸出来，下面是拨叉轴。', explode: [0, 150, 0], stage: [0.06, 0.14] },
  { id: 'lever', index: 3, name: '变速杆', en: 'Gear Lever', role: '选档', material: '钢', description: '左右拨选择哪根拨叉轴（选档），前后推拉移动它（挂档）——这就是“H”形档位。', explode: [0, 230, 0], stage: [0, 0.08] },
  { id: 'forks', index: 4, name: '拨叉与拨叉轴', en: 'Shift Forks & Rails', role: '推动接合套', material: '钢', description: '三根拨叉轴、三个拨叉，叉口卡在同步器接合套的槽里，把它推向要挂的齿轮。', explode: [0, 190, 0], stage: [0.22, 0.32] },
  { id: 'input', index: 5, name: '输入轴', en: 'Input Shaft', role: '接收发动机动力', material: '合金钢', description: '前端花键接离合器片，后端的小齿轮和中间轴常啮合，一直带着中间轴转。', explode: [-160, 0, 0], stage: [0.82, 0.92] },
  { id: 'counter', index: 6, name: '中间轴齿轮组', en: 'Countershaft Cluster', role: '传递动力', material: '合金钢', description: '一整根轴上的一串齿轮，全部和中间轴一起转，分别和输出轴上的各档齿轮常啮合。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'output', index: 7, name: '输出轴', en: 'Output Shaft', role: '输出到传动轴', material: '合金钢', description: '各档齿轮套在它上面空转，同步器的齿毂用花键和它连在一起。锁住哪个齿轮，输出轴就按那一档的速比转。', explode: [0, 150, 0], stage: [0.88, 0.96] },
  { id: 'gear1', index: 8, name: '一档齿轮', en: '1st Gear', role: '最大减速', material: '合金钢', description: '输出轴上最大的齿轮，配中间轴上最小的齿轮。', explode: [70, 0, 0], stage: [0.48, 0.56] },
  { id: 'gear2', index: 9, name: '二档齿轮', en: '2nd Gear', role: '减速', material: '合金钢', description: '旁边那面带细齿的环是“结合齿圈”，同步器接合套滑过来和它咬合。', explode: [50, 0, 0], stage: [0.62, 0.7] },
  { id: 'gear3', index: 10, name: '三档齿轮', en: '3rd Gear', role: '减速', material: '合金钢', description: '和 4 档共用一个同步器。', explode: [30, 0, 0], stage: [0.7, 0.78] },
  { id: 'gear5', index: 11, name: '五档齿轮', en: '5th Gear', role: '超速', material: '合金钢', description: '输出轴上的小齿轮配中间轴上的大齿轮，高速巡航时降低发动机转速、省油。', explode: [160, 0, 0], stage: [0.32, 0.4] },
  { id: 'reverse', index: 12, name: '倒档齿轮与惰轮', en: 'Reverse Gear & Idler', role: '反转', material: '合金钢', description: '中间轴和输出轴的倒档齿轮之间多夹了一个惰轮，转向就反过来了。', explode: [100, 0, 120], stage: [0.4, 0.48] },
  { id: 's34', index: 13, name: '同步器（3-4 档）', en: '3–4 Synchroniser', role: '先同步、再接合', material: '黄铜 / 钢', description: '接合套滑向齿轮前，里面的锥形铜环先摩擦，把齿轮的转速拉到和轴一样，再让齿套顺利咬合——所以换档不会打齿。', explode: [-60, 0, 0], stage: [0.76, 0.84] },
  { id: 's12', index: 14, name: '同步器（1-2 档）', en: '1–2 Synchroniser', role: '先同步、再接合', material: '黄铜 / 钢', description: '向后推挂 1 档，向前推挂 2 档。', explode: [60, 0, 0], stage: [0.54, 0.62] },
  { id: 's5r', index: 15, name: '同步器（5-R 档）', en: '5th / Reverse Synchroniser', role: '先同步、再接合', material: '黄铜 / 钢', description: '向后推挂 5 档，向前推挂倒档。', explode: [125, 0, 0], stage: [0.34, 0.42] },
];

const STEPS: StepDef[] = [
  {
    title: '手动变速箱', en: 'Manual Gearbox',
    body: '输入轴一直带着中间轴转；输出轴上的各档齿轮也一直被中间轴带着空转。“挂档”就是用同步器把其中一个齿轮锁到输出轴上。',
    state: { explode: 0, section: true, running: true, select: null, focus: null },
    apply: () => useGearbox.getState().set('N'),
  },
  {
    title: '换档', en: 'Shifting',
    body: '在左栏选档位：看变速杆在 H 形档位里怎么走，拨叉推着接合套滑向哪个齿轮，输出轴的转速随之改变。4 档是直接档；倒档多了一个惰轮。',
    state: { explode: 0, section: true, running: true, select: 'gear1', focus: null },
    apply: () => useGearbox.getState().set('1'),
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拔出变速杆、拆顶盖和壳体，取下拨叉，从后往前把各档齿轮和同步器从输出轴上退下来，最后抽出输入轴和输出轴，剩下中间轴。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const gearbox: MachineDef = level({
  id: 'gearbox',
  unit: 0.032,
  bounds: [[-55, -135, -65], [330, 245, 65]],
  name: '手动变速箱',
  en: 'Five-Speed Manual Gearbox',
  subtitle: '装配体 · 三轴式 · 五前进档 + 倒档',
  summary: '15 种零件 · 同步器换档、H 形档位、各档速比',
  drawingNo: 'GW-BS-00',
  scale: '1 : 4',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [
    { stage: 'input', origin: [-35, 0, 0] },
    { stage: 'gear5', origin: [300, 0, 0] },
    { stage: 'forks', origin: [170, 60, 0] },
  ],
  centreLines: [[[-60, 0, 0], [345, 0, 0]], [[15, -70, 0], [315, -70, 0]]],
  steps: STEPS,
  camera: { target: [150, -10, 0], offset: [420, 400, 1000], orthoDistance: 3000, exploded: { target: [190, 40, -60], scale: 1.6 } },
  Model: Gearbox,
  Driver: GearboxDriver,
  Controls: GearboxControls,
});
