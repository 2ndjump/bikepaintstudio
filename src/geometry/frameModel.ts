import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loftTube } from './loft';

/**
 * Full procedural gravel frameset, ported 1:1 from the standalone Three.js
 * preview. Everything is built in the model's own MILLIMETRE space
 * (x = forward, y = up, z = lateral, BB at origin); the <BikeFrame> component
 * renders it inside a group scaled ×MODEL_SCALE to reach the scene's metres.
 *
 * The fork is built in its own local space and baked into frame space with the
 * head-angle rig transform, exactly as the source does — so the head-tube axis
 * is derived FROM the fork placement, keeping crown/head-tube/tubes coherent.
 *
 * Per paint zone the geometry is split into two buckets:
 *  - `zones[z]`      the tube lofts, painted with the zone's composited texture
 *                    (base colour + layers/decals/shapes).
 *  - `zonesPlain[z]` chunky junction primitives (BB shell, dropouts, steerer)
 *                    painted with the zone's BASE COLOUR only. Their UVs don't
 *                    match the tube wrap, so mapping the layer texture onto them
 *                    would smear/bleed decals & shapes across them (e.g. a shape
 *                    at the top of the seat tube leaking onto the BB shell).
 * Plus two hardware buckets: `alu` (thru-axle + lever) and `dark` (bores/caps).
 */

export type FrameZone =
  | 'headTube'
  | 'topTube'
  | 'downTube'
  | 'seatTube'
  | 'seatStays'
  | 'chainStays'
  | 'fork';

export const FRAME_ZONES: FrameZone[] = [
  'headTube',
  'topTube',
  'downTube',
  'seatTube',
  'seatStays',
  'chainStays',
  'fork',
];

export interface FrameModel {
  /** Tube lofts, painted with the zone's composited (base + layers) texture. */
  zones: Record<FrameZone, THREE.BufferGeometry>;
  /** Junction primitives, painted with the zone's flat base colour only. */
  zonesPlain: Partial<Record<FrameZone, THREE.BufferGeometry>>;
  /** Bright alloy hardware (thru-axle, lever). */
  alu: THREE.BufferGeometry;
  /** Dark bore/caps (BB caps, steerer bore). */
  dark: THREE.BufferGeometry;
}

// --- Frameset geometry constants (millimetres / radians) ---
const HEAD_ANGLE = (71 * Math.PI) / 180;
const HEAD_TILT = Math.PI / 2 - HEAD_ANGLE;
const STA = (73.5 * Math.PI) / 180;
const FRONT_AXLE = new THREE.Vector3(620, 75, 0);
const REAR_AXLE_X = -Math.sqrt(425 * 425 - 75 * 75); // 425 mm chainstay, 75 mm BB drop

/** mm → scene metres. */
export const MODEL_SCALE = 0.001;
/** Hub positions in scene metres (for wheel placement + ground/camera). */
export const FRONT_HUB = new THREE.Vector3(FRONT_AXLE.x, FRONT_AXLE.y, 0).multiplyScalar(MODEL_SCALE);
export const REAR_HUB = new THREE.Vector3(REAR_AXLE_X, 75, 0).multiplyScalar(MODEL_SCALE);

