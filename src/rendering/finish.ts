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
 * PBR parameters per paint finish. The four standard finishes use the exact
 * MeshPhysicalMaterial preset values from the studio paint spec (1:1, tuned for
 * ACESFilmicToneMapping + the procedural studio environment in
 * StudioEnvironment.tsx). specularIntensity stays at the material default (1.0)
 * and iridescence/sheen at 0 so only the specified parameters shape the look.
 */
export function finishParams(finish: FinishType): FinishParams {
  switch (finish) {
    case 'matte':
      return {
        roughness: 0.74,
        metalness: 0.04,
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        specularIntensity: 1.0,
        envMapIntensity: 0.55,
      };
    case 'satin':
      return {
        roughness: 0.42,
        metalness: 0.05,
        clearcoat: 0.45,
        clearcoatRoughness: 0.45,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        specularIntensity: 1.0,
        envMapIntensity: 0.85,
      };
    case 'glossy':
      // Paint under a thick, mirror-smooth clear coat (the coat carries the
      // sharp softbox reflections, the base stays a touch softer).
      return {
        roughness: 0.18,
        metalness: 0.00,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        specularIntensity: 1.0,
        envMapIntensity: 1.15,
      };
    case 'metallic':
      // Flake base under a full gloss clear coat, like automotive metallic.
      return {
        roughness: 0.36,
        metalness: 0.85,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        specularIntensity: 1.0,
        envMapIntensity: 1.25,
      };
    case 'chameleon':
      return {
        roughness: 0.22,
        metalness: 0.25,
        clearcoat: 1.0,
        clearcoatRoughness: 0.10,
        iridescence: 1.0,
        iridescenceIOR: 1.8,
        sheen: 0,
        specularIntensity: 1.0,
        envMapIntensity: 1.6,
      };
  }
}
