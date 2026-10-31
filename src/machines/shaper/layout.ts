/**
 * BC6063 牛头刨床 (horizontal shaping machine) — shared layout, millimetres.
 *
 * The machine is laid out in side-view planes: +x runs from the column (rear,
 * -x) toward the operator and the table (front, +x), +y is up, z is the
 * machine width with the mechanism plane at z = 0. The section plane z = 0
 * therefore cuts straight through the slotted-link (Whitworth) drive, the ram,
 * the table screw and the tool head.
 *
 * Public data (BC6063, 山东普机 / 通用规格):
 * shaping length 630 mm, table 650 × 450 mm, table cross travel 630 mm,
 * table vertical travel 360 mm, table surface to ram underside 6.5–370 mm,
 * tool-head vertical travel 120 mm, tool-head swivel ±60°,
 * ram strokes 14 / 20 / 28 / 40 / 56 / 80 per minute,
 * cross feed 0.33–3.33 mm per stroke, motor 3 kW,
 * overall 2280 × 1450 × 1750 mm, weight 1850 kg.
 */

export const SHA = {
  /** Bed casting: floor plate under the column and forward under the table. */
  bed: { x0: -1120, x1: 540, z: 430, top: 170 },
  /** Column box: rear wall, two side walls, front wall; hollow for the drive. */
  column: { x0: -1120, x1: -420, z: 380, wall: 60, top: 1450, front: -480 },
  /** Ram guide on top of the column. */
  guide: { x0: -1120, x1: -300, y0: 1450, y1: 1480, z: 320 },
  /** Ram: local x = 0 at the vertical slot that takes the rocker top block. */
  ram: { bottom: 1480, top: 1690, rear: -350, front: 900, halfZ: 110, cheek: 22 },
  /** Rocker pivot in machine coordinates. */
  pivot: { x: -700, y: 200 },
  /** Slotted-link drive: pivot to crank centre, rocker length, bull gear. */
  crank: { d: 440, l: 1385, pitchR: 200, teeth: 60, pinionTeeth: 18, pinionPitchR: 60 },
  /** Input pinion centre (machine coordinates). */
  pinion: { x: -860, y: 840 },
  table: { x0: -50, x1: 400, z: 325, top: 1200, thick: 70 },
  rail: { x0: -420, x1: 120, z: 430, y0: 1000, y1: 1130 },
  /** Cross-feed screw: axis along z, centre in the (x, y) plane. */
  screw: { x: 175, y: 1075, z: 470 },
  /** Tool-head mount: under the ram front end, local vertical downward. */
  tool: { x: 900, y: 1480 },
  /** Belt drive inside the column, on the left of the mechanism plane. */
  drive: { z: -60, motor: { x: -820, y: 330 }, motorR: 95, inputR: 140 },
  motor: { x: -820, y: 330, z0: -320, z1: -80, r: 120 },
} as const;

/** Crank radius that gives a stroke length (mm) for the slotted link. */
export function strokeToRadius(stroke: number): number {
  return (SHA.crank.d * stroke) / (2 * SHA.crank.l);
}

/** Stroke length (mm) of a crank radius. */
export function radiusToStroke(radius: number): number {
  return (2 * SHA.crank.l * radius) / SHA.crank.d;
}

/** Ram travel per tooth of the 24-tooth cross-feed ratchet. */
export const FEED_TEETH = 24;

/** Rocker angle for a crank angle: pin on the crank circle, link through the pivot. */
export function rockerPhi(crank: number, radius: number): number {
  return Math.atan2(radius * Math.cos(crank), SHA.crank.d + radius * Math.sin(crank));
}

/** Angles the cutting and return strokes take on the crank circle (radians). */
export function strokeArcs(radius: number) {
  const asin = Math.asin(Math.min(0.999, Math.max(0, radius / SHA.crank.d)));
  const cutting = Math.PI + 2 * asin;
  const returning = Math.PI - 2 * asin;
  return { asin, cutting, returning, start: Math.PI * 2 - asin };
}
