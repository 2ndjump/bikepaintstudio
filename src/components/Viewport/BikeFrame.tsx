import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildBikeFrame, type BikeGeo, type TubeDesc } from '../../geometry/frame';
import { buildVariableTubeFromPath } from '../../geometry/variableTube';
import { ZonePaintedMaterial } from './ZoneMaterial';
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
    // No end caps: the dark cap disc was the source of the "see-through"
    // notch under lighting. Without caps the buried ends are covered by the
    // partner tube, and DoubleSide (below) renders the lit inner wall on any
    // end that peeks — so matte/satin can stay fully lit.
    caps: false,
    // Hide the UV seam on the underside so decals stay clear of the cut. The
    // fork keeps the original wrap (down-projection rotates its blades ~90°).
    seamDown: tube.zone !== 'fork',
  });
}

function ZonedTube({ tube }: { tube: TubeDesc }) {
  const geometry = useMemo(() => buildTubeGeometry(tube), [tube]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // castShadow stays OFF: per-tube shadow casting self-shadows the
  // neighboring tube at every junction and reads as a dark seam
  // (see DEVELOPMENT_NOTES.md).
  return (
    <mesh name={`tube:${tube.zone}`} geometry={geometry} receiveShadow>
      <ZonePaintedMaterial zone={tube.zone} side={THREE.DoubleSide} />
    </mesh>
  );
}
