import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { box, cyl, extrude, lathe } from '../../scene/geometry';
import { M, Part } from '../../scene/Part';
import { HALF_PI } from '../../scene/parts';
import { Callout } from '../../scene/Overlay';
import { boltSetDef, stageProgress } from '../../scene/explode';
import type { Vec3 } from '../types';
import { at, PENTALOBES, PHONE, SCREWS, X } from './data';

const S = 0.1;
const { width: W, length: L, thickness: T, corner: R, wall, back, plateau } = PHONE;
const [CU, CV] = PHONE.centre;
const [MID0, MID1] = PHONE.midplate;
/** Shape-plane coordinate for a drawing u. */
const SU = (u: number) => (u - CU) * S;

/** Shapes drawn in (X(v), SU(u)) and extruded up through the thickness. */
const FLAT: Vec3 = [-HALF_PI, 0, 0];
/** Shapes drawn in (SU(u), y) and extruded toward the bottom end (+x). */
const EDGE: Vec3 = [0, HALF_PI, 0];

/** u0, u1, v0, v1 and an optional corner radius, all in mm. */
type Rect = [number, number, number, number, number?];
/** u, v, radius in mm. */
type Circle = readonly [number, number, number];
type Range = [number, number];

function roundRect<P extends THREE.Path>(path: P, x0: number, x1: number, y0: number, y1: number, r: number): P {
  if (r <= 0) {
    path.moveTo(x0, y0);
    path.lineTo(x1, y0);
    path.lineTo(x1, y1);
    path.lineTo(x0, y1);
    path.lineTo(x0, y0);
    return path;
  }
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0);
  path.absarc(x1 - r, y0 + r, r, -HALF_PI, 0, false);
  path.lineTo(x1, y1 - r);
  path.absarc(x1 - r, y1 - r, r, 0, HALF_PI, false);
  path.lineTo(x0 + r, y1);
  path.absarc(x0 + r, y1 - r, r, HALF_PI, Math.PI, false);
  path.lineTo(x0, y0 + r);
  path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

function stadium<P extends THREE.Path>(path: P, cx: number, cy: number, w: number, h: number): P {
  const r = h / 2;
  path.moveTo(cx - w / 2 + r, cy - r);
  path.lineTo(cx + w / 2 - r, cy - r);
  path.absarc(cx + w / 2 - r, cy, r, -HALF_PI, HALF_PI, false);
  path.lineTo(cx - w / 2 + r, cy + r);
  path.absarc(cx - w / 2 + r, cy, r, HALF_PI, Math.PI * 1.5, false);
  return path;
}

const planRect = <P extends THREE.Path>(path: P, [u0, u1, v0, v1, r = 0]: Rect) => roundRect(path, X(v0), X(v1), SU(u0), SU(u1), r * S);

/** Outline in plan with rectangular and round holes. */
function plan(outer: Rect | Array<[number, number]>, holes: Rect[] = [], circles: readonly Circle[] = []) {
  return () => {
    let s: THREE.Shape;
    if (Array.isArray(outer[0])) {
      const pts = outer as Array<[number, number]>;
      s = new THREE.Shape();
      s.moveTo(X(pts[0][1]), SU(pts[0][0]));
      pts.slice(1).forEach(([u, v]) => s.lineTo(X(v), SU(u)));
      s.closePath();
    } else {
      s = planRect(new THREE.Shape(), outer as Rect);
    }
    holes.forEach((h) => s.holes.push(planRect(new THREE.Path(), h)));
    circles.forEach(([u, v, r]) => {
      const p = new THREE.Path();
      p.absarc(X(v), SU(u), r * S, 0, Math.PI * 2, true);
      s.holes.push(p);
    });
    return s;
  };
}

/** Plate in plan between heights y (mm). */
function Slab({ k, outer, holes, circles, y }: { k: string; outer: Rect | Array<[number, number]>; holes?: Rect[]; circles?: readonly Circle[]; y: Range }) {
  return <M clip geo={extrude(`ph-${k}`, plan(outer, holes, circles), (y[1] - y[0]) * S)} p={[0, y[0] * S, 0]} r={FLAT} />;
}

