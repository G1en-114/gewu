/**
 * The arithmetic of the 天工差分演算塔 (difference-engine tower), as pure
 * functions: nothing here knows about geometry or time on screen.
 *
 * Seven figure-wheel columns D0…D6 of eight decimal digits each hold a
 * polynomial and its differences. Like Babbage's Difference Engine No. 2 the
 * machine is pipelined: in the first half of every cycle the odd columns are
 * added into the even ones (D0 += D1, D2 += D3, D4 += D5), in the second half
 * the even into the odd (D1 += D2, D3 += D4, D5 += D6). For that to give the
 * right answer the columns start staggered: column k holds the k-th
 * difference taken ⌊k/2⌋ steps back.
 *
 * Every addition is done the way the wheels do it: each digit wheel is first
 * turned on by the digit of the column above it (a wheel that passes 9 → 0
 * trips its warning lever), then a spiral of carry arms sweeps up from the
 * units digit, adding one to every digit whose neighbour below tripped — or
 * that was standing at 9 when a carry ran into it. Negative numbers are
 * held as ten's complements, exactly as the wheels would hold them.
 */

export const DIGITS = 8;
export const COLUMNS = 7;
export const MOD = 10 ** DIGITS;

export interface Card {
  id: string;
  /** Name on the card and in the left column. */
  name: string;
  /** The formula, as printed on the card. */
  formula: string;
  /** f(n) for integer n (may be negative for the staggered set-up). */
  f: (n: number) => number;
  /** Degree of the polynomial (how many difference columns it needs). */
  degree: number;
  note: string;
}

/** The punched cards in the reader's chain: one polynomial each. */
export const CARDS: Card[] = [
  { id: 'euler', name: '素数式', formula: 'n² + n + 41', f: (n) => n * n + n + 41, degree: 2, note: '巴贝奇当年演示用的式子：n 从 0 到 39，算出来的全是素数。二阶差分恒为 2。' },
  { id: 'cubes', name: '立方', formula: 'n³', f: (n) => n ** 3, degree: 3, note: '三阶差分恒为 6；一阶、二阶差分每拍都在变。' },
  { id: 'pyramid', name: '平方和', formula: 'n(n+1)(2n+1) / 6', f: (n) => (n * (n + 1) * (2 * n + 1)) / 6, degree: 3, note: '1² + 2² + … + n²：一层层码起来的炮弹数。' },
  { id: 'sixth', name: '六次幂', formula: 'n⁶', f: (n) => n ** 6, degree: 6, note: '用满六阶差分：第六列恒为 720。n = 22 起超过八位，最高位溢出，整台机器照样转——这是它的量程。' },
  { id: 'shell', name: '弹道', formula: '5000000 + 98000n − 4900n²', f: (n) => 5000000 + 98000 * n - 4900 * n * n, degree: 2, note: '二阶差分是 −9800，轮上存成补码 99990200；加补码就是减法。n = 10 到顶，之后炮弹下落。' },
];

/** a mod 10⁸, always 0 … 10⁸ − 1 (negative numbers become ten's complements). */
export const wrap = (a: number) => ((a % MOD) + MOD) % MOD;

/** The eight digits of a wheel column, units first. */
export function digitsOf(value: number): number[] {
  let v = wrap(value);
  return Array.from({ length: DIGITS }, () => {
    const d = v % 10;
    v = Math.floor(v / 10);
    return d;
  });
}

export const valueOf = (digits: number[]) => digits.reduceRight((acc, d) => acc * 10 + d, 0);

/** Read a column as a signed number: the top half of the range stands for negatives. */
export const signed = (value: number) => (value >= MOD / 2 ? value - MOD : value);

const binom = (k: number, i: number) => {
  let r = 1;
  for (let j = 1; j <= i; j += 1) r = (r * (k - j + 1)) / j;
  return r;
};

/** The k-th forward difference of f at m. */
export function difference(f: (n: number) => number, k: number, m: number) {
  let sum = 0;
  for (let i = 0; i <= k; i += 1) sum += (k - i) % 2 === 0 ? binom(k, i) * f(m + i) : -binom(k, i) * f(m + i);
  return sum;
}

/** Column values to set from a card so that the pipelined engine starts at f(n0). */
export function initialColumns(card: Card, n0 = 0): number[] {
  return Array.from({ length: COLUMNS }, (_, k) => wrap(difference(card.f, k, n0 - Math.floor(k / 2))));
}

