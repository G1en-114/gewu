import { useEffect, useState } from 'react';
import { useStudio } from '../../state';
import { CARDS, signed } from './calc';
import { CYCLE_SECONDS, columnsAtHalf, currentCard, PRESSURE_BAR, type Pressure, towerMotion, tw, useTower } from './motion';

/**
 * Left-column controls for every level of the tower: which punched card
 * (polynomial) is loaded, the boiler pressure (speed), and a live readout —
 * the seven columns as they stand, what this moment of the cycle is doing,
 * and the paper strip so far.
 */

const PRESSURES: Array<[Pressure, string]> = [['low', '低压'], ['mid', '中压'], ['high', '高压']];
const fmt = (v: number) => String(v).padStart(8, '0');

function phaseText(half: 0 | 1, u: number) {
  const which = half === 0 ? '奇数列加进偶数列（D0 += D1 · D2 += D3 · D4 += D5）' : '偶数列加进奇数列（D1 += D2 · D3 += D4 · D5 += D6）';
  if (u < 0.08) return `解锁 · ${which}`;
  if (u < 0.46) return `加法 · ${which}`;
  if (u < 0.5) return '加法小齿轮抬起脱开';
  if (u < 0.9) return `进位 · 螺旋臂从个位往上扫 · 第 ${Math.min(8, Math.floor((u - 0.5) / 0.05) + 1)} 位`;
  return '锁定';
}

export function TowerControls() {
  const { card, pressure, set } = useTower();
  const studio = useStudio((s) => s.set);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((t) => t + 1), 150);
    return () => window.clearInterval(id);
  }, []);
  const c = currentCard();
  const cols = columnsAtHalf(2 * tw.n + tw.half);
  const rpm = towerMotion.crankRate * 60;
  const lines = tw.printed.slice(-5);
  return (
    <>
      <div className="strokes gears">
        {CARDS.map((k) => (
          <button key={k.id} type="button" className={k.id === card ? 'is-on' : ''} onClick={() => { set({ card: k.id }); studio({ running: true }); }}>{k.name}</button>
        ))}
      </div>
      <p className="gear-note">卡片：<b>f(n) = {c.formula}</b>。{c.note}</p>
      <div className="strokes gears">
        {PRESSURES.map(([p, label]) => (
          <button key={p} type="button" className={p === pressure ? 'is-on' : ''} onClick={() => { set({ pressure: p }); studio({ running: true }); }}>{label} {PRESSURE_BAR[p]} bar</button>
        ))}
      </div>
      <div className="gauges">
        <span>第 <b>{tw.n}</b> 行</span>
        <span>曲轴 <b>{rpm.toFixed(0)}</b> r/min</span>
        <span>每行 <b>{CYCLE_SECONDS[pressure]}</b> s</span>
      </div>
      <p className="gear-note">{tw.half === 0 ? '前' : '后'}半拍 · {phaseText(tw.half, tw.u)}</p>
      <table className="tw-columns" style={{ width: '100%', fontVariantNumeric: 'tabular-nums', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
        <tbody>
          {cols.map((v, k) => (
            <tr key={k} style={{ opacity: tw.step?.additions[k] ? 1 : 0.62 }}>
              <td>{k === 0 ? 'D0 · f' : `D${k} · Δ${k === 1 ? '' : superscript(k)}f`}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(v)}</td>
              <td style={{ textAlign: 'right' }}>{signed(v) < 0 ? `= ${signed(v)}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="gear-note">纸带：{lines.map((v, i) => <span key={i} style={{ fontFamily: 'monospace', marginRight: '0.6em' }}>{fmt(v)}</span>)}</p>
    </>
  );
}

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'];
const superscript = (k: number) => SUP[k] ?? String(k);
