// Renders thumbnails of every design template (src/templates/<id>.json) in the
// running app: the whole bike (src/templates/thumbs/<id>.webp) and its front
// wheel alone in the wheel designer (src/templates/thumbs/wheels/<id>.webp).
//
//   npm run dev        (then, in a second terminal)
//   node scripts/render-template-thumbs.mjs [dev-server-url] [id,id,...]
//
// With a list of ids only those templates are rendered (default: all).
//
// Drives a headless Chromium (Edge by default; set BROWSER to another
// Chromium-based executable) over the DevTools protocol. Needs Node 22+.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const ONLY = process.argv[3]?.split(',');
const BROWSER = process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const DIR = path.resolve(import.meta.dirname, '../src/templates');
const PORT = 9339;
// The bike in the default 3/4 view at a 1600×1000 window, as a 4:3 crop.
const CLIP = { x: 455, y: 302, width: 900, height: 675 };
// The wheel designer's face-on wheel (with its floor shadow), also 4:3.
const CLIP_WHEEL = { x: 387, y: 222, width: 826, height: 620 };
const THUMB_W = 320;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'thumbs-'));
const browser = spawn(BROWSER, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--window-size=1600,1000',
  '--no-first-run',
  '--enable-unsafe-swiftshader',
  'about:blank',
]);

try {
  let targets;
  for (let i = 0; i < 50 && !targets; i++) {
    await sleep(200);
    targets = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json(), () => undefined);
  }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++seq, (msg) => (msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)));
      ws.send(JSON.stringify({ id: seq, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description);
    return r.result.value;
  };

  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL });
  while (!(await evaluate('document.readyState === "complete" && !!document.querySelector("canvas")').catch(() => false))) {
    await sleep(500);
  }
  await sleep(4000);
  // The app's own module instances (Vite may serve them with a ?t= suffix).
  await evaluate(`(async () => {
    const url = (f) => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(f));
    window.__store = await import(url('/src/state/designStore.ts'));
    // Only the bike: no panels, guides or highlights. The template strip is
    // closed (not just hidden) so the framing doesn't make room for it; the
    // still wheel faces the camera the same way in every shot.
    const ui = (await import(url('/src/state/uiStore.ts'))).useUIStore.getState();
    ui.setCapturing(true);
    ui.setGalleryOpen(false);
    ui.setWheelSpin(false);
    const style = document.createElement('style');
    style.textContent = '[data-overlay], .viewport-dock { visibility: hidden; }';
    document.head.append(style);
  })()`);

  const capture = async (clip) => {
    const { data } = await send('Page.captureScreenshot', {
      format: 'webp',
      quality: 80,
      clip: { ...clip, scale: THUMB_W / clip.width },
    });
    return Buffer.from(data, 'base64');
  };

  // Collect first, write last: new files under src/ make Vite reload the page.
  const shots = [];
  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && (!ONLY || ONLY.includes(f.slice(0, -5))))) {
    const design = fs.readFileSync(path.join(DIR, file), 'utf8');
    const name = file.replace('.json', '.webp');
    await evaluate(`window.__store.loadDesignFile(${design})`);
    await sleep(6000); // GLB, fonts and layer textures
    shots.push([name, await capture(CLIP)]);
    // Entering the wheel designer remounts the (unturned) preview wheel.
    await evaluate(`window.__store.useDesignStore.getState().setActiveZone('frontRim')`);
    await sleep(3000);
    shots.push([`wheels/${name}`, await capture(CLIP_WHEEL)]);
  }
  fs.mkdirSync(path.join(DIR, 'thumbs', 'wheels'), { recursive: true });
  for (const [name, buf] of shots) {
    fs.writeFileSync(path.join(DIR, 'thumbs', name), buf);
    console.log(`${name}  ${(buf.length / 1024).toFixed(1)} KB`);
  }
  ws.close();
} finally {
  browser.kill();
}