/** Which columns receive in each half-cycle: [receiver, giver]. */
export const HALF_PAIRS: Array<Array<[number, number]>> = [
  [[0, 1], [2, 3], [4, 5]],
  [[1, 2], [3, 4], [5, 6]],
];
export const isReceiver = (half: 0 | 1, col: number) => col < COLUMNS - 1 && col % 2 === half;

/** One wheel column's addition, digit by digit, as the mechanism does it. */
export interface Addition {
  before: number[];
  /** Digit added to each wheel by the adding sector (the giver's digit). */
  add: number[];
  /** After the sectors, before carrying. */
  afterAdd: number[];
  /** Warning levers tripped by a wheel passing 9 → 0 during the add. */
  warn: boolean[];
  /** Whether the carry arm at this digit adds one (from the digit below). */
  carryIn: boolean[];
  after: number[];
}

export function addColumn(receiver: number, giver: number): Addition {
  const before = digitsOf(receiver);
  const add = digitsOf(giver);
  const sum = before.map((d, j) => d + add[j]);
  const afterAdd = sum.map((s) => s % 10);
  const warn = sum.map((s) => s >= 10);
  const carryIn: boolean[] = [];
  const after: number[] = [];
  // The spiral sweeps up from the units: a carry runs into digit j if the
  // wheel below tripped its lever, or if it was at 9 and a carry ran into it.
  let rippling = false;
  for (let j = 0; j < DIGITS; j += 1) {
    const c: boolean = j > 0 && (warn[j - 1] || rippling);
    carryIn.push(c);
    after.push((afterAdd[j] + (c ? 1 : 0)) % 10);
    rippling = c && afterAdd[j] === 9;
  }
  return { before, add, afterAdd, warn, carryIn, after };
}

/** One half-cycle on the whole engine. */
export interface HalfStep {
  half: 0 | 1;
  before: number[];
  after: number[];
  /** Per column: its addition if it receives this half, else null. */
  additions: Array<Addition | null>;
}

export function halfStep(columns: number[], half: 0 | 1): HalfStep {
  const after = [...columns];
  const additions: Array<Addition | null> = columns.map(() => null);
  for (const [r, g] of HALF_PAIRS[half]) {
    // Givers are read before anything moves this half (they are never receivers in the same half).
    const a = addColumn(columns[r], columns[g]);
    additions[r] = a;
    after[r] = valueOf(a.after);
  }
  return { half, before: columns, after, additions };
}

/** One whole cycle: both halves. D0 then holds the next value of the table. */
export function cycle(columns: number[]): number[] {
  return halfStep(halfStep(columns, 0).after, 1).after;
}

// ── Timing: one turn of the main shaft is one cycle ────────────────────

/**
 * The cam drum's programme, as fractions of a half-cycle. In each half the
 * receiving columns are unlocked, the adding sectors swing the wheels on by
 * the giver's digits, the carry spiral sweeps the eight digits in turn
 * (units first), and the columns are locked again.
 */
export const HALF = {
  unlock: [0, 0.08] as const,
  add: [0.08, 0.46] as const,
  carry: [0.5, 0.9] as const,
  lock: [0.92, 1] as const,
};

/** The printer, as fractions of the whole cycle (it prints D0 after the first half has finished). */
export const PRINT = {
  set: [0.5, 0.6] as const,
  strike: [0.66, 0.78] as const,
  feed: [0.84, 0.98] as const,
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** Inverse of smooth on 0–1. */
export const unsmooth = (p: number) => 0.5 - Math.sin(Math.asin(1 - 2 * clamp01(p)) / 3);
export const within = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));
/** Rises over the first window, holds, falls over the second (0 outside). */
export const pulse = (t: number, rise: readonly [number, number], fall: readonly [number, number]) => smooth(within(t, rise)) * (1 - smooth(within(t, fall)));

/** Window of the carry sweep in which digit j is carried into. */
export function carrySlot(j: number): [number, number] {
  const [a, b] = HALF.carry;
  const w = (b - a) / DIGITS;
  return [a + j * w, a + (j + 1) * w];
}

/**
 * A wheel's reading (in digits, continuous) at time u (0–1) through its
 * half-cycle; the wheel's angle is −reading × 36°.
 */
