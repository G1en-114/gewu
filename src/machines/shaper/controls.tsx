import { useEffect, useState } from 'react';
import { useStudio } from '../../state';
import { FEEDS, SPEEDS, shaperMotion, useShaper } from './motion';

/** Speed / stroke / feed controls and the live readout for the shaping machine. */
export function ShaperControls() {
  const { speed, stroke, feed, feedOn, set } = useShaper();
  const studio = useStudio((s) => s.set);
  const [read, setRead] = useState({ cycles: 0 });
  useEffect(() => {
    const id = window.setInterval(() => setRead({ cycles: Math.floor(shaperMotion.crank / (Math.PI * 2)) }), 150);
    return () => window.clearInterval(id);
  }, []);
  const run = () => studio({ running: true });
  return (
    <>
      <div className="strokes gears">
        {SPEEDS.map((rpm) => (
          <button key={rpm} type="button" className={rpm === speed ? 'is-on' : ''} onClick={() => { set({ speed: rpm }); run(); }}>{rpm}</button>
        ))}
        <b>{stroke} mm</b>
      </div>
      <label className="slider">
        <span>行程</span>
        <input type="range" min={150} max={630} step={10} value={stroke} onChange={(e) => { set({ stroke: Number(e.target.value) }); run(); }} />
        <output>{stroke} mm</output>
      </label>
      <div className="strokes gears">
        {FEEDS.map((value) => (
          <button key={value} type="button" className={value === feed ? 'is-on' : ''} onClick={() => { set({ feed: value }); run(); }}>{value}</button>
        ))}
        <button type="button" className={feedOn ? 'is-on' : ''} onClick={() => { set({ feedOn: !feedOn }); run(); }}>进给</button>
      </div>
      <div className="gauges">
        <span>往复 <b>{speed}</b> 次/分</span>
        <span className="gauge-bar" aria-hidden="true"><i style={{ width: `${(speed / 80) * 100}%` }} /></span>
        <span>进给 <b>{feed.toFixed(2)}</b> mm/次</span>
      </div>
      <p className="gear-note">六档往复次数 14–80 次/分；行程 150–630 mm（曲柄滑块调半径）；每行程横向进给 0.33–3.33 mm。画面里工作台每次只挪一点点，看右端棘轮和读数。已往复 {read.cycles} 次。</p>
    </>
  );
}
