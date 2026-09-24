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
 *  - `zonesPlain[z]` chunky junction primitives (BB shell, steerer)
 *                    painted with the zone's BASE COLOUR only. Their UVs don't
 *                    match the tube wrap, so mapping the layer texture onto them
 *                    would smear/bleed decals & shapes across them (e.g. a shape
 *                    at the top of the seat tube leaking onto the BB shell).
 * Plus two hardware buckets: `alu` (thru-axle) and `dark` (bores/caps).
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

// --- Carbon gravel fork (fork-local mm: +y steerer up, +z forward, +x right) ---
// Origin = headset seat (crown top). Axle-to-crown 400, rake 47, 12×100 axle.

/** Sweep station: centreline p, depth d (fore–aft), width w, superellipse
 *  exponent e (2 = ellipse, 3 = boxy), f = share of depth ahead of the line. */
interface ForkStation {
  p: [number, number, number];
  d: number;
  w: number;
  e: number;
  f: number;
}

// One side, dropout tip → crown. Below the axle the sweep forms the dropout
// itself; the crown shoulder spreads its turn over five stations so the inner
// side never folds over itself.
const FORK_SIDE: ForkStation[] = [
  { p: [56.0, -405.5, 48.6], d: 12.0, w: 7.0, e: 2.05, f: 0.5 }, // dropout tip
  { p: [56.0, -401.0, 47.7], d: 26.0, w: 11.0, e: 2.15, f: 0.48 },
  { p: [56.0, -397.0, 46.9], d: 34.0, w: 12.0, e: 2.25, f: 0.47 }, // axle
  { p: [55.2, -388.0, 45.1], d: 30.0, w: 13.0, e: 2.3, f: 0.46 },
  { p: [53.8, -372.0, 42.0], d: 26.0, w: 13.8, e: 2.35, f: 0.45 },
  { p: [52.0, -345.0, 36.9], d: 24.5, w: 14.8, e: 2.4, f: 0.44 },
  { p: [48.5, -292.0, 28.2], d: 28.0, w: 16.5, e: 2.45, f: 0.43 },
  { p: [45.0, -230.0, 20.4], d: 31.0, w: 18.0, e: 2.5, f: 0.43 },
  { p: [43.0, -165.0, 14.6], d: 34.0, w: 19.0, e: 2.55, f: 0.43 },
  { p: [42.5, -112.0, 11.7], d: 37.0, w: 20.0, e: 2.6, f: 0.44 },
  { p: [42.0, -70.0, 10.6], d: 40.0, w: 21.0, e: 2.65, f: 0.45 }, // blade head
  { p: [42.5, -52.0, 10.4], d: 43.0, w: 22.0, e: 2.7, f: 0.46 }, // crown shoulder
  { p: [41.5, -40.0, 9.6], d: 45.5, w: 23.0, e: 2.7, f: 0.47 },
  { p: [38.5, -32.0, 8.6], d: 48.0, w: 24.5, e: 2.65, f: 0.48 },
  { p: [33.0, -26.0, 7.2], d: 51.0, w: 26.5, e: 2.6, f: 0.49 },
  { p: [24.0, -21.5, 5.2], d: 55.0, w: 29.0, e: 2.55, f: 0.5 },
  { p: [12.5, -18.0, 2.5], d: 59.0, w: 30.0, e: 2.5, f: 0.5 },
];
const FORK_APEX: ForkStation = { p: [0, -16.5, 1.0], d: 62.0, w: 31.0, e: 2.5, f: 0.5 };
/** Fork-local axle centre (the rig anchors this on the front hub). */
const FORK_AXLE = new THREE.Vector3(0, -397, 46.9);

function catmull(a: number, b: number, c: number, d: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
}

/** Catmull-Rom through a scalar per station, at station index s ∈ [0, n−1]. */
function scalarAt(values: number[], s: number): number {
  const n = values.length;
  const i = Math.min(Math.floor(s), n - 2);
  const t = s - i;
  return catmull(values[Math.max(i - 1, 0)], values[i], values[i + 1], values[Math.min(i + 2, n - 1)], t);
}

/**
 * The fork as ONE sweep, left dropout → crown → right dropout, whose
 * superellipse section varies along the path — dropouts, blades and crown are a
 * single mapped mesh, so layers cover all of it. Parallel-transport frames keep
 * "depth" on the fore–aft axis.
 *
 * UV: u = arc length around the section, seam on the inner (wheel-facing)
 * flank; v = arc length along the path, folded at the crown so both blades
 * share 0 (dropout) … 1 (crown) and paint lands symmetrically on both legs. U
 * is mirrored on the second blade so decals read the same way on each; the
 * apex ring is emitted twice so no triangle straddles that mirror.
 */