export function wheelReading(a: Addition, j: number, u: number) {
  const added = a.add[j] * smooth(within(u, HALF.add));
  const carried = a.carryIn[j] ? smooth(within(u, carrySlot(j))) : 0;
  return a.before[j] + added + carried;
}

/** Whether digit j's warning lever stands tripped at time u: from the moment its wheel passes 9 until its carry is taken. */
export function warningUp(a: Addition, j: number, u: number) {
  if (!a.warn[j]) return 0;
  const tripAt = HALF.add[0] + unsmooth((10 - a.before[j]) / Math.max(1, a.add[j])) * (HALF.add[1] - HALF.add[0]);
  const rise = smooth((u - tripAt) / 0.04);
  const [, end] = carrySlot(Math.min(DIGITS - 1, j + 1));
  const reset = j + 1 < DIGITS ? smooth((u - end + 0.02) / 0.03) : smooth((u - HALF.carry[1]) / 0.04);
  return rise * (1 - reset);
}

/** Rotation of the carry spiral shaft through its half (one turn during the carry sweep). */
export const spiralTurn = (u: number) => within(u, HALF.carry);

/** Reduction gears between the crankshaft and the main vertical shaft. */
export const REDUCTION: [number, number] = [16, 96];
/** Crankshaft turns per main-shaft turn (per calculation cycle). */
export const ENGINE_RATIO = REDUCTION[1] / REDUCTION[0];

// ── The cam drum: one cam per controlled motion, all on the main shaft ─────

export interface CamDef {
  id: string;
  name: string;
  en: string;
  /** Lift (0–1) of the follower at fraction uc of the cycle. */
  lift: (uc: number) => number;
  what: string;
}

/** Map a window of a half-cycle into the whole cycle. */
const inHalf = (half: 0 | 1, [a, b]: readonly [number, number]): [number, number] => [(half + a) / 2, (half + b) / 2];

export const CAMS: CamDef[] = [
  { id: 'lock-a', name: '解锁凸轮 · 偶数列', en: 'Unlock A', lift: (t) => pulse(t, inHalf(0, HALF.unlock), inHalf(0, HALF.lock)), what: '前半拍整段抬起：拉开 D0、D2、D4 的锁定杆。' },
  { id: 'add-a', name: '加法凸轮 · 偶数列', en: 'Add A', lift: (t) => pulse(t, inHalf(0, HALF.unlock), inHalf(0, [0.46, 0.5])), what: '前半拍前段：探杆伸出、加法小齿轮啮合转动。' },
  { id: 'carry-a', name: '进位凸轮 · A 轴', en: 'Carry A', lift: (t) => pulse(t, inHalf(0, [0.46, 0.5]), inHalf(0, [0.9, 0.92])), what: '前半拍后段：接通进位离合器 A，A 轴带偶数列的螺旋转一圈。' },
  { id: 'lock-b', name: '解锁凸轮 · 奇数列', en: 'Unlock B', lift: (t) => pulse(t, inHalf(1, HALF.unlock), inHalf(1, HALF.lock)), what: '后半拍整段抬起：拉开 D1、D3、D5 的锁定杆。' },
  { id: 'add-b', name: '加法凸轮 · 奇数列', en: 'Add B', lift: (t) => pulse(t, inHalf(1, HALF.unlock), inHalf(1, [0.46, 0.5])), what: '后半拍前段：奇数列收数。' },
  { id: 'carry-b', name: '进位凸轮 · B 轴', en: 'Carry B', lift: (t) => pulse(t, inHalf(1, [0.46, 0.5]), inHalf(1, [0.9, 0.92])), what: '后半拍后段：接通离合器 B。' },
  { id: 'strike', name: '压印凸轮', en: 'Strike', lift: (t) => pulse(t, [PRINT.strike[0], (PRINT.strike[0] + PRINT.strike[1]) / 2], [(PRINT.strike[0] + PRINT.strike[1]) / 2, PRINT.strike[1]]), what: '字轮对好 f(n+1) 以后，一个尖峰：压印锤打一下。' },
  { id: 'feed', name: '进纸凸轮', en: 'Paper Feed', lift: (t) => smooth(within(t, PRINT.feed)) * (1 - smooth(within(t, [0.98, 1]))), what: '印完以后拨一下棘轮，纸带走一行。' },
];
