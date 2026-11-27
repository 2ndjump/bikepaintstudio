import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { layerGroup, useDesignStore } from '../../state/designStore';
import { useUIStore } from '../../state/uiStore';
import type { Layer } from '../../state/types';
import { ZONE_CANVAS_DIMS } from '../../rendering/LayerCompositor';
import { layerBox } from '../../rendering/layerBox';
import { getZoneAspect } from '../../rendering/zoneMetrics';
import { uvToSurface } from '../../rendering/surfaceUV';
import { useT } from '../../i18n/useT';
import { viewportState, zoneMesh } from './viewportBridge';

type V2 = [number, number];

/** Where the selected layer sits on screen this frame. */
interface Frame {
  c: V2;
  /** Screen vectors of the box's half-axes (local x, local y). */
  ax: V2;
  ay: V2;
  /** Canvas → screen keeps (+1) or mirrors (−1) orientation. */
  flip: number;
}

// Handle ids: corners scale uniformly, edges stretch one axis (shape/image),
// 'rot' rotates.
const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;
const EDGES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const PROBE = 8; // canvas px used to measure the local canvas → screen map
const MIN_HALF = 12; // keep tiny layers grabbable (screen px)
const ROT_OFFSET = 28;

const _eye = new THREE.Vector3();
const _ray = new THREE.Raycaster();

function add(a: V2, b: V2, k = 1): V2 {
  return [a[0] + b[0] * k, a[1] + b[1] * k];
}
function len(a: V2) {
  return Math.hypot(a[0], a[1]);
}

/** Project the selected layer's box onto the screen (null: not on screen). */
function measure(layer: Layer): (Frame & { hidden: boolean }) | null {
  const st = viewportState();
  const zone = useDesignStore.getState().activeZone;
  const box = layerBox(zone, layer);
  const mesh = st && zoneMesh(st.scene, zone);
  if (!st || !box || !mesh) return null;
  const { w, h } = ZONE_CANVAS_DIMS[zone];
  const camera = st.camera;
  camera.getWorldPosition(_eye);
  const rect = st.gl.domElement.getBoundingClientRect();
  const at = (x: number, y: number) => uvToSurface(mesh, x / w, 1 - y / h, _eye);
  const screen = (p: THREE.Vector3): V2 => {
    const q = p.clone().project(camera);
    return [(q.x * 0.5 + 0.5) * rect.width, (-q.y * 0.5 + 0.5) * rect.height];
  };
  const [cx, cy] = box.c;
  const P = at(cx, cy);
  if (!P) return null;
  const c = screen(P);
  // Local linear map canvas px → screen px, probed on either side.
  const probe = (dx: number, dy: number): V2 | null => {
    for (const s of [1, -1]) {
      const q = at(cx + dx * s, cy + dy * s);
      if (q) {
        const p = screen(q);
        return [((p[0] - c[0]) / PROBE) * s, ((p[1] - c[1]) / PROBE) * s];
      }
    }
    return null;
  };
  const jx = probe(PROBE, 0);
  const jy = probe(0, PROBE);
  if (!jx || !jy) return null;
  const map = (v: V2): V2 => [jx[0] * v[0] + jy[0] * v[1], jx[1] * v[0] + jy[1] * v[1]];
  let ax = map(box.ax);
  let ay = map(box.ay);
  if (len(ax) < MIN_HALF) ax = len(ax) > 1e-6 ? [(ax[0] / len(ax)) * MIN_HALF, (ax[1] / len(ax)) * MIN_HALF] : [MIN_HALF, 0];
  if (len(ay) < MIN_HALF) ay = len(ay) > 1e-6 ? [(ay[0] / len(ay)) * MIN_HALF, (ay[1] / len(ay)) * MIN_HALF] : [0, MIN_HALF];
  // On the far side of the part (behind its own surface)?
  _ray.set(_eye, P.clone().sub(_eye).normalize());
  const hit = _ray.intersectObject(mesh, false)[0];
  const hidden = !!hit && hit.distance < _eye.distanceTo(P) - 0.003;
  const flip = Math.sign(jx[0] * jy[1] - jx[1] * jy[0]) || 1;
  return { c, ax, ay, flip, hidden };
}

/**
 * Transform handles for the selected layer, drawn over the canvas: an outline
 * of its box on the model, corner handles (scale), edge handles (stretch one
 * axis — shapes and images) and a rotate handle (Shift snaps to 15°). Moving
 * is done by dragging the layer itself (EditControls). Tracks the layer every
 * frame, so it follows the turntable and the spinning wheel.
 */
