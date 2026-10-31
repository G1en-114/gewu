import { Part } from '../../scene/Part';
import { Callout } from '../../scene/Overlay';
import type { MachineDef, PartDef, StepDef } from '../types';
import { Box, Cyl, dome, Hoop, level, Pipe, Plate, roundRect, Rod, Turn, tube, XY_Z } from '../kit';
import { boxes, type P3 } from '../b747/geo';
import { PRINT, smooth, within } from './calc';
import { Boiler, boilerLevel } from './boiler';
import { camsLevel } from './cams';
import { cellLevel } from './cell';
import { columnLevel } from './column';
import { TowerControls } from './controls';
import { Core, coreLevel, CORE_H } from './core';
import { Engine, engineLevel } from './engine';
import { mainShaft, TowerDriver, tw } from './motion';
import { Printer, printerLevel } from './printer';
import { Program, programLevel } from './program';
import { archShape, Geo, rivetLine, SpinY, SpinZ } from './shared';

/**
 * 天工差分演算塔 — the studio's own steam-age fantasy: a difference engine
 * built as a tower. From the ground up: a fire-tube boiler, an inverted
 * compound steam engine, the program floor (cam drum and punched cards),
 * the calculating core of seven figure-wheel columns, and the printer; a
 * main vertical shaft carries the engine's turn up through every floor, and
 * a clock under the dome counts the printed lines. One turn of the main
 * shaft is one calculation cycle; every number on the wheels, the paper and
 * in the left column comes from the same arithmetic (calc.ts, tested).
 * +x right, y up, ground at y = 0, front +z; metres.
 */

const PLINTH = 0.35;
const COL = { x: 1.8, z: 1.3 };
/** Floor levels (top of each deck) and what stands on them. */
const FLOOR = { boiler: PLINTH, engine: 2.08, program: 3.68, core: 4.58, printer: 7.28, roof: 8.2 };
const DECKS = [2.0, 3.6, 4.5, 7.2];
const SHAFT: [number, number] = [-1.62, -0.15];
const CHIMNEY = { x: 1.09, z: -1.62, top: 10.6 };
const STAIR = { x: -2.35, z: 0.85, r: 0.5 };
const CLOCK = { y: 8.75, z: 1.42, r: 0.5 };
const TAU = Math.PI * 2;

const column = (x: number, z: number) => (
  <group key={`${x}:${z}`} position={[x, 0, z]}>
    <Turn
      k="tw-t-column"
      profile={[
        [0, PLINTH], [0.16, PLINTH], [0.16, PLINTH + 0.12], [0.11, PLINTH + 0.2],
        ...DECKS.flatMap((y): Array<[number, number]> => [[0.09, y - 0.25], [0.13, y - 0.1], [0.13, y + 0.1], [0.09, y + 0.2]]),
        [0.09, FLOOR.roof - 0.25], [0.15, FLOOR.roof - 0.08], [0.15, FLOOR.roof], [0, FLOOR.roof],
      ]}
      seg={8}
    />
  </group>
);

/** Ring beam round the tower at height y. */
const ringBeam = (y: number, k: string) => (
  <group key={k}>
    {[-1, 1].map((s) => <Box key={`z${s}`} c={[0, y, s * COL.z]} s={[2 * COL.x, 0.14, 0.12]} />)}
    {[-1, 1].map((s) => <Box key={`x${s}`} c={[s * COL.x, y, 0]} s={[0.12, 0.14, 2 * COL.z]} />)}
    <Geo g={rivetLine(`t-ring-${k}`, [-COL.x + 0.2, y, COL.z + 0.065], [COL.x - 0.2, y, COL.z + 0.065], 22, 0.022)} />
  </group>
);

/** Arched spandrels hanging under the ring beam at y, on all four faces. */
const arches = (y: number, h: number, k: string) => (
  <group key={k}>
    {[-1, 1].map((s) => (
      <Plate key={`z${s}`} k={`tw-t-arch-x-${h}`} shape={archShape(2 * COL.x - 0.2, h, 0.12)} depth={0.05} p={[0, y - h - 0.07, s * COL.z - 0.025]} r={XY_Z} />
    ))}
    {[-1, 1].map((s) => (
      <Plate key={`x${s}`} k={`tw-t-arch-z-${h}`} shape={archShape(2 * COL.z - 0.2, h, 0.12)} depth={0.05} p={[s * COL.x - 0.025, y - h - 0.07, 0]} r={[0, Math.PI / 2, 0]} />
    ))}
  </group>
);

