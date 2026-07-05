import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildFrameModel, FRAME_ZONES, MODEL_SCALE } from '../../geometry/frameModel';
import { ZonePaintedMaterial } from './ZoneMaterial';

/**
 * The full procedural frameset (frame tubes + fork + hardware), built once in
 * millimetres by frameModel.ts and rendered inside a group scaled to metres.
 * Each paint zone is one merged mesh sharing the zone's painted material; the
 * alloy thru-axle and dark bores/caps use their own metal materials.
 */
export function BikeFrame() {
  const model = useMemo(() => buildFrameModel(), []);

  useEffect(
    () => () => {
      FRAME_ZONES.forEach((z) => model.zones[z].dispose());
      model.alu.dispose();
      model.dark.dispose();
    },
    [model],
  );

  return (
    <group scale={[MODEL_SCALE, MODEL_SCALE, MODEL_SCALE]}>
      {FRAME_ZONES.map((z) => (
        <mesh key={z} name={`zone:${z}`} geometry={model.zones[z]} castShadow receiveShadow>
          <ZonePaintedMaterial zone={z} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh geometry={model.alu} castShadow receiveShadow>
        <meshStandardMaterial color="#8f9299" roughness={0.3} metalness={1} envMapIntensity={1} />
      </mesh>
      <mesh geometry={model.dark} castShadow receiveShadow>
        <meshStandardMaterial color="#0a0a0b" roughness={0.8} metalness={0.2} />
      </mesh>
    </group>
  );
}
