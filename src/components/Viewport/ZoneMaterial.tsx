import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import { finishParams } from '../../rendering/finish';
import { useZoneTexture } from '../../rendering/useZoneTexture';
import { ChameleonMaterial } from '../../rendering/ChameleonMaterial';
import { DEFAULT_CHAMELEON_COLORS, type ZoneId } from '../../state/types';

interface Props {
  zone: ZoneId;
  side?: THREE.Side;
  /**
   * Paint with the flat zone base colour only, ignoring the layer stack.
   * Used for junction hardware (BB shell, dropouts, caps): their lathe UVs
   * don't match the tube wrap, so the tube's decals/patterns would smear
   * across them. They still follow the zone's base colour + finish.
   */
  baseOnly?: boolean;
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
export function ZonePaintedMaterial({ zone, side, baseOnly }: Props) {
  const finish = useDesignStore((s) => s.zones[zone]?.finish ?? 'matte');
  const chameleonColors = useDesignStore(
    (s) => s.zones[zone]?.chameleonColors ?? DEFAULT_CHAMELEON_COLORS,
  );
  const baseColor = useDesignStore((s) => s.zones[zone]?.baseColor ?? '#888888');
  const texture = useZoneTexture(zone);
  const fp = finishParams(finish);

  // baseOnly: flat base colour, no layer texture map. Otherwise the composited
  // canvas (base + layers) is the colour map.
  const paint = baseOnly ? { color: baseColor } : { map: texture };

  if (finish === 'chameleon' && !baseOnly) {
    return <ChameleonMaterial texture={texture} fp={fp} colors={chameleonColors} side={side} />;
  }

  if (finish === 'glossy' || finish === 'metallic') {
    return (
      <meshPhysicalMaterial
        {...paint}
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
      {...paint}
      roughness={fp.roughness}
      metalness={fp.metalness}
      envMapIntensity={fp.envMapIntensity}
      side={side ?? THREE.FrontSide}
    />
  );
}
