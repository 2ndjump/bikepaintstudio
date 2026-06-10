import * as THREE from 'three';
import type { RimParams } from '../state/types';

/** 700C rim outer radius (where the tire bead sits). Constant across tire widths. */
export const RIM_OUTER_RADIUS = 0.308;
export const HUB_LENGTH = 0.1;

export function buildRimProfileGeometry(
  params: RimParams,
  rimOuter: number = RIM_OUTER_RADIUS,
): THREE.BufferGeometry {
  const depthM = params.depth / 1000;
  const widthM = params.width / 1000;

  const rOuter = rimOuter;
  const rInner = Math.max(0.12, rOuter - depthM);
  const widthOuter = widthM / 2;
  const widthInner = widthM * 0.28;

  const points: THREE.Vector2[] = [
    new THREE.Vector2(rInner, -widthInner),
    new THREE.Vector2(rInner + depthM * 0.15, -widthInner * 1.5),
    new THREE.Vector2(rInner + depthM * 0.6, -widthOuter * 0.9),
    new THREE.Vector2(rOuter - 0.002, -widthOuter),
    new THREE.Vector2(rOuter, -widthOuter * 0.85),
    new THREE.Vector2(rOuter, widthOuter * 0.85),
    new THREE.Vector2(rOuter - 0.002, widthOuter),
    new THREE.Vector2(rInner + depthM * 0.6, widthOuter * 0.9),
    new THREE.Vector2(rInner + depthM * 0.15, widthInner * 1.5),
    new THREE.Vector2(rInner, widthInner),
    new THREE.Vector2(rInner, -widthInner),
  ];
  const geo = new THREE.LatheGeometry(points, 128);
  geo.computeVertexNormals();
  remapLatheUVToSidewalls(geo);
  return geo;
}

function remapLatheUVToSidewalls(geo: THREE.BufferGeometry): void {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    const v = uv.getY(i);
    let nv: number;
    if (v < 0.4) {
      nv = v / 0.4;
    } else if (v > 0.6) {
      nv = 1 - (v - 0.6) / 0.4;
    } else {
      nv = 1;
    }
    uv.setY(i, nv);
  }
  uv.needsUpdate = true;
}

/**
 * Tire torus.
 * @param tireMinor — tire cross-section radius (~half the tire width)
 * @param wheelRadius — outer wheel radius (where the tire meets the road)
 */
export function buildTireGeometry(
  tireMinor: number,
  wheelRadius: number,
): THREE.BufferGeometry {
  const centerR = wheelRadius - tireMinor;
  return new THREE.TorusGeometry(centerR, tireMinor, 20, 120);
}

/**
 * Hub with proper flange profile — lathe rotated around the hub axis.
 * Profile: axle tip → narrow axle → flange peak → barrel → flange peak → axle tip.
 */
export function buildHubGeometry(): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.0,   -0.055),
    new THREE.Vector2(0.005, -0.055),
    new THREE.Vector2(0.005, -0.045),
    new THREE.Vector2(0.018, -0.040),
    new THREE.Vector2(0.030, -0.040),
    new THREE.Vector2(0.030, -0.034),
    new THREE.Vector2(0.018, -0.030),
    new THREE.Vector2(0.018,  0.030),
    new THREE.Vector2(0.030,  0.034),
    new THREE.Vector2(0.030,  0.040),
    new THREE.Vector2(0.018,  0.040),
    new THREE.Vector2(0.005,  0.045),
    new THREE.Vector2(0.005,  0.055),
    new THREE.Vector2(0.0,    0.055),
  ];
  const geo = new THREE.LatheGeometry(profile, 32);
  geo.computeVertexNormals();
  return geo;
}

export function buildSpokeGeometry(
  params: RimParams,
  rimOuter: number = RIM_OUTER_RADIUS,
): THREE.BufferGeometry[] {
  const depthM = params.depth / 1000;
  const rInner = Math.max(0.12, rimOuter - depthM);

  const geos: THREE.BufferGeometry[] = [];
  const count = params.spokeCount;
  const hubHalf = HUB_LENGTH / 2;

  // Bladed (aero) spoke cross-section: ~2.2mm wide tangent-to-rotation,
  // ~0.9mm thick radially. Modeled as a thin box; the long axis aligns with
  // the wheel's rotational tangent so the spoke cleaves air efficiently.
  const SPOKE_WIDTH = 0.0022;
  const SPOKE_THICK = 0.0009;

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    const side = i % 2 === 0 ? 1 : -1;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const rimPoint = new THREE.Vector3(cos * rInner, 0, sin * rInner);
    const hubPoint = new THREE.Vector3(0, side * hubHalf * 0.85, 0);

    const dir = new THREE.Vector3().subVectors(rimPoint, hubPoint);
    const length = dir.length();
    // BoxGeometry: X=width (tangent-ish), Y=length (along spoke), Z=thickness (radial-ish)
    const geo = new THREE.BoxGeometry(SPOKE_WIDTH, length, SPOKE_THICK);

    const mid = new THREE.Vector3().addVectors(rimPoint, hubPoint).multiplyScalar(0.5);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    m.compose(mid, q, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(m);
    geos.push(geo);
  }

  return geos;
}
