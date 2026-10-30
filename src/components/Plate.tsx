import { useEffect } from 'react';
import { MACHINES, useMachine } from '../machines';
import { selectMachine, useStudio, type ViewMode } from '../state';

const pad = (n: number) => String(n).padStart(2, '0');

export function TitleColumn() {
  const machine = useMachine();
  const { step, explode, running, section, labels, set } = useStudio();
  const { Controls, Toggles } = machine;

  const goStep = (index: number) => {
    const { state, apply } = machine.steps[index];
    const { viewNonce } = useStudio.getState();
    apply?.();
    set({
      localExplode: null, step: index, explode: state.explode, section: state.section, running: state.running,
      selected: state.select, focus: state.focus, view: 'perspective', viewNonce: viewNonce + 1,
    });
  };

  return (
    <section className="title-column">
      <header className="masthead">
        <h1 className="mast-title">格物</h1>
        <div className="mast-rule" />
        <p className="mast-en">MECHANISM STUDIO</p>
        <p className="mast-zh">工程制图 · 交互拆解</p>
        <div className="fig-rule"><span>FIG. {pad(MACHINES.indexOf(machine) + 1)}</span><i /></div>
      </header>

      <nav className="machines" aria-label="选择机器">
        {MACHINES.map((m) => (
          <button key={m.id} type="button" className={m.id === machine.id ? 'is-on' : ''} onClick={() => selectMachine(m.id)} title={m.summary}>
            {m.name}
          </button>
        ))}
      </nav>

      <div className="subject">
        <h2>{machine.name}</h2>
        <p>{machine.en} · {machine.subtitle}</p>
      </div>

      <ol className="steps">
        {machine.steps.map((item, index) => (
          <li key={item.title} className={index === step ? 'is-active' : ''}>
            <button type="button" onClick={() => goStep(index)}>
              <span className="step-num">{pad(index + 1)}</span>
              <span className="step-title">{item.title}</span>
              <span className="step-en">{item.en}</span>
            </button>
            {index === step && <p className="step-body">{item.body}</p>}
          </li>
        ))}
      </ol>

      <div className="controls">
        <label className="slider">
          <span>拆解</span>
          <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => set({ explode: Number(e.target.value) })} />
          <output>{Math.round(explode * 100)}%</output>
        </label>
        {Controls && <Controls />}
        <div className="toggles">
          <button type="button" className={running ? 'is-on' : ''} onClick={() => set({ running: !running })}>{running ? '暂停' : '运转'}</button>
          {Toggles && <Toggles />}
          <button type="button" className={section ? 'is-on' : ''} onClick={() => set({ section: !section })}>剖视</button>
          <button type="button" className={labels ? 'is-on' : ''} onClick={() => set({ labels: !labels })}>标注</button>
        </div>
      </div>
    </section>
  );
}

const VIEWS: Array<[ViewMode, string]> = [['perspective', '透视'], ['elevation', '主视'], ['plan', '俯视']];

export function PlateMeta({ onExport, busy, recording }: { onExport: (kind: 'plate' | 'video' | 'json') => void; busy: boolean; recording: number | null }) {
  const { view, viewNonce, set } = useStudio();
  return (
    <nav className="plate-meta" aria-label="视图">
      <div className="views">
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button" className={view === id ? 'is-on' : ''} onClick={() => set({ view: id, focus: null, viewNonce: viewNonce + 1 })}>{label}</button>
        ))}
      </div>
      <span className="meta-sep" />
      <button type="button" onClick={() => set({ view, focus: null, viewNonce: viewNonce + 1, explode: 0, selected: null, localExplode: null, section: false, step: 0 })}>复位</button>
      <button type="button" disabled={busy} onClick={() => onExport('plate')} title="A4 横版爆炸图：编号气泡、明细表、标题栏">图版 ↓</button>
      <button type="button" disabled={busy} onClick={() => onExport('video')} title="录制整机 → 拆开 → 合拢（WebM）" className={recording !== null ? 'is-recording' : ''}>
        {recording !== null ? `录制中 ${recording.toFixed(0)}s` : '动画 ●'}
      </button>
      <button type="button" disabled={busy} onClick={() => onExport('json')}>JSON ↓</button>
    </nav>
  );
}

export function PartsLegend() {
  const machine = useMachine();
  const { selected, hovered, localExplode, set } = useStudio();
  const focus = selected ?? hovered;
  const part = focus ? machine.parts.find((p) => p.id === focus) : undefined;
  // A local explode follows the selection, and folds away when nothing is selected.
  useEffect(() => {
    const { localExplode: current } = useStudio.getState();
    if (current && current !== selected) set({ localExplode: selected });
  }, [selected, set]);
  return (
    <aside className="legend">
      {part && (
        <div className="caption">
          <div className="caption-head">
            <span className="caption-num">{pad(part.index)}</span>
            <div>
              <h3>{part.name}</h3>
              <p className="caption-en">{part.en} · {part.role}</p>
            </div>
            {selected && <button type="button" className="caption-close" onClick={() => set({ selected: null })} aria-label="取消选择">×</button>}
          </div>
          <p className="caption-body">{part.description}</p>
          <div className="caption-foot">
            <p className="caption-mat">{part.material}</p>
            {selected && (
              <button type="button" className="caption-action" onClick={() => set({ localExplode: localExplode === selected ? null : selected, explode: 0 })}>
                {localExplode === selected ? '收拢' : '局部展开'} <span aria-hidden="true">{localExplode === selected ? '↙' : '↗'}</span>
              </button>
            )}
          </div>
        </div>
      )}
      <table className="parts">
        <caption>零件明细 · PARTS</caption>
        <tbody>
          {machine.parts.map((item) => (
            <tr
              key={item.id}
              className={`${selected === item.id ? 'is-selected' : ''}${hovered === item.id ? ' is-hovered' : ''}`}
              onClick={() => set({ selected: selected === item.id ? null : item.id })}
              onPointerEnter={() => set({ hovered: item.id })}
              onPointerLeave={() => set({ hovered: null })}
            >
              <td className="num">{pad(item.index)}</td>
              <td>{item.name}</td>
              <td className="en">{item.en}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="title-block">
        <span>图号 {machine.drawingNo}</span>
        <span>比例 {machine.scale}</span>
        <span>第 1 张 共 1 张</span>
      </div>
    </aside>
  );
}
