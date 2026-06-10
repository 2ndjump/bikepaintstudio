import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import { buildBikeFrame, type BikeGeo, type TubeDesc } from '../../geometry/frame';
import { buildVariableTubeFromPath } from '../../geometry/variableTube';
import { finishParams } from '../../rendering/finish';
import { useZoneTexture } from '../../rendering/useZoneTexture';
import { getCarbonNormalForTube } from '../../rendering/carbon';
import { ChameleonMaterial } from '../../rendering/ChameleonMaterial';
import { Accessories } from './Accessories';
import { Cockpit } from './Cockpit';
import { Fillets } from './Fillets';

interface Props {
  geo: BikeGeo;
}

export function BikeFrame({ geo }: Props) {
  const frame = useMemo(() => buildBikeFrame(geo), [geo]);

  return (
    <group>
      {frame.tubes.map((t, i) => (
        <ZonedTube key={i} tube={t} />
      ))}
      <Fillets anchors={frame.anchors} />
      <Accessories anchors={frame.anchors} frame={frame} />
      <Cockpit anchors={frame.anchors} />
    </group>
  );
}

function buildTubeGeometry(tube: TubeDesc): THREE.BufferGeometry {
  return buildVariableTubeFromPath(tube.path, {
    tubularSegments: tube.tubularSegments ?? Math.max(32, tube.path.length * 14),
    radialSegments: tube.radialSegments ?? 16,
    radiusStart: tube.radiusStart,
    radiusEnd: tube.radiusEnd ?? tube.radiusStart,
    csStart: tube.csStart,
    csEnd: tube.csEnd,
    shapeExponent: tube.shapeExponent,
  });
}

/** Approximate ellipse perimeter via Ramanujan's first formula. */
function ellipsePerimeter(a: number, b: number): number {
  const h = ((a - b) * (a - b)) / ((a + b) * (a + b));
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

function approxTubePerimeter(tube: TubeDesc): number {
  const r1 = tube.radiusStart;
  const r2 = tube.radiusEnd ?? r1;
  const cs1 = tube.csStart ?? { x: 1, z: 1 };
  const cs2 = tube.csEnd ?? cs1;
  const p1 = ellipsePerimeter(r1 * cs1.x, r1 * cs1.z);
  const p2 = ellipsePerimeter(r2 * cs2.x, r2 * cs2.z);
  return (p1 + p2) / 2;
}

function approxTubeLength(tube: TubeDesc): number {
  let len = 0;
  for (let i = 1; i < tube.path.length; i++) {
    len += tube.path[i].distanceTo(tube.path[i - 1]);
  }
  return len;
}

function ZonedTube({ tube }: { tube: TubeDesc }) {
  const zone = tube.zone;
  const finish = useDesignStore((s) => s.zones[zone].finish);
  const chameleonColors = useDesignStore((s) => s.zones[zone].chameleonColors);
  const texture = useZoneTexture(zone);

  const geometry = useMemo(() => buildTubeGeometry(tube), [tube]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Per-tube carbon-weave normal map tuned so weave cells stay ~5mm across.
  const carbonNormal = useMemo(
    () => getCarbonNormalForTube(approxTubePerimeter(tube), approxTubeLength(tube)),
    [tube],
  );
  useEffect(() => () => carbonNormal.dispose(), [carbonNormal]);

  const fp = finishParams(finish);
  const isChameleon = finish === 'chameleon';

  // Any lighting calculation (Lambert / Standard / Physical) makes the tube
  // END CAPS shade differently from the swept side surface because their
  // normal points along the tube tangent rather than radially. Where a cap
  // sits inside a partner tube the lighting can drop it to almost-black,
  // reading as a hole or "see-through wall." MeshBasicMaterial has no
  // lighting, so the cap renders the same texture color as the wall and the
  // dark notches disappear. Trade-off: matte/satin no longer have curvature
  // shading. Glossy/metallic still use PBR — their specular highlights
  // dominate the visual and the cap-notch is hidden by the highlight.
  const wantsSpecular = finish === 'glossy' || finish === 'metallic';
  void carbonNormal;
  return (
    <mesh geometry={geometry} receiveShadow>
      {isChameleon ? (
        <ChameleonMaterial texture={texture} fp={fp} colors={chameleonColors} />
      ) : wantsSpecular ? (
        <meshStandardMaterial
          map={texture}
          roughness={fp.roughness}
          metalness={fp.metalness}
          envMapIntensity={fp.envMapIntensity}
        />
      ) : (
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      )}
    </mesh>
  );
}
