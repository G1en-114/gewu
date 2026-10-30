import { useEffect, useState } from 'react';
import { useStudio } from '../../state';
import { engineMotion, useEngine } from './motion';

/** Load slider, governor switch and a live speed / throttle readout. */
export function EngineControls() {
  const { load, set } = useEngine();
  const run = useStudio((s) => s.set);
  const [reading, setReading] = useState({ rpm: 0, throttle: 0 });
  useEffect(() => {
    const id = window.setInterval(() => setReading({ rpm: engineMotion.rpm, throttle: engineMotion.throttle }), 150);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <label className="slider">
        <span>负载</span>
        <input type="range" min={0} max={1} step={0.01} value={load} onChange={(e) => { set({ load: Number(e.target.value) }); run({ running: true }); }} />
        <output>{Math.round(load * 100)}%</output>
      </label>
      <div className="gauges" aria-live="off">
        <span><b>{reading.rpm.toFixed(1)}</b> rpm</span>
        <span className="gauge-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (reading.rpm / 70) * 100)}%` }} /></span>
        <span>节流阀 <b>{Math.round(reading.throttle * 100)}%</b></span>
      </div>
    </>
  );
}

export function EngineToggles() {
  const { governor, set } = useEngine();
  const run = useStudio((s) => s.set);
  return <button type="button" className={governor ? 'is-on' : ''} onClick={() => { set({ governor: !governor }); run({ running: true }); }}>调速器</button>;
}
