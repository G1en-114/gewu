import { describe, expect, it } from 'vitest';
import { diameter } from './aperture';
import { crossheadX } from './engine/kinematics';
import { ENGINE } from './engine/data';
import { RATIO } from './gearbox';
import { genevaState } from './geneva';
import { wheelAngle } from './steering';
import { DRILL, drillFeedTravel, MOTOR_RADII, SPEEDS, SPINDLE_RADII } from './drill';
import { SHA, radiusToStroke, rockerPhi, strokeArcs, strokeToRadius } from './shaper/layout';
import { addColumn, CAMS, CARDS, cycle, DIGITS, ENGINE_RATIO, HALF, HALF_PAIRS, halfStep, initialColumns, isReceiver, MOD, signed, valueOf, warningUp, wheelReading, wrap } from './tower/calc';
import { CENTRE_DISTANCE, moduleFor, moonPhase, PAIRS, periodOf, synodicMonthsPerYear, TRUE_PERIOD, TRUE_SYNODIC_PER_YEAR } from './orrery/train';

describe('蒸汽机 · 曲柄连杆', () => {
  it('十字头行程等于两倍曲柄半径', () => {
    const xs = Array.from({ length: 721 }, (_, i) => crossheadX((i / 720) * Math.PI * 2));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2 * ENGINE.crankRadius, 6);
  });
});

describe('转向系统 · 阿克曼梯形', () => {
  // Kingpins at z = ±0.72 m, wheelbase 2.6 m (src/machines/steering).
  const TRACK = 1.44;
  const WHEELBASE = 2.6;

  it('齿条居中时两轮都朝正前方', () => {
    expect(wheelAngle(1, 0)).toBeCloseTo(0, 4);
    expect(wheelAngle(-1, 0)).toBeCloseTo(0, 4);
  });

  it('左右对称', () => {
    for (const s of [0.02, 0.04, 0.06]) expect(wheelAngle(1, s)).toBeCloseTo(-wheelAngle(-1, -s), 6);
  });

  it('两轮同向转，内侧轮转得更多，偏向阿克曼理想值', () => {
    for (const s of [0.01, 0.03, 0.06]) {
      const a = wheelAngle(1, s);
      const b = wheelAngle(-1, s);
      expect(Math.sign(a)).toBe(Math.sign(b));
      const inner = Math.max(Math.abs(a), Math.abs(b));
      const outer = Math.min(Math.abs(a), Math.abs(b));
      expect(inner).toBeGreaterThan(outer);
      // Ideal Ackermann: cot(outer) − cot(inner) = track / wheelbase. A trapezoid
      // linkage only approximates it (the panel shows the gap), so ask for the
      // right direction and a sizeable share of the ideal correction.
      const share = (1 / Math.tan(outer) - 1 / Math.tan(inner)) / (TRACK / WHEELBASE);
      expect(share).toBeGreaterThan(0.5);
      expect(share).toBeLessThan(1.1);
    }
  });
});

describe('槽轮机构', () => {
  it('拨盘转一圈，槽轮转 90°', () => {
    for (const T of [-2, 0.3, 1.7]) {
      expect(genevaState(T + Math.PI * 2).wheel - genevaState(T).wheel).toBeCloseTo(-Math.PI / 2, 6);
    }
  });

  it('锁止时槽轮不动，转位时连续无跳变', () => {
    const N = 4000;
    let prev = genevaState(-Math.PI);
    for (let i = 1; i <= N; i += 1) {
      const cur = genevaState(-Math.PI + (i / N) * Math.PI * 2);
      if (!cur.moving && !prev.moving) expect(cur.wheel).toBeCloseTo(prev.wheel, 9);
      expect(Math.abs(cur.wheel - prev.wheel)).toBeLessThan(0.01);
      prev = cur;
    }
  });
});

describe('手动变速箱 · 速比', () => {
  // The panel shows input : output, i.e. 1 / RATIO.
  const shown = (g: keyof typeof RATIO) => 1 / RATIO[g];

  it('与说明一致：1 档 3.59，5 档 0.80，4 档直接档', () => {
    expect(shown('1')).toBeCloseTo(3.59, 2);
    expect(shown('4')).toBe(1);
    expect(shown('5')).toBeCloseTo(0.8, 2);
  });

  it('1–5 档速比依次减小，倒档反转，空档不出力', () => {
    const forward = (['1', '2', '3', '4', '5'] as const).map(shown);
    forward.slice(1).forEach((r, i) => expect(r).toBeLessThan(forward[i]));
    expect(RATIO.R).toBeLessThan(0);
    expect(RATIO.N).toBe(0);
  });
});

