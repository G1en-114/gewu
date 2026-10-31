// Renders the title card, end card and caption overlays (transparent PNGs) with Edge.
// Usage: node cards.mjs <out dir>
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = process.argv[2];
mkdirSync(out, { recursive: true });

/** Caption timeline (seconds in the final cut): poem line number (0 = none), tag above, the line itself. */
export const CAPTIONS = [
  [6, 14, 1, '格物 · 起', '五百年前，有人对着一丛竹子坐了七天，'],
  [14, 22, 2, '王阳明 · 格竹', '想从竹节里，看出天地运行的道理；'],
  [22, 30, 3, '卧式单缸蒸汽机 · 线稿实时渲染', '他没有看见。竹子只是安静地绿着，'],
  [30, 39.5, 4, '33 台机器 · 67 个可拆的装配体', '把答案藏在纤维与水的缝隙里。'],
  [40, 48, 5, '剖视 · Section', '后来我们有了铅笔、尺和一张白纸，'],
  [48, 54.5, 6, '轮廓线从三维模型里实时“描”出来', '学会把一台机器，画成一层叠一层的线；'],
  [55, 62.5, 7, '三视图 · 国标第一角画法', '主视、俯视、左视，三个方向的诚实，'],
  [62.5, 69.5, 8, '剖面线 · 细虚线 · 细点画线', '连看不见的轮廓，也留下一道虚线。'],
  [70, 79.5, 0, '工程蓝图 · Blueprint', '同一张图，换一种颜色。'],
  [80, 94.5, 9, '波音 747-400 · 着陆构型', '于是我们把它拆开——不为破坏，只为看清：'],
  [95, 109.5, 10, '按真实的维修顺序，一件一件', '一颗螺钉先退出来，一片桨叶再离开，'],
  [110, 133.5, 11, '14 级可拆 · 机翼 → 起落架 → 机轮 → 碳刹车盘', '直到七十米长的空中女王，回到一片刹车盘的大小，'],
  [134, 149.5, 12, '原创太阳系仪 · 齿数比误差 < 0.5% · 打开即今日天象', '直到摇柄转过的一圈，恰好是地球的一年。'],
  [150, 159.5, 13, '格物 · 合', '格物，不是把世界拆碎，而是把它重新装好——'],
  [160, 169.5, 14, '目录 · 33 台机器', '在每一根线条里，留一点人的温度。'],
];

const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap">`;
const BASE_CSS = `
  html,body{margin:0;width:1920px;height:1080px;overflow:hidden}
  body{font-family:'Noto Serif SC','Songti SC',serif;color:#24221f}
  .en{font-family:'Cormorant Garamond',Georgia,serif}
`;
const paper = `background:
  radial-gradient(ellipse at 55% 45%, rgba(255,255,255,.6), transparent 70%),
  linear-gradient(rgba(36,34,31,.04) 1px, transparent 1px) 0 0/28px 28px,
  linear-gradient(90deg, rgba(36,34,31,.04) 1px, transparent 1px) 0 0/28px 28px, #f4f0e7;`;

const caption = ([, , n, tag, line]) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE_CSS}
  body{background:transparent}
  .band{position:absolute;left:50%;bottom:64px;transform:translateX(-50%);width:max-content;min-width:980px;max-width:1780px;white-space:nowrap;box-sizing:border-box;padding:20px 76px 22px;
    background:rgba(247,244,236,.93);border-top:1px solid rgba(36,34,31,.45);border-bottom:1px solid rgba(36,34,31,.18);
    box-shadow:0 10px 40px rgba(60,45,30,.12);text-align:center}
  .tag{font-size:19px;letter-spacing:.32em;color:#a8432f;margin-bottom:10px}
  .line{font-size:42px;letter-spacing:.1em;line-height:1.35}
  .num{position:absolute;right:22px;top:50%;transform:translateY(-50%);font-size:26px;color:#8c867b;font-style:italic}
</style></head><body><div class="band"><div class="tag">${tag}</div><div class="line">${line}</div>${n ? `<div class="num en">${String(n).padStart(2, '0')}</div>` : ''}</div></body></html>`;

const title = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE_CSS}
  body{${paper}}
  .frame{position:absolute;inset:36px;border:1px solid rgba(36,34,31,.42)}
  .frame2{position:absolute;inset:44px;border:1px solid rgba(36,34,31,.16)}
  .box{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%);text-align:center}
  h1{margin:0;font-size:260px;font-weight:900;letter-spacing:.04em;line-height:1}
  .rule{height:1.5px;background:#24221f;margin:34px auto 26px;width:640px}
  .en{font-size:52px;letter-spacing:.6em;padding-left:.6em;font-weight:600}
  .sub{margin-top:30px;font-size:30px;letter-spacing:.42em;color:#57524a}
  .fig{position:absolute;left:96px;bottom:84px;font-size:26px;letter-spacing:.12em;color:#a8432f}
  .fig2{position:absolute;right:96px;bottom:84px;font-size:22px;letter-spacing:.2em;color:#8c867b}
</style></head><body><div class="frame"></div><div class="frame2"></div>
<div class="box"><h1>格物</h1><div class="rule"></div><div class="en">INKWORK</div><div class="sub">把机器拆开看 · 一份给好奇心的工程图谱</div></div>
<div class="fig en">FIG. 00</div><div class="fig2">工程制图 · 交互拆解</div></body></html>`;

const end = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE_CSS}
  body{${paper}}
  .frame{position:absolute;inset:36px;border:1px solid rgba(36,34,31,.42)}
  .box{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);text-align:center}
  h1{margin:0;font-size:150px;font-weight:900;letter-spacing:.06em}
  .en{font-size:44px;letter-spacing:.5em;padding-left:.5em;font-weight:600;margin-top:6px}
  .stats{display:flex;justify-content:center;gap:90px;margin-top:64px}
  .stat b{display:block;font:500 92px/1 'Cormorant Garamond',Georgia,serif}
  .stat span{display:block;margin-top:14px;font-size:24px;letter-spacing:.2em;color:#57524a}
  .url{position:absolute;left:0;right:0;bottom:110px;text-align:center;font-size:30px;letter-spacing:.14em;color:#a8432f}
</style></head><body><div class="frame"></div>
<div class="box"><h1>格物</h1><div class="en">INKWORK</div>
<div class="stats"><div class="stat"><b>33</b><span>台机器</span></div><div class="stat"><b>67</b><span>个可拆装配体</span></div><div class="stat"><b>14</b><span>级逐级拆解</span></div><div class="stat"><b>0.5%</b><span>齿数比误差以内</span></div></div></div>
<div class="url en">github.com/G1en-114/gewu</div></body></html>`;

const pages = [['title', title], ['end', end], ...CAPTIONS.map((c, i) => [`cap${String(i).padStart(2, '0')}`, caption(c)])];
for (const [name, html] of pages) writeFileSync(join(out, `${name}.html`), html);
writeFileSync(join(out, 'captions.json'), JSON.stringify(CAPTIONS));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9500 + Math.floor(Math.random() * 100);
const proc = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'edge-'))}`, '--hide-scrollbars', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
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