/** Square-cornered block. */
function Blk({ u, v, y }: { u: Range; v: Range; y: Range }) {
  return <M clip geo={box((v[1] - v[0]) * S, (y[1] - y[0]) * S, (u[1] - u[0]) * S)} p={at((u[0] + u[1]) / 2, (v[0] + v[1]) / 2, (y[0] + y[1]) / 2)} />;
}

/** Upright cylinder. */
function Post({ c: [u, v], r, y, seg = 32 }: { c: readonly [number, number]; r: number; y: Range; seg?: number }) {
  return <M clip geo={cyl(r * S, r * S, (y[1] - y[0]) * S, seg)} p={at(u, v, (y[0] + y[1]) / 2)} />;
}

/** Profile in mm → lathe in cm. */
const latheMm = (key: string, profile: Array<[number, number]>, seg = 64) => lathe(`ph-${key}`, profile.map(([r, y]) => [r * S, y * S]), seg);

/**
 * A small machine screw seated at (u, v, y), head on the seat. It backs out
 * along its axis in its set's window of the teardown, then rides with the owner.
 */
function Screw({ seat: [u, v, y], set, axis = 'up' }: { seat: readonly [number, number, number]; set: string; axis?: 'up' | 'down' | 'out' }) {
  const out = useRef<THREE.Group>(null);
  useFrame(() => {
    const def = boltSetDef(set);
    if (def && out.current) out.current.position.y = def.distance * stageProgress(set);
  });
  const rotation: Vec3 = axis === 'down' ? [Math.PI, 0, 0] : axis === 'out' ? [0, 0, -HALF_PI] : [0, 0, 0];
  return (
    <group position={at(u, v, y)} rotation={rotation}>
      <group ref={out}>
        <M clip geo={cyl(0.07, 0.07, 0.03, 20)} p={[0, 0.015, 0]} />
        <M clip geo={cyl(0.03, 0.03, 0.13, 10)} p={[0, -0.065, 0]} />
      </group>
    </group>
  );
}

const Screws = ({ set, axis }: { set: string; axis?: 'up' | 'down' }) => (
  <>{SCREWS[set].map((seat, i) => <Screw key={i} seat={seat} set={set} axis={axis} />)}</>
);

/** Glass panels sit just inside the frame wall. */
const GLASS: Rect = [wall + 0.05, W - wall - 0.05, wall + 0.05, L - wall - 0.05, R - wall];
const PLATEAU: Rect = [1.22, 37.15, 1.22, 37.15, 8.8];
const LENS_HOLES: Circle[] = [[...PHONE.ultraWide, 7.535], [...PHONE.wide, 7.535], [...PHONE.flash, 3.14], [11.47, 26.9, 1.05]];

function BackGlass() {
  return (
    <Part id="back-glass">
      <Slab k="back" outer={GLASS} circles={LENS_HOLES} y={[back[0], back[1]]} />
      <Slab k="plateau" outer={PLATEAU} circles={LENS_HOLES} y={[back[1], plateau]} />
      {[PHONE.ultraWide, PHONE.wide].map(([u, v]) => (
        <group key={u}>
          <M clip geo={latheMm('ring', [[6.3, 0], [7.535, 0], [7.535, 3.9], [7.15, 4.29], [6.3, 4.29]])} p={at(u, v, back[0])} />
          <Post c={[u, v]} r={6.3} y={[10.75, 10.95]} seg={48} />
        </group>
      ))}
      <Post c={PHONE.flash} r={3.14} y={[8.9, 9.26]} />
      {/* MagSafe: charging coil, ring of magnets, and the orientation magnet below it */}
      <M clip geo={latheMm('coil', [[8, 0], [19, 0], [19, 0.45], [8, 0.45]])} p={at(CU, CV, 6.55)} />
      <group position={at(CU, CV, 6.775)}>
        {Array.from({ length: 18 }, (_, i) => (
          <group key={i} rotation={[0, (i / 18) * Math.PI * 2, 0]}>
            <M clip geo={box(0.2, 0.045, 0.7)} p={[2.25, 0, 0]} />
          </group>
        ))}
      </group>
      <Blk u={[32, 39.6]} v={[98, 101.5]} y={[6.55, 7.0]} />
      <Blk u={[50, 57]} v={[57, 61]} y={[6.45, 6.55]} />
      <Blk u={[54, 59]} v={[56, 60]} y={[5.4, 6.45]} />
      <Callout id="back-glass" p={at(58, 112, 8.2)} />
    </Part>
  );
}

