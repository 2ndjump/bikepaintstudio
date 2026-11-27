import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import { ENV_GAIN_MAX, envGain, finishMapColors, layerFinish } from '../../rendering/finish';
import { useZoneTexture } from '../../rendering/useZoneTexture';
import { applyDividerShaderMapped } from '../../rendering/dividers';
import { injectFlakes } from '../../rendering/flakes';
import { DEFAULT_CHAMELEON_COLORS, isRimZone, type ZoneId } from '../../state/types';

interface Props {
  zone: ZoneId;
  side?: THREE.Side;
}

type Compile = NonNullable<THREE.Material['onBeforeCompile']>;

const FRAG_HEAD = /* glsl */ `
uniform sampler2D uFinish0;
uniform sampler2D uFinish1;
uniform sampler2D uFinish2;
uniform vec3 uDivFinish0;
uniform vec3 uDivFinish1;
uniform vec3 uDivFinish2;
uniform vec3 uChamA;
uniform vec3 uChamB;
uniform vec3 uChamC;
`;

// After the base colour (and the dividers, which recolour it in map_fragment):
// read this texel's finish, let the dividers' finish take over where they
// painted, then the chameleon flip on what is chameleon paint.
const fragColor = (dividers: boolean) => /* glsl */ `
vec3 pf0 = texture2D(uFinish0, vMapUv).rgb;
vec3 pf1 = texture2D(uFinish1, vMapUv).rgb;
vec3 pf2 = texture2D(uFinish2, vMapUv).rgb;
${
  dividers
    ? `pf0 = mix(pf0, uDivFinish0, divTotal);
pf1 = mix(pf1, uDivFinish1, divTotal);
pf2 = mix(pf2, uDivFinish2, divTotal);`
    : ''
}
// View-angle blend A -> B -> C: B on the broad flanks of a tube, C toward the
// grazing silhouette; the multiplier keeps the shift visible under the studio.
float chamNdV = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
float chamFresnel = 1.0 - chamNdV;
vec3 chamMix = mix(mix(uChamA, uChamB, smoothstep(0.05, 0.5, chamFresnel)), uChamC, smoothstep(0.5, 0.9, chamFresnel));
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * chamMix * 1.8, pf2.r);
`;

/**
 * The painted material for a zone: the compositor's colour map, with the
 * finish read per texel from the compositor's finish maps — the part's finish
 * under the layers' own (finishMapColors / layerFinish), and on the frame the
 * dividers' finish where they recolour the base coat. One material covers all
 * finishes, so layers with their own finish, the chameleon flip on the base
 * coat only and the dividers all work together. Shared by the frame zones and
 * the rims.
 */
export function ZonePaintedMaterial({ zone, side }: Props) {
  const finish = useDesignStore((s) => s.zones[zone]?.finish ?? 'matte');
  const chameleonColors = useDesignStore(
    (s) => s.zones[zone]?.chameleonColors ?? DEFAULT_CHAMELEON_COLORS,
  );
  const tex = useZoneTexture(zone);
  // Global colour dividers apply to the frame only, not the rims/wheels.
  const dividers = !isRimZone(zone);

  const uniforms = useMemo(
    () => ({
      uFinish0: { value: tex.finish[0] },
      uFinish1: { value: tex.finish[1] },
      uFinish2: { value: tex.finish[2] },
      uDivFinish0: { value: new THREE.Vector3() },
      uDivFinish1: { value: new THREE.Vector3() },
      uDivFinish2: { value: new THREE.Vector3() },
      uChamA: { value: new THREE.Color() },
      uChamB: { value: new THREE.Color() },
      uChamC: { value: new THREE.Color() },
    }),
    [tex],
  );

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      map: tex.map,
      // Non-zero so three compiles the clear coat and sheen in; the shader sets
      // the actual amounts per texel.
      clearcoat: 1,
      sheen: 1,
      sheenRoughness: 0.6,
      side: side ?? THREE.FrontSide,
    });
    m.userData.divCoverage = tex.coverage;
    // Reflections at full strength here; the per-texel gain scales them.
    m.onBeforeRender = envGain(ENV_GAIN_MAX);
    const compile: Compile = function (this: THREE.Material, shader, renderer) {
      if (dividers) (applyDividerShaderMapped as Compile).call(this, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>' + FRAG_HEAD)
        .replace('#include <color_fragment>', '#include <color_fragment>' + fragColor(dividers))
        .replace(
          '#include <metalnessmap_fragment>',
          '#include <metalnessmap_fragment>\nroughnessFactor = pf0.r;\nmetalnessFactor = pf0.g;',
        )
        .replace(
          '#include <lights_physical_fragment>',
          `#include <lights_physical_fragment>
material.clearcoat = pf0.b;
material.clearcoatRoughness = min(max(pf1.r, 0.0525) + geometryRoughness, 1.0);
material.sheenColor *= pf1.b;`,
        )
        .replace(
          '#include <lights_fragment_maps>',
          `#include <lights_fragment_maps>
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
radiance *= pf1.g;
clearcoatRadiance *= pf1.g;
#endif
iblIrradiance *= pf1.g;`,
        );
      injectFlakes(shader, 'pf2.g', 'pf2.r');
    };
    m.onBeforeCompile = compile;
    return m;
  }, [tex, side, dividers, uniforms]);

  useEffect(() => () => material.dispose(), [material]);

  // Divider regions take the finish the layers would get on this part.
  useEffect(() => {
    const c = finishMapColors(layerFinish(undefined, finish));
    uniforms.uDivFinish0.value.fromArray(c[0]);
    uniforms.uDivFinish1.value.fromArray(c[1]);
    uniforms.uDivFinish2.value.fromArray(c[2]);
  }, [finish, uniforms]);

  useEffect(() => {
    uniforms.uChamA.value.set(chameleonColors[0]);
    uniforms.uChamB.value.set(chameleonColors[1]);
    uniforms.uChamC.value.set(chameleonColors[2]);
  }, [chameleonColors, uniforms]);

  return <primitive object={material} attach="material" />;
}