describe('镜头光圈', () => {
  const f = (k: number) => 50 / diameter(k);

  it('孔径随收拢单调变小', () => {
    for (let k = 0; k < 1; k += 0.05) expect(diameter(k + 0.05)).toBeLessThan(diameter(k));
  });

  it('全开约 f/2，收到底约 f/16', () => {
    expect(f(0)).toBeGreaterThan(1.8);
    expect(f(0)).toBeLessThan(2.2);
    expect(f(1)).toBeGreaterThan(14);
    expect(f(1)).toBeLessThan(18);
  });
});

describe('太阳系仪 · 齿轮比', () => {
  const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn'] as const;

  it('每颗行星的周期与真实公转周期相差不到 0.5%', () => {
    for (const p of planets) expect(Math.abs(periodOf(p) - TRUE_PERIOD[p]) / TRUE_PERIOD[p]).toBeLessThan(0.005);
  });

  it('月球每年 12.375 个朔望月，与真实值相差不到 0.1%', () => {
    expect(Math.abs(synodicMonthsPerYear() - TRUE_SYNODIC_PER_YEAR) / TRUE_SYNODIC_PER_YEAR).toBeLessThan(0.001);
  });

  it('每对齿轮按各自模数正好跨过同一个中心距', () => {
    for (const [a, b] of Object.values(PAIRS)) expect(((a + b) * moduleFor(a, b)) / 2).toBeCloseTo(CENTRE_DISTANCE, 9);
  });

  it('月相：0 新月，π 满月，π/2 上弦', () => {
    expect(moonPhase(0)).toBe('新月');
    expect(moonPhase(Math.PI)).toBe('满月');
    expect(moonPhase(Math.PI / 2)).toBe('上弦月');
    expect(moonPhase(-Math.PI / 2)).toBe('下弦月');
  });
});

describe('台式钻床 · 五级塔轮与进给', () => {
  it('五档转速从 365 到 3150 r/min，与公开规格一致', () => {
    expect(SPEEDS[0]).toBe(365);
    expect(SPEEDS[SPEEDS.length - 1]).toBe(3150);
    expect(DRILL.travel).toBe(125);
  });

  it('每档的塔轮半径比按电机 1400 r/min 正好给出该档转速', () => {
    SPEEDS.forEach((rpm, i) => {
      expect((DRILL.motorRpm * MOTOR_RADII[i]) / SPINDLE_RADII[i]).toBeCloseTo(rpm, 6);
    });
  });

  it('配对塔轮半径之和不变，所以换挡不用换皮带长度', () => {
    const sums = MOTOR_RADII.map((r, i) => r + SPINDLE_RADII[i]);
    sums.forEach((sum) => expect(sum).toBeCloseTo(sums[0], 9));
  });

  it('进给行程 0–125 mm，回程不越过两端', () => {
    expect(drillFeedTravel(0)).toBe(0);
    expect(drillFeedTravel(3.8)).toBeCloseTo(DRILL.travel, 6);
    expect(drillFeedTravel(6.9)).toBeCloseTo(0, 6);
    for (let i = 0; i <= 700; i += 1) {
      const s = drillFeedTravel((i / 100) * 7);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(DRILL.travel + 1e-9);
    }
  });
});

describe('牛头刨床 · 摆杆机构', () => {
  it('行程调到 630 mm 后，曲柄半径与行程能互相回算', () => {
    const radius = strokeToRadius(630);
    expect(radiusToStroke(radius)).toBeCloseTo(630, 6);
    expect(strokeToRadius(630)).toBeLessThan(SHA.crank.pitchR);
  });

  it('曲柄转一圈，摆杆上端带着滑枕走完设定行程', () => {
    const radius = strokeToRadius(630);
    const xs = Array.from({ length: 1441 }, (_, i) => SHA.crank.l * Math.sin(rockerPhi((i / 1440) * Math.PI * 2, radius)));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(630, 2);
  });

  it('切削行程比返回行程长：急回特性', () => {
    const arcs = strokeArcs(strokeToRadius(630));
    expect(arcs.cutting + arcs.returning).toBeCloseTo(Math.PI * 2, 9);
    expect(arcs.cutting / arcs.returning).toBeGreaterThan(1.25);
    expect(arcs.cutting / arcs.returning).toBeLessThan(1.55);
  });
});

