import * as THREE from 'three';
import type { Divider, PatternLayer } from '../state/types';
import { renderPattern } from './patterns';
import { fillShape } from './LayerCompositor';

/** Max dividers (lines + shapes) supported by the shader (fixed array size). */
export const DIV_MAX = 16;

// Each divider's pattern tile and shape mask live in a single atlas texture (one
// sampler2D — a dynamically-indexed sampler array won't link on GLSL ES). Entry
// i owns a block of two cells [pattern | mask] in a grid of ATLAS_COLS blocks
// per row, so the atlas stays within a 4096 px texture limit.
const ATLAS_CELL = 512;
const ATLAS_COLS = 4;
const ATLAS_ROWS = Math.ceil(DIV_MAX / ATLAS_COLS);
const atlasCanvas = document.createElement('canvas');
atlasCanvas.width = ATLAS_CELL * 2 * ATLAS_COLS;
atlasCanvas.height = ATLAS_CELL * ATLAS_ROWS;
const atlasTex = new THREE.CanvasTexture(atlasCanvas);
atlasTex.wrapS = THREE.ClampToEdgeWrapping;
atlasTex.wrapT = THREE.ClampToEdgeWrapping;

/** Canvas origin of cell `sub` (0 = pattern, 1 = mask) of entry i. */
function cellOrigin(i: number, sub: 0 | 1): [number, number] {
  return [((i % ATLAS_COLS) * 2 + sub) * ATLAS_CELL, Math.floor(i / ATLAS_COLS) * ATLAS_CELL];
}

/**
 * Shared uniforms for the world-space colour dividers. Every painted material's
 * onBeforeCompile references THESE objects, so a single sync updates all shaders
 * at once (no recompile). Packed into three vec4s per entry to stay well within
 * the fragment uniform budget.
 */
