// Records the demo scenes from the live app with the GPU, one folder of
// timestamped JPEG frames per scene. Usage: node record.mjs <out dir> [scene ...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnEdge } from '../../edge.mjs';

const [out, ...only] = process.argv.slice(2);
const BASE = 'http://localhost:5199/';
const W = 1920;
const H = 1080;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws; let proc; let id = 0; const pending = new Map(); let onFrame = null;
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;

/** A fresh GPU browser for each scene, so memory from the last one never piles up. */
async function launch() {
  const port = 9700 + Math.floor(Math.random() * 200);
  proc = spawnEdge([`--remote-debugging-port=${port}`,
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', `--window-size=${W},${H}`, 'about:blank']);
  let t; for (let i = 0; i < 50 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page'); } catch {} await sleep(200); }
  ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Page.screencastFrame') onFrame?.(m.params);
  });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE }); await sleep(2500);
  await ev(`localStorage.setItem('gewu-catalogue-seen','1')`);
}

// ── Actions ──
const click = (sel, text) => ev(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(sel)})].find(b=>${text ? `b.textContent.trim()===${JSON.stringify(text)}` : 'true'});el?.click();return !!el})()`);
const step = (i) => ev(`(()=>{const s=[...document.querySelectorAll('.step-num')];s[${i}]?.closest('button').click()})()`);
const theme = (name) => ev(`(()=>{const b=document.querySelector('.meta-theme');const on=document.documentElement.dataset.theme==='blueprint';if((${JSON.stringify(name)}==='blueprint')!==on)b.click()})()`);
const mouse = (type, x, y, buttons = 0) => send('Input.dispatchMouseEvent', { type, x, y, button: buttons ? 'left' : 'none', buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });
/** A slow orbit: drag across the stage by dx pixels over ms milliseconds. */
async function orbit(dx, ms, dy = 0) {
  const x0 = 1150; const y0 = 160; const start = Date.now();
  await mouse('mousePressed', x0, y0, 1);
  for (let k = 0; k < 1; k = Math.min(1, (Date.now() - start) / ms)) {
    // Ease in and out so the camera drifts rather than lurches.
    const e = 0.5 - 0.5 * Math.cos(Math.PI * k);
    await mouse('mouseMoved', x0 + dx * e, y0 + dy * e, 1);
    await sleep(30);
  }
  await mouse('mouseReleased', x0 + dx, y0 + dy, 0);
}
async function open(hash, wait = 6500) {
  await send('Page.navigate', { url: `${BASE}?r=${Math.random()}#${hash}` });
  await sleep(wait);
  await mouse('mouseMoved', 1900, 1060);
}

/** Cinematic frame: hide the panels so only the drawing fills the screen. */
const bare = () => ev(`(()=>{if(document.getElementById('promo'))return;const s=document.createElement('style');s.id='promo';s.textContent='.title-column,.plate-meta,.legend,.stage-hint,.paper-drawings{display:none!important}.studio::before{display:none!important}';document.head.appendChild(s)})()`);
/** Push the camera in (n wheel notches toward the centre of the stage). */
async function zoom(n) {
  for (let i = 0; i < n; i += 1) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 960, y: 540, deltaX: 0, deltaY: -120 }); await sleep(120); }
  await sleep(1200);
}
const deselect = () => ev(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
/** Turn the part numbers off for a cleaner picture. */
const noLabels = () => ev(`(()=>{const b=[...document.querySelectorAll('.toggles button')].find(x=>x.textContent.trim()==='标注');if(b&&b.classList.contains('is-on'))b.click()})()`);

// ── Scenes: setup (not recorded), then the recorded action and its length (s) ──
const SCENES = {
  engine: { len: 14, setup: async () => { await open('engine', 8000); await bare(); await deselect(); await zoom(3); }, run: async () => { await orbit(-200, 13500, -10); } },
  turbofan: { len: 14, setup: async () => { await open('turbofan', 7000); await step(1); await bare(); await noLabels(); await sleep(3000); await deselect(); await zoom(3); }, run: async () => { await orbit(-70, 13500, 6); } },
  teardown: { len: 10, setup: async () => { await open('b747', 9000); await bare(); await noLabels(); await zoom(1); }, run: async () => { await sleep(400); await step(3); await sleep(300); await deselect(); await orbit(160, 8800); } },
  brake: { len: 9, setup: async () => { await open('b747/wheel', 7000); await bare(); await noLabels(); }, run: async () => { await sleep(300); await step(1); await orbit(-140, 8500); } },
  ortho: { len: 13, setup: async () => { await open('vise', 7000); await click('.views button', '三视图'); await bare(); await sleep(3000); }, run: async () => {
    for (const [x, y] of [[880, 470], [880, 905], [1630, 470], [1450, 300], [880, 470]]) { await mouse('mouseMoved', x, y); await sleep(2500); }
  } },
  blueprint: { len: 12, setup: async () => { await theme('blueprint'); await open('b747', 9000); await bare(); await noLabels(); await deselect(); await zoom(3); }, run: async () => { await sleep(500); await click('.strokes button', '着陆'); await orbit(-200, 11000, 8); } },
  orrery: { len: 12, setup: async () => { await open('orrery', 8000); await click('.strokes button', '一年 10 秒'); await bare(); await noLabels(); await sleep(1500); }, run: async () => { await orbit(-240, 11500, -12); } },
  catalogue: { len: 10, setup: async () => { await open('engine', 6000); }, run: async () => {
    await sleep(300); await click('.meta-catalogue'); await sleep(1500);
    for (const i of Array(50).keys()) { void i; await ev(`document.querySelector('.catalogue').scrollBy(0, 24)`); await sleep(120); }
  } },
};

for (const [name, scene] of Object.entries(SCENES)) {
  if (only.length && !only.includes(name)) continue;
  const dir = join(out, name);
  mkdirSync(dir, { recursive: true });
  await launch();
  await scene.setup();
  const frames = [];
  onFrame = (f) => {
    const file = `${String(frames.length).padStart(5, '0')}.jpg`;
    writeFileSync(join(dir, file), Buffer.from(f.data, 'base64'));
    frames.push([file, f.metadata.timestamp]);
    send('Page.screencastFrameAck', { sessionId: f.sessionId });
  };
  await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const started = Date.now();
  await scene.run();
  const left = scene.len * 1000 - (Date.now() - started);
  if (left > 0) await sleep(left);
  await send('Page.stopScreencast');
  onFrame = null;
  // ffmpeg concat list: each frame shown until the next one arrives.
  if (!frames.length) { console.log(`${name}: no frames`); ws.close(); proc.kill(); continue; }
  const lines = ['ffconcat version 1.0'];
  frames.forEach(([file, ts], i) => {
    const next = frames[i + 1]?.[1] ?? frames[0][1] + scene.len;
    lines.push(`file '${file}'`, `duration ${Math.max(0.001, next - ts).toFixed(4)}`);
  });
  lines.push(`file '${frames[frames.length - 1][0]}'`);
  writeFileSync(join(dir, 'list.ffconcat'), lines.join('\n'));
  console.log(`${name}: ${frames.length} frames, ${(frames.length / scene.len).toFixed(1)} fps`);
  ws.close(); proc.kill(); await sleep(1500);
}
process.exit(0);
