import type { FinishType } from '../state/types';

export interface FinishParams {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  iridescence: number;
  iridescenceIOR: number;
  sheen: number;
  /** Dielectric specular F0 multiplier (0 = no white specular reflection). */
  specularIntensity: number;
  /** Per-material env-map intensity. */
  envMapIntensity: number;
}

/**
 * PBR parameters per paint finish, tuned for MeshPhysicalMaterial under
 * NeutralToneMapping (Khronos PBR-neutral — preserves hue/saturation in the
 * mid-tones, which keeps picked colors accurate).
 *
 * Roughness floors matter: mirror-sharp clearcoat (ccRoughness < ~0.1) makes
 * the IBL reflection so crisp that the normal discontinuity at tube junctions
 * reads as a hard seam / "see-through wall". Keeping reflections slightly soft
 * hides the junction while still looking like sprayed paint.
 */
export function finishParams(finish: FinishType): FinishParams {
  switch (finish) {
    case 'matte':
      return {
        roughness: 0.85,
        metalness: 0.0,
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        specularIntensity: 0.30,
        envMapIntensity: 0.45,
      };
    case 'satin':
      return {
        roughness: 0.52,
        metalness: 0.0,
        clearcoat: 0.30,
        clearcoatRoughness: 0.50,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        specularIntensity: 0.50,
        envMapIntensity: 0.60,
      };
    case 'glossy':
      // Car-paint layering: colored base coat stays fairly rough (color
      // depth), the shine comes from the clearcoat lacquer layer.
      return {
        roughness: 0.32,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.12,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        specularIntensity: 0.65,
        envMapIntensity: 0.85,
      };
    case 'metallic':
      return {
        roughness: 0.34,
        metalness: 1.0,
        clearcoat: 0.70,
        clearcoatRoughness: 0.15,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        specularIntensity: 1.0,
        envMapIntensity: 1.1,
      };
    case 'chameleon':
      return {
        roughness: 0.20,
        metalness: 0.30,
        clearcoat: 1.0,
        clearcoatRoughness: 0.10,
        iridescence: 1.0,
        iridescenceIOR: 1.8,
        sheen: 0,
        specularIntensity: 1.0,
        envMapIntensity: 0.90,
      };
  }
}
