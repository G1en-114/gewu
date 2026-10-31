/**
 * Smoke test: open every assembly (and subassembly) in headless Edge, step to
 * its last study step and the three-view drawing, and report console errors.
 *
 *   npm run build && npx vite preview --port 5199
 *   node scripts/check-machines.mjs http://localhost:5199/ [--only watch,model-t] [--jobs 3] [--shots dir]
 *
 * --only   test just these assemblies (an id, or a prefix such as model-t/)
 * --jobs   browsers to run side by side (default 3)
 * --shots  save a screenshot of each assembly at its last step, for eyeballing framing
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const only = flag('--only')?.split(',');
const jobs = Number(flag('--jobs') ?? 3);
const shots = flag('--shots');
const [base = 'http://localhost:5199/'] = args;
if (shots) mkdirSync(shots, { recursive: true });

const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
const ids = [...new Set(files(fileURLToPath(new URL('../src/machines', import.meta.url)))
  .filter((f) => /\.tsx?$/.test(f))
  .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/(?:level\(\{|MachineDef = \{)\s*id: '([^']+)'/g)].map((m) => m[1])))]
  .filter((m) => !only || only.some((o) => m === o || m.startsWith(o)))
  .sort();
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One headless Edge with a DevTools connection; collects console errors into `errors`. */
async function browser() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(edge, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'edge-'))}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
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
  b.run = (expression) => b.send('Runtime.evaluate', { expression, awaitPromise: true });
  b.close = () => { ws.close(); proc.kill(); };
  await b.send('Runtime.enable');
  await b.send('Page.enable');
  await b.send('Page.navigate', { url: base });
  await sleep(6000);
  await b.run(`try{localStorage.setItem('gewu-catalogue-seen','1')}catch(e){}`);
  return b;
}

async function check(b, m) {
  b.errors = [];
  await b.send('Page.navigate', { url: `${base}?n=${encodeURIComponent(m)}#${m}` });
  await sleep(4500);
  const name = (await b.run(`document.querySelector('.subject h2')?.textContent`)).result?.result?.value;
  await b.run(`(()=>{const s=[...document.querySelectorAll('.step-num')];s[s.length-1]?.closest('button').click()})()`);
  await sleep(2500);
  if (shots) {
    const shot = await b.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(shots, `${m.replace(/\//g, '_')}.png`), Buffer.from(shot.result.data, 'base64'));
  }
  await b.run(`[...document.querySelectorAll('.views button')].find(b=>b.textContent.trim()==='三视图')?.click()`);
  await sleep(2000);
  await b.run(`[...document.querySelectorAll('.views button')].find(b=>b.textContent.trim()==='透视')?.click()`);
  await sleep(500);
  const uniq = [...new Set(b.errors)];
  console.log(`${uniq.length ? '✗' : '✓'} ${m} (${name})${uniq.length ? '\n    ' + uniq.join('\n    ') : ''}`);
  return uniq.length === 0;
}

const queue = [...ids];
let bad = 0;
await Promise.all(Array.from({ length: Math.min(jobs, ids.length) }, async () => {
  const b = await browser();
  for (let m; (m = queue.shift()); ) if (!(await check(b, m))) bad += 1;
  b.close();
}));
console.log(`\n${ids.length - bad}/${ids.length} clean`);
process.exit(bad ? 1 : 0);
