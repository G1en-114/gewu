import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import { useStudio } from '../../state';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, level, Plate, poly, XY_Z } from '../kit';

/**
 * One key of a grand-piano action, seen from the side: the key runs back
 * from the player (x = 0) over the balance rail; behind it the wippen, jack
 * and hammer; the string above. A simplified, schematic layout in mm.
 */

const BALANCE: [number, number] = [230, -14];
const WIPPEN: [number, number] = [460, 42];
const JACK_BASE: [number, number] = [392, 46];
const FLANGE: [number, number] = [470, 104];
const STRING_Y = 182;
const DAMPER_X = 300;

export const pianoMotion = { t: 0 };
export function PianoDriver() {
  useFrame((_, dt) => { if (useStudio.getState().running) pianoMotion.t += Math.min(dt, 0.05) * 0.6; }, -1);
  return null;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const CYCLE = 3;
const LETOFF = 0.82;

/** Key depth p (0–1) and everything that follows from it, through one press–hold–release cycle. */
export function pianoState(time: number) {
  const c = time % CYCLE;
  const p = smooth(c / 0.6) - smooth((c - 1.8) / 0.6);
  // When the jack reaches the let-off button (rising), and when the key comes back past it.
  const tLet = 0.6 * 0.76;
  const follow = 0.36 * p;
  let hammer = follow;
  let phase = 0;
  if (c > tLet && c < 2.25) {
    const f = c - tLet;
    const strike = 0.43;
    const check = 0.26;
    if (f < 0.07) { hammer = follow + (strike - follow) * smooth(f / 0.07); phase = 2; }
    else if (f < 0.4) { hammer = strike + (check - strike) * smooth((f - 0.07) / 0.33); phase = 2; }
    else { hammer = Math.min(check, follow + 0.02); phase = 3; }
    if (f >= 0.4 && c < 1.8) phase = 3;
  } else if (p > 0.02) phase = 1;
  if (c > 1.8) phase = p > 0.1 ? 4 : 0;
  const escape = smooth((p - LETOFF) / 0.12) * 0.35;
  return { p, key: -0.045 * p, wippen: 0.26 * p, hammer, escape, damper: smooth((p - 0.25) / 0.4) * 9, phase };
}

function Pivot({ at, angle, children }: { at: [number, number]; angle: (s: ReturnType<typeof pianoState>) => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = angle(pianoState(pianoMotion.t)); });
  return <group position={[at[0], at[1], 0]}><group ref={ref}>{children}</group></group>;
}

function Lift({ by, children }: { by: (s: ReturnType<typeof pianoState>) => number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.position.y = by(pianoState(pianoMotion.t)); });
  return <group ref={ref}>{children}</group>;
}

/** Shape helper: points relative to a pivot. */
const rel = (o: [number, number], pts: Array<[number, number]>) => poly(pts.map(([x, y]): [number, number] => [x - o[0], y - o[1]]));

