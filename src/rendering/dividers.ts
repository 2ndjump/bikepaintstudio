import * as THREE from 'three';
import type { Divider, PatternLayer } from '../state/types';
import { renderPattern } from './patterns';
import { fillShape } from './LayerCompositor';

/** Max dividers supported by the shader (fixed array size). */
export const DIV_MAX = 6;

// Each divider's pattern tile lives in one cell of a single atlas texture (one
// sampler2D — a dynamically-indexed sampler array won't link on GLSL ES): top
// row = pattern tiles (sampled by world XY), bottom row = shape masks (alpha,
// kind 'shape' only).
const ATLAS_CELL = 512;
const atlasCanvas = document.createElement('canvas');
atlasCanvas.width = ATLAS_CELL * DIV_MAX;
atlasCanvas.height = ATLAS_CELL * 2;
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
  // Shapes: kind (0 line, 1 shape), centre + cos/sin of rotation, size (metres).
  uDivKind: { value: new Float32Array(DIV_MAX) },
  uDivShape: { value: new Float32Array(DIV_MAX * 4) },
  uDivSize: { value: new Float32Array(DIV_MAX * 2) },
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
  const K = dividerUniforms.uDivKind.value;
  const SH = dividerUniforms.uDivShape.value;
  const SZ = dividerUniforms.uDivSize.value;
  for (let i = 0; i < n; i++) {
    const d = dividers[i];
    S[i] = AA_FLOOR + (d.softness ?? 0) * MAX_SOFT;
    _c.set(d.color); // linear RGB (ColorManagement on)
    C[i * 3] = _c.r;
    C[i * 3 + 1] = _c.g;
    C[i * 3 + 2] = _c.b;
    K[i] = d.kind === 'shape' ? 1 : 0;
    if (d.kind === 'shape') {
      const a = ((d.rotation ?? 0) * Math.PI) / 180;
      SH.set([d.cx ?? 0, d.cy ?? 0, Math.cos(a), Math.sin(a)], i * 4);
      SZ.set([d.w ?? 0.1, d.h ?? 0.1], i * 2);
      continue;
    }
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
uniform float uDivKind[DIV_MAX];
uniform vec4 uDivShape[DIV_MAX];
uniform vec2 uDivSize[DIV_MAX];
varying vec3 vWorldPosDiv;
#define DIV_EDGE ${(1 / ATLAS_CELL).toFixed(6)}
// Sample cell di of the atlas at cell uv (row 1 = patterns on top, row 0 =
// shape masks). Clamped a texel in so bilinear doesn't bleed between cells.
vec4 divAtlas(int di, vec2 uv, float row) {
  vec2 c = clamp(uv, DIV_EDGE, 1.0 - DIV_EDGE);
  return texture2D(uDivAtlas, vec2((float(di) + c.x) / float(DIV_MAX), (row + c.y) * 0.5));
}
// The divider's fill: base colour, optionally overlaid with a world-space
// pattern tile (its colour baked in; approximate sRGB to linear). The tiles
// are periodic, so the clamp above stays seamless.
vec3 dividerFill(int di) {
  vec3 fill = uDivColor[di];
  if (uDivPatScale[di] > 0.0) {
    vec4 pc = divAtlas(di, fract(vWorldPosDiv.xy * uDivPatScale[di]), 1.0);
    fill = mix(fill, pow(pc.rgb, vec3(2.2)), pc.a);
  }
  return fill;
}
// How much of divider di covers this fragment: below the line (kind 0), or
// inside the shape mask projected onto the side profile (kind 1).
float dividerMask(int di) {
  if (uDivKind[di] < 0.5) {
    float sd = dot(vWorldPosDiv.xy, uDivN[di]) - uDivOff[di];
    return 1.0 - smoothstep(-uDivSoft[di], uDivSoft[di], sd); // 1 = below the line
  }
  vec4 sh = uDivShape[di];
  vec2 p = vWorldPosDiv.xy - sh.xy;
  vec2 uv = vec2(sh.z * p.x + sh.w * p.y, -sh.w * p.x + sh.z * p.y) / uDivSize[di] + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return divAtlas(di, uv, 0.0).a;
}
`;

const FRAG_BODY = /* glsl */ `
for (int di = 0; di < DIV_MAX; di++) {
  if (di >= uDivCount) break;
  diffuseColor.rgb = mix(diffuseColor.rgb, dividerFill(di), dividerMask(di));
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
  shader.uniforms.uDivKind = dividerUniforms.uDivKind;
  shader.uniforms.uDivShape = dividerUniforms.uDivShape;
  shader.uniforms.uDivSize = dividerUniforms.uDivSize;
}

/**
 * Render each divider's pattern (and, for shapes, its mask) into its atlas
 * cells and set the per-divider world scale (0 = no pattern). Async because pattern tiles render off the main
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
    ctx.clearRect(x, 0, ATLAS_CELL, ATLAS_CELL * 2);
    if (d?.kind === 'shape' && d.shape) {
      // Shape mask fills the whole cell; the shader stretches it to w × h.
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, ATLAS_CELL, ATLAS_CELL, ATLAS_CELL);
      ctx.clip();
      ctx.translate(x + ATLAS_CELL / 2, ATLAS_CELL * 1.5);
      ctx.fillStyle = '#fff';
      fillShape(ctx, d.shape, ATLAS_CELL, ATLAS_CELL);
      ctx.restore();
    }
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
  float m = dividerMask(di) * (1.0 - divCov);
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