function BackAdhesive() {
  return (
    <Part id="back-adhesive">
      <Slab k="back-adh" outer={GLASS} holes={[[wall + 3, W - wall - 3, wall + 3, L - wall - 3, R - wall - 3]]} y={[6.9, back[0]]} />
      <Callout id="back-adhesive" p={at(70, 128, 7.2)} />
    </Part>
  );
}

function CowlUpper() {
  return (
    <Part id="cowl-upper">
      <Slab k="cowl-up" outer={[45, 67, 21, 35.5, 1]} y={[4.2, 4.45]} />
      <Blk u={[45, 45.4]} v={[22, 34.5]} y={[3.2, 4.2]} />
      <Screws set="upper-cowl-screws" />
      <Callout id="cowl-upper" p={at(60, 30, 5)} />
    </Part>
  );
}

function CowlLower() {
  return (
    <Part id="cowl-lower">
      <Slab k="cowl-low" outer={[51, 67.5, 37, 54, 1]} y={[6.0, 6.25]} />
      <Screws set="lower-cowl-screws" />
      <Callout id="cowl-lower" p={at(62, 46, 6.8)} />
    </Part>
  );
}

function TrueDepth() {
  return (
    <Part id="truedepth">
      <Blk u={[24, 45]} v={[4, 14.5]} y={[1.3, 4.4]} />
      {/* front camera, dot projector and infrared camera look out through the island */}
      <Post c={[30.5, 6.3]} r={1.6} y={[0.7, 1.3]} />
      <Post c={[39, 6.3]} r={1.3} y={[0.7, 1.3]} />
      <Post c={[43.4, 6.3]} r={1.2} y={[0.7, 1.3]} />
      <Blk u={[34.5, 36.5]} v={[5.4, 7.2]} y={[0.9, 1.3]} />
      <Blk u={[40, 48]} v={[14.5, 23]} y={[4.0, 4.15]} />
      <Blk u={[46.5, 51.5]} v={[21, 24.5]} y={[3.1, 4.0]} />
      <Callout id="truedepth" p={at(30, 10, 5)} />
    </Part>
  );
}

function Grille() {
  return (
    <Part id="grille">
      <Blk u={[26, 46]} v={[1.25, 1.95]} y={[0.65, 1.15]} />
      <Callout id="grille" p={at(28, 1.5, 1.5)} />
    </Part>
  );
}

const CAMERA_FLOOR: Array<[number, number]> = [[5.5, 4], [22.5, 4], [22.5, 16.5], [37.5, 16.5], [37.5, 36.5], [5.5, 36.5]];