export function buildFrameModel(): FrameModel {
  const mapped: Record<FrameZone, THREE.BufferGeometry[]> = {
    headTube: [],
    topTube: [],
    downTube: [],
    seatTube: [],
    seatStays: [],
    chainStays: [],
    fork: [],
  };
  const plain: Partial<Record<FrameZone, THREE.BufferGeometry[]>> = {
    fork: [],
    seatTube: [],
    chainStays: [],
  };
  const alu: THREE.BufferGeometry[] = [];
  const dark: THREE.BufferGeometry[] = [];

  // ---------- Fork rig: fork-local → frame world (yaw · head-tilt · offset) ----------
  const M0 = new THREE.Matrix4().multiplyMatrices(
    new THREE.Matrix4().makeRotationZ(HEAD_TILT),
    new THREE.Matrix4().makeRotationY(Math.PI / 2),
  );
  const axleNow = new THREE.Vector3(0, -391, 49).applyMatrix4(M0);
  const rigPos = FRONT_AXLE.clone().sub(axleNow);
  const M = new THREE.Matrix4().makeTranslation(rigPos.x, rigPos.y, rigPos.z).multiply(M0);
  const bake = (g: THREE.BufferGeometry) => g.applyMatrix4(M);

  // ---------- Fork ----------
  // Tapered steerer (1 1/8" → 1 1/2"), uncut above the head tube. Base-only:
  // hidden in the head tube, lathe UVs don't match the blade wrap.
  const profile = [
    [22.0, 46],
    [20.5, 52],
    [19.05, 54],
    [19.05, 95],
    [14.3, 152],
    [14.3, 256],
    [13.6, 260],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  plain.fork!.push(bake(new THREE.LatheGeometry(profile, 64)));

  // Uni-crown loft: one continuous curve dropout → crown → dropout (mapped).
  const wU = (t: number) => Math.abs(t - 0.5) * 2;
  const legR = (t: number) => 12.5 + 13 * Math.pow(1 - wU(t), 2.0);
  const legD = (t: number) => 1.02 + 0.2 * wU(t);
  const forkPts = [
    [-56, -386, 47],
    [-58, -318, 37],
    [-58, -195, 22],
    [-53, -62, 10],
    [-38, -2, 4],
    [-16, 22, 3],
    [0, 28, 2],
    [16, 22, 3],
    [38, -2, 4],
    [53, -62, 10],
    [58, -195, 22],
    [58, -318, 37],
    [56, -386, 47],
  ];
  mapped.fork.push(bake(loftTube(forkPts, legR, legD, 260, 48).geo));

  // Dropouts + axle bosses (organic, base-only).
  for (const s of [-1, 1]) {
    const drop = new THREE.SphereGeometry(16.5, 48, 32);
    drop.scale(0.62, 1.3, 1.05);
    drop.rotateX(0.15);
    drop.translate(s * 57, -386, 47);
    plain.fork!.push(bake(drop));
    const boss = new THREE.SphereGeometry(12.5, 40, 28);
    boss.scale(0.42, 1, 1);
    boss.translate(s * 64, -391, 49);
    plain.fork!.push(bake(boss));
  }

  // 12 mm thru-axle + lever (alloy).
  const axle = new THREE.CylinderGeometry(6, 6, 138, 32);
  axle.rotateZ(Math.PI / 2);
  axle.translate(0, -391, 49);
  alu.push(bake(axle));
  const axHead = new THREE.CylinderGeometry(9.5, 9.5, 6, 32);
  axHead.rotateZ(Math.PI / 2);
  axHead.translate(71, -391, 49);
  alu.push(bake(axHead));
  const lever = new THREE.CylinderGeometry(3.2, 2.6, 30, 16);
  lever.translate(73.5, -377, 49);
  alu.push(bake(lever));
  const tip = new THREE.SphereGeometry(3.2, 16, 12);
  tip.translate(73.5, -362, 49);
  alu.push(bake(tip));

  // Steerer bore cap (dark).
  const bore = new THREE.CylinderGeometry(11.5, 11.5, 2, 48);
  bore.translate(0, 259.5, 0);
  dark.push(bake(bore));

  // ---------- Head-tube axis in frame world (from the placed fork) ----------
  const HB = new THREE.Vector3(0, 58, 0).applyMatrix4(M); // head tube bottom
  const dHead = new THREE.Vector3(0, 158, 0).applyMatrix4(M).sub(HB).normalize();
  const HT = HB.clone().addScaledVector(dHead, 160); // head tube top

  // ---------- Frame skeleton ----------
  const BB = new THREE.Vector3(0, 0, 0);
  const dSeat = new THREE.Vector3(-Math.cos(STA), Math.sin(STA), 0);
  const SC = BB.clone().addScaledVector(dSeat, 540); // seat cluster

  // Head tube — slightly conical.
  {
    const a = HB.clone().addScaledVector(dHead, -4);
    const b = HT.clone();
    mapped.headTube.push(loftTube([a, a.clone().lerp(b, 0.5), b], (t) => 27 - 3 * t, () => 1.0, 40, 48).geo);
  }

  // Top tube — gently sloped, tapering to the seat cluster.
  {
    const a = HB.clone().addScaledVector(dHead, 132);
    const b = SC.clone().add(new THREE.Vector3(14, -14, 0));
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -6, 0));
    mapped.topTube.push(loftTube([a, mid, b], (t) => 16 - 3.5 * t, () => 0.85, 90, 40).geo);
  }

  // Down tube — big aero member with a rounded-rectangle (squircle) section.
  {
    const a = HB.clone().addScaledVector(dHead, 38); // junction sits a touch higher on the head tube
    const mid = a.clone().lerp(BB, 0.55).add(new THREE.Vector3(0, -16, 0));
    mapped.downTube.push(
      loftTube(
        [a, mid, new THREE.Vector3(4, 2, 0)],
        (t) => 27 + 6 * Math.sin(t * Math.PI), // deeper in-plane (aero) — reads much thicker from the side
        () => 0.62, // narrower laterally
        90,
        56,
        3.2, // rounded-rectangle cross-section
      ).geo,
    );
  }

  // Seat tube (mapped) + BB shell (base-only). Seat clamp/cluster removed.
  {
    const a = BB.clone().addScaledVector(dSeat, -8);
    const b = SC.clone().addScaledVector(dSeat, 16);
    mapped.seatTube.push(loftTube([a, a.clone().lerp(b, 0.5), b], (t) => 17 - 1.5 * t, () => 0.95, 60, 40).geo);

    const bbShell = new THREE.CylinderGeometry(23.5, 23.5, 68, 48);
    bbShell.rotateX(Math.PI / 2);
    plain.seatTube!.push(bbShell);

    for (const s of [-1, 1]) {
      const cap = new THREE.CylinderGeometry(20, 20, 2, 40);
      cap.rotateX(Math.PI / 2);
      cap.translate(0, 0, s * 34.5);
      dark.push(cap);
    }
  }

  // Chain stays (mapped) + rear dropouts (base-only).
  for (const s of [-1, 1]) {
    const pts = [
      // Root reaches into the BB shell and is pulled inward along z so the ends
      // bury inside the shell instead of overlapping at its outer rim.
      [-8, -3, s * 18],
      [-160, 28, s * 52],
      [-320, 58, s * 64],
      [REAR_AXLE_X + 6, 73, s * 66],
    ];
    mapped.chainStays.push(loftTube(pts, (t) => 11.5 - 3 * t, () => 0.9, 90, 32).geo);
    const drop = new THREE.SphereGeometry(13, 40, 28);
    drop.scale(1.3, 1.05, 0.5);
    drop.translate(REAR_AXLE_X, 75, s * 66);
    plain.chainStays!.push(drop);
  }

  // Seat stays — DROPPED: they join the seat tube low (~61% up), well below the
  // top-tube/seat-cluster junction, then run to the dropouts.
  for (const s of [-1, 1]) {
    const a = BB.clone().addScaledVector(dSeat, 330); // dropped junction on the seat tube
    const pts = [
      new THREE.Vector3(a.x, a.y, s * 9),
      new THREE.Vector3(-235, 250, s * 38),
      new THREE.Vector3(-345, 150, s * 56),
      new THREE.Vector3(REAR_AXLE_X + 8, 82, s * 64),
    ];
    mapped.seatStays.push(loftTube(pts, (t) => 8.5 - 2 * t, () => 0.9, 90, 32).geo);
  }

  const zones = {} as Record<FrameZone, THREE.BufferGeometry>;
  for (const z of FRAME_ZONES) zones[z] = mergeGeometries(mapped[z], false)!;

  const zonesPlain: Partial<Record<FrameZone, THREE.BufferGeometry>> = {};
  for (const z of Object.keys(plain) as FrameZone[]) {
    const arr = plain[z]!;
    if (arr.length) zonesPlain[z] = mergeGeometries(arr, false)!;
  }

  return {
    zones,
    zonesPlain,
    alu: mergeGeometries(alu, false)!,
    dark: mergeGeometries(dark, false)!,
  };
}
