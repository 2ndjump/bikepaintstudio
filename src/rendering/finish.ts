import type * as THREE from 'three';
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
  /** Strength of the studio reflections relative to the scene's (see envGain). */
  envMapIntensity: number;
}

/**
 * `onBeforeRender` for a paint material: three ignores a material's
 * envMapIntensity while the reflections come from scene.environment, so every
 * finish reflected the studio equally. This hands the scene's environment to
 * the material itself, scaled by the finish's own strength.
 */
export function envGain(gain: number) {
  return function (this: THREE.Material, _renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const m = this as THREE.MeshPhysicalMaterial;
    m.envMap = scene.environment;
    m.envMapIntensity = scene.environmentIntensity * gain;
  };
}

/** Largest finish reflection gain; the per-texel finish map stores gain / this. */
export const ENV_GAIN_MAX = 2.5;

/**
 * A finish as three RGB colours (0…1) for the per-texel finish maps the layer
 * compositor paints and the paint shader reads (PaintMaterial):
 * [roughness, metalness, clearcoat], [clearcoat roughness, reflection gain /
 * ENV_GAIN_MAX, sheen] and [chameleon flip, metallic flakes, unused].
 * Kept opaque: canvas alpha is premultiplied and would skew the values.
 */
export function finishMapColors(finish: FinishType): number[][] {
  const p = finishParams(finish);
  return [
    [p.roughness, p.metalness, p.clearcoat],
    [p.clearcoatRoughness, p.envMapIntensity / ENV_GAIN_MAX, p.sheen],
    [finish === 'chameleon' ? 1 : 0, finish === 'metallic' ? 1 : 0, 0],
  ];
}

/** The finish a layer is painted in: its own, else the part's — but glossy on
 *  a chameleon part (the colour flip is the base coat's, not the layers'). */
export function layerFinish(own: FinishType | undefined, part: FinishType): FinishType {
  return own ?? (part === 'chameleon' ? 'glossy' : part);
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
        roughness: 0.7,
        metalness: 0.04,
        clearcoat: 0.0,
        clearcoatRoughness: 1.0,
        iridescence: 0,
        iridescenceIOR: 1.3,
        // A soft glow toward the silhouette rounds the tubes off.
        sheen: 0.35,
        specularIntensity: 1.0,
        envMapIntensity: 0.8,
      };
    case 'satin':
      return {
        roughness: 0.42,
        metalness: 0.05,
        clearcoat: 0.6,
        clearcoatRoughness: 0.35,
        iridescence: 0,
        iridescenceIOR: 1.3,
        sheen: 0.15,
        specularIntensity: 1.0,
        envMapIntensity: 1.3,
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
        envMapIntensity: 2.0,
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
        envMapIntensity: 1.8,
      };
    case 'chameleon':
      return {
        roughness: 0.3,
        // Metallic pigment: reflections take the flip colours (no thin-film tint).
        metalness: 0.7,
        clearcoat: 1.0,
        clearcoatRoughness: 0.10,
        iridescence: 0,
        iridescenceIOR: 1.8,
        sheen: 0,
        specularIntensity: 1.0,
        envMapIntensity: 1.3,
      };
  }
}
