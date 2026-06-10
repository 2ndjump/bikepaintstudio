import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import type { FrameAnchors } from '../../geometry/frame';
import { finishParams } from '../../rendering/finish';
import { useZoneTexture } from '../../rendering/useZoneTexture';
import type { ZoneId } from '../../state/types';

interface Props {
  anchors: FrameAnchors;
}

/**
 * Small ellipsoid fillet bodies at joints where two cylindrical tubes cross.
 * Sized to just barely cover the "armpit" void between adjacent tubes, and
 * oriented along the dominant tube axis so they read as a gentle thickening
 * of that tube rather than a separate sphere stuck on.
 */
export function Fillets({ anchors }: Props) {
  const { bb, stTop, htTop, htBot, seatstayAttach, halfStay, seatTubeAngle, headTubeAngle } = anchors;

  // Axes (unit vectors) for each tube at its joint
  const htAxis = useMemo(
    () => new THREE.Vector3(-Math.cos(headTubeAngle), Math.sin(headTubeAngle), 0),
    [headTubeAngle],
  );
  const stAxis = useMemo(
    () => new THREE.Vector3(-Math.cos(seatTubeAngle), Math.sin(seatTubeAngle), 0),
    [seatTubeAngle],
  );

  const seatstayR = useMemo(() => seatstayAttach.clone().setZ(0.012), [seatstayAttach]);
  const seatstayL = useMemo(() => seatstayAttach.clone().setZ(-0.012), [seatstayAttach]);

  return (
    <group>
      {/* HT-top — align long axis with HT so it looks like the HT thickening. */}
      <Fillet position={htTop} scale={[0.012, 0.018, 0.014]} axis={htAxis} zone="headTube" />

      {/* HT-bot — same shape, mirrored along HT axis. */}
      <Fillet position={htBot} scale={[0.014, 0.020, 0.016]} axis={htAxis} zone="headTube" />

      {/* ST-top — gentle bulge along ST. */}
      <Fillet position={stTop} scale={[0.010, 0.016, 0.012]} axis={stAxis} zone="seatTube" />

      {/* BB — along lateral axis (matches BB shell direction). */}
      <Fillet
        position={bb}
        scale={[0.018, 0.018, halfStay * 0.55]}
        axis={new THREE.Vector3(0, 0, 1)}
        zone="downTube"
      />

      {/* Seatstay attach points — tiny. */}
      <Fillet position={seatstayR} scale={[0.008, 0.008, 0.008]} axis={stAxis} zone="seatTube" />
      <Fillet position={seatstayL} scale={[0.008, 0.008, 0.008]} axis={stAxis} zone="seatTube" />
    </group>
  );
}

interface FilletProps {
  position: THREE.Vector3;
  /** Ellipsoid half-axes (meters) in local space: [x, y=along-axis, z]. */
  scale: [number, number, number];
  /** World direction the long Y axis aligns to. */
  axis: THREE.Vector3;
  zone: ZoneId;
}

function Fillet({ position, scale, axis, zone }: FilletProps) {
  const finish = useDesignStore((s) => s.zones[zone].finish);
  const texture = useZoneTexture(zone);
  const fp = finishParams(finish);
  const wantsSpecular = finish === 'glossy' || finish === 'metallic';

  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 20, 14);
    g.scale(scale[0], scale[1], scale[2]);
    return g;
  }, [scale]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const quaternion = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize()),
    [axis],
  );

  return (
    <mesh geometry={geometry} position={position.toArray()} quaternion={quaternion} receiveShadow>
      {wantsSpecular ? (
        <meshStandardMaterial
          map={texture}
          roughness={fp.roughness}
          metalness={fp.metalness}
          envMapIntensity={fp.envMapIntensity}
        />
      ) : (
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      )}
    </mesh>
  );
}
