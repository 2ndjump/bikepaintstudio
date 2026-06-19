import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import { finishParams } from '../../rendering/finish';
import { useZoneTexture } from '../../rendering/useZoneTexture';
import { ChameleonMaterial } from '../../rendering/ChameleonMaterial';
import type { ZoneId } from '../../state/types';

interface Props {
  zone: ZoneId;
  side?: THREE.Side;
}

/**
 * The painted material for a zone: the compositor CanvasTexture as the base
 * color map, plus the look of the zone's selected finish. Shared by frame
 * tubes, junction hardware, and the rims so they all respond identically to
 * paint + finish changes.
 *
 * All finishes are LIT (MeshStandard / Physical) so tubes show real curvature
 * shading rather than looking flat. The "see-through at joints" artefact is
 * solved at the geometry level instead: frame tubes are built without end-cap
 * discs (the dark cap was the artefact) and rendered DoubleSide, so buried
 * ends are covered by the partner tube and any peeking end shows the lit inner
 * wall. See BikeFrame.tsx / variableTube.ts (caps:false).
 *
 * Color accuracy note: with NeutralToneMapping (set on the renderer) the picked
 * hex survives lighting/tonemapping almost exactly, so the lit finishes stay
 * true to the colour the user chose.
 */
export function ZonePaintedMaterial({ zone, side }: Props) {
  const finish = useDesignStore((s) => s.zones[zone].finish);
  const chameleonColors = useDesignStore((s) => s.zones[zone].chameleonColors);
  const texture = useZoneTexture(zone);
  const fp = finishParams(finish);

  if (finish === 'chameleon') {
    return <ChameleonMaterial texture={texture} fp={fp} colors={chameleonColors} side={side} />;
  }

  if (finish === 'glossy' || finish === 'metallic') {
    return (
      <meshPhysicalMaterial
        map={texture}
        roughness={fp.roughness}
        metalness={fp.metalness}
        clearcoat={fp.clearcoat}
        clearcoatRoughness={fp.clearcoatRoughness}
        specularIntensity={fp.specularIntensity}
        envMapIntensity={fp.envMapIntensity}
        side={side ?? THREE.FrontSide}
      />
    );
  }

  // matte / satin — lit, diffuse. Roughness/metalness from the finish give the
  // soft sheen difference between matte and satin.
  return (
    <meshStandardMaterial
      map={texture}
      roughness={fp.roughness}
      metalness={fp.metalness}
      envMapIntensity={fp.envMapIntensity}
      side={side ?? THREE.FrontSide}
    />
  );
}
