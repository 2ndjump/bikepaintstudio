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
import { finishParams } from '../../rendering/finish';
import { useZoneTexture } from '../../rendering/useZoneTexture';
import { getCarbonNormalForTube } from '../../rendering/carbon';
import { ChameleonMaterial } from '../../rendering/ChameleonMaterial';

interface WheelProps {
  position: [number, number, number];
  zone: Extract<ZoneId, 'frontRim' | 'rearRim'>;
  /** Tire cross-section radius (~half tire width). Default: 0.014 (~28mm) */
  tireWidth?: number;
  /** Outer wheel radius where tire meets road. Default: 0.336 */
  wheelRadius?: number;
}

export function Wheel({ position, zone, tireWidth = 0.014, wheelRadius = 0.336 }: WheelProps) {
  const rim = useDesignStore((s) => s.rim);
  const finish = useDesignStore((s) => s.zones[zone].finish);
  const chameleonColors = useDesignStore((s) => s.zones[zone].chameleonColors);
  const texture = useZoneTexture(zone);

  const rimGeo = useMemo(() => buildRimProfileGeometry(rim), [rim]);
  const tireGeo = useMemo(() => buildTireGeometry(tireWidth, wheelRadius), [tireWidth, wheelRadius]);
  const hubGeo = useMemo(() => buildHubGeometry(), []);

  // Carbon weave on the rim sidewalls. Circumference is large (~1.9m); the
  // visible profile across the sidewall is ~50mm.
  const rimCarbonNormal = useMemo(() => {
    const circumference = 2 * Math.PI * RIM_OUTER_RADIUS;
    const profileLen = (rim.depth / 1000) + (rim.width / 1000);
    return getCarbonNormalForTube(circumference, profileLen);
  }, [rim.depth, rim.width]);
  useEffect(() => () => rimCarbonNormal.dispose(), [rimCarbonNormal]);

  const mergedSpokes = useMemo(() => {
    const spokeGeos = buildSpokeGeometry(rim);
    const g = new THREE.BufferGeometry();
    let vertexCount = 0;
    for (const sg of spokeGeos) vertexCount += sg.attributes.position.count;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    let offset = 0;
    for (const sg of spokeGeos) {
      positions.set(sg.attributes.position.array, offset * 3);
      normals.set(sg.attributes.normal.array, offset * 3);
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

  const fp = finishParams(finish);
  const isChameleon = finish === 'chameleon';

  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={rimGeo} receiveShadow>
        {isChameleon ? (
          <ChameleonMaterial
            texture={texture}
            fp={fp}
            colors={chameleonColors}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshPhysicalMaterial
            map={texture}
            normalMap={rimCarbonNormal}
            normalScale={new THREE.Vector2(0.18, 0.18)}
            roughness={fp.roughness}
            metalness={fp.metalness}
            clearcoat={fp.clearcoat}
            clearcoatRoughness={fp.clearcoatRoughness}
            iridescence={fp.iridescence}
            iridescenceIOR={fp.iridescenceIOR}
            envMapIntensity={fp.envMapIntensity}
            specularIntensity={fp.specularIntensity}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      <mesh geometry={tireGeo} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
      </mesh>

      <mesh geometry={hubGeo} castShadow>
        <meshStandardMaterial color="#1f1f1f" roughness={0.4} metalness={0.6} />
      </mesh>

      <mesh geometry={mergedSpokes}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.7} />
      </mesh>
    </group>
  );
}
