import type { FinishType } from '../state/types';

export interface FinishParams {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  iridescence: number;
  iridescenceIOR: number;
  sheen: number;
  /** Per-material env-map intensity. Low for matte (preserves pure colors),
   *  high for glossy/metallic so reflections look shiny. */
  envMapIntensity: number;
  /** Dielectric specular F0 multiplier. 0 = no white specular reflection (pure
   *  color visible), 1 = default ~4% white reflection. Drop for matte/satin so
   *  the picked color isn't tinted by IBL averaging. */
  specularIntensity: number;
}

export function finishParams(finish: FinishType): FinishParams {
  switch (finish) {
    case 'matte':
      return {
        roughness: 0.95,
        metalness: 0.0,
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        envMapIntensity: 0.0,
        specularIntensity: 0.0,
      };
    case 'satin':
      return {
        roughness: 0.45,
        metalness: 0.0,
        clearcoat: 0.4,
        clearcoatRoughness: 0.4,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        envMapIntensity: 0.15,
        specularIntensity: 0.3,
      };
    case 'glossy':
      // Smooth-painted glossy look without clearcoat (Three.js's clearcoat
      // layer was attenuating diffuse). Low roughness + full dielectric F0
      // gives a polished sheen plus sharp specular highlights.
      return {
        roughness: 0.12,
        metalness: 0.0,
        clearcoat: 0.0,
        clearcoatRoughness: 0.0,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        envMapIntensity: 0.35,
        specularIntensity: 1.0,
      };
    case 'metallic':
      return {
        roughness: 0.25,
        metalness: 1.0,
        clearcoat: 0.5,
        clearcoatRoughness: 0.1,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0,
        envMapIntensity: 0.9,
        specularIntensity: 1.0,
      };
    case 'chameleon':
      return {
        roughness: 0.18,
        metalness: 0.3,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        iridescence: 1.0,
        iridescenceIOR: 1.8,
        sheen: 0,
        envMapIntensity: 0.8,
        specularIntensity: 1.0,
      };
  }
}
