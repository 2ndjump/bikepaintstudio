/**
 * Metal-flake glitter for the metallic and chameleon paints, injected into a
 * MeshPhysicalMaterial: the surface is cut into small cells (in the mesh's own
 * space, so the flakes stick to the paint), each holding one round flake with
 * a random tilt. A flake flashes when its tilted normal mirrors one of the
 * studio softboxes into the camera, so the glitter runs over the tubes as the
 * bike turns. The flash is added as emissive light under the (smooth) clear
 * coat. The cell size follows the zoom so a flake always covers a pixel or two.
 */

interface CompileShader {
  vertexShader: string;
  fragmentShader: string;
}

const FRAG_HEAD = /* glsl */ `
varying vec3 vFlakePos;
vec3 flakeHash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
// x: flash strength of the flake under p, y: a random 0..1 per flake.
vec2 flakeFlash(vec3 p, vec3 n, vec3 v, float power) {
  vec3 cell = floor(p);
  vec3 h = flakeHash(cell);
  vec3 h2 = flakeHash(cell + 17.0);
  vec3 fn = normalize(n + (h * 2.0 - 1.0) * 0.85);
  // The softboxes as seen from the camera (it always faces the back wall):
  // key front-left above, overhead strip, fill from the right.
  float s = pow(max(dot(fn, normalize(v + vec3(-0.45, 0.55, 0.70))), 0.0), power);
  s += 0.7 * pow(max(dot(fn, normalize(v + vec3(0.0, 0.97, 0.24))), 0.0), power);
  s += 0.5 * pow(max(dot(fn, normalize(v + vec3(0.75, 0.30, 0.59))), 0.0), power);
  float disc = smoothstep(0.5, 0.25, length(fract(p) - 0.5));
  return vec2(s * disc * step(0.3, h2.x), h2.y);
}
`;

/**
 * `color` is a GLSL expression mapping the per-flake random `r` to a colour.
 * A lower `power` lets flakes flash further away from the mirror angle, so
 * more of them are lit at once.
 */
function fragBody(color: string, gain: number, power: number, size: number, px: number): string {
  const pw = power.toFixed(1);
  return /* glsl */ `
{
  vec3 flakeP = vFlakePos / ${size.toFixed(5)};
  float flakeW = max(fwidth(flakeP.x), max(fwidth(flakeP.y), fwidth(flakeP.z)));
  // Double the cell size until a cell covers the set pixel count; blend two levels.
  float flakeLod = max(log2(flakeW * ${px.toFixed(2)}), 0.0);
  float flakeL0 = floor(flakeLod);
  vec3 flakeV = normalize(vViewPosition);
  // Two interleaved sets of flakes per level (the second shifted half a cell).
  vec2 flakeA = flakeFlash(flakeP / exp2(flakeL0), normal, flakeV, ${pw});
  vec2 flakeA2 = flakeFlash(flakeP / exp2(flakeL0) + 0.5, normal, flakeV, ${pw});
  vec2 flakeB = flakeFlash(flakeP / exp2(flakeL0 + 1.0), normal, flakeV, ${pw});
  vec2 flakeB2 = flakeFlash(flakeP / exp2(flakeL0 + 1.0) + 0.5, normal, flakeV, ${pw});
  float r = flakeA.y;
  vec3 flakeCa = (${color}) * flakeA.x;
  r = flakeA2.y;
  flakeCa += (${color}) * flakeA2.x;
  r = flakeB.y;
  vec3 flakeCb = (${color}) * flakeB.x;
  r = flakeB2.y;
  flakeCb += (${color}) * flakeB2.x;
  totalEmissiveRadiance += mix(flakeCa, flakeCb, flakeLod - flakeL0) * ${gain.toFixed(1)};
}
`;
}

/**
 * `size`: smallest flake cell (metres, seen up close); `px`: about how many
 * pixels a cell covers when zoomed out.
 */
function inject(shader: CompileShader, color: string, gain: number, power: number, size: number, px: number): void {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vFlakePos;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlakePos = position;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>' + FRAG_HEAD)
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + fragBody(color, gain, power, size, px));
}

/** Metallic: silver flakes tinted by the paint under them. */
export function injectMetallicFlakes(shader: CompileShader): void {
  inject(shader, 'mix(diffuseColor.rgb, vec3(1.0), 0.45 + 0.4 * r)', 2.2, 120, 0.0005, 1.67);
}

/** Chameleon: a dense glitter of flakes in the three flip colours (uniforms of ChameleonMaterial). */
export function injectChameleonFlakes(shader: CompileShader): void {
  inject(shader, 'mix(mix(uChamA, uChamB, smoothstep(0.0, 0.5, r)), uChamC, smoothstep(0.5, 1.0, r)) * 1.4 + 0.3', 4.0, 50, 0.0001, 0.75);
}
