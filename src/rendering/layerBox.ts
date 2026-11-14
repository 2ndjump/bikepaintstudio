import type { Layer, ZoneId } from '../state/types';
import { getLoadedImage, ZONE_CANVAS_DIMS } from './LayerCompositor';
import { getZoneAspect } from './zoneMetrics';

/**
 * A placed layer's footprint on its zone canvas (pixels): centre `c` and the
 * two half-axis vectors `ax` (local x) and `ay` (local y), so the corners are
 * c ± ax ± ay. Mirrors the transforms in LayerCompositor's draw functions.
 * Patterns (and solids) cover the whole zone and have no box.
 */
export interface LayerBox {
  c: [number, number];
  ax: [number, number];
  ay: [number, number];
}

let measureCtx: CanvasRenderingContext2D | null = null;

export function layerBox(zone: ZoneId, layer: Layer): LayerBox | null {
  const { w, h } = ZONE_CANVAS_DIMS[zone];
  const isRim = zone === 'frontRim' || zone === 'rearRim';
  if (layer.type === 'shape' || layer.type === 'image') {
    let hw: number;
    let hh: number;
    if (layer.type === 'shape') {
      hw = (w * layer.width) / 2;
      hh = (h * layer.height) / 2;
    } else {
      const img = getLoadedImage(layer.src);
      const base = Math.min(w, h);
      const max = img ? Math.max(img.width, img.height) : 1;
      hw = ((img ? img.width / max : 1) * base * layer.scaleX) / 2;
      hh = ((img ? img.height / max : 1) * base * layer.scaleY) / 2;
    }
    const a = (layer.rotation * Math.PI) / 180;
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    return { c: [w * layer.x, h * layer.y], ax: [cs * hw, sn * hw], ay: [-sn * hh, cs * hh] };
  }
  if (layer.type === 'decal') {
    const px = layer.size * 0.01 * Math.min(w, h);
    measureCtx ??= document.createElement('canvas').getContext('2d');
    const ctx = measureCtx!;
    ctx.font = `${layer.italic ? 'italic ' : ''}${layer.bold ? 700 : 400} ${px}px "${layer.font}", sans-serif`;
    const chars = [...layer.text];
    let total = (layer.letterSpacing ?? 0) * Math.max(0, chars.length - 1);
    for (const ch of chars) total += ctx.measureText(ch).width;
    // translate → scale(1, ky) → rotate(rotation + 90° on tubes).
    const aspect = getZoneAspect(zone);
    const ky = aspect !== undefined && isFinite((aspect * h) / w) ? (aspect * h) / w : 1;
    const a = ((layer.rotation + (isRim ? 0 : 90)) * Math.PI) / 180;
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const hw = Math.max(total, px * 0.5) / 2;
    const hh = px * 0.55;
    return { c: [w * layer.x, h * layer.y], ax: [cs * hw, ky * sn * hw], ay: [-sn * hh, ky * cs * hh] };
  }
  return null;
}

/** Is canvas point (x, y) inside the box? Also tries the u-wrapped copies. */
export function boxContains(zone: ZoneId, box: LayerBox, x: number, y: number): boolean {
  const { w } = ZONE_CANVAS_DIMS[zone];
  const [axx, axy] = box.ax;
  const [ayx, ayy] = box.ay;
  const det = axx * ayy - ayx * axy;
  if (Math.abs(det) < 1e-9) return false;
  for (const off of [0, w, -w]) {
    const dx = x + off - box.c[0];
    const dy = y - box.c[1];
    const s = (dx * ayy - dy * ayx) / det;
    const t = (axx * dy - axy * dx) / det;
    if (Math.abs(s) <= 1 && Math.abs(t) <= 1) return true;
  }
  return false;
}

/** Topmost visible, placeable layer of the zone under canvas point (x, y). */
export function pickLayer(zone: ZoneId, layers: Layer[], x: number, y: number): Layer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (!l.visible) continue;
    const box = layerBox(zone, l);
    if (box && boxContains(zone, box, x, y)) return l;
  }
  return null;
}
