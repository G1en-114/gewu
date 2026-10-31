import type { P3 } from './geo';

type Box = { c: P3; s: P3; r?: P3 };

/** Seat sizes: width, seat depth, back height (m). */
const SIZES = {
  pilot: [0.55, 0.55, 0.85],
  first: [0.75, 0.75, 0.85],
  business: [0.6, 0.6, 0.8],
  economy: [0.46, 0.45, 0.72],
} as const;

export type SeatKind = keyof typeof SIZES;

/** One seat facing +x (forward) at station x, lateral z, on a floor at height `floor`, as boxes. */
export function seat(kind: SeatKind, x: number, z: number, floor: number): Box[] {
  const [w, d, h] = SIZES[kind];
  const sit = floor + 0.44;
  const boxes: Box[] = [
    { c: [x, sit, z], s: [d, 0.1, w * 0.92] },
    { c: [x - d / 2 + 0.04, sit + h / 2 + 0.02, z], s: [0.09, h, w * 0.92], r: [0, 0, 0.12] },
    { c: [x, floor + 0.2, z], s: [d * 0.5, 0.4, w * 0.5] },
  ];
  if (kind !== 'economy') {
    for (const s of [-1, 1]) boxes.push({ c: [x - 0.02, sit + 0.16, z + s * (w / 2 - 0.03)], s: [d * 0.8, 0.06, 0.07] });
    boxes.push({ c: [x - d / 2 + 0.02, sit + h + 0.08, z], s: [0.1, 0.18, w * 0.5] });
  }
  return boxes;
}

/** A block of seat rows: rows from x0 aft at `pitch`, seats at the given lateral positions. */
export function seatRows(kind: SeatKind, x0: number, rows: number, pitch: number, zs: number[], floor: number, fits: (x: number, z: number) => boolean = () => true): Box[] {
  const out: Box[] = [];
  for (let i = 0; i < rows; i += 1) {
    const x = x0 - i * pitch;
    for (const z of zs) if (fits(x, z)) out.push(...seat(kind, x, z, floor));
  }
  return out;
}
