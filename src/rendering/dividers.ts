import * as THREE from 'three';
import type { Divider, PatternLayer } from '../state/types';
import { renderPattern } from './patterns';

/** Max dividers supported by the shader (fixed array size). */
export const DIV_MAX = 6;

// Each divider's pattern tile lives in one cell of a single horizontal atlas
// texture (one sampler2D — a dynamically-indexed sampler array won't link on
// GLSL ES). Cells are sampled by world XY in the shader.
const ATLAS_CELL = 256;
const atlasCanvas = document.createElement('canvas');
atlasCanvas.width = ATLAS_CELL * DIV_MAX;
atlasCanvas.height = ATLAS_CELL;
const atlasTex = new THREE.CanvasTexture(atlasCanvas);
atlasTex.wrapS = THREE.ClampToEdgeWrapping;
atlasTex.wrapT = THREE.ClampToEdgeWrapping;

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
  uDivSoft: { value: new Float32Array(DIV_MAX) }, // per-divider edge softness (metres)
  // Optional per-divider pattern filling the region (sampled by world XY).
  uDivAtlas: { value: atlasTex as THREE.Texture },
  uDivPatScale: { value: new Float32Array(DIV_MAX) }, // world tiles/metre, 0 = none
};

/** smoothstep half-width in metres for a crisp-but-anti-aliased edge. */
const AA_FLOOR = 0.0022;
/** Extra half-width (metres) at softness = 1 — a wide, soft colour gradient. */
const MAX_SOFT = 0.05;

const _c = new THREE.Color();

