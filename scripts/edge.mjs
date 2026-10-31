/**
 * Headless Edge over the DevTools protocol, shared by the self-check and the
 * thumbnail scripts.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Every assembly id declared under src/machines (top level and subassemblies), sorted. */
export function assemblyIds() {
  const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
  return [...new Set(files(fileURLToPath(new URL('../src/machines', import.meta.url)))
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'))
    .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/(?:level\(\{|MachineDef = \{)\s*id: '([^']+)'/g)].map((m) => m[1])))].sort();
}

/**
 * Start a headless Edge on `base` with the catalogue already dismissed.
 * Console errors and exceptions collect in `errors`.
 */
export async function browser(base, { width = 1280, height = 800 } = {}) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'edge-'))}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
    await sleep(200);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  const b = { errors: [] };
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') b.errors.push('EXC ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).split('\n')[0]);
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) b.errors.push(msg.params.type + ' ' + msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
  });
  b.send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  /** Evaluate an expression in the page and return its (JSON) value. */
  b.eval = async (expression) => (await b.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
  /** Open an assembly by id and wait for it to settle. */
  b.open = async (m, wait = 4500) => {
    await b.send('Page.navigate', { url: `${base}?n=${encodeURIComponent(m)}#${m}` });
    await sleep(wait);
  };
  b.close = () => { ws.close(); proc.kill(); };
  await b.send('Runtime.enable');
  await b.send('Page.enable');
  await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await b.send('Page.navigate', { url: base });
  await sleep(6000);
  await b.eval(`try{localStorage.setItem('gewu-catalogue-seen','1')}catch(e){}`);
  return b;
}