/** Spiral stair: treads round a newel post, rising 0.2 m a step. */
const STEPS_N = Math.round((FLOOR.printer - PLINTH) / 0.2);
const treads = boxes('tw-t-treads', () => Array.from({ length: STEPS_N }, (_, i) => {
  const a = (i * TAU) / 14;
  const y = PLINTH + (i + 1) * 0.2;
  return { c: [Math.sin(a) * STAIR.r * 0.55, y, Math.cos(a) * STAIR.r * 0.55] as P3, s: [0.16, 0.035, STAIR.r * 0.9] as P3, r: [0, a, 0] as P3 };
}));
const RAIL: P3[] = Array.from({ length: STEPS_N + 1 }, (_, i) => {
  const a = (i * TAU) / 14;
  return [STAIR.x + Math.sin(a) * STAIR.r, PLINTH + i * 0.2 + 0.95, STAIR.z + Math.cos(a) * STAIR.r];
});

/** Lines printed, as the clock hand shows them: one turn per 60 lines. */
const clockHand = () => -TAU * ((tw.n + smooth(within(tw.uc, PRINT.feed))) / 60);

export function Tower() {
  return (
    <group>
      <Part id="plinth">
        <Box c={[-0.35, PLINTH / 2, 0.1]} s={[4.9, PLINTH, 3.3]} />
        {[0, 1, 2].map((i) => <Box key={i} c={[0, 0.06 + i * 0.1 - 0.06 + 0.05, 1.75 + 0.18 * (2 - i) / 2 + 0.1]} s={[1.6, 0.1 * (i + 1), 0.18 * (3 - i)]} />)}
        <Box c={[-0.35, 0.02, 0.1]} s={[5.1, 0.04, 3.5]} />
        <Callout id="plinth" p={[1.9, PLINTH, 1.6]} />
      </Part>

      <Part id="frame">
        {[[-COL.x, -COL.z], [COL.x, -COL.z], [-COL.x, COL.z], [COL.x, COL.z]].map(([x, z]) => column(x, z))}
        {DECKS.map((y) => ringBeam(y - 0.04, `d${y}`))}
        {ringBeam(FLOOR.roof - 0.07, 'roof')}
        {arches(FLOOR.engine - 0.08, 0.55, 'a1')}
        {arches(FLOOR.program - 0.08, 0.5, 'a2')}
        {arches(FLOOR.roof - 0.07, 0.6, 'a4')}
        {[-1, 1].map((s) => <Rod key={s} a={[s * COL.x, FLOOR.core + 0.2, -COL.z]} b={[-s * COL.x, FLOOR.printer - 0.3, -COL.z]} r={0.025} />)}
        <Callout id="frame" p={[COL.x, 5.8, COL.z]} />
      </Part>

      <Part id="decks">
        {DECKS.map((y, i) => (
          <Plate
            key={y}
            k={`tw-t-deck-${i}`}
            shape={roundRect(-COL.x + 0.06, -COL.z + 0.06, COL.x - 0.06, COL.z - 0.06, 0.02, i === 0 ? [[-0.95, 0.6, 0.07], [0.95, -0.25, 0.08], [SHAFT[0], -SHAFT[1], 0.05]] : [[SHAFT[0], -SHAFT[1], 0.05]])}
            depth={0.08}
            p={[0, y - 0.08, 0]}
            r={[-Math.PI / 2, 0, 0]}
          />
        ))}
        <Callout id="decks" p={[-1.4, DECKS[1], 1.2]} />
      </Part>

      <Part id="boiler">
        <group position={[0, FLOOR.boiler, -0.15]}><Boiler /></group>
        <Callout id="boiler" p={[-0.4, FLOOR.boiler + 1.3, 0.3]} />
      </Part>

      <Part id="engine">
        <group position={[0, FLOOR.engine, -0.15]}><Engine /></group>
        <Callout id="engine" p={[0.4, FLOOR.engine + 1.3, 0.2]} />
      </Part>

      <Part id="program">
        <group position={[0, FLOOR.program, 0]}><Program /></group>
        <Callout id="program" p={[0.6, FLOOR.program + 0.5, 0.2]} />
      </Part>

      <Part id="core">
        <group position={[0, FLOOR.core, 0]}><Core /></group>
        <Callout id="core" p={[0.2, FLOOR.core + 1.8, 0.2]} />
      </Part>

      <Part id="printer">
        <group position={[0, FLOOR.printer, 0]}><Printer /></group>
        <Callout id="printer" p={[0.3, FLOOR.printer + 0.7, 0.1]} />
      </Part>

      <Part id="main-shaft">
        <SpinY at={[SHAFT[0], 0, SHAFT[1]]} angle={() => -mainShaft()}>
          <Cyl c={[0, (2.95 + FLOOR.roof + 0.3) / 2, 0]} r={0.035} len={FLOOR.roof + 0.3 - 2.95} seg={12} />
          <Turn k="tw-t-shaft-bevel" profile={[[0.035, 0], [0.12, 0], [0.08, 0.07], [0.035, 0.07]]} p={[0, FLOOR.engine + 0.96 + 0.09, 0]} axis="-y" seg={32} />
          <Turn k="tw-t-shaft-bevel" profile={[[0.035, 0], [0.12, 0], [0.08, 0.07], [0.035, 0.07]]} p={[0, FLOOR.roof + 0.22, 0]} axis="-y" seg={32} />
        </SpinY>
        {[FLOOR.engine + 1.3, FLOOR.program + 0.6, FLOOR.core + 1.2, FLOOR.core + 2.3, FLOOR.printer + 0.5].map((y) => (
          <group key={y}>
            <Box c={[SHAFT[0] - 0.1, y, SHAFT[1]]} s={[0.36, 0.06, 0.1]} />
            <Turn k="tw-t-bearing" profile={[[0.035, -0.05], [0.07, -0.05], [0.07, 0.05], [0.035, 0.05]]} p={[SHAFT[0], y, SHAFT[1]]} seg={16} />
          </group>
        ))}
        <Callout id="main-shaft" p={[SHAFT[0], FLOOR.core + 2.6, SHAFT[1] + 0.05]} />
      </Part>

      <Part id="chimney">
        <Pipe k="tw-t-flue" pts={[[CHIMNEY.x, FLOOR.boiler + 1.5, -0.15], [CHIMNEY.x, FLOOR.boiler + 1.6, -0.6], [CHIMNEY.x, FLOOR.boiler + 1.55, -1.25], [CHIMNEY.x, FLOOR.boiler + 1.62, CHIMNEY.z]]} r={0.16} />
        <Turn
          k="tw-t-stack"
          profile={[[0.15, FLOOR.boiler + 1.45], [0.24, FLOOR.boiler + 1.45], [0.24, FLOOR.boiler + 1.75], [0.2, FLOOR.boiler + 1.85], [0.17, CHIMNEY.top - 0.7], [0.26, CHIMNEY.top - 0.3], [0.3, CHIMNEY.top], [0.27, CHIMNEY.top], [0.14, CHIMNEY.top - 0.6], [0.14, FLOOR.boiler + 1.85], [0.15, FLOOR.boiler + 1.75]]}
          p={[CHIMNEY.x, 0, CHIMNEY.z]}
          seg={28}
        />
        {[3, 4.6, 6.2, 7.8, 9.2].map((y) => (
          <group key={y}>
            <Turn k={`tw-t-band-${y}`} profile={[[0.19, y - 0.04], [0.215, y - 0.04], [0.215, y + 0.04], [0.19, y + 0.04]]} p={[CHIMNEY.x, 0, CHIMNEY.z]} seg={28} />
            {y < FLOOR.roof && <Box c={[CHIMNEY.x, y, (CHIMNEY.z - COL.z) / 2]} s={[0.05, 0.05, COL.z - CHIMNEY.z - 0.2]} />}
          </group>
        ))}
        <Callout id="chimney" p={[CHIMNEY.x + 0.25, 9.6, CHIMNEY.z]} />
      </Part>

      <Part id="steam-pipes">
        <Pipe k="tw-t-steamup" pts={[[-0.95, FLOOR.boiler + 1.7, -0.6], [-0.95, 2.04, -0.6], [-0.95, FLOOR.engine - 0.05, -0.6]]} r={0.04} />
        <Pipe k="tw-t-exhaust" pts={[[0.95, FLOOR.engine + 0.05, 0.25], [0.95, 1.95, 0.25], [1.0, 1.75, 0.15], [1.09, FLOOR.boiler + 1.28, -0.05]]} r={0.06} />
        <Callout id="steam-pipes" p={[-0.95, 2.1, -0.55]} />
      </Part>

      <Part id="stair">
        <group position={[STAIR.x, 0, STAIR.z]}>
          <Cyl c={[0, (PLINTH + FLOOR.printer + 1) / 2, 0]} r={0.06} len={FLOOR.printer + 1 - PLINTH} seg={12} />
          <Geo g={treads} />
        </group>
        <Pipe k="tw-t-rail" pts={RAIL} r={0.02} seg={6} />
        {RAIL.filter((_, i) => i % 3 === 0).map(([x, y, z], i) => <Rod key={i} a={[x, y - 0.95 + 0.04, z]} b={[x, y, z]} r={0.01} seg={6} />)}
        {[FLOOR.engine, FLOOR.program, FLOOR.printer].map((y) => <Box key={y} c={[(STAIR.x - COL.x) / 2 - 0.15, y - 0.04, STAIR.z]} s={[0.7, 0.06, 0.6]} />)}
        <Callout id="stair" p={[STAIR.x, 5, STAIR.z + 0.4]} />
      </Part>

      <Part id="dome">
        <Plate k="tw-t-cornice" shape={roundRect(-COL.x - 0.15, -COL.z - 0.15, COL.x + 0.15, COL.z + 0.15, 0.05)} depth={0.16} p={[0, FLOOR.roof, 0]} r={[-Math.PI / 2, 0, 0]} />
        <Turn k="tw-t-drum" profile={tube(1.25, FLOOR.roof + 0.16, FLOOR.roof + 0.7, 0.06)} seg={16} />
        <Turn k="tw-t-dome" profile={dome(1.3, FLOOR.roof + 0.7, 1.1, 0.06, 18)} seg={16} />
        <Turn k="tw-t-lantern" profile={[[0, FLOOR.roof + 1.75], [0.28, FLOOR.roof + 1.75], [0.28, FLOOR.roof + 2.15], [0.34, FLOOR.roof + 2.2], [0.1, FLOOR.roof + 2.45], [0.03, FLOOR.roof + 2.8], [0, FLOOR.roof + 2.8]]} seg={8} />
        {[0.25, 0.55, 0.8].map((f) => (
          <Hoop key={f} k={`tw-t-domering-${f}`} c={[0, FLOOR.roof + 0.7 + 1.1 * Math.sin(f * Math.PI / 2), 0]} R={1.3 * Math.cos(f * Math.PI / 2) + 0.01} r={0.025} seg={16} />
        ))}
        <Callout id="dome" p={[0.5, FLOOR.roof + 1.6, 0.6]} />
      </Part>

      <Part id="clock">
        <group position={[0, CLOCK.y, CLOCK.z]}>
          <Turn k="tw-t-clockface" profile={[[0, 0], [CLOCK.r, 0], [CLOCK.r, 0.04], [CLOCK.r - 0.04, 0.06], [0, 0.06]]} axis="z" seg={48} />
          <Geo g={boxes('tw-t-clockticks', () => Array.from({ length: 60 }, (_, i) => {
            const a = (i * TAU) / 60;
            const long = i % 5 === 0;
            const r = CLOCK.r - (long ? 0.08 : 0.06);
            return { c: [Math.sin(a) * r, Math.cos(a) * r, 0.065] as P3, s: [long ? 0.02 : 0.01, long ? 0.08 : 0.04, 0.01] as P3, r: [0, 0, -a] as P3 };
          }))} />
          <SpinZ at={[0, 0, 0.08]} angle={clockHand}>
            <Box c={[0, CLOCK.r * 0.38, 0]} s={[0.03, CLOCK.r * 0.8, 0.012]} />
            <Box c={[0, -0.06, 0]} s={[0.05, 0.14, 0.012]} />
          </SpinZ>
          <Cyl c={[0, 0, 0.09]} r={0.03} len={0.03} axis="z" seg={16} />
        </group>
        <Rod a={[SHAFT[0], FLOOR.roof + 0.25, SHAFT[1]]} b={[0, CLOCK.y, CLOCK.z - 0.05]} r={0.025} />
        <Callout id="clock" p={[0.3, CLOCK.y + 0.35, CLOCK.z + 0.06]} />
      </Part>

      <Part id="whistle">
        <group position={[1.25, FLOOR.roof + 0.16, -0.9]}>
          <Pipe k="tw-t-whistlepipe" pts={[[0, 0, 0], [0, 0.4, 0], [0, 0.6, 0.05]]} r={0.03} />
          <Turn k="tw-t-whistle" profile={[[0, 0.6], [0.07, 0.6], [0.07, 0.62], [0.06, 0.64], [0.06, 0.95], [0.08, 1.0], [0, 1.03]]} seg={20} />
          <Rod a={[0.06, 0.66, 0]} b={[0.25, 0.7, 0]} r={0.008} />
        </group>
        <Callout id="whistle" p={[1.3, FLOOR.roof + 1.1, -0.9]} />
      </Part>

      <Part id="console">
        <group position={[-1.25, FLOOR.engine, 0.95]}>
          <Box c={[0, 0.45, 0]} s={[0.5, 0.9, 0.3]} />
          <Box c={[0, 0.95, -0.05]} s={[0.55, 0.12, 0.35]} r={[-0.4, 0, 0]} />
          {[-0.12, 0.12].map((x) => (
            <group key={x}>
              <Turn k="tw-t-gauge" profile={[[0, 0], [0.08, 0], [0.08, 0.03], [0, 0.03]]} p={[x, 0.72, 0.15]} axis="z" seg={28} />
              <Box c={[x, 0.75, 0.185]} s={[0.006, 0.06, 0.006]} r={[0, 0, x * 4]} />
            </group>
          ))}
          {[-0.15, 0, 0.15].map((x, i) => (
            <group key={x} position={[x, 0.98, 0.05]} rotation={[0.3 + i * 0.15, 0, 0]}>
              <Rod a={[0, 0, 0]} b={[0, 0.3, 0]} r={0.01} />
              <Cyl c={[0, 0.32, 0]} r={0.022} len={0.05} seg={12} />
            </group>
          ))}
        </group>
        <Callout id="console" p={[-1.25, FLOOR.engine + 1.25, 1.0]} />
      </Part>
    </group>
  );
}