export function PianoAction() {
  return (
    <group>
      <Part id="frame">
        <Box c={[230, -24, 0]} s={[520, 8, 30]} />
        <Plate k="pa-balance" shape={poly([[-14, -20], [14, -20], [6, 0], [-6, 0]])} depth={30} p={[BALANCE[0], 0, -15]} r={XY_Z} />
        <Box c={[FLANGE[0] + 10, 70, 0]} s={[12, 86, 26]} />
        <Box c={[WIPPEN[0] + 14, 30, 0]} s={[10, 40, 26]} />
        <Callout id="frame" p={[40, -24, 15]} />
      </Part>
      <Part id="key">
        <Pivot at={BALANCE} angle={(s) => s.key}>
          <Plate k="pa-key" shape={rel(BALANCE, [[0, -10], [440, -10], [440, 12], [8, 12], [0, 6]])} depth={22} p={[0, 0, -11]} r={XY_Z} />
          <Plate k="pa-key-top" shape={rel(BALANCE, [[0, 12], [150, 12], [150, 15], [0, 15]])} depth={22} p={[0, 0, -11]} r={XY_Z} />
          <Cyl c={[372 - BALANCE[0], 18 - BALANCE[1], 0]} r={4} len={12} seg={12} />
          <Box c={[330 - BALANCE[0], 42 - BALANCE[1], 0]} s={[8, 60, 14]} r={[0, 0, -0.15]} />
        </Pivot>
        <Callout id="key" p={[60, 20, 11]} />
      </Part>
      <Part id="wippen">
        <Pivot at={WIPPEN} angle={(s) => s.wippen * 0.4}>
          <Plate k="pa-wippen" shape={rel(WIPPEN, [[360, 26], [460, 38], [460, 46], [400, 50], [360, 34]])} depth={16} p={[0, 0, -8]} r={XY_Z} />
          <Box c={[432 - WIPPEN[0], 62 - WIPPEN[1], 0]} s={[54, 6, 10]} r={[0, 0, 0.05]} />
        </Pivot>
        <Callout id="wippen" p={[420, 52, 10]} />
      </Part>
      <Part id="jack">
        <Pivot at={WIPPEN} angle={(s) => s.wippen * 0.4}>
          <Pivot at={[JACK_BASE[0] - WIPPEN[0], JACK_BASE[1] - WIPPEN[1]]} angle={(s) => -s.escape}>
            <Plate k="pa-jack" shape={poly([[-3, 0], [3, 0], [3, 50], [-3, 50]])} depth={10} p={[0, 0, -5]} r={XY_Z} />
            <Plate k="pa-jack-tail" shape={poly([[0, 0], [24, 8], [24, 13], [0, 6]])} depth={10} p={[0, 0, -5]} r={XY_Z} />
          </Pivot>
        </Pivot>
        <Callout id="jack" p={[392, 80, 6]} />
      </Part>
      <Part id="letoff">
        <Cyl c={[420, 72, 0]} r={5} len={6} seg={16} />
        <Box c={[420, 85, 0]} s={[3, 22, 3]} />
        <Callout id="letoff" p={[425, 78, 6]} />
      </Part>
      <Part id="hammer">
        <Pivot at={FLANGE} angle={(s) => -s.hammer * 0.75}>
          <Box c={[-75, 0, 0]} s={[150, 7, 8]} />
          <Cyl c={[392 - FLANGE[0], -5, 0]} r={6} len={12} axis="z" seg={20} />
          <Plate k="pa-hammer-head" shape={poly([[-16, -4], [16, -4], [11, 26], [6, 34], [-6, 34], [-11, 26]])} depth={18} p={[DAMPER_X + 30 - FLANGE[0], 0, -9]} r={XY_Z} />
          <Cyl c={[0, 0, 0]} r={4} len={20} axis="z" seg={12} />
        </Pivot>
        <Callout id="hammer" p={[DAMPER_X + 30, 145, 10]} />
      </Part>
      <Part id="damper">
        <Lift by={(s) => s.damper}>
          <Box c={[DAMPER_X - 40, STRING_Y + 10, 0]} s={[30, 14, 22]} />
          <Box c={[DAMPER_X - 40, STRING_Y + 50, 0]} s={[4, 66, 4]} />
        </Lift>
        <Callout id="damper" p={[DAMPER_X - 40, STRING_Y + 40, 12]} />
      </Part>
      <Part id="string">
        <Cyl c={[220, STRING_Y, 0]} r={1.2} len={420} axis="x" seg={8} />
        <Callout id="string" p={[120, STRING_Y, 3]} />
      </Part>
    </group>
  );
}

const PHASES = ['静止', '抬起', '擒纵 · 击弦', '止槌接住', '回位止音'];

export function PianoControls() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPhase(pianoState(pianoMotion.t).phase), 80);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="strokes" aria-live="off">
      {PHASES.slice(1).map((p, i) => <span key={p} className={i + 1 === phase ? 'is-on' : ''}>{p}</span>)}
    </div>
  );
}

