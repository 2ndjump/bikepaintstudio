import * as THREE from 'three';
import type { Divider } from '../state/types';

/** Max dividers supported by the shader (fixed array size). */
export const DIV_MAX = 6;

/**
 * Shared uniforms for the world-space colour dividers. Every painted material's
 * onBeforeCompile references THESE objects, so a single sync updates all shaders
 * at once (no recompile).
 */
export const dividerUniforms = {
  uDivCount: { value: 0 },
  uDivN: { value: new Float32Array(DIV_MAX * 2) }, // line normals (points "up")
  uDivOff: { value: new Float32Array(DIV_MAX) }, // signed offset along the normal
  uDivColor: { value: new Float32Array(DIV_MAX * 3) }, // linear RGB
  uDivSoft: { value: 0.0022 }, // edge softness in metres (crisp but anti-aliased)
};

const _c = new THREE.Color();

/** Write the divider list into the shared uniform buffers. */
export function syncDividerUniforms(dividers: Divider[]): void {
  const n = Math.min(dividers.length, DIV_MAX);
  dividerUniforms.uDivCount.value = n;
  const N = dividerUniforms.uDivN.value;
  const O = dividerUniforms.uDivOff.value;
  const C = dividerUniforms.uDivColor.value;
  for (let i = 0; i < n; i++) {
    const d = dividers[i];
    let dx = d.bx - d.ax;
    let dy = d.by - d.ay;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // Perpendicular pointing "up" (+y) so signed distance < 0 is BELOW the line.
    let nx = -dy;
    let ny = dx;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    N[i * 2] = nx;
    N[i * 2 + 1] = ny;
    O[i] = d.ax * nx + d.ay * ny;
    _c.set(d.color); // linear RGB (ColorManagement on)
    C[i * 3] = _c.r;
    C[i * 3 + 1] = _c.g;
    C[i * 3 + 2] = _c.b;
  }
}

const FRAG_HEAD = /* glsl */ `
#define DIV_MAX ${DIV_MAX}
uniform int uDivCount;
uniform vec2 uDivN[DIV_MAX];
uniform float uDivOff[DIV_MAX];
uniform vec3 uDivColor[DIV_MAX];
uniform float uDivSoft;
varying vec3 vWorldPosDiv;
`;

const FRAG_BODY = /* glsl */ `
for (int di = 0; di < DIV_MAX; di++) {
  if (di >= uDivCount) break;
  float sd = dot(vWorldPosDiv.xy, uDivN[di]) - uDivOff[di];
  float m = 1.0 - smoothstep(-uDivSoft, uDivSoft, sd); // 1 = below the line
  diffuseColor.rgb = mix(diffuseColor.rgb, uDivColor[di], m);
}
`;

interface CompileShader {
  uniforms: Record<string, THREE.IUniform>;
  vertexShader: string;
  fragmentShader: string;
}

/** onBeforeCompile hook: tint fragments below each divider line (world XY). */
export function applyDividerShader(shader: CompileShader): void {
  shader.uniforms.uDivCount = dividerUniforms.uDivCount;
  shader.uniforms.uDivN = dividerUniforms.uDivN;
  shader.uniforms.uDivOff = dividerUniforms.uDivOff;
  shader.uniforms.uDivColor = dividerUniforms.uDivColor;
  shader.uniforms.uDivSoft = dividerUniforms.uDivSoft;

  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPosDiv;')
    .replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvWorldPosDiv = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );

  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>' + FRAG_HEAD)
    .replace('#include <map_fragment>', '#include <map_fragment>' + FRAG_BODY);
}
