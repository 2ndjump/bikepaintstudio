import * as THREE from 'three';
import type { RootState } from '@react-three/fiber';
import type { ZoneId } from '../../state/types';

/**
 * Access to the R3F scene from DOM code outside the <Canvas> (the on-model
 * layer handles, the panel's "add layer" placement). Set by EditControls.
 */
let getter: (() => RootState) | null = null;

export function setViewportGetter(get: (() => RootState) | null): void {
  getter = get;
}

export function viewportState(): RootState | null {
  return getter ? getter() : null;
}

/** Shared pointer state between the canvas handlers and the highlight overlay. */
export const pointerState = {
  /** Zone under the pointer (frame mode), for the hover highlight. */
  hoverZone: null as ZoneId | null,
};

function isShown(o: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

/** All shown paintable meshes (named `zone:<id>`; the hidden bike in the
 *  wheel designer doesn't count). */
export function zoneMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && o.name.startsWith('zone:') && isShown(o)) out.push(m);
  });
  return out;
}

export function zoneMesh(scene: THREE.Scene, zone: ZoneId): THREE.Mesh | null {
  return zoneMeshes(scene).find((m) => m.name === `zone:${zone}`) ?? null;
}

const _p = new THREE.Vector3();
const _eye = new THREE.Vector3();

/**
 * A good spot for a new layer on `zone`, as canvas fractions {x, y}: halfway
 * along the part, on the side currently facing the camera (on a wheel: the
 * top of the rim, so it's on screen whatever the spin).
 */
export function visibleSpot(zone: ZoneId): { x: number; y: number } {
  const st = viewportState();
  const mesh = st && zoneMesh(st.scene, zone);
  if (!st || !mesh) return { x: 0.5, y: 0.5 };
  const rim = zone === 'frontRim' || zone === 'rearRim';
  const uv = mesh.geometry.getAttribute('uv');
  const pos = mesh.geometry.getAttribute('position');
  st.camera.getWorldPosition(_eye);
  mesh.updateWorldMatrix(true, false);
  let best = -Infinity;
  let spot = { x: 0.5, y: 0.5 };
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(uv.getY(i) - 0.5) > 0.08) continue;
    _p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const score = -_p.distanceTo(_eye) + (rim ? _p.y * 2 : 0);
    if (score > best) {
      best = score;
      spot = { x: uv.getX(i), y: 1 - uv.getY(i) };
    }
  }
  return spot;
}
