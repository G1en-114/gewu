import { ENGINE } from '../data/machine';

/**
 * Faint orthographic drawings that sit behind the 3D plate, generated from
 * the same engine dimensions so they always agree with the model.
 */
const S = 34;
const AX = ENGINE.axisY;
const R = ENGINE.flywheelRadius;

function Dim({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g className="dim">
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} />
      <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} />
      <text x={(x1 + x2) / 2} y={y - 5}>{label}</text>
    </g>
  );
}

export function SideElevation({ className }: { className?: string }) {
  // x: -5.6 → 4.2, y: -1.6 → 5.2 (scene units), drawn y-down.
  const X = (x: number) => (x + 5.6) * S;
  const Y = (y: number) => (5.2 - y) * S;
  const spokes = Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 3 + 0.3);
  const gx = ENGINE.governor[0];
  return (
    <svg className={className} viewBox={`0 0 ${9.8 * S} ${7.6 * S}`} aria-hidden="true">
      <g className="draft">
        <rect x={X(-5.5)} y={Y(-0.8)} width={9.4 * S} height={0.24 * S} />
        <rect x={X(-5.2)} y={Y(0)} width={8.8 * S} height={0.8 * S} />
        <rect x={X(-4.6)} y={Y(0.35)} width={7 * S} height={0.35 * S} />
        <rect x={X(-4.3)} y={Y(AX + 0.84)} width={0.12 * S} height={1.68 * S} />
        <rect x={X(-4.18)} y={Y(AX + 0.68)} width={1.36 * S} height={1.36 * S} />
        <rect x={X(-2.82)} y={Y(AX + 0.84)} width={0.12 * S} height={1.68 * S} />
        <rect x={X(-4.5)} y={Y(AX + 0.84)} width={0.2 * S} height={1.68 * S} />
        <rect x={X(-3.95)} y={Y(AX + 1.12)} width={0.9 * S} height={0.44 * S} />
        <line x1={X(-3.5)} y1={Y(AX + 1.2)} x2={X(-3.5)} y2={Y(AX + 2.0)} />
        <rect x={X(-1.62)} y={Y(AX + 0.22)} width={1.64 * S} height={0.44 * S} />
        <line x1={X(-0.8)} y1={Y(AX)} x2={X(ENGINE.crankX - 0.3)} y2={Y(AX + 0.32)} />
        <circle cx={X(ENGINE.crankX)} cy={Y(AX)} r={R * S} />
        <circle cx={X(ENGINE.crankX)} cy={Y(AX)} r={(R - 0.3) * S} />
        <circle cx={X(ENGINE.crankX)} cy={Y(AX)} r={0.36 * S} />
        {spokes.map((a) => (
          <line key={a} x1={X(ENGINE.crankX + Math.cos(a) * 0.36)} y1={Y(AX + Math.sin(a) * 0.36)} x2={X(ENGINE.crankX + Math.cos(a) * (R - 0.3))} y2={Y(AX + Math.sin(a) * (R - 0.3))} />
        ))}
        <line x1={X(gx)} y1={Y(0.35)} x2={X(gx)} y2={Y(4.2)} />
        <line x1={X(gx)} y1={Y(3.95)} x2={X(gx - 0.5)} y2={Y(3.3)} />
        <line x1={X(gx)} y1={Y(3.95)} x2={X(gx + 0.5)} y2={Y(3.3)} />
        <circle cx={X(gx - 0.58)} cy={Y(3.2)} r={0.17 * S} />
        <circle cx={X(gx + 0.58)} cy={Y(3.2)} r={0.17 * S} />
      </g>
      <g className="centre">
        <line x1={X(-5.6)} y1={Y(AX)} x2={X(4.2)} y2={Y(AX)} />
        <line x1={X(ENGINE.crankX)} y1={Y(AX + R + 0.3)} x2={X(ENGINE.crankX)} y2={Y(-1.3)} />
      </g>
      <Dim x1={X(-5.5)} x2={X(3.9)} y={Y(-1.35)} label="9400" />
      <Dim x1={X(-4.3)} x2={X(-2.7)} y={Y(AX + 1.9)} label="1600" />
    </svg>
  );
}

export function EndElevation({ className }: { className?: string }) {
  // Looking along the engine axis: z → horizontal, y up.
  const Z = (z: number) => (z + 3.0) * S;
  const Y = (y: number) => (5.0 - y) * S;
  const gz = ENGINE.governor[2];
  return (
    <svg className={className} viewBox={`0 0 ${4.5 * S} ${6.7 * S}`} aria-hidden="true">
      <g className="draft">
        <rect x={Z(-2.9)} y={Y(-0.8)} width={4.2 * S} height={0.24 * S} />
        <rect x={Z(-1.05)} y={Y(0)} width={2.05 * S} height={0.8 * S} />
        <rect x={Z(-2.6)} y={Y(0)} width={0.95 * S} height={0.8 * S} />
        <rect x={Z(-1.52)} y={Y(AX + R)} width={0.34 * S} height={2 * R * S} />
        <rect x={Z(-0.7)} y={Y(0.35)} width={1.4 * S} height={0.35 * S} />
        <circle cx={Z(0)} cy={Y(AX)} r={0.84 * S} />
        <circle cx={Z(0)} cy={Y(AX)} r={0.56 * S} />
        <line x1={Z(gz)} y1={Y(0.35)} x2={Z(gz)} y2={Y(4.2)} />
        <line x1={Z(-2.4)} y1={Y(AX)} x2={Z(0.2)} y2={Y(AX)} />
      </g>
      <g className="centre">
        <line x1={Z(0)} y1={Y(AX + 1.2)} x2={Z(0)} y2={Y(-1.3)} />
        <line x1={Z(-1.35)} y1={Y(AX + R + 0.2)} x2={Z(-1.35)} y2={Y(-1.3)} />
      </g>
      <Dim x1={Z(-2.9)} x2={Z(1.3)} y={Y(-1.45)} label="4200" />
    </svg>
  );
}
