/**
 * Smoke test: open every assembly (and subassembly) in headless Edge, step to
 * its last study step and the three-view drawing, and report console errors.
 *
 *   npm run build && npx vite preview --port 5199
 *   node scripts/check-machines.mjs http://localhost:5199/
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [base = 'http://localhost:5199/'] = process.argv.slice(2);
const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
const ids = [...new Set(files(fileURLToPath(new URL('../src/machines', import.meta.url)))
  .filter((f) => /\.tsx?$/.test(f))
  .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/(?:level\(\{|MachineDef = \{)\s*id: '([^']+)'/g)].map((m) => m[1])))].sort();
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(edge, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'edge-'))}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
  await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
let errors = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).split('\n')[0]);
  if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) errors.push(msg.params.type + ' ' + msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const run = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true });
await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: base });
await sleep(6000);
await run(`try{localStorage.setItem('gewu-catalogue-seen','1')}catch(e){}`);
let bad = 0;
for (const m of ids) {
  errors = [];
  await send('Page.navigate', { url: `${base}?n=${encodeURIComponent(m)}#${m}` });
  await sleep(4500);
  const name = (await run(`document.querySelector('.subject h2')?.textContent`)).result?.result?.value;
  await run(`(()=>{const s=[...document.querySelectorAll('.step-num')];s[s.length-1]?.closest('button').click()})()`);
  await sleep(2500);
  await run(`[...document.querySelectorAll('.views button')].find(b=>b.textContent.trim()==='三视图')?.click()`);
  await sleep(2000);
  await run(`[...document.querySelectorAll('.views button')].find(b=>b.textContent.trim()==='透视')?.click()`);
  await sleep(500);
  const uniq = [...new Set(errors)];
  if (uniq.length) bad += 1;
  console.log(`${uniq.length ? '✗' : '✓'} ${m} (${name})${uniq.length ? '\n    ' + uniq.join('\n    ') : ''}`);
}
console.log(`\n${ids.length - bad}/${ids.length} clean`);
ws.close();
proc.kill();
process.exit(0);
