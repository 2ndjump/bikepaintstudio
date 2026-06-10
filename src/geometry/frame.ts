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
  forkCrownTop: THREE.Vector3;
  forkCrownBot: THREE.Vector3;
  seatstayAttach: THREE.Vector3;
  rearHub: THREE.Vector3;
  frontHub: THREE.Vector3;
  halfStay: number;
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
  /** Oval scaling at start (x=side, z=fore-aft) */
  csStart?: { x: number; z: number };
  /** Oval scaling at end — defaults to csStart */
  csEnd?: { x: number; z: number };
  radialSegments?: number;
  tubularSegments?: number;
  /**
   * Cross-section shape exponent (Lamé curve / superellipse):
   *   2 = ellipse (default), 4 = rounded rectangle, 8 = nearly sharp rectangle.
   */
  shapeExponent?: number;
}

/**
 * Geometry parameters that drive the frame shape. Numbers approximate published
 * specs of size-56cm bikes from the named brands. Lengths are meters, angles
 * are degrees.
 */
export interface BikeGeo {
  seatTubeLen: number;
  seatTubeAngle: number;
  topTubeLen: number;
  topTubeDrop: number;
  headTubeLen: number;
  headTubeAngle: number;
  forkLen: number;
  forkRake: number;
  rearHubX: number;
  hubHeight: number;
  /** Tire cross-section radius (used by Wheel.tsx) */
  tireWidth: number;
  /** Outer wheel radius including tire */
  wheelRadius: number;
}

// Modern endurance road bike geometry — tuned for visible front-wheel clearance.
// `topTubeDrop` is the rise from seat-tube-top to head-tube-top (compact frame).
// Seat tube and head tube are each shortened by half the original head-tube
// length so the top tube sits lower (seatpost + steerer take up the slack).
export const ROAD_GEO: BikeGeo = {
  seatTubeLen: 0.422,
  seatTubeAngle: 73.5,
  topTubeLen: 0.605,
  topTubeDrop: 0.080,
  headTubeLen: 0.077,
  headTubeAngle: 71.0,
  forkLen: 0.395,
  forkRake: 0.060,
  rearHubX: -0.420,
  hubHeight: 0.063,
  tireWidth: 0.014,
  wheelRadius: 0.336,
};


const D2R = Math.PI / 180;

