import type { PatternLayer } from '../state/types';

const cache = new Map<string, HTMLCanvasElement>();

export async function renderPattern(layer: PatternLayer): Promise<HTMLCanvasElement> {
  const key = `${layer.pattern}|${layer.color}|${layer.background}|${layer.scale}|${layer.intensity}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = Math.max(32, Math.round(layer.scale * 8));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = layer.background;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = layer.intensity;

  if (layer.pattern === 'hexagons') drawHexagons(ctx, size, layer);
  else if (layer.pattern === 'stripes') drawStripes(ctx, size, layer);
  else if (layer.pattern === 'carbon') drawCarbon(ctx, size, layer);
  else if (layer.pattern === 'smoke') drawSmoke(ctx, size, layer);
  else if (layer.pattern === 'thread') drawThread(ctx, size, layer);
  else if (layer.pattern === 'splashes') drawSplashes(ctx, size, layer);

  cache.set(key, canvas);
  if (cache.size > 64) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return canvas;
}

function drawHexagons(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  const r = size / 8;
  const hexW = Math.sqrt(3) * r;
  const hexH = 2 * r;
  const vStep = hexH * 0.75;
  ctx.strokeStyle = layer.color;
  ctx.lineWidth = Math.max(0.5, r * 0.15);

  for (let y = -r; y < size + hexH; y += vStep) {
    const rowIndex = Math.round((y + r) / vStep);
    const xOff = rowIndex % 2 === 0 ? 0 : hexW / 2;
    for (let x = -hexW; x < size + hexW; x += hexW) {
      drawHex(ctx, x + xOff, y, r);
    }
  }
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawStripes(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  const w = Math.max(2, size / 6);
  ctx.fillStyle = layer.color;
  for (let x = 0; x < size + w; x += w * 2) {
    ctx.fillRect(x, -size, w, size * 3);
  }
}

function drawCarbon(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  const cell = size / 4;
  ctx.fillStyle = layer.color;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cx = x * cell;
      const cy = y * cell;
      const checker = (x + y) % 2 === 0;
      ctx.save();
      ctx.translate(cx + cell / 2, cy + cell / 2);
      ctx.rotate(checker ? Math.PI / 4 : -Math.PI / 4);
      const w = cell * 0.95;
      const h = cell * 0.35;
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, layer.background);
      g.addColorStop(0.5, layer.color);
      g.addColorStop(1, layer.background);
      ctx.fillStyle = g;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
}

function hash2(x: number, y: number, seed = 0): number {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) % 10000) / 10000;
}

function valueNoiseTiled(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const wrap = (v: number) => ((v % period) + period) % period;
  const a = hash2(wrap(xi), wrap(yi), seed);
  const b = hash2(wrap(xi + 1), wrap(yi), seed);
  const c = hash2(wrap(xi), wrap(yi + 1), seed);
  const d = hash2(wrap(xi + 1), wrap(yi + 1), seed);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbmTiled(x: number, y: number, period: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoiseTiled(x * freq, y * freq, period * freq, seed + i);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawSmoke(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  const imgData = ctx.getImageData(0, 0, size, size);
  const [br, bg, bb] = parseHex(layer.background);
  const [fr, fg, fb] = parseHex(layer.color);
  const period = 4;
  const scale = period / size;
  const seed = 7;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbmTiled(x * scale, y * scale, period, 5, seed);
      const t = Math.max(0, Math.min(1, (n - 0.3) * 2.2));
      const idx = (y * size + x) * 4;
      imgData.data[idx] = br * (1 - t) + fr * t;
      imgData.data[idx + 1] = bg * (1 - t) + fg * t;
      imgData.data[idx + 2] = bb * (1 - t) + fb * t;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function drawThread(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  ctx.strokeStyle = layer.color;
  ctx.lineWidth = Math.max(0.6, size / 240);
  const count = Math.max(30, Math.round(size / 3));
  const rng = (i: number) => hash2(i, i * 13, 99);
  for (let i = 0; i < count; i++) {
    const y0 = rng(i) * size;
    const y1 = y0 + (rng(i + count) - 0.5) * size * 0.3;
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, y0);
    ctx.lineTo(size * 1.2, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, y0 + size);
    ctx.lineTo(size * 1.2, y1 + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, y0 - size);
    ctx.lineTo(size * 1.2, y1 - size);
    ctx.stroke();
  }
}

function drawSplashes(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  ctx.fillStyle = layer.color;
  const count = Math.max(20, Math.round(size / 12));
  const rng = (i: number, s: number) => hash2(i, s, 101);
  for (let i = 0; i < count; i++) {
    const cx = rng(i, 1) * size;
    const cy = rng(i, 2) * size;
    const r = (0.4 + rng(i, 3) * 2.5) * (size / 80);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        ctx.beginPath();
        ctx.arc(cx + dx * size, cy + dy * size, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const droplets = Math.floor(rng(i, 4) * 5) + 1;
    for (let j = 0; j < droplets; j++) {
      const a = rng(i + j, 5) * Math.PI * 2;
      const d = rng(i + j, 6) * r * 4 + r * 0.5;
      const dr = (0.1 + rng(i + j, 7) * 0.5) * r;
      const dcx = cx + Math.cos(a) * d;
      const dcy = cy + Math.sin(a) * d;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          ctx.beginPath();
          ctx.arc(dcx + dx * size, dcy + dy * size, dr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
