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
 * - Seat clamp collar at the ST top.
 * - Rear dropouts + front fork tips with thru-axle end caps.
 *
 * Tube-to-tube junctions themselves need no cover geometry: cross-sections in
 * frame.ts are sized so the smaller tube always tucks fully inside its partner
 * (TT inside ST and HT, DT inside HT, blades inside the crown).
 */
export function Fillets({ anchors }: Props) {
  const { bb, stTop, rearHub, frontHub, stAxis, halfStayRear, halfStayFront, bbShellHalfWidth } =
    anchors;

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

  // ---- Seat clamp collar ----
  const clusterQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), stAxis),
    [stAxis],
  );
  const collarGeo = useMemo(() => {
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.0140, -0.0065),
      new THREE.Vector2(0.0186, -0.0055),
      new THREE.Vector2(0.0190, 0.0),
      new THREE.Vector2(0.0186, 0.0055),
      new THREE.Vector2(0.0140, 0.0065),
    ];
    return new THREE.LatheGeometry(profile, 28);
  }, []);
  // Wrapped AROUND the tube just below its top edge — not perched above it.
  const collarPos = useMemo(
    () => stTop.clone().addScaledVector(stAxis, -0.004),
    [stTop, stAxis],
  );

  return (
    <group>
      <PaintedPart geometry={bbShellGeo} position={bb} zone="downTube" />
      <PaintedPart geometry={collarGeo} position={collarPos} quaternion={clusterQuat} zone="seatTube" />

      <Dropout hub={rearHub} z={halfStayRear} zone="chainStays" />
      <Dropout hub={rearHub} z={-halfStayRear} zone="chainStays" />
      <Dropout hub={frontHub} z={halfStayFront} zone="forkLegs" small />
      <Dropout hub={frontHub} z={-halfStayFront} zone="forkLegs" small />
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
      <ZonePaintedMaterial zone={zone} />
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
        <ZonePaintedMaterial zone={zone} />
      </mesh>
      <mesh geometry={capGeo} position={[0, 0, sign * 0.0085]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#2e2e2e" roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}
