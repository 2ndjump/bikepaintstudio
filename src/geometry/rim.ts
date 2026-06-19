import * as THREE from 'three';
import type { RimParams } from '../state/types';

/** 700C bead-seat radius (622mm BSD / 2 + hook). The tire seats here. */
export const RIM_OUTER_RADIUS = 0.3115;
export const HUB_LENGTH = 0.1;

/**
 * Modern carbon aero rim profile: widest just below the bead (~29mm), pulling
 * in to a rounded V at the spoke bed. Lathe profile in (radius, lateral).
 */
export function buildRimProfileGeometry(
  params: RimParams,
  rimOuter: number = RIM_OUTER_RADIUS,
): THREE.BufferGeometry {
  const depthM = params.depth / 1000;
  const halfW = params.width / 2000; // external half-width
  const maxHalfW = halfW * 1.04; // bulge below the bead

  const rOuter = rimOuter;
  const rInner = Math.max(0.12, rOuter - depthM);
  const bulgeR = rOuter - depthM * 0.30;

  const points: THREE.Vector2[] = [
    // spoke bed (rounded)
    new THREE.Vector2(rInner, -halfW * 0.30),
    new THREE.Vector2(rInner + 0.003, -halfW * 0.52),
    // V-section flank out to the bulge
    new THREE.Vector2(bulgeR, -maxHalfW),
    // brake-track-less sidewall up to the bead
    new THREE.Vector2(rOuter - 0.003, -halfW * 0.96),
    new THREE.Vector2(rOuter, -halfW * 0.82),
    // bead channel
    new THREE.Vector2(rOuter, halfW * 0.82),
    new THREE.Vector2(rOuter - 0.003, halfW * 0.96),
    new THREE.Vector2(bulgeR, maxHalfW),
    new THREE.Vector2(rInner + 0.003, halfW * 0.52),
    new THREE.Vector2(rInner, halfW * 0.30),
    new THREE.Vector2(rInner, -halfW * 0.30),
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
 * Tire: torus seated on the bead with a slight bulge past the rim sidewalls.
 * @param tireMinor — tire cross-section radius (half the tire width)
 * @param wheelRadius — outer wheel radius (tire contact patch)
 */
export function buildTireGeometry(
  tireMinor: number,
  wheelRadius: number,
): THREE.BufferGeometry {
  const centerR = wheelRadius - tireMinor;
  return new THREE.TorusGeometry(centerR, tireMinor, 28, 140);
}

/** Disc-brake era hub: flanges, center barrel, axle ends. */
export function buildHubGeometry(): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -0.054),
    new THREE.Vector2(0.0065, -0.054),
    new THREE.Vector2(0.0065, -0.046),
    new THREE.Vector2(0.0155, -0.042),
    new THREE.Vector2(0.0235, -0.040),
    new THREE.Vector2(0.0235, -0.0335),
    new THREE.Vector2(0.0150, -0.031),
    new THREE.Vector2(0.0125, -0.015),
    new THREE.Vector2(0.0125, 0.015),
    new THREE.Vector2(0.0150, 0.031),
    new THREE.Vector2(0.0235, 0.0335),
    new THREE.Vector2(0.0235, 0.040),
    new THREE.Vector2(0.0155, 0.042),
    new THREE.Vector2(0.0065, 0.046),
    new THREE.Vector2(0.0065, 0.054),
    new THREE.Vector2(0.0, 0.054),
  ];
  const geo = new THREE.LatheGeometry(profile, 36);
  geo.computeVertexNormals();
  return geo;
}

/** Bladed aero spokes, alternating hub flange sides. */
export function buildSpokeGeometry(
  params: RimParams,
  rimOuter: number = RIM_OUTER_RADIUS,
): THREE.BufferGeometry[] {
  const depthM = params.depth / 1000;
  const rInner = Math.max(0.12, rimOuter - depthM);

  const geos: THREE.BufferGeometry[] = [];
  const count = params.spokeCount;
  const flangeY = 0.036;
  const flangeR = 0.020;

  const SPOKE_WIDTH = 0.0021;
  const SPOKE_THICK = 0.0010;

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    const side = i % 2 === 0 ? 1 : -1;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const rimPoint = new THREE.Vector3(cos * rInner, 0, sin * rInner);
    const hubPoint = new THREE.Vector3(cos * flangeR, side * flangeY, sin * flangeR);

    const dir = new THREE.Vector3().subVectors(rimPoint, hubPoint);
    const length = dir.length();
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
