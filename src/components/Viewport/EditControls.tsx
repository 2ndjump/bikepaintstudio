import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useUIStore } from '../../state/uiStore';
import { layerGroup, useDesignStore } from '../../state/designStore';
import { isRimZone, type ZoneId } from '../../state/types';
import { ZONE_CANVAS_DIMS } from '../../rendering/LayerCompositor';
import { boxContains, layerBox, pickLayer } from '../../rendering/layerBox';
import { pointerState, setViewportGetter, zoneMeshes } from './viewportBridge';

const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
/** A press that moves less than this (px) is a click, not a drag. */
const CLICK_SLOP = 5;

interface MoveDrag {
  zone: ZoneId;
  mesh: THREE.Mesh;
  /** Start positions of the layer and the layers grouped with it. */
  starts: Record<string, { x: number; y: number }>;
  startU: number;
  startV: number;
}

/**
 * Pointer editing on the model (always on — there's no separate tool):
 *  - press on a layer (text/shape/image) and drag: selects it and moves it
 *    (with the layers grouped with it) along the surface; the topmost layer under the pointer wins, but the
 *    selected one is kept when it's under the pointer too;
 *  - click a part: selects that zone (deselects the layer); click the
 *    backdrop: deselects the layer;
 *  - everything else falls through: left-drag pans, right-drag / one-finger
 *    spins the turntable (or turns the wheel in the wheel designer);
 *  - Delete removes the selected layer, Escape deselects it.
 * Scale/rotate handles for the selected layer are DOM (LayerGizmo).
 */
export function EditControls() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    setViewportGetter(get);
    return () => setViewportGetter(null);
  }, [get]);

  useEffect(() => {
    const { gl } = get();
    const dom = gl.domElement;

    const raycast = (clientX: number, clientY: number, meshes: THREE.Mesh[]) => {
      const { camera } = get();
      const rect = dom.getBoundingClientRect();
      _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _ray.setFromCamera(_ndc, camera);
      return _ray.intersectObjects(meshes, false).find((h) => h.uv) ?? null;
    };

    let drag: MoveDrag | null = null;
    let press: { x: number; y: number; zone: ZoneId | null } | null = null;

    const onDown = (e: PointerEvent) => {
      const primary = e.button === 0 || (e.pointerType === 'touch' && e.isPrimary);
      if (!primary) return;
      const hit = raycast(e.clientX, e.clientY, zoneMeshes(get().scene));
      const zone = hit ? (hit.object.name.slice(5) as ZoneId) : null;
      press = { x: e.clientX, y: e.clientY, zone };
      if (!hit || !hit.uv || !zone) return;

      const { w, h } = ZONE_CANVAS_DIMS[zone];
      const px = hit.uv.x * w;
      const py = (1 - hit.uv.y) * h;
      const layers = useDesignStore.getState().zones[zone]?.layers ?? [];
      const selId = useUIStore.getState().selectedLayerId;
      const sel = layers.find((l) => l.id === selId && l.visible);
      const selBox = sel && layerBox(zone, sel);
      const layer = sel && selBox && boxContains(zone, selBox, px, py, sel.repeat) ? sel : pickLayer(zone, layers, px, py);
      if (!layer || (layer.type !== 'decal' && layer.type !== 'shape' && layer.type !== 'image')) return;

      // Grab the layer: select it and keep OrbitControls / turntable / wheel
      // turn from also starting on this press.
      e.stopImmediatePropagation();
      e.preventDefault();
      press = null;
      if (useDesignStore.getState().activeZone !== zone) useDesignStore.getState().setActiveZone(zone);
      const ui = useUIStore.getState();
      ui.setActiveDividerId(null);
      ui.setSelectedLayerId(layer.id);
      ui.setSpinHold(true);
      const starts: MoveDrag['starts'] = {};
      for (const l of layerGroup(layers, layer.id)) {
        if (l.type === 'decal' || l.type === 'shape' || l.type === 'image') starts[l.id] = { x: l.x, y: l.y };
      }
      drag = {
        zone,
        mesh: hit.object as THREE.Mesh,
        starts,
        startU: hit.uv.x,
        startV: hit.uv.y,
      };
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        /* capture unavailable (e.g. synthetic events) */
      }
    };

    let hoverFrame = 0;
    const onMove = (e: PointerEvent) => {
      if (drag) {
        const hit = raycast(e.clientX, e.clientY, [drag.mesh]);
        if (!hit || !hit.uv) return;
        // u wraps around the tube/rim: take the short way across the seam.
        let du = hit.uv.x - drag.startU;
        du -= Math.round(du);
        const dv = hit.uv.y - drag.startV; // canvas y = 1 - v
        const patches: Record<string, { x: number; y: number }> = {};
        for (const [id, p] of Object.entries(drag.starts)) patches[id] = { x: p.x + du, y: p.y - dv };
        useDesignStore.getState().updateLayers(drag.zone, patches);
        return;
      }
      if (e.buttons !== 0 || e.target !== dom) {
        pointerState.hoverZone = null;
        return;
      }
      // Hover feedback (throttled to one raycast per frame).
      if (hoverFrame) return;
      const { clientX, clientY } = e;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        const hit = raycast(clientX, clientY, zoneMeshes(get().scene));
        const zone = hit ? (hit.object.name.slice(5) as ZoneId) : null;
        pointerState.hoverZone = zone && !isRimZone(zone) ? zone : null;
        let onLayer = false;
        if (hit?.uv && zone) {
          const { w, h } = ZONE_CANVAS_DIMS[zone];
          const l = pickLayer(zone, useDesignStore.getState().zones[zone]?.layers ?? [], hit.uv.x * w, (1 - hit.uv.y) * h);
          onLayer = !!l && l.type !== 'pattern' && l.type !== 'solid';
        }
        dom.style.cursor = onLayer ? 'move' : zone ? 'pointer' : '';
      });
    };

    const onUp = (e: PointerEvent) => {
      if (drag) {
        drag = null;
        useUIStore.getState().setSpinHold(false);
        try {
          dom.releasePointerCapture(e.pointerId);
        } catch {
          /* pointer already released */
        }
        return;
      }
      if (!press) return;
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
      const zone = press.zone;
      press = null;
      if (moved > CLICK_SLOP) return; // that was a pan / spin
      const ui = useUIStore.getState();
      ui.setSelectedLayerId(null);
      if (zone) {
        ui.setActiveDividerId(null);
        if (useDesignStore.getState().activeZone !== zone) useDesignStore.getState().setActiveZone(zone);
      }
    };

    const onLeave = () => {
      pointerState.hoverZone = null;
    };

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const ui = useUIStore.getState();
      if (!ui.selectedLayerId) return;
      if (e.key === 'Escape') ui.setSelectedLayerId(null);
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        const ds = useDesignStore.getState();
        if (!ds.zones[ds.activeZone].layers.some((l) => l.id === ui.selectedLayerId)) return;
        e.preventDefault();
        ds.removeLayer(ds.activeZone, ui.selectedLayerId);
        ui.setSelectedLayerId(null);
      }
    };

    // Capture phase: runs before OrbitControls' / the turntable's listeners on
    // the same element, so grabbing a layer can stop them from starting.
    dom.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    dom.addEventListener('pointerleave', onLeave);
    window.addEventListener('keydown', onKey);
    return () => {
      dom.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(hoverFrame);
      dom.style.cursor = '';
    };
  }, [get]);

  return null;
}