const sub = (id: string, index: number, name: string, en: string, role: string, description: string, explode: P3, deep: P3, stage: [number, number]): PartDef => ({
  id, index, name, en, role, material: '—', description, explode, deep, stage,
});

const PARTS: PartDef[] = [
  { id: 'plinth', index: 1, name: '石砌塔基', en: 'Stone Plinth', role: '承重 · 隔潮', material: '花岗岩', description: '整座塔约 60 吨，压在 4.9 m × 3.3 m 的花岗岩基座上。正面三级台阶通锅炉房。', explode: [0, 0, 0], stage: [1, 1] },
  { id: 'frame', index: 2, name: '铸铁塔架', en: 'Cast-Iron Frame', role: '四柱 · 圈梁 · 拱券', material: '铸铁', description: '四根八棱铸铁柱高 7.8 m，每层楼板处一道铆接圈梁，梁下挂着镂空拱券——维多利亚时代火车站的做法。四面不封墙，好让人从外面看见机器。', explode: [0, 0, -2.6], stage: [0.88, 1] },
  { id: 'decks', index: 3, name: '楼板 ×4', en: 'Decks', role: '分出五层', material: '铸铁花纹板', description: '四块铸铁楼板把塔分成锅炉房、动力层、程序层、计算核心和印字层。主竖轴、汽管和拉杆从板上的孔里穿过。', explode: [0, 0, -2.6], stage: [0.86, 0.98] },
  sub('boiler', 4, '锅炉房', 'Boiler House', '产生蒸汽', '机车式火管锅炉，汽压 4–8 bar。点“拆开此组件”进去看火箱、火管、安全阀和给水泵。', [1.6, 0, 3.0], [-4.2, 0, 2.2], [0.68, 0.82]),
  sub('engine', 5, '动力层', 'Engine Floor', '蒸汽 → 转动', '倒立式双胀蒸汽机，曲轴转 6 圈主竖轴转 1 圈。点“拆开此组件”看汽缸、配汽机构和调速器。', [-1.6, 0, 2.8], [4.2, -0.4, 2.0], [0.6, 0.74]),
  sub('program', 6, '程序层', 'Program Floor', '安排每一拍', '凸轮鼓与打孔卡。点“拆开此组件”进去，凸轮鼓还能再拆一级。', [1.8, 0, 3.4], [-4.4, -1.2, 1.4], [0.5, 0.64]),
  sub('core', 7, '计算核心', 'Calculating Core', '七列 × 八位', '七列数字柱做差分加法。这一支最深：计算核心 → 数字柱 → 加法单元，一共四级。', [0, 0.5, 3.6], [4.4, -1.6, 1.2], [0.4, 0.54]),
  sub('printer', 8, '印字层', 'Printer', '把结果印出来', '八个字轮、压印锤、纸带。点“拆开此组件”看纸上印出来的数。', [-1.2, 1.4, 2.8], [-3.6, -3.6, 2.4], [0.3, 0.44]),
  { id: 'main-shaft', index: 9, name: '主竖轴', en: 'Main Vertical Shaft', role: '一圈 = 一行', material: '锻钢', description: '贯穿全塔的 Ø70 mm 钢轴：底端由动力层的大齿轮经锥齿轮带动，经过程序层时带动凸轮鼓，顶上带动计行大钟。它转一圈，机器就算完、印完一行。', explode: [-1.4, 0, 0], stage: [0.74, 0.88] },
  { id: 'chimney', index: 10, name: '烟囱', en: 'Chimney', role: '抽风 · 排烟', material: '铆接钢板', description: '烟道从锅炉烟箱出来，拐到塔后面，再沿外墙直上 10.6 m，顶上一圈喇叭形冠饰。动力层的乏汽也从这里喷出，喷得越猛抽风越强。', explode: [0, 0, -1.8], stage: [0.12, 0.26] },
  { id: 'steam-pipes', index: 11, name: '蒸汽管网', en: 'Steam Pipes', role: '上汽 · 排汽', material: '紫铜管', description: '一根主汽管把锅炉汽包里的蒸汽送上动力层；一根排汽管把低压缸的乏汽送回烟箱喷出。', explode: [0.8, 0, 1.2], stage: [0.2, 0.32] },
  { id: 'stair', index: 12, name: '外旋梯', en: 'Spiral Stair', role: '上下各层', material: '铸铁', description: '塔外左前角的铸铁旋梯，每级 200 mm，一直通到印字层；每层楼都有一块平台伸进塔里。', explode: [-1.8, 0, 0.6], stage: [0.04, 0.16] },
  { id: 'dome', index: 13, name: '穹顶与灯笼亭', en: 'Dome & Lantern', role: '遮雨 · 采光', material: '铆接铁皮 · 玻璃', description: '八角鼓座上一个铆接铁皮穹顶，顶上灯笼亭开窗采光、排出印字层的热气。', explode: [0, 3.0, 0], stage: [0, 0.12] },
  { id: 'clock', index: 14, name: '计行大钟', en: 'Line Clock', role: '每圈 60 行', material: '黄铜 · 搪瓷', description: '穹顶正面的大钟不报时，报“行”：主竖轴顶端经拉杆带动指针，每印一行走一小格，一圈 60 行。', explode: [0, 1.6, 1.8], stage: [0.06, 0.18] },
  { id: 'whistle', index: 15, name: '汽笛', en: 'Steam Whistle', role: '开机 · 报警', material: '黄铜', description: '屋顶上的钟形汽笛：开机时长鸣一声，汽压过高时由安全阀联动短鸣。', explode: [0.6, 3.4, -0.4], stage: [0, 0.1] },
  { id: 'console', index: 16, name: '操纵台', en: 'Control Stand', role: '司机在这里', material: '铸铁 · 黄铜', description: '动力层前角的操纵台：两块表看汽压和转速，三根手柄管节流阀、换向和启停离合。', explode: [-0.6, 0, 1.8], stage: [0.16, 0.3] },
];

