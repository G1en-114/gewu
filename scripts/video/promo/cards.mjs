// Promo cards: title, end, and chapter captions (transparent PNGs). Usage: node cards.mjs <out dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnEdge } from '../../edge.mjs';

const out = process.argv[2];
mkdirSync(out, { recursive: true });

/** [start, end, number, English, title, line, blueprint?] in the final cut (seconds). */
const CAPTIONS = [
  [6, 17.4, '01', 'Live Ink Rendering', '线稿实时渲染', '每一条轮廓，都从三维模型里实时描出来。'],
  [19, 30.4, '02', 'Section View', '一刀剖开', '沿中线切开，流道、齿轮、活塞，一目了然。'],
  [31.6, 40.2, '03', 'Teardown, Level by Level', '逐级拆解', '按真实的维修顺序，一件一件拆下来——'],
  [40.6, 48.4, '03', 'Down to the Brake Discs', '一直拆到最小的零件', '波音 747 一共 14 级，最深拆到碳刹车盘。'],
  [50, 60.4, '04', 'Orthographic Drawing', '国标三视图', '第一角画法，虚线、剖面线、投影连线一应俱全。'],
  [62, 71.4, '05', 'Blueprint', '一键工程蓝图', '同一张图，换一种颜色。', true],
  [73, 82.4, '06', 'True Motion', '真实的运动', '原创太阳系仪：齿数比按公转周期设计，误差不到 0.5%。'],
  [84, 91.4, '07', 'Thirty-Three Machines', '33 台机器，67 个可拆装配体', '从千斤顶到波音 747，打开网页就能用。'],
];

const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap">`;
const BASE_CSS = `html,body{margin:0;width:1920px;height:1080px;overflow:hidden}body{font-family:'Noto Serif SC','Songti SC',serif}.en{font-family:'Cormorant Garamond',Georgia,serif}`;
const paper = `background:radial-gradient(ellipse at 55% 45%, rgba(255,255,255,.6), transparent 70%),linear-gradient(rgba(36,34,31,.04) 1px, transparent 1px) 0 0/28px 28px,linear-gradient(90deg, rgba(36,34,31,.04) 1px, transparent 1px) 0 0/28px 28px,#f4f0e7;`;

const caption = ([, , n, en, title, line, blue], i) => {
  const strong = i === 7;
  const ink = blue ? '#e8f0f9' : '#24221f';
  const ink2 = blue ? '#b8cbe2' : '#57524a';
  const accent = blue ? '#ffc35c' : '#a8432f';
  const glow = blue ? '23,59,99' : '244,240,231';
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE_CSS}
  body{background:transparent}
  .glow{position:absolute;left:-260px;bottom:-240px;width:1500px;height:640px;background:radial-gradient(ellipse at 38% 62%, rgba(${glow},.98) 0%, rgba(${glow},${strong ? '.97' : '.9'}) ${strong ? 52 : 36}%, rgba(${glow},0) ${strong ? 82 : 70}%)}
  .box{position:absolute;left:118px;bottom:104px;color:${ink}}
  .kick{display:flex;align-items:center;gap:18px;font-size:30px;color:${accent}}
  .kick i{display:block;width:72px;height:1px;background:${accent}}
  .kick span{font-style:italic;font-size:26px;color:${ink2};letter-spacing:.04em}
  h2{margin:14px 0 0;font-size:64px;font-weight:600;letter-spacing:.08em;line-height:1.15}
  p{margin:16px 0 0;font-size:27px;letter-spacing:.06em;color:${ink2}}
</style></head><body><div class="glow"></div><div class="box"><div class="kick en">${n}<i></i><span>${en}</span></div><h2>${title}</h2><p>${line}</p></div></body></html>`;
};

const frame = `.frame{position:absolute;inset:36px;border:1px solid rgba(36,34,31,.42)}.frame2{position:absolute;inset:44px;border:1px solid rgba(36,34,31,.16)}`;
const title = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE_CSS}body{${paper}color:#24221f}${frame}
  .box{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);text-align:center}
  h1{margin:0;font-size:240px;font-weight:900;letter-spacing:.04em;line-height:1}
  .rule{height:1.5px;background:#24221f;margin:34px auto 26px;width:600px}
  .name{font-size:50px;letter-spacing:.6em;padding-left:.6em;font-weight:600}
  .sub{margin-top:30px;font-size:30px;letter-spacing:.4em;padding-left:.4em;color:#57524a}
</style></head><body><div class="frame"></div><div class="frame2"></div>
<div class="box"><h1>格物</h1><div class="rule"></div><div class="name en">INKWORK</div><div class="sub">一份能拆开看的机械图谱</div></div></body></html>`;

const end = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE_CSS}body{${paper}color:#24221f}${frame}
  .box{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);text-align:center}
  h1{margin:0;font-size:150px;font-weight:900;letter-spacing:.06em}
  .name{font-size:42px;letter-spacing:.5em;padding-left:.5em;font-weight:600;margin-top:4px}
  .feat{margin-top:56px;font-size:28px;letter-spacing:.3em;padding-left:.3em;color:#57524a}
  .url{position:absolute;left:0;right:0;bottom:116px;text-align:center;font-size:30px;letter-spacing:.14em;color:#a8432f}
</style></head><body><div class="frame"></div><div class="frame2"></div>
<div class="box"><h1>格物</h1><div class="name en">INKWORK</div><div class="feat">线稿 · 剖视 · 拆解 · 三视图 · 蓝图</div></div>
<div class="url en">github.com/G1en-114/gewu</div></body></html>`;

const pages = [['title', title], ['end', end], ...CAPTIONS.map((c, i) => [`cap${String(i).padStart(2, '0')}`, caption(c, i)])];
for (const [name, html] of pages) writeFileSync(join(out, `${name}.html`), html);
writeFileSync(join(out, 'captions.json'), JSON.stringify(CAPTIONS.map(([a, b]) => [a, b])));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9500 + Math.floor(Math.random() * 100);
const proc = spawnEdge([`--remote-debugging-port=${port}`, '--hide-scrollbars', '--window-size=1920,1080', 'about:blank']);
let t; for (let i = 0; i < 50 && !t; i++) { try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page'); } catch {} await sleep(200); }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const p = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m); p.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
for (const [name] of pages) {
  await send('Page.navigate', { url: 'file:///' + join(out, `${name}.html`).replace(/\\/g, '/') });
  await sleep(name === 'title' ? 2500 : 1200);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(out, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
}
console.log('cards:', pages.length);
ws.close(); proc.kill(); process.exit(0);
