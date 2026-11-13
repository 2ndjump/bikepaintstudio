import { FRAME_ZONES, type BikeModel } from '../../geometry/bikeModel';
import { ZonePaintedMaterial } from './ZoneMaterial';

/**
 * The Blender-built frameset of the selected variant (see bikeModel.ts): each
 * paint zone is one closed mesh with the zone's painted material (base
 * colour + layers + finish); the rotors and thru-axles keep their GLB
 * materials.
 */
export function BikeFrame({ model }: { model: BikeModel }) {
  return (
    <group>
      {FRAME_ZONES.map((z) => (
        // name `zone:<id>` so the edit tool can raycast + drag decals here.
        <mesh key={z} name={`zone:${z}`} geometry={model.zones[z]} castShadow receiveShadow>
          <ZonePaintedMaterial zone={z} />
        </mesh>
      ))}
      {model.hardware.map((m) => (
        <mesh key={m.uuid} geometry={m.geometry} material={m.material} castShadow receiveShadow />
      ))}
    </group>
  );
}
