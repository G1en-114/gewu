import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { motion } from '../state';
import { MACHINE_PARTS, STUDY_STEPS, partById } from '../data/machine';
import { useStudio } from '../state';
import type { ViewMode } from '../types/machine';
import { parseDrawingPlaceholder, parsePrompt } from '../ai/parse';

const pad = (n: number) => String(n).padStart(2, '0');

export function TitleColumn() {
  const { step, explode, running, section, load, governor, labels, set } = useStudio();
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const goStep = (index: number) => {
    const { state } = STUDY_STEPS[index];
    const { viewNonce } = useStudio.getState();
    set({ step: index, explode: state.explode, section: state.section, running: state.running, load: state.load, governor: state.governor, selected: state.select, focus: state.focus, view: 'perspective', viewNonce: viewNonce + 1 });
  };
  const submit = () => {
    const prompt = input.trim();
    if (!prompt) return;
    const parsed = parsePrompt(prompt, { includeInputMetadata: true });
    setNotice(`已解析 · ${parsed.title} · 本地演示适配器`);
  };
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    const parsed = parseDrawingPlaceholder({ fileName: picked.name, mimeType: picked.type });
    setNotice(`已载入图纸 · ${parsed.title}`);
    event.target.value = '';
  };

  return (
    <section className="title-column">
      <header className="masthead">
        <h1 className="mast-title">格物</h1>
        <div className="mast-rule" />
        <p className="mast-en">MECHANISM STUDIO</p>
        <p className="mast-zh">机械原理 · 交互拆解</p>
        <div className="fig-rule"><span>FIG. 01</span><i /></div>
      </header>

      <div className="subject">
        <h2>卧式单缸蒸汽机</h2>
        <p>Horizontal Mill Engine · c. 1850</p>
      </div>

      <ol className="steps">
        {STUDY_STEPS.map((item, index) => (
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
        <label className="slider">
          <span>负载</span>
          <input type="range" min={0} max={1} step={0.01} value={load} onChange={(e) => set({ load: Number(e.target.value), running: true })} />
          <output>{Math.round(load * 100)}%</output>
        </label>
        <Gauges />
        <div className="toggles">
          <button type="button" className={running ? 'is-on' : ''} onClick={() => set({ running: !running })}>{running ? '暂停' : '运转'}</button>
          <button type="button" className={governor ? 'is-on' : ''} onClick={() => set({ governor: !governor, running: true })}>调速器</button>
          <button type="button" className={section ? 'is-on' : ''} onClick={() => set({ section: !section })}>剖视</button>
          <button type="button" className={labels ? 'is-on' : ''} onClick={() => set({ labels: !labels })}>标注</button>
        </div>
      </div>

      <div className="prompt">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="描述一个机构，例如：带离心调速器的卧式蒸汽机"
          aria-label="描述一个机构"
        />
        <button type="button" onClick={submit} aria-label="解析描述">↗</button>
        <button type="button" className="prompt-upload" onClick={() => file.current?.click()}>图纸</button>
        <input ref={file} hidden type="file" accept="image/png,image/jpeg,application/pdf" onChange={upload} />
      </div>
      {notice && <p className="prompt-notice">{notice}</p>}
    </section>
  );
}

/** Live speed and throttle readout from the engine model. */
function Gauges() {
  const [reading, setReading] = useState({ rpm: 0, throttle: 0 });
  useEffect(() => {
    const id = window.setInterval(() => setReading({ rpm: motion.rpm, throttle: motion.throttle }), 150);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="gauges" aria-live="off">
      <span><b>{reading.rpm.toFixed(1)}</b> rpm</span>
      <span className="gauge-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (reading.rpm / 70) * 100)}%` }} /></span>
      <span>节流阀 <b>{Math.round(reading.throttle * 100)}%</b></span>
    </div>
  );
}

const VIEWS: Array<[ViewMode, string]> = [['perspective', '透视'], ['elevation', '立面'], ['plan', '平面']];

export function PlateMeta({ onExport }: { onExport: (kind: 'png' | 'json') => void }) {
  const { view, viewNonce, set } = useStudio();
  return (
    <nav className="plate-meta" aria-label="视图">
      <div className="views">
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button" className={view === id ? 'is-on' : ''} onClick={() => set({ view: id, focus: null, viewNonce: viewNonce + 1 })}>{label}</button>
        ))}
      </div>
      <span className="meta-sep" />
      <button type="button" onClick={() => set({ view, focus: null, viewNonce: viewNonce + 1, explode: 0, selected: null, section: false, step: 0 })}>复位</button>
      <button type="button" onClick={() => onExport('png')}>PNG ↓</button>
      <button type="button" onClick={() => onExport('json')}>JSON ↓</button>
    </nav>
  );
}

export function PartsLegend() {
  const { selected, hovered, set } = useStudio();
  const focus = selected ?? hovered;
  const part = focus ? partById(focus) : null;
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
          <p className="caption-mat">{part.material}</p>
        </div>
      )}
      <table className="parts">
        <caption>零件明细 · PARTS</caption>
        <tbody>
          {MACHINE_PARTS.map((item) => (
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
        <span>图号 GW-ME-001</span>
        <span>比例 1 : 20</span>
        <span>第 1 张 共 1 张</span>
      </div>
    </aside>
  );
}