/** Write the divider list into the shared uniform buffers. */
export function syncDividerUniforms(dividers: Divider[]): void {
  const n = Math.min(dividers.length, DIV_MAX);
  dividerUniforms.uDivCount.value = n;
  const N = dividerUniforms.uDivN.value;
  const O = dividerUniforms.uDivOff.value;
  const C = dividerUniforms.uDivColor.value;
  const S = dividerUniforms.uDivSoft.value;
  for (let i = 0; i < n; i++) {
    const d = dividers[i];
    S[i] = AA_FLOOR + (d.softness ?? 0) * MAX_SOFT;
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
uniform float uDivSoft[DIV_MAX];
uniform sampler2D uDivAtlas;
uniform float uDivPatScale[DIV_MAX];
varying vec3 vWorldPosDiv;
#define DIV_EDGE ${(1 / ATLAS_CELL).toFixed(6)}
// The divider's fill: base colour, optionally overlaid with a world-space
// pattern tile from cell di of the atlas (its colour baked in; approximate
// sRGB to linear). puv.x is clamped a texel in so bilinear doesn't bleed
// between cells; the tiles are periodic, so this stays seamless.
vec3 dividerFill(int di) {
  vec3 fill = uDivColor[di];
  if (uDivPatScale[di] > 0.0) {
    vec2 puv = fract(vWorldPosDiv.xy * uDivPatScale[di]);
    float cw = 1.0 / float(DIV_MAX);
    float au = (float(di) + clamp(puv.x, DIV_EDGE, 1.0 - DIV_EDGE)) * cw;
    vec4 pc = texture2D(uDivAtlas, vec2(au, puv.y));
    fill = mix(fill, pow(pc.rgb, vec3(2.2)), pc.a);
  }
  return fill;
}
`;

const FRAG_BODY = /* glsl */ `
for (int di = 0; di < DIV_MAX; di++) {
  if (di >= uDivCount) break;
  float sd = dot(vWorldPosDiv.xy, uDivN[di]) - uDivOff[di];
  float m = 1.0 - smoothstep(-uDivSoft[di], uDivSoft[di], sd); // 1 = below the line
  diffuseColor.rgb = mix(diffuseColor.rgb, dividerFill(di), m);
}
`;

interface CompileShader {
  uniforms: Record<string, THREE.IUniform>;
  vertexShader: string;
  fragmentShader: string;
}

function injectVertex(shader: CompileShader): void {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPosDiv;')
    .replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvWorldPosDiv = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
}

function wireUniforms(shader: CompileShader): void {
  shader.uniforms.uDivCount = dividerUniforms.uDivCount;
  shader.uniforms.uDivN = dividerUniforms.uDivN;
  shader.uniforms.uDivOff = dividerUniforms.uDivOff;
  shader.uniforms.uDivColor = dividerUniforms.uDivColor;
  shader.uniforms.uDivSoft = dividerUniforms.uDivSoft;
  shader.uniforms.uDivAtlas = dividerUniforms.uDivAtlas;
  shader.uniforms.uDivPatScale = dividerUniforms.uDivPatScale;
}

/**
 * Render each divider's pattern into its atlas cell and set the per-divider
 * world scale (0 = no pattern). Async because pattern tiles render off the main
 * path; safe to call on every divider change.
 */
export async function syncDividerPatterns(dividers: Divider[]): Promise<void> {
  const ps = dividerUniforms.uDivPatScale.value;
  const ctx = atlasCanvas.getContext('2d');
  if (!ctx) return;
  const n = Math.min(dividers.length, DIV_MAX);
  for (let i = 0; i < DIV_MAX; i++) {
    const d = i < n ? dividers[i] : undefined;
    const x = i * ATLAS_CELL;
    ctx.clearRect(x, 0, ATLAS_CELL, ATLAS_CELL);
    if (!d?.pattern) {
      ps[i] = 0;
      continue;
    }
    const canvas = await renderPattern({
      pattern: d.pattern,
      color: d.patternColor ?? '#0a0a0a',
      intensity: 1,
    } as PatternLayer);
    ctx.clearRect(x, 0, ATLAS_CELL, ATLAS_CELL);
    ctx.drawImage(canvas, x, 0, ATLAS_CELL, ATLAS_CELL);
    ps[i] = (d.patternScale ?? 12) / 3; // world tiles per metre
  }
  atlasTex.needsUpdate = true;
}

/**
 * onBeforeCompile for base-colour-only meshes (no layer map): tint fragments
 * below each divider line (world XY).
 */
export function applyDividerShader(shader: CompileShader): void {
  wireUniforms(shader);
  injectVertex(shader);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>' + FRAG_HEAD)
    .replace('#include <map_fragment>', '#include <map_fragment>' + FRAG_BODY);
}

const FRAG_HEAD_MAPPED = FRAG_HEAD + '\nuniform sampler2D uDivCoverage;';

// Recolour only the base coat: scale the divider mix by (1 - layer coverage) so
// the layer stack stays fully visible on top of the divider colour.
const FRAG_BODY_MAPPED = /* glsl */ `
float divCov = texture2D(uDivCoverage, vMapUv).a;
for (int di = 0; di < DIV_MAX; di++) {
  if (di >= uDivCount) break;
  float sd = dot(vWorldPosDiv.xy, uDivN[di]) - uDivOff[di];
  float m = (1.0 - smoothstep(-uDivSoft[di], uDivSoft[di], sd)) * (1.0 - divCov);
  diffuseColor.rgb = mix(diffuseColor.rgb, dividerFill(di), m);
}
`;

/**
 * onBeforeCompile for mapped meshes: the dividers sit UNDER the layer stack —
 * they recolour the base coat but not the layers (via a coverage texture read
 * from `material.userData.divCoverage`).
 */
export function applyDividerShaderMapped(this: THREE.Material, shader: CompileShader): void {
  wireUniforms(shader);
  const coverage = (this.userData?.divCoverage as THREE.Texture | undefined) ?? null;
  shader.uniforms.uDivCoverage = { value: coverage };
  injectVertex(shader);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>' + FRAG_HEAD_MAPPED)
    .replace('#include <map_fragment>', '#include <map_fragment>' + FRAG_BODY_MAPPED);
}