export function LayerGizmo() {
  const selId = useUIStore((s) => s.selectedLayerId);
  const capturing = useUIStore((s) => s.capturing);
  const zone = useDesignStore((s) => s.activeZone);
  const layer = useDesignStore((s) => s.zones[s.activeZone]?.layers.find((l) => l.id === selId));
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const poly = useRef<SVGPolygonElement>(null);
  const stem = useRef<SVGLineElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const frame = useRef<Frame | null>(null);
  const placeable = !!layer && layer.type !== 'pattern' && layer.type !== 'solid';
  const stretchable = layer?.type === 'shape' || layer?.type === 'image';

  useEffect(() => {
    if (!placeable || !selId) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const cur = useDesignStore
        .getState()
        .zones[useDesignStore.getState().activeZone]?.layers.find((l) => l.id === selId);
      const f = cur && cur.visible ? measure(cur) : null;
      const el = root.current;
      if (!el) return;
      if (!f) {
        el.style.display = 'none';
        frame.current = null;
        return;
      }
      el.style.display = '';
      el.style.opacity = f.hidden ? '0.35' : '1';
      el.style.pointerEvents = 'none';
      frame.current = f;
      const pt = (sx: number, sy: number) => add(add(f.c, f.ax, sx), f.ay, sy);
      poly.current?.setAttribute('points', CORNERS.map(([sx, sy]) => pt(sx, sy).join(',')).join(' '));
      const top = pt(0, -1);
      const dir: V2 = [-f.ay[0] / len(f.ay), -f.ay[1] / len(f.ay)];
      const rot = add(top, dir, ROT_OFFSET);
      stem.current?.setAttribute('x1', String(top[0]));
      stem.current?.setAttribute('y1', String(top[1]));
      stem.current?.setAttribute('x2', String(rot[0]));
      stem.current?.setAttribute('y2', String(rot[1]));
      const place = (id: string, p: V2) => {
        const hEl = el.querySelector<HTMLElement>(`[data-h="${id}"]`);
        if (!hEl) return;
        hEl.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
        hEl.style.pointerEvents = f.hidden ? 'none' : 'auto';
      };
      CORNERS.forEach(([sx, sy]) => place(`c${sx}${sy}`, pt(sx, sy)));
      EDGES.forEach(([sx, sy]) => place(`e${sx}${sy}`, pt(sx, sy)));
      place('rot', rot);
      if (label.current) {
        const ys = CORNERS.map(([sx, sy]) => pt(sx, sy)[1]);
        const xs = CORNERS.map(([sx, sy]) => pt(sx, sy)[0]);
        label.current.style.transform = `translate(${Math.min(...xs)}px, ${Math.max(...ys) + 10}px)`;
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [placeable, selId, zone]);

  if (!placeable || !layer || capturing) return null;

  /** Drag a handle: `apply` gets the pointer (screen px, canvas-relative). */
  function startDrag(e: React.PointerEvent, apply: (p: V2, f: Frame, ev: PointerEvent) => void) {
    const f = frame.current;
    if (!f) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = (root.current!.parentElement as HTMLElement).getBoundingClientRect();
    const ui = useUIStore.getState();
    ui.setSpinHold(true);
    const move = (ev: PointerEvent) => apply([ev.clientX - rect.left, ev.clientY - rect.top], f, ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      useUIStore.getState().setSpinHold(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  /** Scale about the centre by the pointer's distance ratio along `axis`
   *  (null: uniform, by plain distance). */
  function startScale(e: React.PointerEvent, axis: 'x' | 'y' | null) {
    const l0 = layer!;
    const f = frame.current;
    if (!f) return;
    const rect = (root.current!.parentElement as HTMLElement).getBoundingClientRect();
    const p0: V2 = [e.clientX - rect.left, e.clientY - rect.top];
    const dir = axis === 'x' ? f.ax : axis === 'y' ? f.ay : null;
    const along = (p: V2) => {
      const d: V2 = [p[0] - f.c[0], p[1] - f.c[1]];
      return dir ? (d[0] * dir[0] + d[1] * dir[1]) / len(dir) : len(d);
    };
    const start = along(p0) || 1;
    const sized = (l: Layer, k: number): Partial<Layer> => {
      if (l.type === 'shape') {
        return {
          width: axis === 'y' ? l.width : clamp(l.width * k, 0.02, 1),
          height: axis === 'x' ? l.height : clamp(l.height * k, 0.02, 1),
        };
      }
      if (l.type === 'image') {
        return {
          scaleX: axis === 'y' ? l.scaleX : clamp(l.scaleX * k, 0.05, 3),
          scaleY: axis === 'x' ? l.scaleY : clamp(l.scaleY * k, 0.05, 3),
        };
      }
      if (l.type === 'decal') return { size: Math.round(clamp(l.size * k, 8, 256)) };
      return {};
    };
    // A uniform scale takes the whole group along, about this layer's centre;
    // stretching one axis stays with this layer.
    const members = axis ? [l0] : groupOf(l0);
    startDrag(e, (p) => {
      const k = Math.max(0.02, along(p) / start);
      const patches: Record<string, Partial<Layer>> = {};
      for (const l of members) {
        patches[l.id] = sized(l, k);
        if (l !== l0 && 'x' in l && 'x' in l0) {
          Object.assign(patches[l.id], { x: l0.x + (l.x - l0.x) * k, y: l0.y + (l.y - l0.y) * k });
        }
      }
      useDesignStore.getState().updateLayers(zone, patches);
    });
  }

  /** The selected layer and the placeable layers grouped with it, as they are now. */
  function groupOf(l0: Layer): Layer[] {
    const layers = useDesignStore.getState().zones[zone].layers;
    return layerGroup(layers, l0.id).filter((l) => l.type === 'shape' || l.type === 'image' || l.type === 'decal');
  }

  function startRotate(e: React.PointerEvent) {
    const l0 = layer!;
    const f = frame.current;
    if (!f || (l0.type !== 'shape' && l0.type !== 'image' && l0.type !== 'decal')) return;
    const rect = (root.current!.parentElement as HTMLElement).getBoundingClientRect();
    const a0 = Math.atan2(e.clientY - rect.top - f.c[1], e.clientX - rect.left - f.c[0]);
    const r0 = l0.rotation;
    const members = groupOf(l0);
    // Grouped layers turn about this layer's centre, measured on the surface
    // (canvas y scaled like the text, see LayerCompositor.drawDecal).
    const { w, h } = ZONE_CANVAS_DIMS[zone];
    const aspect = getZoneAspect(zone);
    const ky = aspect !== undefined && isFinite((aspect * h) / w) ? (aspect * h) / w : 1;
    startDrag(e, (p, _f, ev) => {
      const a = Math.atan2(p[1] - f.c[1], p[0] - f.c[0]);
      let deg = r0 + (((a - a0) * 180) / Math.PI) * f.flip;
      if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
      deg = Math.round(deg);
      const d = deg - r0;
      const rad = (d * Math.PI) / 180;
      const patches: Record<string, Partial<Layer>> = {};
      for (const l of members) {
        if (!('rotation' in l) || !('x' in l)) continue;
        let r = l.rotation + d;
        // Same ranges as the sliders: text −180…180, shapes/images 0…360.
        r = l.type === 'decal' ? ((((r + 180) % 360) + 360) % 360) - 180 : ((r % 360) + 360) % 360;
        patches[l.id] = { rotation: r };
        if (l !== l0) {
          const sx = (l.x - l0.x) * w;
          const sy = ((l.y - l0.y) * h) / ky;
          const rx = sx * Math.cos(rad) - sy * Math.sin(rad);
          const ry = sx * Math.sin(rad) + sy * Math.cos(rad);
          Object.assign(patches[l.id], { x: l0.x + rx / w, y: l0.y + (ry * ky) / h });
        }
      }
      useDesignStore.getState().updateLayers(zone, patches);
    });
  }

  const hold = (on: boolean) => () => useUIStore.getState().setSpinHold(on);
  const handleProps = (id: string) => ({
    'data-h': id,
    onPointerEnter: hold(true),
    onPointerLeave: hold(false),
  });

  return (
    <div ref={root} className="gizmo" style={{ display: 'none' }}>
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <polygon ref={poly} className="gizmo-box" />
        <line ref={stem} className="gizmo-stem" />
      </svg>
      {CORNERS.map(([sx, sy]) => (
        <div
          key={`c${sx}${sy}`}
          {...handleProps(`c${sx}${sy}`)}
          className="gizmo-handle"
          style={{ cursor: sx * sy > 0 ? 'nwse-resize' : 'nesw-resize' }}
          title={t('handleScale')}
          onPointerDown={(e) => startScale(e, null)}
        />
      ))}
      {stretchable &&
        EDGES.map(([sx, sy]) => (
          <div
            key={`e${sx}${sy}`}
            {...handleProps(`e${sx}${sy}`)}
            className="gizmo-handle gizmo-handle-edge"
            title={t('handleStretch')}
            onPointerDown={(e) => startScale(e, sx !== 0 ? 'x' : 'y')}
          />
        ))}
      <div
        {...handleProps('rot')}
        className="gizmo-handle gizmo-handle-rot"
        title={t('handleRotate')}
        onPointerDown={startRotate}
      />
      <div ref={label} className="gizmo-label">
        {layer.name}
      </div>
    </div>
  );
}