const PARTS: PartDef[] = [
  { id: 'key', index: 1, name: '琴键', en: 'Key', role: '杠杆输入', material: '云杉木 / 树脂键面', description: '一根长长的木杠杆，架在中间的平衡轨上。前端按下 10 mm，后端的顶杆抬起；后端上还装着止槌器。', explode: [0, -40, 0], stage: [0.76, 0.92] },
  { id: 'wippen', index: 2, name: '转击器', en: 'Wippen', role: '传递 · 重复', material: '枫木', description: '被琴键上的顶杆抬起，绕后端的支点转动，托着顶杆往上走。上面的重复杠杆让琴槌没完全落下时就能再次击弦——三角钢琴能快速连打靠的就是它。', explode: [0, 30, 40], stage: [0.5, 0.64] },
  { id: 'jack', index: 3, name: '顶杆（擒纵杆）', en: 'Jack', role: '推琴槌 · 及时脱开', material: '枫木', description: '整个机构的精髓：它推着琴槌柄上的转轮向上，快到弦时尾巴碰到擒纵钮，顶杆被拨开，琴槌就脱离了推动，凭惯性飞向琴弦——否则琴槌会一直压在弦上把声音闷住。', explode: [0, 40, 60], stage: [0.36, 0.5] },
  { id: 'letoff', index: 4, name: '擒纵钮', en: 'Let-off Button', role: '决定脱开时机', material: '毛毡 / 木', description: '可调节的小螺钉，琴槌离弦约 2 mm 时让顶杆脱开。', explode: [0, 50, 0], stage: [0.2, 0.32] },
  { id: 'hammer', index: 5, name: '琴槌', en: 'Hammer', role: '击弦', material: '羊毛毡 / 枫木', description: '木芯外裹压紧的羊毛毡。它飞上去打一下弦就弹回来，落到止槌器上，等手松开再回到原位。毛毡越硬，音色越亮。', explode: [0, 70, 20], stage: [0.24, 0.38] },
  { id: 'damper', index: 6, name: '制音器', en: 'Damper', role: '止音', material: '毛毡', description: '平时压在弦上让它不响。按键时被抬起放开琴弦，松开琴键就落回去把声音掐断。踩右踏板会把所有制音器一起抬起来。', explode: [0, 60, 0], stage: [0.06, 0.18] },
  { id: 'string', index: 7, name: '琴弦', en: 'String', role: '发声', material: '高碳钢丝', description: '中音区每个音有三根绷得很紧的钢弦（合计拉力约 250 kgf），这里只画一根。', explode: [0, 90, 0], stage: [0, 0.1] },
  { id: 'frame', index: 8, name: '键床与托架', en: 'Keyframe & Rails', role: '支承', material: '木', description: '平衡轨、转击器托架、琴槌法兰托架都固定在它上面。', explode: [0, 0, 0], stage: [1, 1] },
];

const STEPS: StepDef[] = [
  {
    title: '钢琴击弦机', en: 'Grand Piano Action',
    body: '每个琴键后面都有一套这样的机构，约 90 个零件，这里简化成 8 个。按下琴键，琴槌飞起击弦，随即弹回——左栏显示每一刻在发生什么。',
    state: { explode: 0, section: false, running: true, select: 'jack', focus: null },
  },
  {
    title: '擒纵', en: 'Escapement',
    body: '盯住顶杆和擒纵钮：顶杆尾巴碰到擒纵钮的那一刻被拨开，琴槌从此不受推动，自己飞上去打弦。没有这一下，琴槌会闷在弦上发不出声。',
    state: { explode: 0, section: false, running: true, select: 'letoff', focus: 'escape' },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '拆下琴弦和制音器，取下擒纵钮和琴槌，卸下顶杆和转击器，最后抬起琴键。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
];

export const piano: MachineDef = level({
  id: 'piano',
  unit: 0.035,
  bounds: [[0, -30, -15], [480, 250, 15]],
  name: '钢琴击弦机',
  en: 'Grand Piano Action',
  subtitle: '装配体 · 单键 · 擒纵与重复',
  summary: '8 种零件 · 按键→击弦→擒纵→止音，会动',
  drawingNo: 'GW-GQ-00',
  scale: '1 : 2',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  guides: [{ stage: 'hammer', origin: [FLANGE[0], FLANGE[1], 0] }],
  centreLines: [[[BALANCE[0], -40, 0], [BALANCE[0], 30, 0]]],
  steps: STEPS,
  camera: { target: [270, 100, 0], offset: [70, 110, 1050], orthoDistance: 2400, exploded: { target: [200, 120, 20], scale: 1.4 }, foci: { escape: { target: [400, 90, 0], scale: 0.45 } } },
  Model: PianoAction,
  Driver: PianoDriver,
  Controls: PianoControls,
});
