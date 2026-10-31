import { useFrame } from '@react-three/fiber';
import { useStudio } from '../../state';
import { TurbofanDriver } from '../turbofan';
import { PHASES, rollWheels, stepJumbo, useJumbo } from './airframe';

/** Eases flaps, slats, gear and spoilers toward the flight phase; turns the fans and wheels while running. */
export function JumboDriver() {
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    stepJumbo(dt);
    if (useStudio.getState().running) rollWheels(dt);
  }, -1);
  return <TurbofanDriver />;
}

/** Flight phase buttons, shared by every 747 level. */
export function PhaseControls() {
  const { phase, set } = useJumbo();
  return (
    <>
      <div className="strokes gears">
        {PHASES.map(([p, label]) => (
          <button key={p} type="button" className={p === phase ? 'is-on' : ''} onClick={() => set(p)}>{label}</button>
        ))}
      </div>
      <p className="gear-note">{PHASES.find((p) => p[0] === phase)![2]}</p>
    </>
  );
}