function buildForkSweep(steps: number, radial: number): THREE.BufferGeometry {
  const st = [
    ...FORK_SIDE.map((s) => ({ ...s, p: [-s.p[0], s.p[1], s.p[2]] as [number, number, number] })),
    FORK_APEX,
    ...FORK_SIDE.slice().reverse(),
  ];
  const n = st.length;
  const depth = st.map((s) => s.d);
  const width = st.map((s) => s.w);
  const expo = st.map((s) => s.e);
  const bias = st.map((s) => s.f);
  const curve = new THREE.CatmullRomCurve3(
    st.map((s) => new THREE.Vector3(...s.p)),
    false,
    'centripetal',
    0.5,
  );

  // Centreline + tangents (getPoint, not getPointAt: keeps t aligned with the
  // station index that drives the section scalars).
  const C: THREE.Vector3[] = [];
  const T: THREE.Vector3[] = [];
  for (let j = 0; j <= steps; j++) {
    C.push(curve.getPoint(j / steps));
    T.push(curve.getTangent(j / steps).normalize());
  }

  // Parallel transport: N starts as +z projected and is turned minimally.
  const N: THREE.Vector3[] = [];
  const B: THREE.Vector3[] = [];
  const n0 = new THREE.Vector3(0, 0, 1);
  n0.addScaledVector(T[0], -n0.dot(T[0])).normalize();
  N.push(n0);
  B.push(new THREE.Vector3().crossVectors(T[0], n0).normalize());
  const axis = new THREE.Vector3();
  const q = new THREE.Quaternion();
  for (let j = 1; j <= steps; j++) {
    axis.crossVectors(T[j - 1], T[j]);
    const s = axis.length();
    const next = N[j - 1].clone();
    if (s > 1e-8) {
      axis.divideScalar(s);
      q.setFromAxisAngle(axis, Math.atan2(s, T[j - 1].dot(T[j])));
      next.applyQuaternion(q);
    }
    next.addScaledVector(T[j], -next.dot(T[j])).normalize();
    N.push(next);
    B.push(new THREE.Vector3().crossVectors(T[j], next).normalize());
  }

  // Arc length along the centreline (for v).
  const along = [0];
  for (let j = 1; j <= steps; j++) along.push(along[j - 1] + C[j].distanceTo(C[j - 1]));
  const total = along[steps];

  // Section rings; each with its arc length around (for u).
  const rings: number[][] = [];
  const around: number[][] = [];
  for (let j = 0; j <= steps; j++) {
    const s = (j / steps) * (n - 1);
    const d = scalarAt(depth, s);
    const w = scalarAt(width, s);
    const e = scalarAt(expo, s);
    const f = scalarAt(bias, s);
    const k2 = 2 / e;
    const ring: number[] = [];
    for (let k = 0; k <= radial; k++) {
      // Start at +B, the inner (wheel-facing) flank, so the UV seam hides there.
      const th = (k / radial) * Math.PI * 2 + Math.PI / 2;
      const cu = Math.cos(th);
      const cv = Math.sin(th);
      const a = Math.sign(cu) * Math.pow(Math.abs(cu), k2);
      const b = Math.sign(cv) * Math.pow(Math.abs(cv), k2);
      const du = a >= 0 ? d * f : d * (1 - f);
      ring.push(
        C[j].x + N[j].x * a * du + B[j].x * b * w * 0.5,
        C[j].y + N[j].y * a * du + B[j].y * b * w * 0.5,
        C[j].z + N[j].z * a * du + B[j].z * b * w * 0.5,
      );
    }
    const cum = [0];
    for (let k = 1; k <= radial; k++) {
      cum.push(
        cum[k - 1] +
          Math.hypot(
            ring[k * 3] - ring[(k - 1) * 3],
            ring[k * 3 + 1] - ring[(k - 1) * 3 + 1],
            ring[k * 3 + 2] - ring[(k - 1) * 3 + 2],
          ),
      );
    }
    rings.push(ring);
    around.push(cum);
  }

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const stride = radial + 1;
  const mid = steps / 2;
  // Emit rings 0…mid (left blade) and mid…steps (right blade, U mirrored).
  const order: { j: number; mirror: boolean }[] = [];
  for (let j = 0; j <= mid; j++) order.push({ j, mirror: false });
  for (let j = mid; j <= steps; j++) order.push({ j, mirror: true });
  order.forEach(({ j, mirror }) => {
    const v = 1 - Math.abs((2 * along[j]) / total - 1);
    const perim = around[j][radial];
    for (let k = 0; k <= radial; k++) {
      pos.push(rings[j][k * 3], rings[j][k * 3 + 1], rings[j][k * 3 + 2]);
      const u = perim > 0 ? around[j][k] / perim : k / radial;
      uv.push(mirror ? 1 - u : u, v);
    }
  });
  for (let r = 0; r < order.length - 1; r++) {
    if (order[r].j === order[r + 1].j) continue; // duplicated apex ring
    for (let k = 0; k < radial; k++) {
      const a = r * stride + k;
      const c = (r + 1) * stride + k;
      idx.push(a, a + 1, c + 1, a, c + 1, c);
    }
  }

  // End caps at both dropout tips.
  const last = (order.length - 1) * stride;
  const cs = pos.length / 3;
  pos.push(C[0].x, C[0].y, C[0].z);
  uv.push(0.5, 0);
  const ce = pos.length / 3;
  pos.push(C[steps].x, C[steps].y, C[steps].z);
  uv.push(0.5, 0);
  for (let k = 0; k < radial; k++) {
    idx.push(cs, k + 1, k);
    idx.push(ce, last + k, last + k + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

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
  };
  const alu: THREE.BufferGeometry[] = [];
  const dark: THREE.BufferGeometry[] = [];

  // ---------- Fork rig: fork-local → frame world (yaw · head-tilt · offset) ----------
  const M0 = new THREE.Matrix4().multiplyMatrices(
    new THREE.Matrix4().makeRotationZ(HEAD_TILT),
    new THREE.Matrix4().makeRotationY(Math.PI / 2),
  );
  const axleNow = FORK_AXLE.clone().applyMatrix4(M0);
  const rigPos = FRONT_AXLE.clone().sub(axleNow);
  const M = new THREE.Matrix4().makeTranslation(rigPos.x, rigPos.y, rigPos.z).multiply(M0);
  const bake = (g: THREE.BufferGeometry) => g.applyMatrix4(M);

  // ---------- Fork ----------
  // Tapered steerer (1.5" → 1 1/8"); below the headset seat it flares into the
  // crown like a monocoque fork. Ends 42 mm above the head tube (spacers).
  // Base-only: its lathe UVs don't match the blade wrap.
  const steererTop = 180;
  const profile = [
    [0, -24],
    [25.5, -24],
    [24.6, -18],
    [22.8, -11],
    [21.0, -5],
    [19.9, 0],
    [19.9, 40],
    [19.5, 48],
    [17.2, 62],
    [15.0, 76],
    [14.3, 84],
    [14.3, steererTop - 4],
    [13.0, steererTop],
    [0, steererTop],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  plain.fork!.push(bake(new THREE.LatheGeometry(profile, 64)));

  // Dropouts + blades + crown: one mapped sweep (see buildForkSweep).
  mapped.fork.push(bake(buildForkSweep(260, 48)));

  // 12 mm thru-axle (alloy): shaft ends inside both dropouts, clamp head left.
  const axle = new THREE.CylinderGeometry(6, 6, 116, 32);
  axle.rotateZ(Math.PI / 2);
  axle.translate(FORK_AXLE.x, FORK_AXLE.y, FORK_AXLE.z);
  alu.push(bake(axle));
  const axHead = new THREE.CylinderGeometry(9.5, 8.4, 7, 32);
  axHead.rotateZ(Math.PI / 2);
  axHead.translate(-63.5, FORK_AXLE.y, FORK_AXLE.z);
  alu.push(bake(axHead));

  // Steerer bore cap (dark).
  const bore = new THREE.CylinderGeometry(11.5, 11.5, 2, 48);
  bore.translate(0, steererTop - 0.5, 0);
  dark.push(bake(bore));

  // ---------- Head-tube axis in frame world (from the placed fork) ----------
  const HB = new THREE.Vector3(0, 0, 0).applyMatrix4(M); // head tube bottom = headset seat
  const dHead = new THREE.Vector3(0, 100, 0).applyMatrix4(M).sub(HB).normalize();
  const HT = HB.clone().addScaledVector(dHead, 138); // head tube top (shortened)

  // ---------- Frame skeleton ----------
  const BB = new THREE.Vector3(0, 0, 0);
  const dSeat = new THREE.Vector3(-Math.cos(STA), Math.sin(STA), 0);
  const SC = BB.clone().addScaledVector(dSeat, 510); // seat cluster (lowered → shorter seat tube)

  // Head tube — slightly conical. Chunky enough that the uniform down tube plugs
  // fully into it (no overhang at the join).
  {
    const a = HB.clone().addScaledVector(dHead, -4);
    const b = HT.clone();
    mapped.headTube.push(loftTube([a, a.clone().lerp(b, 0.5), b], (t) => 29 - 3 * t, () => 1.0, 40, 48).geo);
  }

  // Top tube — gently sloped, tapering to the seat cluster. Sits a bit lower now.
  {
    const a = HB.clone().addScaledVector(dHead, 108);
    const b = SC.clone().add(new THREE.Vector3(14, -14, 0));
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -6, 0));
    mapped.topTube.push(loftTube([a, mid, b], (t) => 16 - 3.5 * t, () => 0.85, 90, 40).geo);
  }

  // Down tube — big aero member with a rounded-rectangle (squircle) section.
  {
    const a = HB.clone().addScaledVector(dHead, 55); // down tube meets the head tube higher up
    const mid = a.clone().lerp(BB, 0.55).add(new THREE.Vector3(0, -16, 0));
    mapped.downTube.push(
      loftTube(
        // End plunged into the BB shell so the tube fully overlaps it (no gap).
        [a, mid, new THREE.Vector3(2, 3, 0)],
        () => 26, // uniform thickness the whole length (⌀52 in-plane)
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

    const bbShell = new THREE.CylinderGeometry(28, 28, 68, 48);
    bbShell.rotateX(Math.PI / 2);
    plain.seatTube!.push(bbShell);

    for (const s of [-1, 1]) {
      const cap = new THREE.CylinderGeometry(20, 20, 2, 40);
      cap.rotateX(Math.PI / 2);
      cap.translate(0, 0, s * 34.5);
      dark.push(cap);
    }
  }

  // Chain stays (mapped). Past the axle each stay flattens into a thin, tall
  // dropout plate with a rounded tip — part of the same sweep, so layers cover it.
  for (const s of [-1, 1]) {
    const pts = [
      // Root reaches into the BB shell and is pulled inward along z so the ends
      // bury inside the shell instead of overlapping at its outer rim.
      new THREE.Vector3(-8, -3, s * 18),
      new THREE.Vector3(-160, 28, s * 52),
      new THREE.Vector3(-320, 58, s * 64),
      new THREE.Vector3(REAR_AXLE_X + 20, 72, s * 66),
      new THREE.Vector3(REAR_AXLE_X - 16, 77, s * 66), // dropout tip
    ];
    const len = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5).getLength();
    const plate = (t: number) => 1 - THREE.MathUtils.smoothstep((1 - t) * len, 14, 80); // 1 on the dropout, long taper
    const tip = (t: number) => {
      const u = Math.min(1, ((1 - t) * len) / 8);
      return Math.max(0.2, Math.sqrt(1 - (1 - u) * (1 - u))); // quarter-round tip
    };
    const r = (t: number) => THREE.MathUtils.lerp(11.5 - 3 * t, 11, plate(t)) * tip(t);
    const lateral = (t: number) => THREE.MathUtils.lerp((11.5 - 3 * t) * 0.9, 4.5, plate(t)) * tip(t);
    mapped.chainStays.push(loftTube(pts, r, (t) => lateral(t) / r(t), 110, 32).geo);
  }

  // Seat stays — DROPPED: they join the seat tube low (~61% up), well below the
  // top-tube/seat-cluster junction, then run to the dropouts.
  for (const s of [-1, 1]) {
    const a = BB.clone().addScaledVector(dSeat, 330); // dropped junction on the seat tube
    const pts = [
      new THREE.Vector3(a.x, a.y, s * 9),
      new THREE.Vector3(-235, 250, s * 38),
      new THREE.Vector3(-345, 150, s * 56),
      new THREE.Vector3(REAR_AXLE_X - 8, 79, s * 66), // upper edge runs flush onto the dropout plate
    ];
    // The end flattens so it stays within the thin dropout plate's width.
    const flat = (t: number) => THREE.MathUtils.lerp(0.9, 0.55, THREE.MathUtils.smoothstep(t, 0.8, 1));
    mapped.seatStays.push(loftTube(pts, (t) => 8.5 - 2 * t, flat, 90, 32).geo);
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
