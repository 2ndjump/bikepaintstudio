import type {
  BlendMode,
  DecalLayer,
  ImageLayer,
  Layer,
  LayerEffect,
  PatternLayer,
  ShapeLayer,
  SolidColorLayer,
  ZoneId,
} from '../state/types';
import { renderPattern } from './patterns';
import { getZoneAspect } from './zoneMetrics';

/** Apply a blur/smear effect to a canvas's own pixels, in place. Opacity/blend
 *  are handled by the caller when compositing the result. */
function applyEffect(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  effect: LayerEffect,
): void {
  const { kind, amount, angle } = effect;
  if (amount <= 0) return;
  const w = canvas.width;
  const h = canvas.height;

  const snap = document.createElement('canvas');
  snap.width = w;
  snap.height = h;
  const sctx = snap.getContext('2d');
  if (!sctx) return;
  sctx.drawImage(canvas, 0, 0);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);

  if (kind === 'gaussian') {
    ctx.filter = `blur(${amount}px)`;
    ctx.drawImage(snap, 0, 0);
    ctx.filter = 'none';
  } else {
    const steps = 12;
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    ctx.globalAlpha = (1 / steps) * 1.6;
    for (let i = 0; i < steps; i++) {
      const t = (i / (steps - 1) - 0.5) * 2;
      ctx.filter = kind === 'directional' ? `blur(${Math.max(0.5, amount * 0.1)}px)` : 'none';
      ctx.drawImage(snap, dx * t * amount, dy * t * amount);
    }
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }
}

const ZONE_CANVAS_DIMS: Record<ZoneId, { w: number; h: number }> = {
  headTube: { w: 1024, h: 1024 },
  topTube: { w: 256, h: 1024 },
  downTube: { w: 320, h: 1024 },
  seatTube: { w: 256, h: 1024 },
  seatStays: { w: 160, h: 1024 },
  chainStays: { w: 224, h: 1024 },
  fork: { w: 256, h: 1024 },
  frontRim: { w: 2048, h: 128 },
  rearRim: { w: 2048, h: 128 },
};

const BLEND_MODE_MAP: Record<BlendMode, GlobalCompositeOperation> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  softLight: 'soft-light',
  hardLight: 'hard-light',
  colorDodge: 'color-dodge',
  colorBurn: 'color-burn',
};

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function cssFilterForImage(layer: ImageLayer): string {
  const b = 1 + layer.brightness;
  const c = 1 + layer.contrast;
  const s = 1 + layer.saturation;
  const h = layer.hueShift;
  return `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${h}deg)`;
}

function applyLevelsAndDodgeBurn(data: ImageData, layer: ImageLayer): void {
  const black = layer.levelsBlack * 255;
  const white = layer.levelsWhite * 255;
  const gamma = layer.levelsGamma;
  const dodge = layer.dodge;
  const burn = layer.burn;
  const span = Math.max(1, white - black);
  const invGamma = 1 / Math.max(0.01, gamma);
  const needsLevels = black > 0 || white < 255 || Math.abs(gamma - 1) > 0.001;
  const needsDodge = dodge > 0.001;
  const needsBurn = burn > 0.001;
  if (!needsLevels && !needsDodge && !needsBurn) return;

  const arr = data.data;
  for (let i = 0; i < arr.length; i += 4) {
    if (arr[i + 3] === 0) continue;
    for (let c = 0; c < 3; c++) {
      let v = arr[i + c] / 255;
      if (needsLevels) {
        v = (v * 255 - black) / span;
        if (v < 0) v = 0;
        else if (v > 1) v = 1;
        v = Math.pow(v, invGamma);
      }
      if (needsDodge) {
        const denom = Math.max(0.001, 1 - dodge);
        v = v / denom;
        if (v > 1) v = 1;
      }
      if (needsBurn) {
        const denom = Math.max(0.001, 1 - burn);
        v = 1 - (1 - v) / denom;
        if (v < 0) v = 0;
      }
      arr[i + c] = Math.round(v * 255);
    }
  }
}

