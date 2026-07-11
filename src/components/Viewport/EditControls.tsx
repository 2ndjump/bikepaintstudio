import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useUIStore } from '../../state/uiStore';
import { useDesignStore } from '../../state/designStore';
import type { ZoneId } from '../../state/types';

const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _p = new THREE.Vector3();

/** Layer centre (uv tu,tv) → screen px, via the nearest mesh vertex. Used as the
 *  pivot for rotate-drag. */
function layerCentreScreen(
  mesh: THREE.Mesh,
  tu: number,
  tv: number,
  camera: THREE.Camera,
  rect: DOMRect,
): { x: number; y: number } {
  const uv = mesh.geometry.getAttribute('uv');
  const pos = mesh.geometry.getAttribute('position');
  let bi = 0;
  let bd = Infinity;
  for (let i = 0; i < uv.count; i++) {
    const du = uv.getX(i) - tu;
    const dv = uv.getY(i) - tv;
    const d = du * du + dv * dv;
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  _p.fromBufferAttribute(pos, bi);
  mesh.localToWorld(_p);
  _p.project(camera);
  return {
    x: rect.left + (_p.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-_p.y * 0.5 + 0.5) * rect.height,
  };
}

interface Drag {
  zone: ZoneId;
  layerId: string;
  mesh: THREE.Mesh;
  rotate: boolean;
  startX: number;
  startY: number;
  startU: number;
  startV: number;
  startRotation: number;
  pivotX: number;
  pivotY: number;
  startAngle: number;
}

/**
 * When the 'edit' tool is active, drag a text/shape layer on the model to move
 * it (updates its x/y from the surface UV) or Shift+drag to rotate it. The
 * nearest text/shape layer to the click is picked; OrbitControls stays disabled
 * (see Viewport) so dragging never orbits.
 */
export function EditControls() {
  const tool = useUIStore((s) => s.tool);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    if (tool !== 'edit') return;
    const dom = gl.domElement;

    const zoneMeshes = (): THREE.Mesh[] => {
      const out: THREE.Mesh[] = [];
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && o.name.startsWith('zone:')) out.push(m);
      });
      return out;
    };

    const raycast = (clientX: number, clientY: number, meshes: THREE.Mesh[]) => {
      const rect = dom.getBoundingClientRect();
      _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _ray.setFromCamera(_ndc, camera);
      const hits = _ray.intersectObjects(meshes, false);
      return hits.find((h) => h.uv) ?? null;
    };

    let drag: Drag | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const hit = raycast(e.clientX, e.clientY, zoneMeshes());
      if (!hit || !hit.uv) return;
      const zone = hit.object.name.slice(5) as ZoneId;
      const layers = useDesignStore.getState().zones[zone]?.layers ?? [];
      const u = hit.uv.x;
      const v = hit.uv.y;
      // Nearest text/shape layer centre (in uv space) to the hit; later layers
      // (drawn on top) win ties.
      let best: { id: string; x: number; y: number; rotation: number } | null = null;
      let bestD = Infinity;
      for (const l of layers) {
        if (l.type !== 'decal' && l.type !== 'shape') continue;
        const d = (l.x - u) ** 2 + (1 - l.y - v) ** 2;
        if (d <= bestD) {
          bestD = d;
          best = { id: l.id, x: l.x, y: l.y, rotation: l.rotation };
        }
      }
      if (!best) return;

      useDesignStore.getState().setActiveZone(zone);
      useUIStore.getState().setActiveDividerId(null);

      const rotate = e.shiftKey;
      drag = {
        zone,
        layerId: best.id,
        mesh: hit.object as THREE.Mesh,
        rotate,
        startX: best.x,
        startY: best.y,
        startU: u,
        startV: v,
        startRotation: best.rotation,
        pivotX: 0,
        pivotY: 0,
        startAngle: 0,
      };
      if (rotate) {
        const pivot = layerCentreScreen(drag.mesh, best.x, 1 - best.y, camera, dom.getBoundingClientRect());
        drag.pivotX = pivot.x;
        drag.pivotY = pivot.y;
        drag.startAngle = Math.atan2(e.clientY - pivot.y, e.clientX - pivot.x);
      }
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        /* capture unavailable (e.g. synthetic events) */
      }
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      if (drag.rotate) {
        const ang = Math.atan2(e.clientY - drag.pivotY, e.clientX - drag.pivotX);
        const deg = ((ang - drag.startAngle) * 180) / Math.PI;
        useDesignStore.getState().updateLayer(drag.zone, drag.layerId, {
          rotation: Math.round(drag.startRotation + deg),
        });
      } else {
        const hit = raycast(e.clientX, e.clientY, [drag.mesh]);
        if (!hit || !hit.uv) return;
        useDesignStore.getState().updateLayer(drag.zone, drag.layerId, {
          x: drag.startX + (hit.uv.x - drag.startU),
          y: drag.startY - (hit.uv.y - drag.startV), // canvas y = 1 - v
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      drag = null;
      try {
        dom.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    };

    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    dom.style.cursor = 'crosshair';
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dom.style.cursor = '';
    };
  }, [tool, camera, gl, scene]);

  return null;
}