export function buildBikeFrame(geo: BikeGeo = ROAD_GEO): FrameGeometryDesc {
  const bb = new THREE.Vector3(0, 0, 0);

  const seatTubeAngle = geo.seatTubeAngle * D2R;
  const headTubeAngle = geo.headTubeAngle * D2R;

  // --- Main triangle ---
  const stTop = new THREE.Vector3(
    bb.x - Math.cos(seatTubeAngle) * geo.seatTubeLen,
    bb.y + Math.sin(seatTubeAngle) * geo.seatTubeLen,
    0,
  );

  const htTop = new THREE.Vector3(stTop.x + geo.topTubeLen, stTop.y + geo.topTubeDrop, 0);

  const htBot = new THREE.Vector3(
    htTop.x + Math.cos(headTubeAngle) * geo.headTubeLen,
    htTop.y - Math.sin(headTubeAngle) * geo.headTubeLen,
    0,
  );

  // --- Hubs & rear stays ---
  const rearHub = new THREE.Vector3(geo.rearHubX, geo.hubHeight, 0);

  const frontHub = new THREE.Vector3(
    htBot.x + Math.cos(headTubeAngle) * geo.forkLen + Math.sin(headTubeAngle) * geo.forkRake,
    geo.hubHeight,
    0,
  );

  const halfStay = 0.057;
  const rRear = new THREE.Vector3(rearHub.x, rearHub.y, halfStay);
  const lRear = new THREE.Vector3(rearHub.x, rearHub.y, -halfStay);
  const rFront = new THREE.Vector3(frontHub.x, frontHub.y, halfStay * 0.9);
  const lFront = new THREE.Vector3(frontHub.x, frontHub.y, -halfStay * 0.9);

  // Fork crown positions
  const forkCrownTop = new THREE.Vector3(htBot.x, htBot.y, 0);
  const forkCrownBot = new THREE.Vector3(
    htBot.x + Math.cos(headTubeAngle) * 0.045,
    htBot.y - Math.sin(headTubeAngle) * 0.045,
    0,
  );

  // --- Joint-extension helper ---
  // Small overlap so tube ends sit inside the partner tube and aren't visible
  // as flat caps. Junction fillets fill any remaining armpit between two
  // crossing tubes.
  const SELF_EXT = 0.010;
  const axis = (from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 =>
    new THREE.Vector3().subVectors(to, from).normalize();

  const ttAxis = axis(stTop, htTop);
  const stAxis = axis(bb, stTop);
  const htAxis = axis(htBot, htTop);
  const dtMidpoint = new THREE.Vector3(
    bb.x + (htBot.x - bb.x) * 0.35,
    bb.y + (htBot.y - bb.y) * 0.35 + 0.01,
    0,
  );
  const dtAxisAtEnd = axis(dtMidpoint, htBot);
  const forkCrownAxis = axis(forkCrownTop, forkCrownBot);

  // --- Path builders ---

  // Chainstay: bows outward around chainring, flat oval cross-section
  const chainstayPath = (sign: 1 | -1): THREE.Vector3[] => {
    const zEnd = halfStay * sign;
    return [
      new THREE.Vector3(bb.x + 0.006, bb.y - 0.005, 0.022 * sign),
      new THREE.Vector3(bb.x - 0.06, bb.y + 0.002, halfStay * 1.55 * sign),
      new THREE.Vector3(bb.x - 0.18, bb.y + 0.015, halfStay * 1.12 * sign),
      new THREE.Vector3(bb.x - 0.32, bb.y + 0.035, zEnd * 1.02),
      new THREE.Vector3(rearHub.x, rearHub.y, zEnd),
    ];
  };

  // Seatstay: thin aero blade. Modern endurance/gravel bikes use "dropped"
  // seatstays — they attach low on the seat tube (around mid-tube) instead of
  // at stTop, giving more vertical compliance.
  const stLen = Math.sqrt(stTop.x * stTop.x + stTop.y * stTop.y);
  const seatstayAttachT = 0.55; // fraction along ST from BB
  const seatstayAttach = new THREE.Vector3(
    stTop.x * seatstayAttachT,
    stTop.y * seatstayAttachT,
    0,
  );
  // Push the attach point slightly rearward of the ST centerline so the stay
  // emerges from the back of the seat tube, not its axis.
  seatstayAttach.x -= 0.012;
  void stLen;
  const seatstayPath = (target: THREE.Vector3): THREE.Vector3[] => {
    const mid = new THREE.Vector3().lerpVectors(seatstayAttach, target, 0.55);
    mid.z = (seatstayAttach.z + target.z) / 2 + (target.z > 0 ? 0.006 : -0.006);
    return [seatstayAttach.clone(), mid, target.clone()];
  };

  // Fork leg: nearly straight — rake comes from the crown offset, not blade curve.
  // This matches the modern straight-bladed carbon fork (eg ENVE All-Road) look.
  const forkLegPath = (target: THREE.Vector3): THREE.Vector3[] => {
    const start = new THREE.Vector3(forkCrownBot.x, forkCrownBot.y, target.z * 0.55);
    // Use only 2 points = LineCurve3 = perfectly straight blade.
    return [start, target.clone()];
  };

  const tubes: TubeDesc[] = [
    // Head tube — stays round. Extended along its own axis so caps tuck inside
    // the fork crown (bottom) and the top tube (top).
    {
      zone: 'headTube',
      path: [
        htBot.clone().addScaledVector(htAxis, -SELF_EXT),
        htTop.clone().addScaledVector(htAxis, SELF_EXT),
      ],
      radiusStart: 0.026,
      radiusEnd: 0.023,
      csStart: { x: 1.0, z: 0.95 },
      radialSegments: 20,
    },

    // Top tube — wide+flat elliptic cross-section. Extended along TT axis past both ends.
    {
      zone: 'topTube',
      path: [
        stTop.clone().addScaledVector(ttAxis, -SELF_EXT),
        htTop.clone().addScaledVector(ttAxis, SELF_EXT),
      ],
      radiusStart: 0.021,
      radiusEnd: 0.019,
      csStart: { x: 1.30, z: 0.60 },
      csEnd: { x: 1.20, z: 0.55 },
      radialSegments: 18,
      tubularSegments: 40,
    },

    // Down tube — rounded rectangle (3 height : 2 width), tapering toward the
    // head tube. Extended along its own axis at HT end so the cap is hidden.
    {
      zone: 'downTube',
      path: [
        bb.clone(),
        dtMidpoint,
        htBot.clone().addScaledVector(dtAxisAtEnd, SELF_EXT),
      ],
      radiusStart: 0.030,
      radiusEnd: 0.022,
      csStart: { x: 1.0, z: 1.5 },
      csEnd: { x: 0.8, z: 1.2 },
      radialSegments: 28,
      tubularSegments: 56,
      shapeExponent: 4,
    },

    // Seat tube — aero airfoil at the BB, transitioning to round at the top so
    // the wider top-tube extension is hidden inside the junction.
    {
      zone: 'seatTube',
      path: [
        bb.clone(),
        stTop.clone().addScaledVector(stAxis, SELF_EXT),
      ],
      radiusStart: 0.022,
      radiusEnd: 0.022,
      csStart: { x: 0.7, z: 1.5 },
      csEnd: { x: 1.0, z: 1.0 },
      radialSegments: 22,
      tubularSegments: 32,
    },

    // Seatstays — thin blades, right + left
    {
      zone: 'seatStays',
      path: seatstayPath(rRear),
      radiusStart: 0.010,
      radiusEnd: 0.007,
      csStart: { x: 0.55, z: 1.8 },
      csEnd: { x: 0.45, z: 1.5 },
      radialSegments: 12,
      tubularSegments: 28,
    },
    {
      zone: 'seatStays',
      path: seatstayPath(lRear),
      radiusStart: 0.010,
      radiusEnd: 0.007,
      csStart: { x: 0.55, z: 1.8 },
      csEnd: { x: 0.45, z: 1.5 },
      radialSegments: 12,
      tubularSegments: 28,
    },

    // Chainstays — flat oval blade shape, right + left
    {
      zone: 'chainStays',
      path: chainstayPath(1),
      radiusStart: 0.016,
      radiusEnd: 0.010,
      csStart: { x: 0.60, z: 1.9 },
      csEnd: { x: 0.50, z: 1.4 },
      radialSegments: 14,
      tubularSegments: 40,
    },
    {
      zone: 'chainStays',
      path: chainstayPath(-1),
      radiusStart: 0.016,
      radiusEnd: 0.010,
      csStart: { x: 0.60, z: 1.9 },
      csEnd: { x: 0.50, z: 1.4 },
      radialSegments: 14,
      tubularSegments: 40,
    },

    // Fork crown — subtle taper sitting just below the HT. Matches the blade
    // cross-section at the bottom so there's no visible step where blades emerge.
    // No self-extension up: the crown sits flush against htBot, where the HT
    // body itself extends down to cover the join.
    {
      zone: 'forkCrown',
      path: [forkCrownTop.clone(), forkCrownBot.clone()],
      radiusStart: 0.025,
      radiusEnd: 0.018,
      csStart: { x: 1.05, z: 1.0 },
      csEnd: { x: 0.85, z: 1.25 },
      radialSegments: 20,
      tubularSegments: 12,
    },

    // Fork legs — straight blades with a mild aero (deep fore-aft, narrow lateral)
    // airfoil. Blade-top cross-section matches crown-bottom so they merge cleanly.
    {
      zone: 'forkLegs',
      path: forkLegPath(rFront),
      radiusStart: 0.016,
      radiusEnd: 0.012,
      csStart: { x: 0.85, z: 1.25 },
      csEnd: { x: 0.7, z: 1.35 },
      radialSegments: 16,
      tubularSegments: 12,
    },
    {
      zone: 'forkLegs',
      path: forkLegPath(lFront),
      radiusStart: 0.016,
      radiusEnd: 0.012,
      csStart: { x: 0.85, z: 1.25 },
      csEnd: { x: 0.7, z: 1.35 },
      radialSegments: 16,
      tubularSegments: 12,
    },
  ];

  const anchors: FrameAnchors = {
    bb: bb.clone(),
    stTop: stTop.clone(),
    htTop: htTop.clone(),
    htBot: htBot.clone(),
    forkCrownTop: forkCrownTop.clone(),
    forkCrownBot: forkCrownBot.clone(),
    seatstayAttach: seatstayAttach.clone(),
    rearHub: rearHub.clone(),
    frontHub: frontHub.clone(),
    halfStay,
    seatTubeAngle,
    headTubeAngle,
  };

  return { tubes, rearHub, frontHub, wheelRadius: geo.wheelRadius, anchors, geo };
}

/** Backward-compatibility alias — use buildBikeFrame instead. */
export function buildRoadFrame(): FrameGeometryDesc {
  return buildBikeFrame(ROAD_GEO);
}
