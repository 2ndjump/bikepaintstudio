import * as THREE from 'three';
import type { ZoneId } from '../state/types';

/**
 * Per-zone surface aspect (mean circumference-per-unit-u ÷ length-per-unit-v),
 * measured from the tube geometry once the frame is built. The compositor uses
 * it to keep decals isotropic on the surface despite the fixed-aspect zone
 * canvas. Unset (e.g. rims) means "don't correct".
 */
const zoneAspect: Partial<Record<ZoneId, number>> = {};

export function setZoneAspect(zone: ZoneId, aspect: number): void {
  zoneAspect[zone] = aspect;
}

export function getZoneAspect(zone: ZoneId): number | undefined {
  return zoneAspect[zone];
}

/**
 * Mean world-space length spanned by a unit step in u (around) and in v (along),
 * area-weighted over the mesh. For a tube these approximate the surface's
 * circumference and length; their ratio (su/sv) is the surface aspect used to
 * keep decals from stretching on the fixed-aspect zone canvas. Scale-invariant.
 */
export function measureUVScale(geo: THREE.BufferGeometry): { su: number; sv: number } {
  const pos = geo.getAttribute('position');
  const uvA = geo.getAttribute('uv');
  const index = geo.getIndex();
  if (!pos || !uvA || !index) return { su: 1, sv: 1 };

  const p0 = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const ju = new THREE.Vector3();
  const jv = new THREE.Vector3();
  let suSum = 0;
  let svSum = 0;
  let wSum = 0;

  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    p0.fromBufferAttribute(pos, a);
    e1.fromBufferAttribute(pos, b).sub(p0);
    e2.fromBufferAttribute(pos, c).sub(p0);
    const u0 = uvA.getX(a);
    const v0 = uvA.getY(a);
    const du1 = uvA.getX(b) - u0;
    const dv1 = uvA.getY(b) - v0;
    const du2 = uvA.getX(c) - u0;
    const dv2 = uvA.getY(c) - v0;
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-12) continue;
    // Invert the triangle's linear uv→world map for ∂world/∂u and ∂world/∂v.
    ju.copy(e1).multiplyScalar(dv2).addScaledVector(e2, -dv1).divideScalar(det);
    jv.copy(e2).multiplyScalar(du1).addScaledVector(e1, -du2).divideScalar(det);
    const area = 0.5 * e1.clone().cross(e2).length();
    suSum += ju.length() * area;
    svSum += jv.length() * area;
    wSum += area;
  }

  if (wSum === 0) return { su: 1, sv: 1 };
  return { su: suSum / wSum, sv: svSum / wSum };
}
