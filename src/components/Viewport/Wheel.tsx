import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import {
  buildHubGeometry,
  buildRimProfileGeometry,
  buildSpokeGeometry,
  buildTireGeometry,
  RIM_OUTER_RADIUS,
} from '../../geometry/rim';
import type { ZoneId } from '../../state/types';
import { ZonePaintedMaterial } from './ZoneMaterial';

interface WheelProps {
  position: [number, number, number];
  zone: Extract<ZoneId, 'frontRim' | 'rearRim'>;
  /** Tire cross-section radius (~half tire width). Default: 0.014 (~28mm) */
  tireWidth?: number;
  /** Outer wheel radius where tire meets road. Default: 0.339 */
  wheelRadius?: number;
}

export function Wheel({ position, zone, tireWidth = 0.014, wheelRadius = 0.339 }: WheelProps) {
  const rim = useDesignStore((s) => s.rim);

  const rimGeo = useMemo(() => buildRimProfileGeometry(rim), [rim]);
  const tireGeo = useMemo(() => buildTireGeometry(tireWidth, wheelRadius), [tireWidth, wheelRadius]);
  const hubGeo = useMemo(() => buildHubGeometry(), []);

  const mergedSpokes = useMemo(() => {
    const spokeGeos = buildSpokeGeometry(rim);
    const g = new THREE.BufferGeometry();
    let vertexCount = 0;
    for (const sg of spokeGeos) vertexCount += sg.attributes.position.count;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    let offset = 0;
    for (const sg of spokeGeos) {
      positions.set(sg.attributes.position.array as Float32Array, offset * 3);
      normals.set(sg.attributes.normal.array as Float32Array, offset * 3);
      offset += sg.attributes.position.count;
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    const indices: number[] = [];
    let base = 0;
    for (const sg of spokeGeos) {
      const idx = sg.index;
      if (idx) for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + base);
      base += sg.attributes.position.count;
    }
    if (indices.length > 0) g.setIndex(indices);
    for (const sg of spokeGeos) sg.dispose();
    return g;
  }, [rim]);

  useEffect(() => () => rimGeo.dispose(), [rimGeo]);
  useEffect(() => () => tireGeo.dispose(), [tireGeo]);
  useEffect(() => () => hubGeo.dispose(), [hubGeo]);
  useEffect(() => () => mergedSpokes.dispose(), [mergedSpokes]);

  // Valve stem: at the rim bed pointing toward the hub. Instantly reads
  // "real wheel" for one cylinder's worth of geometry.
  const rimInner = Math.max(0.12, RIM_OUTER_RADIUS - rim.depth / 1000);
  const valveLen = 0.030;

  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      {/* name `zone:<id>` so the edit tool can raycast + drag decals here too. */}
      <mesh name={`zone:${zone}`} geometry={rimGeo} castShadow receiveShadow>
        <ZonePaintedMaterial zone={zone} side={THREE.DoubleSide} />
      </mesh>

      <mesh geometry={tireGeo} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#181818" roughness={0.88} metalness={0} />
      </mesh>

      <mesh geometry={hubGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#1b1b1b" roughness={0.35} metalness={0.8} />
      </mesh>

      <mesh geometry={mergedSpokes} castShadow receiveShadow>
        <meshStandardMaterial color="#2a2a2a" roughness={0.45} metalness={0.85} />
      </mesh>

      {/* Valve stem */}
      <mesh
        position={[rimInner - valveLen / 2, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.0022, 0.0022, valveLen, 12]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.35} metalness={0.9} />
      </mesh>
    </group>
  );
}
