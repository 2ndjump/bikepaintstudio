import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import type { BikeVariant, ZoneId } from '../state/types';
import { measureUVScale, setZoneAspect } from '../rendering/zoneMetrics';

/**
 * The frameset comes from Blender (blender/export_variants.py): one GLB per
 * variant with a painted mesh per frame zone (`zone_<ZoneId>`, paint UVs: u
 * around the tube, v along it), the non-painted hardware (`hw_*`: rotors,
 * thru-axles) and the wheel/hub placement in the scene extras. Units are
 * metres, +x forward, +y up, tires touch y = 0. Rims, tires, hubs and spokes
 * stay procedural (Wheel.tsx) so RimParams keep working.
 */

export type FrameZone = Exclude<ZoneId, 'frontRim' | 'rearRim'>;

export const FRAME_ZONES: FrameZone[] = [
  'headTube',
  'topTube',
  'downTube',
  'seatTube',
  'seatStays',
  'chainStays',
  'fork',
];

export const ALL_VARIANTS: BikeVariant[] = [
  { discipline: 'gravel', style: 'classic' },
  { discipline: 'gravel', style: 'aero' },
  { discipline: 'road', style: 'classic' },
  { discipline: 'road', style: 'aero' },
];

export function variantUrl(v: BikeVariant): string {
  return `${import.meta.env.BASE_URL}assets/bike_${v.discipline}_${v.style}.glb`;
}

export interface BikeModel {
  zones: Record<FrameZone, THREE.BufferGeometry>;
  /** Non-painted hardware with its own (GLB) material. */
  hardware: THREE.Mesh[];
  frontHub: THREE.Vector3;
  rearHub: THREE.Vector3;
  /** Outer tire radius (m). */
  wheelRadius: number;
  /** Tire width (m). */
  tireWidth: number;
  /** Hub half-length up to the dropout inner faces (m), front / rear. */
  hubHalfFront: number;
  hubHalfRear: number;
}

interface Extras {
  frontHub: [number, number, number];
  rearHub: [number, number, number];
  wheelRadius: number;
  tireWidth: number;
  hubHalfFront: number;
  hubHalfRear: number;
}

/** Load (suspends) the variant's GLB and pick out zones, hardware and wheel data. */
export function useBikeModel(variant: BikeVariant): BikeModel {
  const { scene } = useGLTF(variantUrl(variant));
  return useMemo(() => {
    const zones = {} as Record<FrameZone, THREE.BufferGeometry>;
    const hardware: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (m.name.startsWith('zone_')) zones[m.name.slice(5) as FrameZone] = m.geometry;
      else hardware.push(m);
    });
    // Each tube's real surface aspect keeps decals undistorted on the
    // fixed-aspect zone canvases (see LayerCompositor.drawDecal).
    FRAME_ZONES.forEach((z) => {
      const { su, sv } = measureUVScale(zones[z]);
      if (sv > 0) setZoneAspect(z, su / sv);
    });
    const x = scene.userData as Extras;
    return {
      zones,
      hardware,
      frontHub: new THREE.Vector3(...x.frontHub),
      rearHub: new THREE.Vector3(...x.rearHub),
      wheelRadius: x.wheelRadius,
      tireWidth: x.tireWidth,
      hubHalfFront: x.hubHalfFront,
      hubHalfRear: x.hubHalfRear,
    };
  }, [scene]);
}
