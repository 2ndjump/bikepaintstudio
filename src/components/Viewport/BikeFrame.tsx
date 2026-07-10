import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildFrameModel, FRAME_ZONES, MODEL_SCALE, type FrameZone } from '../../geometry/frameModel';
import { measureUVScale } from '../../geometry/loft';
import { setZoneAspect } from '../../rendering/zoneMetrics';
import { ZonePaintedMaterial } from './ZoneMaterial';

/**
 * The full procedural frameset (frame tubes + fork + hardware), built once in
 * millimetres by frameModel.ts and rendered inside a group scaled to metres.
 * Each paint zone renders as a mapped tube mesh (base colour + layers) plus, for
 * a few zones, a base-only primitive mesh (BB shell, dropouts, steerer) so the
 * layer texture never smears across those chunky junctions. The alloy thru-axle
 * and dark bores/caps use their own metal materials.
 */
export function BikeFrame() {
  const model = useMemo(() => {
    const m = buildFrameModel();
    // Measure each tube's real surface aspect so decals stay undistorted on the
    // fixed-aspect zone canvases (see LayerCompositor.drawDecal).
    FRAME_ZONES.forEach((z) => {
      const { su, sv } = measureUVScale(m.zones[z]);
      if (sv > 0) setZoneAspect(z, su / sv);
    });
    return m;
  }, []);

  useEffect(
    () => () => {
      FRAME_ZONES.forEach((z) => model.zones[z].dispose());
      Object.values(model.zonesPlain).forEach((g) => g?.dispose());
      model.alu.dispose();
      model.dark.dispose();
    },
    [model],
  );

  const plainZones = Object.keys(model.zonesPlain) as FrameZone[];

  return (
    <group scale={[MODEL_SCALE, MODEL_SCALE, MODEL_SCALE]}>
      {FRAME_ZONES.map((z) => (
        <mesh key={z} name={`zone:${z}`} geometry={model.zones[z]} castShadow receiveShadow>
          <ZonePaintedMaterial zone={z} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {plainZones.map((z) => (
        <mesh key={`plain:${z}`} geometry={model.zonesPlain[z]} castShadow receiveShadow>
          <ZonePaintedMaterial zone={z} baseOnly />
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