export class ZoneCompositor {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Layer coverage (the layer stack over transparent): alpha = how much the
   *  layers hide the base. Used so global dividers only recolour the base coat,
   *  leaving the layers on top. Same UV layout as `canvas`. */
  coverageCanvas: HTMLCanvasElement;
  private coverageCtx: CanvasRenderingContext2D;
  zoneId: ZoneId;
  /** Serialises render() calls: the async body mutates this.ctx, so overlapping
   *  runs on the same compositor would corrupt the shared canvas. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(zoneId: ZoneId) {
    this.zoneId = zoneId;
    const dims = ZONE_CANVAS_DIMS[zoneId];
    this.canvas = document.createElement('canvas');
    this.canvas.width = dims.w;
    this.canvas.height = dims.h;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.coverageCanvas = document.createElement('canvas');
    this.coverageCanvas.width = dims.w;
    this.coverageCanvas.height = dims.h;
    const covCtx = this.coverageCanvas.getContext('2d');
    if (!covCtx) throw new Error('Canvas 2D context not available');
    this.coverageCtx = covCtx;
  }

  render(layers: Layer[], baseColor: string): Promise<HTMLCanvasElement> {
    const run = this.queue.catch(() => {}).then(() => this.renderNow(layers, baseColor));
    this.queue = run;
    return run;
  }

  private async renderNow(layers: Layer[], baseColor: string): Promise<HTMLCanvasElement> {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.clearRect(0, 0, w, h);

    // Opaque base fill the user-managed layer stack composites on top of.
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    // Coverage: the same layer stack over transparent, so its alpha records how
    // much the base is hidden (for divider-under-layers). Reset it here.
    const cov = this.coverageCtx;
    cov.setTransform(1, 0, 0, 1, 0, 0);
    cov.globalCompositeOperation = 'source-over';
    cov.globalAlpha = 1;
    cov.filter = 'none';
    cov.clearRect(0, 0, w, h);

    // The alpha of the most recent non-clip layer's content — clip layers are
    // masked to it ("clip to layer below" / clipping-mask groups).
    let clipMask: HTMLCanvasElement | null = null;

    for (const layer of layers) {
      if (!layer.visible) continue;

      // Render this layer's content to an isolated offscreen (so effects,
      // clipping and blending compose cleanly).
      const off = this.getEffectCanvas();
      const offCtx = off.ctx;
      const prevCtx = this.ctx;
      this.ctx = offCtx;
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.globalAlpha = 1;
      offCtx.globalCompositeOperation = 'source-over';
      offCtx.filter = 'none';
      offCtx.clearRect(0, 0, w, h);
      await this.drawLayerContent(layer);
      this.ctx = prevCtx;

      if (layer.effect && layer.effect.amount > 0) {
        applyEffect(off.canvas, offCtx, layer.effect);
      }

      // Clip to the layer below (mask by its alpha) when requested.
      if (layer.clip && clipMask) {
        offCtx.setTransform(1, 0, 0, 1, 0, 0);
        offCtx.globalAlpha = 1;
        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.filter = 'none';
        offCtx.drawImage(clipMask, 0, 0);
        offCtx.globalCompositeOperation = 'source-over';
      }

      // Composite onto the main canvas with the layer's opacity + blend.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = BLEND_MODE_MAP[layer.blendMode];
      ctx.filter = 'none';
      ctx.drawImage(off.canvas, 0, 0);
      ctx.restore();

      // Accumulate coverage (opacity only, ignoring blend mode) so the alpha
      // reflects how opaquely this layer sits over the base. A "below divider"
      // layer is excluded so the divider colour paints over it.
      if (!layer.belowDivider) {
        cov.globalCompositeOperation = 'source-over';
        cov.globalAlpha = layer.opacity;
        cov.drawImage(off.canvas, 0, 0);
      }

      // A non-clip layer becomes the mask base for the clip layers above it.
      if (!layer.clip) clipMask = this.snapshotClipMask(off.canvas);
    }

    return this.canvas;
  }

  private clipMaskCanvas?: HTMLCanvasElement;

  /** Copy a layer's content into a persistent canvas so it survives as the clip
   *  base while the shared offscreen is reused for the next layer. */
  private snapshotClipMask(src: HTMLCanvasElement): HTMLCanvasElement {
    if (!this.clipMaskCanvas) {
      this.clipMaskCanvas = document.createElement('canvas');
      this.clipMaskCanvas.width = this.canvas.width;
      this.clipMaskCanvas.height = this.canvas.height;
    }
    const c = this.clipMaskCanvas;
    const cx = c.getContext('2d')!;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.globalCompositeOperation = 'source-over';
    cx.globalAlpha = 1;
    cx.filter = 'none';
    cx.clearRect(0, 0, c.width, c.height);
    cx.drawImage(src, 0, 0);
    return c;
  }

