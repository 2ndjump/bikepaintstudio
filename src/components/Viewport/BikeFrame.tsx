import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { FRAME_ZONES, type BikeModel } from '../../geometry/bikeModel';
import { brushedMetal } from '../../rendering/brushed';
import { ZonePaintedMaterial } from './ZoneMaterial';

/**
 * The Blender-built frameset of the selected variant (see bikeModel.ts): each
 * paint zone is one closed mesh with the zone's painted material (base
 * colour + layers + finish); the rotor rings (`hw_steel`) become brushed
 * stainless, the rest of the hardware keeps its GLB material.
 */
export function BikeFrame({ model }: { model: BikeModel }) {
  // Rotors are brushed about their axle (z) through the hub centres.
  const steel = useMemo(() => {
    const src = model.hardware.find((m) => m.name === 'hw_steel')?.material as THREE.MeshStandardMaterial | undefined;
    if (!src) return null;
    return brushedMetal(
      { color: src.color, roughness: 0.28, metalness: 1, anisotropy: 0.75, side: src.side },
      [model.frontHub, model.rearHub],
      new THREE.Vector3(0, 0, 1),
    );
  }, [model]);
  useEffect(() => () => steel?.dispose(), [steel]);

  return (
    <group>
      {FRAME_ZONES.map((z) => (
        // name `zone:<id>` so the edit tool can raycast + drag decals here.
        <mesh key={z} name={`zone:${z}`} geometry={model.zones[z]} castShadow receiveShadow>
          <ZonePaintedMaterial zone={z} />
        </mesh>
      ))}
      {model.hardware.map((m) => (
        <mesh
          key={m.uuid}
          geometry={m.geometry}
          material={m.name === 'hw_steel' && steel ? steel : m.material}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