const STEPS: StepDef[] = [
  {
    title: '天工差分演算塔', en: 'Difference-Engine Tower',
    body: '一座蒸汽驱动的差分机，竖着造成七层的塔：锅炉烧出蒸汽，蒸汽机转动主竖轴，程序层的凸轮鼓安排每一拍，计算核心七列数字轮做差分加法，印字层把结果印上纸。主竖轴转一圈就是一行。左栏换多项式、换汽压；表格和纸带上的数字就是数字轮上的真实读数。',
    state: { explode: 0, section: false, running: true, select: 'core', focus: null },
  },
  {
    title: '剖视', en: 'Section',
    body: '沿中线剖开整座塔：从下往上看火箱和火管、两个活塞、凸轮鼓、七列数字轮和字轮。所有运动都来自同一根主竖轴。',
    state: { explode: 0, section: true, running: true, select: 'main-shaft', focus: null },
  },
  {
    title: '计算核心', en: 'Calculating Core',
    body: '镜头推近计算核心：前半拍 D1、D3、D5 加进 D0、D2、D4，后半拍 D2、D4、D6 加进 D1、D3、D5；每次加完，后面的螺旋轴转一圈完成进位。',
    state: { explode: 0, section: false, running: true, select: 'core', focus: 'core' },
  },
  {
    title: '拆开', en: 'Teardown',
    body: '先揭穹顶、拆汽笛和大钟，拆旋梯、烟囱和管网，再把印字层、计算核心、程序层、动力层、锅炉房一层层拉出来，最后是塔架和塔基。',
    state: { explode: 1, section: false, running: false, select: null, focus: null },
  },
  {
    title: '逐级深入', en: 'Drill Down',
    body: '五个功能层都能再拆开：选中后点“拆开此组件”。最深的一支是 计算核心 → 数字柱 → 加法单元，共四级；或者打开“全部展开”，所有层级同时拆开排在旁边。',
    state: { explode: 1, section: false, running: false, select: 'core', focus: null },
  },
];

