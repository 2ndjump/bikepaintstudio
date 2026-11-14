import * as THREE from 'three';

/**
 * Circularly brushed metal (disc rotors, hubs): a MeshPhysicalMaterial with
 * anisotropy whose direction is set per vertex instead of from the UVs — the
 * radial direction from the nearest axle centre, so the highlight streaks run
 * radially across the circular grooves like on a real turned/brushed part.
 *
 * `centers` (up to two) and `axis` are in the mesh's local space.
 */
export function brushedMetal(
  params: THREE.MeshPhysicalMaterialParameters,
  centers: THREE.Vector3[],
  axis: THREE.Vector3,
): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ anisotropy: 0.7, ...params });
  const c0 = centers[0];
  const c1 = centers[1] ?? centers[0];
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uBrushC0 = { value: c0 };
    shader.uniforms.uBrushC1 = { value: c1 };
    shader.uniforms.uBrushAxis = { value: axis.clone().normalize() };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uBrushC0;\nuniform vec3 uBrushC1;\nuniform vec3 uBrushAxis;\nvarying vec3 vBrushT;',
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vec3 brushC = distance(transformed, uBrushC0) < distance(transformed, uBrushC1) ? uBrushC0 : uBrushC1;
        vec3 brushR = transformed - brushC;
        brushR -= dot(brushR, uBrushAxis) * uBrushAxis;
        vBrushT = normalize((modelViewMatrix * vec4(brushR, 0.0)).xyz);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBrushT;')
      .replace(
        '#include <lights_physical_fragment>',
        /* glsl */ `#include <lights_physical_fragment>
        #ifdef USE_ANISOTROPY
          vec3 brushT = vBrushT - dot(vBrushT, normal) * normal;
          if (dot(brushT, brushT) > 1e-6) {
            brushT = normalize(brushT);
            material.anisotropyT = brushT;
            material.anisotropyB = cross(normal, brushT);
          }
        #endif`,
      );
  };
  return m;
}
