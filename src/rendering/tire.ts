import * as THREE from 'three';

/**
 * Procedural tyre surface for the torus tyre (rim.ts buildTireGeometry): u runs
 * around the wheel, v around the tyre's cross-section with v = 0 / 1 on the
 * tread centre. One tile is TILE_M of tread along u; across v it covers the
 * whole cross-section once.
 *
 * - tread band (|cross-section angle| < TREAD_HALF): a staggered file tread of
 *   small rounded studs, very rough rubber
 * - sidewalls: smooth casing with fine concentric ribs, a little less rough
 *
 * Returns a tangent-space normal map and a roughness map (G channel).
 */
const TILE_M = 0.016;
const TREAD_HALF = 0.2; // share of the cross-section (v) either side of the tread centre
const W = 64; // px per tile along u
const H = 512; // px around the cross-section

let cached: { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } | null = null;

function height(x: number, y: number): number {
  // v distance from the tread centre (0 … 0.5).
  const v = y / H;
  const dv = Math.min(v, 1 - v);
  if (dv < TREAD_HALF) {
    // Studs on a staggered grid: 4 columns per tile along u, rows every 1/64 of v.
    const rows = 64;
    const row = Math.floor(v * rows);
    const fu = (x / W) * 4 + (row % 2) * 0.5;
    const cu = fu - Math.floor(fu) - 0.5;
    const cv = v * rows - row - 0.5;
    const r = Math.hypot(cu * 1.2, cv);
    const stud = Math.max(0, 1 - r / 0.42);
    // Studs fade out towards the shoulder.
    const edge = Math.min(1, (TREAD_HALF - dv) / 0.04);
    return Math.sqrt(stud) * edge;
  }
  // Sidewall: fine concentric ribs (they run along u).
  return 0.3 * (0.5 + 0.5 * Math.cos(dv * Math.PI * 2 * 60));
}

function build() {
  const hgt = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) hgt[y * W + x] = height(x, y);
  const h = (x: number, y: number) => hgt[((y + H) % H) * W + ((x + W) % W)];

  const nCanvas = document.createElement('canvas');
  const rCanvas = document.createElement('canvas');
  nCanvas.width = rCanvas.width = W;
  nCanvas.height = rCanvas.height = H;
  const nImg = nCanvas.getContext('2d')!.createImageData(W, H);
  const rImg = rCanvas.getContext('2d')!.createImageData(W, H);
  const strength = 4;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * W + x) * 4;
      // Canvas rows run top-down while texture v runs bottom-up: flip y.
      nImg.data[i] = Math.round((-dx / len * 0.5 + 0.5) * 255);
      nImg.data[i + 1] = Math.round((dy / len * 0.5 + 0.5) * 255);
      nImg.data[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
      nImg.data[i + 3] = 255;
      const dv = Math.min(y / H, 1 - y / H);
      const rough = dv < TREAD_HALF ? 0.9 - 0.1 * h(x, y) : 0.62;
      rImg.data[i] = rImg.data[i + 1] = rImg.data[i + 2] = Math.round(rough * 255);
      rImg.data[i + 3] = 255;
    }
  }
  nCanvas.getContext('2d')!.putImageData(nImg, 0, 0);
  rCanvas.getContext('2d')!.putImageData(rImg, 0, 0);
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { normalMap: tex(nCanvas), roughnessMap: tex(rCanvas) };
}

/** Tyre maps tiled for a tyre of the given outer radius (shared per radius). */
export function getTireMaps(wheelRadius: number) {
  if (!cached) cached = build();
  const repeat = Math.round((2 * Math.PI * wheelRadius) / TILE_M);
  if (cached.normalMap.repeat.x !== repeat) {
    cached.normalMap.repeat.set(repeat, 1);
    cached.roughnessMap.repeat.set(repeat, 1);
  }
  return cached;
}