export const tower: MachineDef = level({
  id: 'tower',
  unit: 1.05,
  bounds: [[-2.85, 0, -1.85], [2.1, CHIMNEY.top, 1.95]],
  name: '天工差分演算塔',
  en: 'Difference-Engine Tower',
  subtitle: '原创幻想 · 蒸汽驱动的差分机 · 七层 · 四级可拆',
  summary: '16 个大件 · 蒸汽驱动、真的在算多项式表，可一路拆到一位数字的加法单元',
  drawingNo: 'GW-TG-00',
  scale: '1 : 50',
  parts: PARTS,
  boltSets: {},
  neighbours: {},
  children: { boiler: 'tower/boiler', engine: 'tower/engine', program: 'tower/program', core: 'tower/core', printer: 'tower/printer' },
  guides: [{ stage: 'dome', origin: [0, FLOOR.roof + 0.5, 0] }, { stage: 'core', origin: [0, FLOOR.core + 1.2, 0] }],
  centreLines: [[[SHAFT[0], 2.8, SHAFT[1]], [SHAFT[0], FLOOR.roof + 0.4, SHAFT[1]], 0.035], [[0, FLOOR.roof, 0], [0, FLOOR.roof + 3, 0], 1.25]],
  steps: STEPS,
  camera: {
    target: [-0.2, 5.0, 0],
    offset: [11.5, 7.2, 23.5],
    orthoDistance: 30,
    exploded: { target: [-0.2, 5.8, 1.6], scale: 1.5 },
    deep: { target: [0, 4.8, 1.8], scale: 1.9 },
    foci: { core: { target: [0, FLOOR.core + CORE_H / 2, 0], scale: 0.4 } },
  },
  Model: Tower,
  Driver: TowerDriver,
  Controls: TowerControls,
});

export const TOWER_LEVELS: MachineDef[] = [boilerLevel, engineLevel, programLevel, camsLevel, coreLevel, columnLevel, cellLevel, printerLevel];