export const dividerUniforms = {
  uDivCount: { value: 0 },
  // Line: (normal xy pointing "up", signed offset, edge softness in metres).
  // Shape: (centre xy, cos, sin of rotation).
  uDivGeo: { value: new Float32Array(DIV_MAX * 4) },
  uDivColor: { value: new Float32Array(DIV_MAX * 4) }, // linear RGB, kind (0 line, 1 shape)
  uDivExt: { value: new Float32Array(DIV_MAX * 4) }, // shape w, h (metres), pattern tiles/metre (0 = none)
  // Optional per-divider pattern filling the region (sampled by world XY).
  uDivAtlas: { value: atlasTex as THREE.Texture },
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
  const G = dividerUniforms.uDivGeo.value;
  const C = dividerUniforms.uDivColor.value;
  const E = dividerUniforms.uDivExt.value;
  for (let i = 0; i < n; i++) {
    const d = dividers[i];
    _c.set(d.color); // linear RGB (ColorManagement on)
    C.set([_c.r, _c.g, _c.b, d.kind === 'shape' ? 1 : 0], i * 4);
    if (d.kind === 'shape') {
      const a = ((d.rotation ?? 0) * Math.PI) / 180;
      G.set([d.cx ?? 0, d.cy ?? 0, Math.cos(a), Math.sin(a)], i * 4);
      E[i * 4] = d.w ?? 0.1;
      E[i * 4 + 1] = d.h ?? 0.1;
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
    G.set([nx, ny, d.ax * nx + d.ay * ny, AA_FLOOR + (d.softness ?? 0) * MAX_SOFT], i * 4);
  }
}

const FRAG_HEAD = /* glsl */ `
#define DIV_MAX ${DIV_MAX}
#define DIV_COLS ${ATLAS_COLS.toFixed(1)}
#define DIV_ROWS ${ATLAS_ROWS.toFixed(1)}
uniform int uDivCount;
uniform vec4 uDivGeo[DIV_MAX];
uniform vec4 uDivColor[DIV_MAX];
uniform vec4 uDivExt[DIV_MAX];
uniform sampler2D uDivAtlas;
varying vec3 vWorldPosDiv;
#define DIV_EDGE ${(1 / ATLAS_CELL).toFixed(6)}
// Sample cell sub (0 = pattern, 1 = shape mask) of entry di at cell uv (v up).
// Clamped a texel in so bilinear doesn't bleed between cells.
vec4 divAtlas(int di, vec2 uv, float sub) {
  vec2 c = clamp(uv, DIV_EDGE, 1.0 - DIV_EDGE);
  float col = mod(float(di), DIV_COLS);
  float row = floor(float(di) / DIV_COLS);
  return texture2D(uDivAtlas, vec2((col * 2.0 + sub + c.x) / (DIV_COLS * 2.0), 1.0 - (row + 1.0 - c.y) / DIV_ROWS));
}
// The divider's fill: base colour, optionally overlaid with a world-space
// pattern tile (its colour baked in; approximate sRGB to linear). The tiles
// are periodic, so the clamp above stays seamless.
vec3 dividerFill(int di) {
  vec3 fill = uDivColor[di].rgb;
  float ps = uDivExt[di].z;
  if (ps > 0.0) {
    vec4 pc = divAtlas(di, fract(vWorldPosDiv.xy * ps), 0.0);
    fill = mix(fill, pow(pc.rgb, vec3(2.2)), pc.a);
  }
  return fill;
}
// How much of divider di covers this fragment: below the line (kind 0), or
// inside the shape mask projected onto the side profile (kind 1).
float dividerMask(int di) {
  vec4 g = uDivGeo[di];
  if (uDivColor[di].a < 0.5) {
    float sd = dot(vWorldPosDiv.xy, g.xy) - g.z;
    return 1.0 - smoothstep(-g.w, g.w, sd); // 1 = below the line
  }
  vec2 p = vWorldPosDiv.xy - g.xy;
  vec2 uv = vec2(g.z * p.x + g.w * p.y, -g.w * p.x + g.z * p.y) / uDivExt[di].xy + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return divAtlas(di, uv, 1.0).a;
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
  shader.uniforms.uDivGeo = dividerUniforms.uDivGeo;
  shader.uniforms.uDivColor = dividerUniforms.uDivColor;
  shader.uniforms.uDivExt = dividerUniforms.uDivExt;
  shader.uniforms.uDivAtlas = dividerUniforms.uDivAtlas;
}

/**
 * Render each divider's pattern (and, for shapes, its mask) into its atlas
 * cells and set the per-divider world scale (0 = no pattern). Async because pattern tiles render off the main
 * path; safe to call on every divider change.
 */
export async function syncDividerPatterns(dividers: Divider[]): Promise<void> {
  const E = dividerUniforms.uDivExt.value;
  const ctx = atlasCanvas.getContext('2d');
  if (!ctx) return;
  const n = Math.min(dividers.length, DIV_MAX);
  for (let i = 0; i < DIV_MAX; i++) {
    const d = i < n ? dividers[i] : undefined;
    const [px, py] = cellOrigin(i, 0);
    const [mx, my] = cellOrigin(i, 1);
    ctx.clearRect(px, py, ATLAS_CELL * 2, ATLAS_CELL);
    if (d?.kind === 'shape' && d.shape) {
      // Shape mask fills the whole cell; the shader stretches it to w × h.
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx, my, ATLAS_CELL, ATLAS_CELL);
      ctx.clip();
      ctx.translate(mx + ATLAS_CELL / 2, my + ATLAS_CELL / 2);
      ctx.fillStyle = '#fff';
      fillShape(ctx, d.shape, ATLAS_CELL, ATLAS_CELL);
      ctx.restore();
    }
    if (!d?.pattern) {
      E[i * 4 + 2] = 0;
      continue;
    }
    const canvas = await renderPattern({
      pattern: d.pattern,
      color: d.patternColor ?? '#0a0a0a',
      intensity: 1,
    } as PatternLayer);
    ctx.clearRect(px, py, ATLAS_CELL, ATLAS_CELL);
    ctx.drawImage(canvas, px, py, ATLAS_CELL, ATLAS_CELL);
    E[i * 4 + 2] = (d.patternScale ?? 12) / 3; // world tiles per metre
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
