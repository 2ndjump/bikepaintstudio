import * as THREE from 'three';
import type { ZoneId } from '../state/types';

export interface FrameGeometryDesc {
  tubes: TubeDesc[];
  rearHub: THREE.Vector3;
  frontHub: THREE.Vector3;
  wheelRadius: number;
  anchors: FrameAnchors;
  geo: BikeGeo;
}

export interface FrameAnchors {
  bb: THREE.Vector3;
  stTop: THREE.Vector3;
  htTop: THREE.Vector3;
  htBot: THREE.Vector3;
  crownBot: THREE.Vector3;
  seatstayAttach: THREE.Vector3;
  rearHub: THREE.Vector3;
  frontHub: THREE.Vector3;
  /** Unit vector along the seat tube, pointing up (BB → stTop). */
  stAxis: THREE.Vector3;
  /** Unit vector along the head tube / steering axis, pointing up (htBot → htTop). */
  htAxis: THREE.Vector3;
  /** Rear dropout half-spacing (z offset of each chainstay/seatstay end). */
  halfStayRear: number;
  /** Front fork tip half-spacing. */
  halfStayFront: number;
  /** BB shell half-width along z. */
  bbShellHalfWidth: number;
  seatTubeAngle: number;
  headTubeAngle: number;
}

export interface TubeDesc {
  zone: ZoneId;
  path: THREE.Vector3[];
  /** Radius at path start */
  radiusStart: number;
  /** Radius at path end — defaults to radiusStart */
  radiusEnd?: number;
  /** Oval scaling at start (x=side-to-side, z=in-plane perpendicular) */
  csStart?: { x: number; z: number };
  /** Oval scaling at end — defaults to csStart */
  csEnd?: { x: number; z: number };
  radialSegments?: number;
  tubularSegments?: number;
  /** Superellipse exponent: 2 = ellipse, 2.5-3 = rounded rectangle. */
  shapeExponent?: number;
}

/**
 * Frame geometry parameters. All lengths in meters, angles in degrees.
 * Numbers follow a real 56cm endurance road bike (Specialized Roubaix /
 * Trek Domane class): stack 565, reach 385, HT 73°, ST 73.5°,
 * chainstay 412, BB drop 72, fork rake 47.
 */
export interface BikeGeo {
  /** Seat tube length BB → seat cluster (center-top). */
  seatTubeLen: number;
  seatTubeAngle: number;
  /** Horizontal distance BB → head tube top center. */
  reach: number;
  /** Vertical distance BB → head tube top center. */
  stack: number;
  headTubeLen: number;
  headTubeAngle: number;
  /** Fork rake (offset perpendicular to steering axis). */
  forkRake: number;
  /** Chainstay length (BB center → rear axle, 3D). */
  chainstayLen: number;
  /** BB drop: how far hubs sit ABOVE the BB. */
  bbDrop: number;
  /** Tire cross-section radius (half the tire width). */
  tireWidth: number;
  /** Outer wheel radius including tire. */
  wheelRadius: number;
}

// 56cm endurance road geometry.
export const ROAD_GEO: BikeGeo = {
  seatTubeLen: 0.500,
  seatTubeAngle: 73.5,
  reach: 0.385,
  stack: 0.565,
  headTubeLen: 0.150,
  headTubeAngle: 73.0,
  // Rake is exaggerated past a real ~47mm to open up down-tube/front-wheel
  // clearance — the fork sweeps the hub further forward.
  forkRake: 0.085,
  chainstayLen: 0.412,
  bbDrop: 0.072,
  tireWidth: 0.014,
  wheelRadius: 0.339,
};

const D2R = Math.PI / 180;