function Camera() {
  const lens = (key: string, [u, v]: readonly [number, number], r: number) => (
    <M clip geo={latheMm(key, [[0, 0], [r, 0], [r, 2.2], [r - 0.6, 2.2], [r - 0.6, 3.8], [0, 3.8]])} p={at(u, v, 6.9)} />
  );
  return (
    <Part id="camera">
      <Slab k="cam-floor" outer={CAMERA_FLOOR} y={[MID1, 3.0]} />
      {/* ultra-wide (small) and wide (large) modules */}
      <Blk u={[7.23, 18.23]} v={[7.23, 18.23]} y={[3.0, 6.9]} />
      <Blk u={[18.64, 32.64]} v={[18.64, 32.64]} y={[3.0, 6.9]} />
      {lens('lens-uw', PHONE.ultraWide, 5.0)}
      {lens('lens-w', PHONE.wide, 6.0)}
      {/* a flex cable and connector from each module to the board */}
      <Blk u={[32.64, 48]} v={[26.5, 29]} y={[4.0, 4.15]} />
      <Blk u={[46.5, 51.5]} v={[26, 29.5]} y={[3.1, 4.0]} />
      <Blk u={[13, 17]} v={[18.23, 35.5]} y={[4.0, 4.15]} />
      <Blk u={[13, 48]} v={[33, 35.5]} y={[4.0, 4.15]} />
      <Blk u={[46.5, 51.5]} v={[31.5, 35.2]} y={[3.1, 4.0]} />
      <Screws set="camera-screws" />
      <Callout id="camera" p={at(10, 30, 8)} />
    </Part>
  );
}

function Antenna() {
  return (
    <Part id="antenna">
      <Blk u={[56, 66]} v={[14, 20.5]} y={[3.1, 5.0]} />
      <Blk u={[52, 56]} v={[16, 19]} y={[3.1, 3.6]} />
      <Callout id="antenna" p={at(64, 17, 5.5)} />
    </Part>
  );
}

function TopSpeaker() {
  return (
    <Part id="top-speaker">
      <Slab k="top-spk" outer={[47, 66, 4, 13.5, 1.5]} y={[MID1, 5.4]} />
      <Slab k="top-spk-cap" outer={[49, 64, 5.5, 12, 1]} y={[5.4, 5.6]} />
      <Blk u={[45, 47]} v={[3, 6]} y={[2.6, 4.0]} />
      <Blk u={[60, 64]} v={[13.5, 15]} y={[3.1, 3.4]} />
      <Callout id="top-speaker" p={at(62, 6, 6)} />
    </Part>
  );
}

const BOARD: Array<[number, number]> = [[46, 14], [68.5, 14], [68.5, 119.5], [57, 119.5], [57, 112], [51, 112], [51, 36], [46, 36]];
const UPPER: Rect = [51, 68.5, 36, 100, 1];

function LogicBoard() {
  return (
    <Part id="logic-board">
      <Slab k="pcb-low" outer={BOARD} y={[MID1, 3.1]} />
      {/* interposer ring between the two boards of the sandwich */}
      <Slab k="interposer" outer={UPPER} holes={[[52.2, 67.3, 37.2, 98.8, 0.5]]} y={[3.1, 4.6]} />
      <Slab k="pcb-up" outer={UPPER} y={[4.6, 5.4]} />
      <Slab k="soc" outer={[53.5, 66, 60, 73, 1]} y={[5.4, 6.2]} />
      <Blk u={[53, 66.5]} v={[76, 92]} y={[5.4, 5.95]} />
      <Blk u={[53, 60]} v={[47, 56]} y={[5.4, 5.9]} />
      <Blk u={[61, 67]} v={[40, 56]} y={[5.4, 5.9]} />
      {/* SIM reader */}
      <Blk u={[57.5, 68.5]} v={[102, 119.5]} y={[4.1, 4.35]} />
      <Blk u={[57.5, 58.2]} v={[102, 119.5]} y={[3.1, 4.1]} />
      <Callout id="logic-board" p={at(60, 84, 6.5)} />
    </Part>
  );
}

