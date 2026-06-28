import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { FinishParams } from './finish';

interface Props {
  texture: THREE.Texture;
  fp: FinishParams;
  colors: [string, string, string];
  side?: THREE.Side;
}

// View-angle (Fresnel-style) blend A -> B -> C across the surface. A linear
// ramp (no exponent) keeps colour A from dominating, so the mid (B) shows on
// the broad flanks of each tube and C appears toward the grazing silhouette.
// The multiplier compensates for the reduced scene light budget so the shift
// stays as visible as before.
const CHAM_COLOR_INJECT = /* glsl */ `
  float chamNdV = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
  float chamFresnel = 1.0 - chamNdV;
  vec3 chamAB = mix(uChamA, uChamB, smoothstep(0.05, 0.5, chamFresnel));
  vec3 chamMix = mix(chamAB, uChamC, smoothstep(0.5, 0.9, chamFresnel));
  diffuseColor.rgb *= chamMix * 1.8;
`;

export function ChameleonMaterial({ texture, fp, colors, side }: Props) {
  const uniforms = useMemo(
    () => ({
      uChamA: { value: new THREE.Color(colors[0]) },
      uChamB: { value: new THREE.Color(colors[1]) },
      uChamC: { value: new THREE.Color(colors[2]) },
    }),
    [],
  );

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: fp.roughness,
      metalness: fp.metalness,
      clearcoat: fp.clearcoat,
      clearcoatRoughness: fp.clearcoatRoughness,
      iridescence: fp.iridescence,
      iridescenceIOR: fp.iridescenceIOR,
      sheen: fp.sheen,
      side: side ?? THREE.FrontSide,
    });

    m.onBeforeCompile = (shader) => {
      shader.uniforms.uChamA = uniforms.uChamA;
      shader.uniforms.uChamB = uniforms.uChamB;
      shader.uniforms.uChamC = uniforms.uChamC;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform vec3 uChamA;\nuniform vec3 uChamB;\nuniform vec3 uChamC;',
        )
        .replace('#include <color_fragment>', `#include <color_fragment>\n${CHAM_COLOR_INJECT}`);
    };

    return m;
  }, [texture, fp.roughness, fp.metalness, fp.clearcoat, fp.clearcoatRoughness, fp.iridescence, fp.iridescenceIOR, fp.sheen, side, uniforms]);

  useEffect(() => {
    uniforms.uChamA.value.set(colors[0]);
    uniforms.uChamB.value.set(colors[1]);
    uniforms.uChamC.value.set(colors[2]);
  }, [colors, uniforms]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} attach="material" />;
}
