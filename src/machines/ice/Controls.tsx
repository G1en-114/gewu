import { useEffect, useState } from 'react';
import { useStudio } from '../../state';
import { cycle, iceMotion, STROKES, strokeIndex, useIce } from './motion';

/** Speed slider and a live readout of the stroke in the 720° cycle. */
export function IceControls() {
  const { speed, set } = useIce();
  const run = useStudio((s) => s.set);
  const [theta, setTheta] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTheta(iceMotion.theta), 80);
    return () => window.clearInterval(id);
  }, []);
  const stroke = strokeIndex(theta);
  return (
    <>
      <label className="slider">
        <span>转速</span>
        <input type="range" min={0.1} max={1.5} step={0.05} value={speed} onChange={(e) => { set({ speed: Number(e.target.value) }); run({ running: true }); }} />
        <output>{Math.round(speed * 60)} r/min</output>
      </label>
      <div className="strokes" aria-live="off">
        {STROKES.map((name, i) => <span key={name} className={i === stroke ? 'is-on' : ''}>{name}</span>)}
        <b>{Math.round((cycle(theta) * 180) / Math.PI)}°</b>
      </div>
    </>
  );
}