function Battery() {
  return (
    <Part id="battery">
      <Slab k="cell" outer={[5, 49.7, 41.2, 127, 2]} y={[2.4, 6.45]} />
      {/* protection circuit along the top edge, flex and connector */}
      <Blk u={[8, 47]} v={[38.7, 41.2]} y={[2.8, 5.6]} />
      <Blk u={[47, 54.5]} v={[41.5, 45]} y={[5.45, 5.55]} />
      <Blk u={[52, 57]} v={[40.5, 45.5]} y={[5.4, 6.0]} />
      {/* stretch-release adhesive pull tabs */}
      <Blk u={[15, 21]} v={[36.5, 44]} y={[6.45, 6.5]} />
      <Blk u={[36, 42]} v={[36.5, 44]} y={[6.45, 6.5]} />
      <Blk u={[10, 14.5]} v={[100, 104.5]} y={[6.45, 6.5]} />
      <Callout id="battery" p={at(22, 88, 7)} />
    </Part>
  );
}

function Taptic() {
  return (
    <Part id="taptic">
      <Slab k="taptic" outer={[50, 67, 120, 135.5, 1.5]} y={[2.5, 6.0]} />
      <Slab k="taptic-cap" outer={[52, 65, 122, 133.5, 1]} y={[6.0, 6.1]} />
      <Blk u={[48.2, 51]} v={[127.5, 131]} y={[5.6, 6.0]} />
      <Blk u={[66, 68.5]} v={[130, 134]} y={[5.6, 6.0]} />
      <Screws set="taptic-screws" />
      <Callout id="taptic" p={at(62, 126, 6.6)} />
    </Part>
  );
}

function BottomSpeaker() {
  return (
    <Part id="bottom-speaker">
      <Slab k="spk" outer={[5, 25, 128.5, 145.5, 2]} y={[MID1, 6.3]} />
      <Slab k="spk-cap" outer={[7, 23, 130.5, 143.5, 1.2]} y={[6.3, 6.4]} />
      <Blk u={[14, 25]} v={[145.5, 146.6]} y={[2.8, 5.0]} />
      <Blk u={[3.2, 5]} v={[129.5, 132.5]} y={[5.2, 5.6]} />
      <Blk u={[3.2, 5]} v={[140.5, 143.5]} y={[5.2, 5.6]} />
      <Blk u={[25, 28.5]} v={[135, 139]} y={[5.2, 5.6]} />
      <Screws set="speaker-screws" />
      <Callout id="bottom-speaker" p={at(10, 135, 7)} />
    </Part>
  );
}

function Mic() {
  return (
    <Part id="mic">
      <Blk u={[45, 54.5]} v={[138, 145.8]} y={[2.45, 4.6]} />
      <Blk u={[46, 53.5]} v={[145.8, 146.6]} y={[2.9, 4.9]} />
      <Post c={[49.8, 141.9]} r={2} y={[4.6, 5.4]} />
      <Callout id="mic" p={at(52, 142, 6)} />
    </Part>
  );
}

const PORT = { u: CU, y: 3.95, w: 8.94, h: 3.26 };

function receptacle() {
  const s = stadium(new THREE.Shape(), SU(PORT.u), PORT.y * S, PORT.w * S, PORT.h * S);
  s.holes.push(stadium(new THREE.Path(), SU(PORT.u), PORT.y * S, (PORT.w - 0.6) * S, (PORT.h - 0.7) * S));
  return s;
}

function DockFlex() {
  return (
    <Part id="dock-flex">
      <M clip geo={extrude('ph-usb-c', receptacle, (L - wall - 139.5) * S)} p={[X(139.5), 0, 0]} r={EDGE} />
      <Blk u={[PORT.u - 4.47, PORT.u + 4.47]} v={[139, 139.5]} y={[PORT.y - 1.63, PORT.y + 1.63]} />
      <Blk u={[33.2, 38.4]} v={[140, 146.3]} y={[3.75, 4.15]} />
      {/* bracket ears, flex run along the bottom and up the side, board connector */}
      <Blk u={[26, 29.5]} v={[139.5, 143.5]} y={[2.45, 2.8]} />
      <Blk u={[41, 44.5]} v={[139.5, 143.5]} y={[2.45, 2.8]} />
      <Blk u={[26, 45]} v={[137, 139.5]} y={[2.45, 2.8]} />
      <Blk u={[26, 56]} v={[136.5, 139]} y={[MID1, 2.45]} />
      <Blk u={[51, 56]} v={[117, 136.5]} y={[MID1, 2.45]} />
      <Blk u={[51.5, 56.5]} v={[112.5, 117]} y={[MID1, 3.2]} />
      <Screws set="dock-screws" />
      <Callout id="dock-flex" p={at(38, 146, 6.5)} />
    </Part>
  );
}

