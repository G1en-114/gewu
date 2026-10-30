import { useEffect, useMemo, useState } from 'react';
import { lineage, MACHINES, machineById, useMachine } from '../machines';
import type { MachineDef } from '../machines/types';
import { clearEdits, editOf, partEdits, restoreAll, selectMachine, useStudio, type ViewMode } from '../state';

const pad = (n: number) => String(n).padStart(2, '0');

export function TitleColumn() {
  const machine = useMachine();
  const { step, explode, running, section, labels, view, hiddenLines, projection, moveMode, deep, hidden, solo, set } = useStudio();
  const drawingMode = view === 'drawing';
  const { Controls, Toggles } = machine;
  const chain = lineage(machine);
  const root = chain[0];

  const goStep = (index: number) => {
    const { state, apply } = machine.steps[index];
    const { viewNonce } = useStudio.getState();
    apply?.();
    set({
      localExplode: null, step: index, explode: state.explode, section: state.section, running: state.running,
      selected: state.select, focus: state.focus, view: drawingMode ? 'drawing' : 'perspective', viewNonce: viewNonce + 1,
    });
  };

  return (
    <section className="title-column">
      <header className="masthead">
        <h1 className="mast-title">格物</h1>
        <div className="mast-rule" />
        <p className="mast-en">MECHANISM STUDIO</p>
        <p className="mast-zh">工程制图 · 交互拆解</p>
        <div className="fig-rule"><span>FIG. {pad(MACHINES.indexOf(root) + 1)}{chain.length > 1 ? `-${chain.length - 1}` : ''}</span><i /></div>
      </header>

      <nav className="machines" aria-label="选择机器">
        {MACHINES.map((m) => (
          <button key={m.id} type="button" className={m.id === root.id ? 'is-on' : ''} onClick={() => selectMachine(m.id)} title={m.summary}>
            {m.name}
          </button>
        ))}
      </nav>

      <div className="subject">
        {chain.length > 1 && (
          <nav className="crumbs" aria-label="所在组件">
            {chain.slice(0, -1).map((m) => (
              <button key={m.id} type="button" onClick={() => selectMachine(m.id)}>{m.name}</button>
            ))}
            <span>{machine.name}</span>
          </nav>
        )}
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
        <Stepper machine={machine} explode={explode} />
        {Controls && <Controls />}
        <div className="toggles">
          <button type="button" className={running ? 'is-on' : ''} onClick={() => set({ running: !running })}>{running ? '暂停' : '运转'}</button>
          {Toggles && <Toggles />}
          <button type="button" className={section ? 'is-on' : ''} onClick={() => set({ section: !section })}>剖视</button>
          {drawingMode ? (
            <>
              <button type="button" className={hiddenLines ? 'is-on' : ''} onClick={() => set({ hiddenLines: !hiddenLines })} title="不可见轮廓线（细虚线）">虚线</button>
              <button type="button" className={projection ? 'is-on' : ''} onClick={() => set({ projection: !projection })} title="长对正 · 高平齐 · 宽相等">投影</button>
            </>
          ) : (
            <>
              <button type="button" className={labels ? 'is-on' : ''} onClick={() => set({ labels: !labels })}>标注</button>
              <button type="button" className={moveMode ? 'is-on' : ''} onClick={() => set({ moveMode: !moveMode })} title="拖动零件挪到别处（视角暂停转动）">挪动</button>
              {(hidden.length > 0 || solo) && (
                <button type="button" className="is-on" onClick={() => set({ hidden: [], solo: null })} title="把隐藏的零件都显示出来">
                  显示全部{hidden.length > 0 ? ` (${hidden.length})` : ''}
                </button>
              )}
              {machine.children && (
                <button
                  type="button"
                  className={deep ? 'is-on' : ''}
                  onClick={() => set(deep ? { deep: false } : { deep: true, explode: 1, localExplode: null })}
                  title="整个拆开，并把每个子组件拉到旁边再拆开"
                >
                  全部展开
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const VIEWS: Array<[ViewMode, string]> = [['perspective', '透视'], ['drawing', '三视图'], ['elevation', '主视'], ['plan', '俯视']];

export function PlateMeta({ onExport, busy, recording }: { onExport: (kind: 'plate' | 'video' | 'json') => void; busy: boolean; recording: number | null }) {
  const { view, viewNonce, set } = useStudio();
  const machine = useMachine();
  return (
    <nav className="plate-meta" aria-label="视图">
      <div className="views">
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button" className={view === id ? 'is-on' : ''} onClick={() => set({ view: id, focus: null, viewNonce: viewNonce + 1 })}>{label}</button>
        ))}
      </div>
      <span className="meta-sep" />
      <button
        type="button"
        onClick={() => {
          clearEdits();
          set({ view, focus: null, viewNonce: viewNonce + 1, explode: 0, selected: null, localExplode: null, section: false, step: 0, deep: false });
        }}
      >
        复位
      </button>
      <button type="button" onClick={() => restoreAll(machine.steps[0])} title="合拢所有零件，撤销挪动和缩放，关掉剖视、挪动、全部展开，回到第一步和默认视角">
        完全恢复
      </button>
      <button type="button" disabled={busy} onClick={() => onExport('plate')} title="A4 横版爆炸图：编号气泡、明细表、标题栏">图版 ↓</button>
      <button type="button" disabled={busy} onClick={() => onExport('video')} title="录制整机 → 拆开 → 合拢（WebM）" className={recording !== null ? 'is-recording' : ''}>
        {recording !== null ? `录制中 ${recording.toFixed(0)}s` : '动画 ●'}
      </button>
      <button type="button" disabled={busy} onClick={() => onExport('json')}>JSON ↓</button>
    </nav>
  );
}

/** The teardown as discrete steps: each step ends where some part (or set of screws) is off. */
function teardownStops(machine: MachineDef) {
  const stops = new Map<number, { at: number; ids: string[]; labels: string[] }>();
  const add = (end: number, label: string, id?: string) => {
    const key = Math.round(end * 1000);
    const stop = stops.get(key) ?? { at: end, ids: [], labels: [] };
    stop.labels.push(label);
    if (id) stop.ids.push(id);
    stops.set(key, stop);
  };
  for (const [id, set] of Object.entries(machine.boltSets)) {
    if (set.stage[1] > set.stage[0]) add(set.stage[1], `${machine.parts.find((p) => p.id === set.owner)?.name ?? ''}的螺钉`);
  }
  for (const p of machine.parts) if (p.stage[1] > p.stage[0]) add(p.stage[1], p.name, p.id);
  return [...stops.values()].sort((a, b) => a.at - b.at);
}

/** Step through the teardown one part at a time. */
function Stepper({ machine, explode }: { machine: MachineDef; explode: number }) {
  const set = useStudio((s) => s.set);
  const stops = useMemo(() => teardownStops(machine), [machine]);
  if (stops.length === 0) return null;
  const done = stops.filter((s) => s.at <= explode + 1e-4).length;
  const go = (n: number) => {
    const target = n <= 0 ? 0 : stops[Math.min(n, stops.length) - 1].at;
    const next = stops[n - 1];
    set({ explode: target, localExplode: null, deep: false, selected: next?.ids[0] ?? null });
  };
  const current = done > 0 ? stops[done - 1] : null;
  return (
    <div className="stepper">
      <button type="button" disabled={done === 0} onClick={() => go(done - 1)} aria-label="上一步">‹</button>
      <p>
        <span className="stepper-count">{pad(done)} / {pad(stops.length)}</span>
        {current ? `拆下 ${current.labels.join('、')}` : '完整装配 · 按 › 逐步拆开'}
      </p>
      <button type="button" disabled={done === stops.length} onClick={() => go(done + 1)} aria-label="下一步">›</button>
    </div>
  );
}

/** Size slider for the selected part, plus a button to undo its moves and resizing. */
function PartSize({ id }: { id: string }) {
  const nonce = useStudio((s) => s.editNonce);
  const [scale, setScale] = useState(() => partEdits.get(id)?.scale ?? 1);
  useEffect(() => setScale(partEdits.get(id)?.scale ?? 1), [id, nonce]);
  return (
    <div className="part-size">
      <label className="slider">
        <span>大小</span>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.05}
          value={scale}
          onChange={(e) => {
            const value = Number(e.target.value);
            editOf(id).scale = value;
            setScale(value);
          }}
        />
        <output>{scale.toFixed(2)}×</output>
      </label>
      <button type="button" className="caption-action" onClick={() => clearEdits(id)}>还原</button>
    </div>
  );
}

export function PartsLegend() {
  const machine = useMachine();
  const { selected, hovered, localExplode, view, hidden, solo, set } = useStudio();
  const focus = selected ?? hovered;
  const part = focus ? machine.parts.find((p) => p.id === focus) : undefined;
  const child = part && machine.children?.[part.id];
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
          {selected && view !== 'drawing' && <PartSize id={selected} />}
          {selected && view !== 'drawing' && (
            <div className="caption-tools">
              <button type="button" className="caption-action" onClick={() => set({ hidden: [...hidden, selected], selected: null, solo: solo === selected ? null : solo })}>隐藏</button>
              <button type="button" className="caption-action" onClick={() => set({ solo: solo === selected ? null : selected })}>{solo === selected ? '显示全部' : '只看它'}</button>
            </div>
          )}
          {child && (
            <button type="button" className="caption-open" onClick={() => selectMachine(child)}>
              拆开此组件：{machineById(child).summary} <span aria-hidden="true">↘</span>
            </button>
          )}
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
      <table className={`parts${machine.parts.length > 15 ? ' is-long' : ''}`}>
        <caption>零件明细 · PARTS</caption>
        <tbody>
          {machine.parts.map((item) => (
            <tr
              key={item.id}
              className={`${selected === item.id ? 'is-selected' : ''}${hovered === item.id ? ' is-hovered' : ''}${hidden.includes(item.id) || (solo && solo !== item.id) ? ' is-hidden' : ''}`}
              onClick={() => hidden.includes(item.id)
                ? set({ hidden: hidden.filter((h) => h !== item.id), selected: item.id })
                : set({ selected: selected === item.id ? null : item.id })}
              onPointerEnter={() => set({ hovered: item.id })}
              onPointerLeave={() => set({ hovered: null })}
            >
              <td className="num">{pad(item.index)}</td>
              <td>{item.name}{machine.children?.[item.id] && <span className="has-child" title="可继续拆开"> ▸</span>}</td>
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
