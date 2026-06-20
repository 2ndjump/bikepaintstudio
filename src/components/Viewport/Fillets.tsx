import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { FrameAnchors } from '../../geometry/frame';
import { ZonePaintedMaterial } from './ZoneMaterial';
import type { ZoneId } from '../../state/types';

interface Props {
  anchors: FrameAnchors;
}

/**
 * Junction hardware — the pieces a real frame actually has where tubes meet:
 *
 * - BB shell: PF86-style bottom bracket housing across the DT/ST/CS convergence.
 * - Headset top cap closing the open top of the steerer / head tube.
 * - Seat tube top cap closing its open top.
 * - Rear dropouts + front fork tips with thru-axle end caps.
 *
 * Tube-to-tube junctions themselves need no cover geometry: cross-sections in
 * frame.ts are sized so the smaller tube always tucks fully inside its partner
 * (TT inside ST and HT, DT inside HT, blades inside the crown).
 */
export function Fillets({ anchors }: Props) {
  const {
    bb,
    stTop,
    stAxis,
    htTop,
    htAxis,
    rearHub,
    frontHub,
    halfStayRear,
    halfStayFront,
    bbShellHalfWidth,
  } = anchors;

  // ---- BB shell: rounded cylinder along z ----
  const bbShellGeo = useMemo(() => {
    const w = bbShellHalfWidth;
    const r = 0.0235;
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.013, -w),
      new THREE.Vector2(r * 0.92, -w + 0.002),
      new THREE.Vector2(r, -w + 0.009),
      new THREE.Vector2(r, w - 0.009),
      new THREE.Vector2(r * 0.92, w - 0.002),
      new THREE.Vector2(0.013, w),
    ];
    const g = new THREE.LatheGeometry(profile, 32);
    g.rotateX(Math.PI / 2); // lathe axis Y → z
    return g;
  }, [bbShellHalfWidth]);

  // ---- Headset top cap ----
  // The head tube renders open at the top; a shallow domed cap closes it the
  // way a real headset top cover / stem cap does.
  const steererQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), htAxis),
    [htAxis],
  );
  const topCapGeo = useMemo(() => {
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.0205, 0.0),
      new THREE.Vector2(0.0200, 0.0020),
      new THREE.Vector2(0.0165, 0.0045),
      new THREE.Vector2(0.0100, 0.0060),
      new THREE.Vector2(0.0000, 0.0065),
    ];
    return new THREE.LatheGeometry(profile, 32);
  }, []);
  // Base tucked just inside the head tube's open top so the seam stays buried.
  const topCapPos = useMemo(
    () => htTop.clone().addScaledVector(htAxis, 0.010),
    [htTop, htAxis],
  );

  // ---- Seat tube top cap ----
  // Closes the open top of the seat tube (ST top end radius ≈ 0.0175, round).
  const seatQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), stAxis),
    [stAxis],
  );
  const seatCapGeo = useMemo(() => {
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.0175, 0.0),
      new THREE.Vector2(0.0170, 0.0018),
      new THREE.Vector2(0.0140, 0.0040),
      new THREE.Vector2(0.0085, 0.0053),
      new THREE.Vector2(0.0000, 0.0058),
    ];
    return new THREE.LatheGeometry(profile, 32);
  }, []);
  // ST top end is at stTop + stAxis*0.018; tuck the base just inside it.
  const seatCapPos = useMemo(
    () => stTop.clone().addScaledVector(stAxis, 0.016),
    [stTop, stAxis],
  );

  return (
    <group>
      <PaintedPart geometry={bbShellGeo} position={bb} zone="downTube" />
      <PaintedPart geometry={topCapGeo} position={topCapPos} quaternion={steererQuat} zone="headTube" />
      <PaintedPart geometry={seatCapGeo} position={seatCapPos} quaternion={seatQuat} zone="seatTube" />

      <Dropout hub={rearHub} z={halfStayRear} zone="chainStays" />
      <Dropout hub={rearHub} z={-halfStayRear} zone="chainStays" />
      <Dropout hub={frontHub} z={halfStayFront} zone="fork" small />
      <Dropout hub={frontHub} z={-halfStayFront} zone="fork" small />
    </group>
  );
}

/* ----------------------------------------------------------------------- */

function PaintedPart({
  geometry,
  position,
  quaternion,
  zone,
}: {
  geometry: THREE.BufferGeometry;
  position: THREE.Vector3;
  quaternion?: THREE.Quaternion;
  zone: ZoneId;
}) {
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={position.toArray()} quaternion={quaternion} receiveShadow>
      <ZonePaintedMaterial zone={zone} baseOnly />
    </mesh>
  );
}

/** Painted dropout body + dark thru-axle end cap. */
function Dropout({
  hub,
  z,
  zone,
  small,
}: {
  hub: THREE.Vector3;
  z: number;
  zone: ZoneId;
  small?: boolean;
}) {
  const r = small ? 0.0128 : 0.0130;
  const bodyGeo = useMemo(() => {
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.004, -0.007),
      new THREE.Vector2(r * 0.9, -0.006),
      new THREE.Vector2(r, -0.002),
      new THREE.Vector2(r, 0.003),
      new THREE.Vector2(r * 0.8, 0.006),
      new THREE.Vector2(0.004, 0.007),
    ];
    const g = new THREE.LatheGeometry(profile, 24);
    g.rotateX(Math.PI / 2);
    return g;
  }, [r]);
  useEffect(() => () => bodyGeo.dispose(), [bodyGeo]);

  const capGeo = useMemo(() => new THREE.CylinderGeometry(0.0062, 0.0062, 0.005, 18), []);
  useEffect(() => () => capGeo.dispose(), [capGeo]);

  const sign = Math.sign(z);

  return (
    <group position={[hub.x, hub.y, z]}>
      <mesh geometry={bodyGeo} receiveShadow>
        <ZonePaintedMaterial zone={zone} baseOnly />
      </mesh>
      <mesh geometry={capGeo} position={[0, 0, sign * 0.0085]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#2e2e2e" roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}