function Sim() {
  return (
    <Part id="sim">
      <Slab k="sim-tray" outer={[58, 70.6, 102.8, 118.7, 0.8]} holes={[[60, 68.8, 104.5, 116.8, 0.6]]} y={[3.4, 4.0]} />
      <Blk u={[60.3, 68.5]} v={[104.8, 116.5]} y={[3.5, 3.75]} />
      <Slab k="sim-cap" outer={[70.6, W + 0.05, 102.8, 118.7, 0.5]} y={[2.6, 5.2]} />
      <Callout id="sim" p={at(W, 112, 5.5)} />
    </Part>
  );
}

/** Frame in plan, open along the straight of the bottom edge (that wall is made separately, with its holes). */
function frameShape() {
  const ax0 = X(0), ax1 = X(L), ay0 = SU(0), ay1 = SU(W), r = R * S;
  const t = wall * S, ri = r - t;
  const bx0 = ax0 + t, bx1 = ax1 - t, by0 = ay0 + t, by1 = ay1 - t;
  const s = new THREE.Shape();
  s.moveTo(ax1, ay1 - r);
  s.absarc(ax1 - r, ay1 - r, r, 0, HALF_PI, false);
  s.lineTo(ax0 + r, ay1);
  s.absarc(ax0 + r, ay1 - r, r, HALF_PI, Math.PI, false);
  s.lineTo(ax0, ay0 + r);
  s.absarc(ax0 + r, ay0 + r, r, Math.PI, 1.5 * Math.PI, false);
  s.lineTo(ax1 - r, ay0);
  s.absarc(ax1 - r, ay0 + r, r, 1.5 * Math.PI, 2 * Math.PI, false);
  s.lineTo(bx1, by0 + ri);
  s.absarc(bx1 - ri, by0 + ri, ri, 2 * Math.PI, 1.5 * Math.PI, true);
  s.lineTo(bx0 + ri, by0);
  s.absarc(bx0 + ri, by0 + ri, ri, 1.5 * Math.PI, Math.PI, true);
  s.lineTo(bx0, by1 - ri);
  s.absarc(bx0 + ri, by1 - ri, ri, Math.PI, HALF_PI, true);
  s.lineTo(bx1 - ri, by1);
  s.absarc(bx1 - ri, by1 - ri, ri, HALF_PI, 0, true);
  s.closePath();
  return s;
}

/** Bottom wall in (u, y): USB-C opening, screw holes, speaker and microphone holes. */
function bottomWall() {
  const s = roundRect(new THREE.Shape(), SU(R), SU(W - R), 0, T * S, 0);
  s.holes.push(stadium(new THREE.Path(), SU(PORT.u), PORT.y * S, (PORT.w + 0.06) * S, (PORT.h + 0.06) * S));
  const holes: Array<[number, number]> = [
    ...PENTALOBES.map((u): [number, number] => [u, 0.8]),
    ...Array.from({ length: 5 }, (_, i): [number, number] => [15.08 + i * 2.255, 0.675]),
    [47.53, 0.675], [52.04, 0.675],
  ];
  for (const [u, r] of holes) {
    const p = new THREE.Path();
    p.absarc(SU(u), PHONE.portY * S, r * S, 0, Math.PI * 2, true);
    s.holes.push(p);
  }
  return s;
}

