import * as THREE from 'three';

/**
 * Inverse texture lookup: where on a mesh is paint coordinate (u, v)? Used to
 * anchor the on-model layer handles and to place new layers. Triangles are
 * bucketed by their UV bounds in a coarse grid (built once per geometry).
 */
interface UVGrid {
  n: number;
  u0: number;
  v0: number;
  du: number;
  dv: number;
  cells: number[][]; // triangle indices per cell
  tri: Uint32Array; // vertex indices, 3 per triangle
}

const GRID_N = 48;
const grids = new WeakMap<THREE.BufferGeometry, UVGrid>();

function grid(geo: THREE.BufferGeometry): UVGrid {
  const cached = grids.get(geo);
  if (cached) return cached;
  const uv = geo.getAttribute('uv');
  const index = geo.getIndex();
  const count = index ? index.count : uv.count;
  const tri = new Uint32Array(count);
  for (let i = 0; i < count; i++) tri[i] = index ? index.getX(i) : i;
  let u0 = Infinity;
  let v0 = Infinity;
  let u1 = -Infinity;
  let v1 = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    u0 = Math.min(u0, uv.getX(i));
    u1 = Math.max(u1, uv.getX(i));
    v0 = Math.min(v0, uv.getY(i));
    v1 = Math.max(v1, uv.getY(i));
  }
  const g: UVGrid = {
    n: GRID_N,
    u0,
    v0,
    du: (u1 - u0) / GRID_N || 1,
    dv: (v1 - v0) / GRID_N || 1,
    cells: Array.from({ length: GRID_N * GRID_N }, () => []),
    tri,
  };
  const cell = (x: number, lo: number, d: number) => Math.min(GRID_N - 1, Math.max(0, Math.floor((x - lo) / d)));
  for (let t = 0; t < count / 3; t++) {
    const a = tri[t * 3];
    const b = tri[t * 3 + 1];
    const c = tri[t * 3 + 2];
    const ia0 = cell(Math.min(uv.getX(a), uv.getX(b), uv.getX(c)), u0, g.du);
    const ia1 = cell(Math.max(uv.getX(a), uv.getX(b), uv.getX(c)), u0, g.du);
    const ib0 = cell(Math.min(uv.getY(a), uv.getY(b), uv.getY(c)), v0, g.dv);
    const ib1 = cell(Math.max(uv.getY(a), uv.getY(b), uv.getY(c)), v0, g.dv);
    for (let i = ia0; i <= ia1; i++) for (let j = ib0; j <= ib1; j++) g.cells[j * GRID_N + i].push(t);
  }
  grids.set(geo, g);
  return g;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

/**
 * World point at paint coordinate (u, v) of `mesh` (u wraps around). Where
 * (u, v) occurs more than once (e.g. on both rim sidewalls), the one nearest
 * `eye` (world) wins. Null when the coordinate isn't on the surface.
 */
export function uvToSurface(mesh: THREE.Mesh, u: number, v: number, eye: THREE.Vector3): THREE.Vector3 | null {
  const geo = mesh.geometry;
  const g = grid(geo);
  const uv = geo.getAttribute('uv');
  const pos = geo.getAttribute('position');
  let best: THREE.Vector3 | null = null;
  let bestDist = Infinity;
  mesh.updateWorldMatrix(true, false);
  for (const uu of [u, u - 1, u + 1]) {
    const i = Math.floor((uu - g.u0) / g.du);
    const j = Math.floor((v - g.v0) / g.dv);
    if (i < 0 || j < 0 || i >= g.n || j >= g.n) continue;
    for (const t of g.cells[j * g.n + i]) {
      const a = g.tri[t * 3];
      const b = g.tri[t * 3 + 1];
      const c = g.tri[t * 3 + 2];
      const ax = uv.getX(a);
      const ay = uv.getY(a);
      const e1x = uv.getX(b) - ax;
      const e1y = uv.getY(b) - ay;
      const e2x = uv.getX(c) - ax;
      const e2y = uv.getY(c) - ay;
      const det = e1x * e2y - e2x * e1y;
      if (Math.abs(det) < 1e-14) continue;
      const px = uu - ax;
      const py = v - ay;
      const s = (px * e2y - e2x * py) / det;
      const r = (e1x * py - px * e1y) / det;
      if (s < -1e-6 || r < -1e-6 || s + r > 1 + 1e-6) continue;
      _a.fromBufferAttribute(pos, a);
      _b.fromBufferAttribute(pos, b);
      _c.fromBufferAttribute(pos, c);
      const point = _a
        .clone()
        .multiplyScalar(1 - s - r)
        .addScaledVector(_b, s)
        .addScaledVector(_c, r)
        .applyMatrix4(mesh.matrixWorld);
      const dist = point.distanceToSquared(eye);
      if (dist < bestDist) {
        bestDist = dist;
        best = point;
      }
    }
  }
  return best;
}
