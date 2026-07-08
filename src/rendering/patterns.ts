import type { PatternLayer } from '../state/types';

const cache = new Map<string, HTMLCanvasElement>();

// Tiles render at a fixed high resolution; the compositor (drawPattern) scales
// them down to the on-surface size (layer.scale), so fine detail no longer
// degrades / pixelates at small scales.
const TILE = 512;

export async function renderPattern(layer: PatternLayer): Promise<HTMLCanvasElement> {
  // scale no longer affects the tile (it's applied at composite time), so it's
  // out of the cache key — different scales share one high-res tile.
  const key = `${layer.pattern}|${layer.color}|${layer.intensity}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = TILE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Transparent background: the layer below (or the base color) shows through.
  ctx.globalAlpha = layer.intensity;

  if (layer.pattern === 'hexagons') drawHexagons(ctx, size, layer);
  else if (layer.pattern === 'stripes') drawStripes(ctx, size, layer);
  else if (layer.pattern === 'carbon') drawCarbon(ctx, size, layer);
  else if (layer.pattern === 'smoke') drawSmoke(ctx, size, layer);
  else if (layer.pattern === 'thread') drawThread(ctx, size, layer);
  else if (layer.pattern === 'splashes') drawSplashes(ctx, size, layer);
  else if (layer.pattern === 'topo') drawTopo(ctx, size, layer);
  else if (layer.pattern === 'marble') drawMarble(ctx, size, layer);
  else if (layer.pattern === 'voronoi') drawVoronoi(ctx, size, layer);
  else if (layer.pattern === 'camo') drawCamo(ctx, size, layer, false);
  else if (layer.pattern === 'digicamo') drawCamo(ctx, size, layer, true);
  else if (layer.pattern === 'circuit') drawCircuit(ctx, size, layer);
  else if (layer.pattern === 'mesh') drawMesh(ctx, size, layer);

  cache.set(key, canvas);
  if (cache.size > 48) {
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
      // Threads fade to transparent at their edges so the surface below
      // reads as the gaps in the weave.
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, layer.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
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

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function drawSmoke(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  // Smoke fades from transparent (thin) to the foreground color (dense) so the
  // surface below shows through the wisps. putImageData bypasses globalAlpha,
  // so fold the layer intensity into the per-pixel alpha here.
  const imgData = ctx.getImageData(0, 0, size, size);
  const [fr, fg, fb] = parseHex(layer.color);
  const period = 4;
  const scale = period / size;
  const seed = 7;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbmTiled(x * scale, y * scale, period, 5, seed);
      const t = Math.max(0, Math.min(1, (n - 0.3) * 2.2));
      const idx = (y * size + x) * 4;
      imgData.data[idx] = fr;
      imgData.data[idx + 1] = fg;
      imgData.data[idx + 2] = fb;
      imgData.data[idx + 3] = Math.round(t * layer.intensity * 255);
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

/* ------------------------------------------------------------------ *
 * New high-detail patterns
 * ------------------------------------------------------------------ */

/** Topographic contour lines from tiled fBm. */
function drawTopo(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  const img = ctx.getImageData(0, 0, size, size);
  const [r, g, b] = parseHex(layer.color);
  const period = 6;
  const scale = period / size;
  const seed = 21;
  const bands = 8; // number of contour levels across the height field
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbmTiled(x * scale, y * scale, period, 5, seed);
      const v = n * bands;
      const d = Math.abs(v - Math.round(v)); // 0 on a contour line … 0.5 between
      const line = 1 - smoothstep(0.03, 0.09, d);
      const idx = (y * size + x) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = Math.round(line * layer.intensity * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Marble veins via domain-warped tiled fBm. */
function drawMarble(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  const img = ctx.getImageData(0, 0, size, size);
  const [r, g, b] = parseHex(layer.color);
  const period = 5;
  const scale = period / size;
  const seed = 41;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = fbmTiled(x * scale, y * scale, period, 4, seed);
      const qy = fbmTiled(x * scale + 1.7, y * scale + 4.3, period, 4, seed + 10);
      const val = fbmTiled(
        x * scale + (qx - 0.5) * 1.6,
        y * scale + (qy - 0.5) * 1.6,
        period,
        4,
        seed + 20,
      );
      // Sharp bright vein where the warped field crosses its midline.
      const vein = Math.pow(1 - Math.abs(2 * val - 1), 6);
      const idx = (y * size + x) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = Math.round(vein * layer.intensity * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Voronoi crackle / cells: bright borders between jittered cells (tiled). */
function drawVoronoi(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  const img = ctx.getImageData(0, 0, size, size);
  const [r, g, b] = parseHex(layer.color);
  const cells = 6; // feature-point grid across the tile
  const cs = size / cells;
  const seed = 55;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cs);
      const gy = Math.floor(y / cs);
      let f1 = Infinity;
      let f2 = Infinity;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const cxw = ((gx + ox) % cells + cells) % cells;
          const cyw = ((gy + oy) % cells + cells) % cells;
          const px = (gx + ox + hash2(cxw, cyw, seed)) * cs;
          const py = (gy + oy + hash2(cxw, cyw, seed + 1)) * cs;
          const dx = x - px;
          const dy = y - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < f1) {
            f2 = f1;
            f1 = dist;
          } else if (dist < f2) {
            f2 = dist;
          }
        }
      }
      const edge = 1 - smoothstep(0.0, cs * 0.14, f2 - f1); // thin bright border
      const idx = (y * size + x) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = Math.round(edge * layer.intensity * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Camouflage: two-tone irregular patches (organic) or grid-quantised (digital). */
function drawCamo(
  ctx: CanvasRenderingContext2D,
  size: number,
  layer: PatternLayer,
  digital: boolean,
) {
  const img = ctx.getImageData(0, 0, size, size);
  const [r, g, b] = parseHex(layer.color);
  const period = 5;
  const scale = period / size;
  const seed = 63;
  const cell = size / 40; // pixel size for digital camo
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sx = x;
      let sy = y;
      if (digital) {
        sx = Math.floor(x / cell) * cell;
        sy = Math.floor(y / cell) * cell;
      }
      const n = fbmTiled(sx * scale, sy * scale, period, 4, seed);
      // Two overlapping patch levels → dense / mid / clear.
      const t = n > 0.58 ? 1 : n > 0.44 ? 0.55 : 0;
      const idx = (y * size + x) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = Math.round(t * layer.intensity * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** PCB-style circuit: through-going traces on a grid, with vias/pads. */
function drawCircuit(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  ctx.strokeStyle = layer.color;
  ctx.fillStyle = layer.color;
  ctx.lineWidth = Math.max(1, size / 200);
  const n = 10;
  const step = size / n;
  const seed = 77;

  // Full-length traces wrap cleanly across the tile edges.
  for (let i = 0; i < n; i++) {
    const gy = i * step + step / 2;
    if (hash2(i, 0, seed) > 0.4) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(size, gy);
      ctx.stroke();
    }
    const gx = i * step + step / 2;
    if (hash2(0, i, seed + 1) > 0.4) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, size);
      ctx.stroke();
    }
  }

  // Short L-connectors + vias at grid nodes.
  for (let iy = 0; iy < n; iy++) {
    for (let ix = 0; ix < n; ix++) {
      const cx = ix * step + step / 2;
      const cy = iy * step + step / 2;
      const h = hash2(ix, iy, seed + 2);
      if (h > 0.72) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + step * (h > 0.86 ? 1 : -1), cy);
        ctx.lineTo(cx + step * (h > 0.86 ? 1 : -1), cy + step * (h > 0.86 ? 1 : -1));
        ctx.stroke();
      }
      if (hash2(ix, iy, seed + 3) > 0.6) {
        const rad = size / 90;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            ctx.beginPath();
            ctx.arc(cx + dx * size, cy + dy * size, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }
}

/** Fine technical grid/mesh with heavier major lines. */
function drawMesh(ctx: CanvasRenderingContext2D, size: number, layer: PatternLayer) {
  ctx.strokeStyle = layer.color;
  const n = 16;
  const step = size / n;
  const minor = Math.max(0.5, size / 900);
  const major = Math.max(1.2, size / 320);
  for (let i = 0; i <= n; i++) {
    const p = i * step;
    ctx.lineWidth = i % 4 === 0 ? major : minor;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
}
