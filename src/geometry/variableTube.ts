import * as THREE from 'three';

export interface VariableTubeOptions {
  tubularSegments?: number;
  radialSegments?: number;
  radiusStart: number;
  radiusEnd?: number;
  /** Oval scaling at start: x = side-to-side, z = fore-aft */
  csStart?: { x: number; z: number };
  /** Oval scaling at end — defaults to csStart */
  csEnd?: { x: number; z: number };
  /**
   * Cross-section shape exponent (Lamé curve / superellipse).
   *   2 = ellipse (default), 4 = rounded rectangle, 8 = nearly sharp rectangle.
   */
  shapeExponent?: number;
}

/**
 * Builds a tube geometry along an arbitrary curve with:
 * - linearly tapered radius from start to end
 * - linearly interpolated oval cross-section
 * - rotation-minimizing frames (no twisting)
 * - correct ellipse normals (not distorted by post-hoc scaling)
 */
export function buildVariableTubeGeo(
  curve: THREE.Curve<THREE.Vector3>,
  opts: VariableTubeOptions,
): THREE.BufferGeometry {
  const {
    tubularSegments = 48,
    radialSegments = 16,
    radiusStart,
    radiusEnd = radiusStart,
    csStart = { x: 1, z: 1 },
    csEnd = csStart,
    shapeExponent = 2,
  } = opts;

  // Lamé / superellipse parameterization. For n=2 this reduces to a standard
  // sin/cos ellipse; for higher n the cross-section becomes a rounded rectangle.
  const expo = shapeExponent;
  function lame(angle: number): { c: number; s: number } {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    if (expo === 2) return { c: cosA, s: sinA };
    const c = Math.sign(cosA) * Math.pow(Math.abs(cosA), 2 / expo);
    const s = Math.sign(sinA) * Math.pow(Math.abs(sinA), 2 / expo);
    return { c, s };
  }

  const N = tubularSegments;
  const R = radialSegments;

  // Sample curve
  const points = curve.getPoints(N);
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    tangents.push(curve.getTangentAt(i / N).normalize());
  }

  // Build rotation-minimizing frames
  const normals: THREE.Vector3[] = new Array(N + 1);
  const binormals: THREE.Vector3[] = new Array(N + 1);

  // Bootstrap first frame: find vector most perpendicular to first tangent
  const t0 = tangents[0];
  const tmp = Math.abs(t0.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  normals[0] = new THREE.Vector3().crossVectors(t0, tmp).normalize();
  binormals[0] = new THREE.Vector3().crossVectors(t0, normals[0]).normalize();

  // Parallel-transport frames
  for (let i = 1; i <= N; i++) {
    const ti = tangents[i];
    const ti_1 = tangents[i - 1];
    const b = new THREE.Vector3().crossVectors(ti_1, ti);
    if (b.lengthSq() < 1e-10) {
      normals[i] = normals[i - 1].clone();
    } else {
      b.normalize();
      const theta = Math.acos(Math.max(-1, Math.min(1, ti_1.dot(ti))));
      const rotM = new THREE.Matrix4().makeRotationAxis(b, theta);
      normals[i] = normals[i - 1].clone().applyMatrix4(rotM).normalize();
    }
    binormals[i] = new THREE.Vector3().crossVectors(ti, normals[i]).normalize();
  }

  // Build vertex positions and normals
  const positions: number[] = [];
  const normalsBuf: number[] = [];
  const uvs: number[] = [];

  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const radius = radiusStart + (radiusEnd - radiusStart) * t;
    const ex = csStart.x + (csEnd.x - csStart.x) * t;
    const ez = csStart.z + (csEnd.z - csStart.z) * t;
    const center = points[i];
    const n = normals[i];
    const b = binormals[i];

    for (let j = 0; j <= R; j++) {
      const angle = (j / R) * Math.PI * 2;
      const { c, s } = lame(angle);

      // Superellipse position in the (n, b) cross-section plane
      const px = center.x + radius * (c * ex * n.x + s * ez * b.x);
      const py = center.y + radius * (c * ex * n.y + s * ez * b.y);
      const pz = center.z + radius * (c * ex * n.z + s * ez * b.z);
      positions.push(px, py, pz);

      // Outward normal: gradient of the implicit superellipse equation,
      // |x/(ex)|^expo + |y/(ez)|^expo = 1. For expo=2 this reduces to the
      // ellipse normal (cos/ex, sin/ez). Then map to world via n, b.
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const gx =
        expo === 2
          ? cosA / ex
          : (Math.sign(cosA) * Math.pow(Math.abs(cosA), expo - 1)) / Math.pow(ex, expo - 1);
      const gy =
        expo === 2
          ? sinA / ez
          : (Math.sign(sinA) * Math.pow(Math.abs(sinA), expo - 1)) / Math.pow(ez, expo - 1);
      const nx = gx * n.x + gy * b.x;
      const ny = gx * n.y + gy * b.y;
      const nz = gx * n.z + gy * b.z;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normalsBuf.push(nx / nl, ny / nl, nz / nl);

      uvs.push(j / R, i / N);
    }
  }

  // Build index buffer for the swept side surface
  const indices: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j;
      const b = a + R + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  // End caps — without these, tubes that don't fully interpenetrate a neighbor
  // show the background through their open end as a hole.
  const startCenter = points[0];
  const endCenter = points[N];
  const startTangent = tangents[0];
  const endTangent = tangents[N];

  // Start cap: vertex at start center with normal pointing back along -startTangent.
  const startCenterIdx = positions.length / 3;
  positions.push(startCenter.x, startCenter.y, startCenter.z);
  normalsBuf.push(-startTangent.x, -startTangent.y, -startTangent.z);
  uvs.push(0.5, 0.5);
  for (let j = 0; j < R; j++) {
    const a = 0 * (R + 1) + j;
    indices.push(startCenterIdx, a + 1, a);
  }

  // End cap: vertex at end center with normal pointing forward along +endTangent.
  const endCenterIdx = positions.length / 3;
  positions.push(endCenter.x, endCenter.y, endCenter.z);
  normalsBuf.push(endTangent.x, endTangent.y, endTangent.z);
  uvs.push(0.5, 0.5);
  const endRingBase = N * (R + 1);
  for (let j = 0; j < R; j++) {
    const a = endRingBase + j;
    indices.push(endCenterIdx, a, a + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normalsBuf, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/** Convenience: build from a point array (auto-wraps in CatmullRomCurve3) */
export function buildVariableTubeFromPath(
  path: THREE.Vector3[],
  opts: VariableTubeOptions,
): THREE.BufferGeometry {
  const curve = path.length === 2
    ? new THREE.LineCurve3(path[0], path[1])
    : new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.5);
  return buildVariableTubeGeo(curve, opts);
}
