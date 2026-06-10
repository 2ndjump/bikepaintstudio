import * as THREE from 'three';

/**
 * Procedural carbon-fiber twill-weave normal map.
 *
 * Each cell of the weave is `threadPx` square. We tile pairs of cells in a 2/2
 * twill (each thread goes over two and under two), producing the alternating
 * dark/light striped diagonals that define carbon fiber visually. The output is
 * a tangent-space normal map: 128 = flat, +x = bump right, +y = bump up.
 *
 * Returned texture is RepeatWrapping so it tiles cleanly across tube UVs.
 */
export function buildCarbonWeaveNormalTexture(opts?: {
  size?: number;
  threadPx?: number;
  bumpStrength?: number;
}): THREE.Texture {
  const size = opts?.size ?? 512;
  const threadPx = opts?.threadPx ?? 16;
  const bumpStrength = opts?.bumpStrength ?? 0.45;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  // 2/2 twill weave classifier — returns true if the warp (horizontal thread)
  // is on top at this cell, false if the weft (vertical thread) is on top.
  // The pattern offsets by one cell each row, creating the diagonal stripe.
  function warpOver(cellX: number, cellY: number): boolean {
    const phase = ((cellX - cellY) % 4 + 4) % 4;
    return phase === 0 || phase === 1;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cellX = Math.floor(x / threadPx);
      const cellY = Math.floor(y / threadPx);
      const localX = ((x % threadPx) + threadPx) % threadPx; // [0, threadPx)
      const localY = ((y % threadPx) + threadPx) % threadPx;
      const u = localX / threadPx; // [0, 1)
      const v = localY / threadPx;

      const warp = warpOver(cellX, cellY);

      // Each thread is a half-cylinder running along its axis. The cross-section
      // (perpendicular to the thread) is sin(pi * t) — peaks in the middle.
      // For a warp (horizontal) thread, the bump varies along Y. For a weft
      // (vertical) thread, along X.
      let bumpDX = 0;
      let bumpDY = 0;
      if (warp) {
        // Horizontal thread: surface height ~ sin(pi * v). Derivative dY = pi*cos(pi*v).
        // We want a normal map, so encode the slope.
        bumpDY = -Math.cos(Math.PI * v) * bumpStrength;
      } else {
        // Vertical thread: bump along X.
        bumpDX = -Math.cos(Math.PI * u) * bumpStrength;
      }

      // Tangent-space normal: (-dHeight/dx, -dHeight/dy, 1) normalized.
      let nx = bumpDX;
      let ny = bumpDY;
      let nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      // Encode to RGB [0..255]; 128 = 0 component.
      const i = (y * size + x) * 4;
      data[i + 0] = Math.round((nx * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  // Normal maps must be in linear color space, not sRGB.
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Lazy singleton so all frame meshes share one carbon normal texture. */
let cached: THREE.Texture | null = null;
export function getCarbonNormalMap(): THREE.Texture {
  if (!cached) cached = buildCarbonWeaveNormalTexture();
  return cached;
}

/**
 * Returns a per-mesh clone of the carbon normal map with `repeat` set so weave
 * cells appear roughly `cellSize` meters across, independent of tube size. The
 * clone shares the underlying canvas image with the singleton, so GPU upload
 * cost is paid once.
 *
 * The procedural texture has 32 cells per UV unit, so:
 *   repeat = surface_dimension / (CELL_SIZE * 32) = surface_dimension / 0.16
 *
 * @param perimeter — surface dimension wrapping around the tube (U direction)
 * @param length    — surface dimension along the tube (V direction)
 */
export function getCarbonNormalForTube(
  perimeter: number,
  length: number,
  cellSize = 0.005,
): THREE.Texture {
  const base = getCarbonNormalMap();
  const cloned = base.clone();
  cloned.needsUpdate = true;
  const denom = cellSize * 32;
  cloned.repeat.set(Math.max(0.25, perimeter / denom), Math.max(0.25, length / denom));
  return cloned;
}
