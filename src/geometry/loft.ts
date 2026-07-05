import * as THREE from 'three';

/**
 * Loft a tapered, elliptical-section tube along a Catmull-Rom curve through the
 * given points. `radiusFn(t)` is the "up" half-axis; `depthFn(t)` scales the
 * near-Z half-axis (fore/aft). The cross-section is oriented against the global
 * Z axis, so tubes lying in the XY plane keep a consistent lateral profile.
 *
 * Produces position + uv (u around, v along) + smooth normals, with flat end
 * caps. Shared by the whole procedural frameset (see frameModel.ts).
 */
export function loftTube(
  points: (THREE.Vector3 | number[])[],
  radiusFn: (t: number) => number,
  depthFn: (t: number) => number,
  segs = 140,
  radial = 48,
): { geo: THREE.BufferGeometry; curve: THREE.CatmullRomCurve3 } {
  const vecs = points.map((p) =>
    p instanceof THREE.Vector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]),
  );
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.5);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const Z = new THREE.Vector3(0, 0, 1);
  const T = new THREE.Vector3();
  const fore = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const c = curve.getPointAt(t);
    curve.getTangentAt(t, T);
    side.crossVectors(T, Z).normalize();
    fore.crossVectors(T, side).normalize(); // right-handed → outward winding
    const r = radiusFn(t);
    const d = r * depthFn(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(
        c.x + side.x * Math.cos(a) * r + fore.x * Math.sin(a) * d,
        c.y + side.y * Math.cos(a) * r + fore.y * Math.sin(a) * d,
        c.z + side.z * Math.cos(a) * r + fore.z * Math.sin(a) * d,
      );
      uv.push(j / radial, t);
    }
  }

  const stride = radial + 1;
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * stride + j;
      const b = a + stride;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }

  // End caps.
  const pStart = curve.getPointAt(0);
  const pEnd = curve.getPointAt(1);
  const cs = pos.length / 3;
  pos.push(pStart.x, pStart.y, pStart.z);
  uv.push(0.5, 0);
  const ce = pos.length / 3;
  pos.push(pEnd.x, pEnd.y, pEnd.z);
  uv.push(0.5, 1);
  for (let j = 0; j < radial; j++) {
    idx.push(cs, j + 1, j);
    idx.push(ce, segs * stride + j, segs * stride + j + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, curve };
}