describe('差分演算塔 · 运算', () => {
  it('每张卡片：流水线跑 40 拍，D0 每拍都等于 f(n)（八位，补码）', () => {
    for (const card of CARDS) {
      let cols = initialColumns(card);
      expect(cols[0]).toBe(wrap(card.f(0)));
      for (let n = 1; n <= 40; n += 1) {
        cols = cycle(cols);
        expect(cols[0]).toBe(wrap(card.f(n)));
      }
    }
  });

  it('逐位加法 + 螺旋进位与整数加法一致（含连续进位 99999999 + 1）', () => {
    const cases: Array<[number, number]> = [[99999999, 1], [12345678, 87654322], [50000000, 50000000], [9, 1], [19999990, 10], [0, 0]];
    for (let i = 0; i < 200; i += 1) cases.push([Math.floor(Math.random() * MOD), Math.floor(Math.random() * MOD)]);
    for (const [a, b] of cases) expect(valueOf(addColumn(a, b).after)).toBe((a + b) % MOD);
    const ripple = addColumn(99999999, 1);
    expect(ripple.warn.filter(Boolean)).toHaveLength(1);
    expect(ripple.carryIn.filter(Boolean)).toHaveLength(7);
  });

  it('负数存成补码：弹道卡的二阶差分是 −9800', () => {
    const cols = initialColumns(CARDS.find((c) => c.id === 'shell')!);
    expect(cols[2]).toBe(MOD - 9800);
    expect(signed(cols[2])).toBe(-9800);
  });

  it('六次幂卡：第六列恒为 720，二拍之内不被改写', () => {
    let cols = initialColumns(CARDS.find((c) => c.id === 'sixth')!);
    for (let n = 0; n < 10; n += 1) {
      expect(cols[6]).toBe(720);
      cols = cycle(cols);
    }
  });

  it('前半拍偶数列收、后半拍奇数列收；给数的列在同一半拍里不动', () => {
    const step = halfStep(initialColumns(CARDS[1]), 0);
    step.additions.forEach((a, c) => expect(a !== null).toBe(isReceiver(0, c)));
    for (const [, g] of HALF_PAIRS[0]) expect(step.after[g]).toBe(step.before[g]);
  });

  it('数字轮读数：加法结束时等于加完的数字，进位窗口结束时等于结果', () => {
    const a = addColumn(19999990, 10);
    for (let j = 0; j < DIGITS; j += 1) {
      expect(wheelReading(a, j, HALF.add[1]) % 10).toBeCloseTo(a.afterAdd[j], 9);
      expect(wheelReading(a, j, 1) % 10).toBeCloseTo(a.after[j], 9);
    }
  });

  it('警示杆在数字轮越过 9 → 0 的那一刻抬起，进位取走后落下', () => {
    const a = addColumn(7, 5);
    expect(warningUp(a, 0, HALF.add[0])).toBe(0);
    expect(warningUp(a, 0, HALF.carry[0])).toBeCloseTo(1, 6);
    expect(warningUp(a, 0, 1)).toBe(0);
    expect(warningUp(a, 1, HALF.carry[0])).toBe(0);
  });

  it('减速齿轮 16 / 96：曲轴转六圈，主竖轴转一圈 = 算一行', () => {
    expect(ENGINE_RATIO).toBe(6);
  });
});

describe('差分演算塔 · 凸轮鼓', () => {
  it('解锁凸轮抬起的区间覆盖了加法和进位，两组凸轮前后半拍互不重叠', () => {
    const a = CAMS.find((c) => c.id === 'lock-a')!;
    const b = CAMS.find((c) => c.id === 'lock-b')!;
    for (let i = 0; i <= 1000; i += 1) {
      const t = i / 1000;
      expect(Math.min(a.lift(t), b.lift(t))).toBeLessThan(1e-9);
    }
    expect(a.lift(0.15)).toBeCloseTo(1, 6);
    expect(a.lift(0.35)).toBeCloseTo(1, 6);
    expect(b.lift(0.65)).toBeCloseTo(1, 6);
  });

  it('压印在字轮对好之后、进纸之前', () => {
    const strike = CAMS.find((c) => c.id === 'strike')!;
    const peak = Array.from({ length: 1001 }, (_, i) => i / 1000).reduce((best, t) => (strike.lift(t) > strike.lift(best) ? t : best), 0);
    expect(peak).toBeGreaterThan(0.6);
    expect(peak).toBeLessThan(0.84);
  });
});