  /** Draw a layer's content (no blend/opacity — caller sets those). */
  private async drawLayerContent(layer: Layer): Promise<void> {
    if (layer.type === 'solid') this.drawSolid(layer);
    else if (layer.type === 'pattern') await this.drawPattern(layer);
    else if (layer.type === 'image') await this.drawImage(layer);
    else if (layer.type === 'decal') await this.drawDecal(layer);
    else if (layer.type === 'shape') this.drawShape(layer);
  }

  private drawShape(layer: ShapeLayer) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    // Sizes are relative to the part: width spans the zone width (around the
    // tube), height spans the zone height (along the part's length).
    const sw = w * layer.width;
    const sh = h * layer.height;

    const rx = sw / 2;
    const ry = sh / 2;

    ctx.save();
    ctx.translate(w * layer.x, h * layer.y);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.fillStyle = layer.color;

    // Regular n-gon inscribed in the rx/ry ellipse, first vertex at the top.
    const poly = (n: number) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const x = rx * Math.cos(a);
        const y = ry * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };
    // Star: `pts` spikes alternating outer (1) / inner (`inner`) radius.
    const star = (pts: number, inner: number) => {
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const a = -Math.PI / 2 + (i / (pts * 2)) * Math.PI * 2;
        const rr = i % 2 === 0 ? 1 : inner;
        const x = rx * rr * Math.cos(a);
        const y = ry * rr * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };
    const path = (pointsOrPath: () => void) => {
      ctx.beginPath();
      pointsOrPath();
      ctx.closePath();
      ctx.fill();
    };
    const line = (x: number, y: number) => ctx.lineTo(x, y);

    switch (layer.shape) {
      case 'rectangle':
        ctx.fillRect(-rx, -ry, sw, sh);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -ry);
        line(rx, ry);
        line(-rx, ry);
        ctx.closePath();
        ctx.fill();
        break;
      case 'diamond':
        poly(4);
        ctx.fill();
        break;
      case 'pentagon':
        poly(5);
        ctx.fill();
        break;
      case 'hexagon':
        poly(6);
        ctx.fill();
        break;
      case 'star':
        star(5, 0.42);
        ctx.fill();
        break;
      case 'ring':
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.ellipse(0, 0, rx * 0.58, ry * 0.58, 0, 0, Math.PI * 2);
        ctx.fill('evenodd');
        break;
      case 'cross': {
        const t = 0.34; // arm thickness (fraction of full size)
        ctx.beginPath();
        ctx.rect(-rx * t, -ry, sw * t, sh);
        ctx.rect(-rx, -ry * t, sw, sh * t);
        ctx.fill();
        break;
      }
      case 'heart':
        ctx.beginPath();
        ctx.moveTo(0, ry); // bottom point
        ctx.bezierCurveTo(rx * 1.4, ry * 0.15, rx, -ry * 0.9, 0, -ry * 0.3);
        ctx.bezierCurveTo(-rx, -ry * 0.9, -rx * 1.4, ry * 0.15, 0, ry);
        ctx.closePath();
        ctx.fill();
        break;
      case 'arrow':
        path(() => {
          ctx.moveTo(0, -ry); // tip
          line(rx, -ry * 0.1);
          line(rx * 0.42, -ry * 0.1);
          line(rx * 0.42, ry);
          line(-rx * 0.42, ry);
          line(-rx * 0.42, -ry * 0.1);
          line(-rx, -ry * 0.1);
        });
        break;
      case 'lightning':
        path(() => {
          ctx.moveTo(rx * 0.25, -ry);
          line(-rx * 0.55, ry * 0.15);
          line(-rx * 0.05, ry * 0.15);
          line(-rx * 0.25, ry);
          line(rx * 0.55, -ry * 0.2);
          line(rx * 0.05, -ry * 0.2);
        });
        break;
      case 'chevron':
        path(() => {
          ctx.moveTo(-rx, -ry * 0.5);
          line(0, ry * 0.5);
          line(rx, -ry * 0.5);
          line(rx, -ry);
          line(0, 0);
          line(-rx, -ry);
        });
        break;
    }
    ctx.restore();
  }

  private effectCanvas?: HTMLCanvasElement;
  private effectCtx?: CanvasRenderingContext2D;

  private getEffectCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (!this.effectCanvas || !this.effectCtx) {
      const c = document.createElement('canvas');
      c.width = this.canvas.width;
      c.height = this.canvas.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D context not available');
      this.effectCanvas = c;
      this.effectCtx = ctx;
    }
    return { canvas: this.effectCanvas, ctx: this.effectCtx };
  }

  private drawSolid(layer: SolidColorLayer) {
    const ctx = this.ctx;
    ctx.fillStyle = layer.color;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private async drawPattern(layer: PatternLayer) {
    const ctx = this.ctx;
    const tile = await renderPattern(layer);
    const pattern = ctx.createPattern(tile, 'repeat');
    if (!pattern) return;
    // The tile is rendered at a fixed high resolution; scale it down to the
    // requested on-surface size here (layer.scale) via the pattern's own
    // transform, so the fill overdraw below still covers the canvas.
    const target = Math.max(32, layer.scale * 8);
    const f = target / tile.width;
    pattern.setTransform?.(new DOMMatrix([f, 0, 0, f, 0, 0]));
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const rx = ((layer.rotationX ?? 0) * Math.PI) / 180;
    const ry = ((layer.rotationY ?? 0) * Math.PI) / 180;

    ctx.translate(cx, cy);
    // Out-of-plane X/Y tilt as a shear (perspective-style), then in-plane spin.
    if (rx !== 0 || ry !== 0) ctx.transform(1, Math.tan(rx), Math.tan(ry), 1, 0, 0);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    // Per-axis stretch of the pattern fill.
    ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = pattern;
    // Generous overdraw so the sheared/rotated fill still covers the canvas.
    ctx.fillRect(-w * 2, -h * 2, w * 5, h * 5);
  }

  private async drawImage(layer: ImageLayer) {
    const ctx = this.ctx;
    try {
      const img = await loadImage(layer.src);
      const w = this.canvas.width;
      const h = this.canvas.height;
      const cx = w * layer.x;
      const cy = h * layer.y;
      const base = Math.min(w, h);
      const maxDim = Math.max(img.width, img.height);
      const targetW = (img.width / maxDim) * base * layer.scaleX;
      const targetH = (img.height / maxDim) * base * layer.scaleY;

      const needsPixelOps =
        layer.dodge > 0.001 ||
        layer.burn > 0.001 ||
        layer.levelsBlack > 0 ||
        layer.levelsWhite < 1 ||
        Math.abs(layer.levelsGamma - 1) > 0.001;

      if (!needsPixelOps) {
        ctx.translate(cx, cy);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.filter = cssFilterForImage(layer);
        ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
        return;
      }

      const off = document.createElement('canvas');
      const ow = Math.max(1, Math.round(targetW));
      const oh = Math.max(1, Math.round(targetH));
      off.width = ow;
      off.height = oh;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return;
      octx.filter = cssFilterForImage(layer);
      octx.drawImage(img, 0, 0, ow, oh);
      const imageData = octx.getImageData(0, 0, ow, oh);
      applyLevelsAndDodgeBurn(imageData, layer);
      octx.putImageData(imageData, 0, 0);

      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.drawImage(off, -targetW / 2, -targetH / 2, targetW, targetH);
    } catch {
      // ignore missing images
    }
  }

  private async drawDecal(layer: DecalLayer) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w * layer.x;
    const cy = h * layer.y;

    ctx.translate(cx, cy);
    // Correct for the zone canvas's aspect vs the tube's real surface aspect, so
    // glyphs keep their proportions instead of stretching along the tube. The
    // canvas maps u→width over the circumference and v→height over the length;
    // scaling the length (canvas-y) axis by (world-per-px-x / world-per-px-y)
    // makes the drawing isotropic on the surface. Unset (rims) = no correction.
    const aspect = getZoneAspect(this.zoneId);
    if (aspect !== undefined) {
      const ky = (aspect * h) / w;
      if (isFinite(ky) && ky > 0) ctx.scale(1, ky);
    }
    // Baseline so a stored rotation of 0 reads in the natural orientation for
    // the surface: +90° on tubes (text runs ALONG the lengthwise canvas), but
    // 0° on rims (upright along the wheel circumference). The slider then turns
    // left/right from that neutral.
    const isRim = this.zoneId === 'frontRim' || this.zoneId === 'rearRim';
    ctx.rotate(((layer.rotation + (isRim ? 0 : 90)) * Math.PI) / 180);

    const base = Math.min(w, h);
    const px = layer.size * 0.01 * base;
    const weight = layer.bold ? 700 : 400;
    const style = layer.italic ? 'italic ' : '';
    const fontSpec = `${style}${weight} ${px}px "${layer.font}", sans-serif`;

    try {
      await document.fonts.load(fontSpec);
    } catch {
      // fall back to whatever is available
    }

    ctx.font = fontSpec;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Glyphs are laid out and spaced manually (so each can be rotated), so the
    // native letterSpacing is cleared and the gap applied between glyphs below.
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';

    // Lay out each character one by one along the (local) baseline. Each glyph
    // is rotated about its own centre by glyphRotation. The advance stays based
    // on glyph width only (rotation never changes spacing); the gap between
    // glyphs is controlled solely by the letterSpacing slider.
    const chars = [...layer.text];
    const glyph = ((layer.glyphRotation ?? 0) * Math.PI) / 180;
    const gap = layer.letterSpacing ?? 0;
    const sizes = chars.map((c) => ctx.measureText(c).width);

    let total = gap * Math.max(0, chars.length - 1);
    for (const s of sizes) total += s;

    let cursor = -total / 2;
    for (let i = 0; i < chars.length; i++) {
      const s = sizes[i];
      ctx.save();
      ctx.translate(cursor + s / 2, 0);
      ctx.rotate(glyph);
      if (layer.outlineWidth > 0) {
        ctx.strokeStyle = layer.outlineColor;
        ctx.lineWidth = layer.outlineWidth * 2;
        ctx.lineJoin = 'round';
        ctx.strokeText(chars[i], 0, 0);
      }
      ctx.fillStyle = layer.color;
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
      cursor += s + gap;
    }

    // Underline / strikethrough: horizontal rules across the whole text, drawn
    // in the text's local frame (they follow the baseline, not per-glyph spin).
    if (layer.underline || layer.strikethrough) {
      const lineW = Math.max(1, px * 0.07);
      const x0 = -total / 2;
      const x1 = total / 2;
      const rule = (y: number) => {
        if (layer.outlineWidth > 0) {
          ctx.strokeStyle = layer.outlineColor;
          ctx.lineWidth = lineW + layer.outlineWidth * 2;
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.lineTo(x1, y);
          ctx.stroke();
        }
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = lineW;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
      };
      // middle baseline: glyph centre ≈ y 0, descenders ≈ y px*0.4.
      if (layer.strikethrough) rule(0);
      if (layer.underline) rule(px * 0.42);
    }
  }

}

const compositors = new Map<ZoneId, ZoneCompositor>();

export function getCompositor(zoneId: ZoneId): ZoneCompositor {
  let c = compositors.get(zoneId);
  if (!c) {
    c = new ZoneCompositor(zoneId);
    compositors.set(zoneId, c);
  }
  return c;
}
