import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import { finishParams } from '../../rendering/finish';
import { useZoneTexture } from '../../rendering/useZoneTexture';
import { ChameleonMaterial } from '../../rendering/ChameleonMaterial';
import { applyDividerShaderMapped } from '../../rendering/dividers';
import { DEFAULT_CHAMELEON_COLORS, type ZoneId } from '../../state/types';

interface Props {
  zone: ZoneId;
  side?: THREE.Side;
}

/**
 * The painted material for a zone: the compositor CanvasTexture as the base
 * color map, plus the look of the zone's selected finish. Shared by the frame
 * zones and the rims so they all respond identically to paint + finish changes.
 *
 * All finishes are LIT (MeshStandard / Physical) so tubes show real curvature
 * shading rather than looking flat.
 *
 * Color accuracy note: with NeutralToneMapping (set on the renderer) the picked
 * hex survives lighting/tonemapping almost exactly, so the lit finishes stay
 * true to the colour the user chose.
 */
export function ZonePaintedMaterial({ zone, side }: Props) {
  const finish = useDesignStore((s) => s.zones[zone]?.finish ?? 'matte');
  const chameleonColors = useDesignStore(
    (s) => s.zones[zone]?.chameleonColors ?? DEFAULT_CHAMELEON_COLORS,
  );
  const tex = useZoneTexture(zone);
  const fp = finishParams(finish);
  // Global colour dividers apply to the frame only, not the rims/wheels.
  const useDivider = zone !== 'frontRim' && zone !== 'rearRim';

  // Dividers sit UNDER the layers: the coverage-aware shader recolours the
  // base coat only.
  const dividerProps = !useDivider
    ? {}
    : { onBeforeCompile: applyDividerShaderMapped, userData: { divCoverage: tex.coverage } };

  if (finish === 'chameleon') {
    return <ChameleonMaterial texture={tex.map} fp={fp} colors={chameleonColors} side={side} />;
  }

  // All four standard finishes are a single shared MeshPhysicalMaterial recipe:
  // matt/satin/gloss/metallic differ only by roughness/metalness/clearcoat/
  // clearcoatRoughness/envMapIntensity (see finish.ts). matt has clearcoat 0.0
  // so the clearcoat layer is a no-op there.
  return (
    <meshPhysicalMaterial
      map={tex.map}
      roughness={fp.roughness}
      metalness={fp.metalness}
      clearcoat={fp.clearcoat}
      clearcoatRoughness={fp.clearcoatRoughness}
      envMapIntensity={fp.envMapIntensity}
      side={side ?? THREE.FrontSide}
      {...dividerProps}
    />
  );
}
