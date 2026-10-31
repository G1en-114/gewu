/**
 * The orrery's gear trains as data. The layshaft turns once per Earth year
 * (one turn of the crank); each planet's tube is driven from it by one pair
 * of gears whose tooth ratio gives that planet's orbital period. Saturn is too
 * slow for a single pair, so it takes a compound train off Jupiter's tube.
 */

export type Planet = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn';

/** Orbital (sidereal) periods in Earth years, for comparison. */
export const TRUE_PERIOD: Record<Planet, number> = {
  mercury: 0.2408, venus: 0.6152, earth: 1, mars: 1.8809, jupiter: 11.862, saturn: 29.457,
};

/** Layshaft gear → tube gear tooth counts. Saturn's entry is its compound train off Jupiter's tube. */
export const PAIRS: Record<Exclude<Planet, 'saturn'>, [number, number]> = {
  mercury: [83, 20],
  venus: [52, 32],
  earth: [40, 40],
  mars: [25, 47],
  jupiter: [7, 83],
};
/** Jupiter's tube (29) → second layshaft (72), and that layshaft (40) → Saturn's tube (40). */
export const SATURN_TRAIN: [[number, number], [number, number]] = [[29, 72], [40, 40]];

/** Turns of a planet's tube per turn of the layshaft (per year). */
export function turnsPerYear(p: Planet): number {
  if (p === 'saturn') {
    const [[a, b], [c, d]] = SATURN_TRAIN;
    return turnsPerYear('jupiter') * (a / b) * (c / d);
  }
  const [a, b] = PAIRS[p];
  return a / b;
}

export const periodOf = (p: Planet) => 1 / turnsPerYear(p);

/**
 * Tellurion on the Earth arm: a wheel fixed to the gearbox (99) meshes
 * directly with the Moon's gear (8) at the end of the arm. One mesh, so the
 * Moon turns the same way as the arm, once per synodic month relative to the
 * Sun–Earth line.
 */
export const MOON_TRAIN: [number, number] = [99, 8];
export const synodicMonthsPerYear = () => MOON_TRAIN[0] / MOON_TRAIN[1];
/** Synodic months in a year: 365.2422 / 29.5306. */
export const TRUE_SYNODIC_PER_YEAR = 365.2422 / 29.5306;

/** Centre distance between the central arbors and each layshaft (m). */
export const CENTRE_DISTANCE = 0.12;
/** Module (tooth size, m) that makes a pair of a and b teeth span the centre distance. */
export const moduleFor = (a: number, b: number, c = CENTRE_DISTANCE) => (2 * c) / (a + b);

/** The phase of the Moon for an angle (rad) from the Sun–Earth line: 0 new, π full. */
export function moonPhase(angle: number): string {
  const f = ((angle / (Math.PI * 2)) % 1 + 1) % 1;
  if (f < 0.0625 || f >= 0.9375) return '新月';
  if (f < 0.1875) return '娥眉月';
  if (f < 0.3125) return '上弦月';
  if (f < 0.4375) return '盈凸月';
  if (f < 0.5625) return '满月';
  if (f < 0.6875) return '亏凸月';
  if (f < 0.8125) return '下弦月';
  return '残月';
}