function Enclosure() {
  return (
    <Part id="enclosure">
      <M clip geo={extrude('ph-frame', frameShape, T * S)} r={FLAT} />
      <M clip geo={extrude('ph-bottom-wall', bottomWall, wall * S)} p={[X(L - wall), 0, 0]} r={EDGE} />
      <Slab
        k="midplate"
        outer={[wall, W - wall, wall, L - wall, R - wall]}
        holes={[[22, 46, 1.2, 16, 1.5], [46.5, 53, 6.5, 12, 0.8], [56, 62, 97, 103, 0.5]]}
        y={[MID0, MID1]}
      />
      {/* side button on the left (seen from the back); action button and volume buttons on the right */}
      <Blk u={[-0.45, 0.5]} v={[53.37, 71.07]} y={[2.6, 5.2]} />
      <Blk u={[W - 0.5, W + 0.6]} v={[29.87, 35.79]} y={[2.9, 4.9]} />
      <Blk u={[W - 0.5, W + 0.45]} v={[40.67, 51.87]} y={[2.6, 5.2]} />
      <Blk u={[W - 0.5, W + 0.45]} v={[54.87, 66.07]} y={[2.6, 5.2]} />
      <Callout id="enclosure" p={at(0, 62, 6)} />
    </Part>
  );
}

function AlsCowl() {
  return (
    <Part id="als-cowl">
      <Slab k="als-cowl" outer={[46.2, 53.3, 6.2, 12.3, 0.6]} holes={[[47.3, 51.7, 7.3, 11.2, 0.3]]} y={[1.32, 1.55]} />
      <Callout id="als-cowl" p={at(50, 9, 0.5)} />
    </Part>
  );
}

function DisplayCowl() {
  return (
    <Part id="display-cowl">
      <Slab k="disp-cowl" outer={[54, 64, 94, 106, 0.8]} holes={[[56, 62, 97, 103, 0.3]]} y={[1.32, 1.55]} />
      <Screws set="cowl-screws" axis="down" />
      <Callout id="display-cowl" p={at(60, 100, 0.5)} />
    </Part>
  );
}

function DisplayAdhesive() {
  return (
    <Part id="display-adhesive">
      <Slab k="disp-adh" outer={GLASS} holes={[[3.2, W - 3.2, 3.2, L - 3.2, R - 3.2]]} y={[1.25, MID0]} />
      <Callout id="display-adhesive" p={at(70, 30, 1)} />
    </Part>
  );
}

function Display() {
  return (
    <Part id="display">
      <Slab k="cover-glass" outer={GLASS} y={[0, 0.6]} />
      {/* OLED panel with the Dynamic Island cut-out */}
      <Slab k="oled" outer={[2.5, W - 2.5, 2.5, L - 2.5, R - 2.5]} holes={[[25.47, 46.15, 4.4, 8.2, 1.9]]} y={[0.6, 1.25]} />
      {/* display flex and its connector, which reaches the board through the midplate */}
      <Blk u={[56, 62]} v={[102.5, 145]} y={[1.25, 1.32]} />
      <Blk u={[56.5, 61.5]} v={[97.5, 102.5]} y={[1.25, 2.2]} />
      {/* ambient light / proximity sensor flex */}
      <Blk u={[47.6, 51.4]} v={[2.6, 7.6]} y={[1.25, 1.32]} />
      <Blk u={[47.6, 51.4]} v={[7.6, 10.9]} y={[1.25, 2.2]} />
      {PENTALOBES.map((u) => <Screw key={u} seat={[u, L, PHONE.portY]} set="pentalobes" axis="out" />)}
      <Callout id="display" p={at(20, 120, -0.5)} />
    </Part>
  );
}

export function Phone() {
  return (
    <group>
      <Enclosure />
      <Display />
      <DisplayAdhesive />
      <DisplayCowl />
      <AlsCowl />
      <LogicBoard />
      <DockFlex />
      <Mic />
      <BottomSpeaker />
      <Taptic />
      <Battery />
      <TopSpeaker />
      <Grille />
      <TrueDepth />
      <Camera />
      <Antenna />
      <CowlLower />
      <CowlUpper />
      <BackAdhesive />
      <BackGlass />
      <Sim />
    </group>
  );
}