export function buildBikeFrame(geo: BikeGeo = ROAD_GEO): FrameGeometryDesc {
  const bb = new THREE.Vector3(0, 0, 0);

  const seatTubeAngle = geo.seatTubeAngle * D2R;
  const headTubeAngle = geo.headTubeAngle * D2R;

  // --- Key points ---
  const stTop = new THREE.Vector3(
    -Math.cos(seatTubeAngle) * geo.seatTubeLen,
    Math.sin(seatTubeAngle) * geo.seatTubeLen,
    0,
  );

  const htTop = new THREE.Vector3(geo.reach, geo.stack, 0);
  const htBot = new THREE.Vector3(
    htTop.x + Math.cos(headTubeAngle) * geo.headTubeLen,
    htTop.y - Math.sin(headTubeAngle) * geo.headTubeLen,
    0,
  );

  // Hubs. Rear from chainstay length + BB drop; front from steering geometry.
  const hubY = geo.bbDrop;
  const rearHub = new THREE.Vector3(
    -Math.sqrt(geo.chainstayLen * geo.chainstayLen - hubY * hubY),
    hubY,
    0,
  );
  const frontHub = new THREE.Vector3(
    htBot.x + (htBot.y - hubY) / Math.tan(headTubeAngle) + geo.forkRake / Math.sin(headTubeAngle),
    hubY,
    0,
  );

  // --- Axes ---
  const stAxis = stTop.clone().normalize(); // BB is origin
  const htAxis = new THREE.Vector3().subVectors(htTop, htBot).normalize();
  const ttAxis = new THREE.Vector3().subVectors(htTop, stTop).normalize();

  // --- Stay / shell spacing ---
  const halfStayRear = 0.0635; // 142mm hub minus dropout thickness
  const halfStayFront = 0.070; // wide fork stance — wide gap between blades
  const bbShellHalfWidth = 0.044;

  // Dropped seatstays: attach at 80% up the seat tube. Roots sit close to the
  // ST axis so their end caps stay buried inside the tube body.
  const seatstayAttach = stTop.clone().multiplyScalar(0.80);
  seatstayAttach.x -= 0.004;

  // Fork crown anchor (kept for the anchors record; the fork itself is now a
  // separate model positioned from frontHub + htBot/htAxis).
  const crownBot = htBot.clone().addScaledVector(htAxis, -0.050);

  const tubes: TubeDesc[] = [
    // ── Head tube ── chunky tapered modern HT (41 → 49mm). Oversized enough
    // that the TT and DT roots bury fully inside it with 2mm+ margin. Bottom
    // end sits 10mm inside the crown so its cap rim never reaches the skin.
    {
      zone: 'headTube',
      path: [
        htBot.clone().addScaledVector(htAxis, -0.010),
        htTop.clone().addScaledVector(htAxis, 0.012),
      ],
      radiusStart: 0.0245,
      radiusEnd: 0.0205,
      csStart: { x: 1.0, z: 1.05 },
      csEnd: { x: 1.0, z: 1.05 },
      radialSegments: 24,
      tubularSegments: 12,
      shapeExponent: 2,
    },

    // ── Top tube ── flattened oval, gentle slope down toward the seat cluster.
    // End caps sit just SHORT of each partner tube's axis so the cap rim stays
    // buried inside the partner's skin (the tube walls still pierce the
    // partner surface, which is what makes the joint read as welded).
    {
      zone: 'topTube',
      path: [
        stTop.clone().addScaledVector(ttAxis, 0.005),
        htTop.clone().addScaledVector(htAxis, -0.026).addScaledVector(ttAxis, -0.009),
      ],
      radiusStart: 0.019,
      radiusEnd: 0.019,
      csStart: { x: 0.85, z: 0.75 },
      csEnd: { x: 0.92, z: 1.02 },
      radialSegments: 22,
      tubularSegments: 24,
      shapeExponent: 2.4,
    },

    // ── Down tube ── the big aero member: 45×60mm rounded-rect at BB,
    // narrowing to meet the 49mm head tube bottom. End cap pulled back along
    // its own axis so the rim stays under the HT skin.
    ...(() => {
      const dtStart = new THREE.Vector3(-0.008, 0.002, 0);
      const dtEndNominal = htBot.clone().addScaledVector(htAxis, 0.022);
      const dtAxis = new THREE.Vector3().subVectors(dtEndNominal, dtStart).normalize();
      const dtEnd = dtEndNominal.addScaledVector(dtAxis, -0.013);
      const dt: TubeDesc = {
        zone: 'downTube',
        path: [dtStart, dtEnd],
        radiusStart: 0.030,
        radiusEnd: 0.0235,
        csStart: { x: 0.75, z: 1.00 },
        csEnd: { x: 0.78, z: 0.85 },
        radialSegments: 26,
        tubularSegments: 32,
        shapeExponent: 2.6,
      };
      return [dt];
    })(),

    // ── Seat tube ── stout at the top (covers the TT root + clamp area),
    // flaring to an aero section at the BB.
    {
      zone: 'seatTube',
      path: [
        new THREE.Vector3(0.004, -0.002, 0),
        // Extended up so the ST top reaches the upper edge of the top tube
        // (TT half-height ≈ 0.019 * 0.85 above its centerline near stTop).
        stTop.clone().addScaledVector(stAxis, 0.018),
      ],
      radiusStart: 0.021,
      radiusEnd: 0.0175,
      csStart: { x: 0.85, z: 1.30 },
      csEnd: { x: 1.0, z: 1.0 },
      radialSegments: 22,
      tubularSegments: 24,
      shapeExponent: 2.2,
    },

    // ── Chainstays ── tall blades at the BB (18×42mm) tapering to the
    // dropouts, bowed outward for tire clearance.
    ...([1, -1] as const).map((side): TubeDesc => ({
      zone: 'chainStays',
      path: [
        new THREE.Vector3(-0.012, -0.002, 0.030 * side),
        new THREE.Vector3(-0.16, 0.012, (halfStayRear + 0.008) * side),
        new THREE.Vector3(rearHub.x + 0.012, rearHub.y - 0.001, halfStayRear * side),
      ],
      radiusStart: 0.015,
      radiusEnd: 0.0085,
      csStart: { x: 0.60, z: 1.40 },
      csEnd: { x: 0.75, z: 1.10 },
      radialSegments: 16,
      tubularSegments: 24,
      shapeExponent: 2.3,
    })),

    // ── Seatstays ── thin dropped blades with a slight arc. Roots start at
    // z ±9mm so the end caps stay inside the seat tube (half-width ~17.7mm).
    ...([1, -1] as const).map((side): TubeDesc => ({
      zone: 'seatStays',
      path: [
        new THREE.Vector3(seatstayAttach.x, seatstayAttach.y, 0.009 * side),
        new THREE.Vector3(
          (seatstayAttach.x + rearHub.x) / 2 - 0.008,
          (seatstayAttach.y + rearHub.y) / 2 + 0.012,
          (0.009 + halfStayRear) * 0.55 * side,
        ),
        new THREE.Vector3(rearHub.x + 0.010, rearHub.y + 0.006, halfStayRear * side),
      ],
      radiusStart: 0.0075,
      radiusEnd: 0.0060,
      csStart: { x: 0.85, z: 1.30 },
      csEnd: { x: 0.85, z: 1.10 },
      radialSegments: 14,
      tubularSegments: 20,
      shapeExponent: 2,
    })),

    // ── Fork ── the crown + blades are now a separate full-carbon uni-crown
    // model (see components/Viewport/Fork.tsx + geometry/fork.ts), positioned
    // from the anchors below. No fork tubes are emitted here.
  ];

  const anchors: FrameAnchors = {
    bb: bb.clone(),
    stTop: stTop.clone(),
    htTop: htTop.clone(),
    htBot: htBot.clone(),
    crownBot: crownBot.clone(),
    seatstayAttach: seatstayAttach.clone(),
    rearHub: rearHub.clone(),
    frontHub: frontHub.clone(),
    stAxis: stAxis.clone(),
    htAxis: htAxis.clone(),
    halfStayRear,
    halfStayFront,
    bbShellHalfWidth,
    seatTubeAngle,
    headTubeAngle,
  };

  return { tubes, rearHub, frontHub, wheelRadius: geo.wheelRadius, anchors, geo };
}

/** Backward-compatibility alias — use buildBikeFrame instead. */
export function buildRoadFrame(): FrameGeometryDesc {
  return buildBikeFrame(ROAD_GEO);
}
