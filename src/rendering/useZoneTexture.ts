import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../state/designStore';
import type { Layer, ZoneId } from '../state/types';
import { getCompositor } from './LayerCompositor';

export interface ZoneTextures {
  /** Base + layers, opaque — the colour map. */
  map: THREE.CanvasTexture;
  /** Layer coverage (alpha) — where the layers hide the base. */
  coverage: THREE.CanvasTexture;
}

const zoneTextures = new Map<ZoneId, ZoneTextures>();

// Stable fallback so a missing/stale zone never returns a fresh array (which
// would re-trigger the effect / re-render every frame).
const EMPTY_LAYERS: Layer[] = [];

function getOrCreateTextures(zoneId: ZoneId): ZoneTextures {
  const existing = zoneTextures.get(zoneId);
  if (existing) return existing;
  const compositor = getCompositor(zoneId);

  // u wraps around the tube. Past a tube's ends (v outside 0..1: BB shell,
  // dropouts, fork crown) the paint continues mirrored instead of smearing.
  const map = new THREE.CanvasTexture(compositor.canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.MirroredRepeatWrapping;

  // Only the alpha channel matters, so keep it in linear/no colour space.
  const coverage = new THREE.CanvasTexture(compositor.coverageCanvas);
  coverage.anisotropy = 8;
  coverage.wrapS = THREE.RepeatWrapping;
  coverage.wrapT = THREE.MirroredRepeatWrapping;

  const textures = { map, coverage };
  zoneTextures.set(zoneId, textures);
  return textures;
}

export function useZoneTexture(zoneId: ZoneId): ZoneTextures {
  const layers = useDesignStore((s) => s.zones[zoneId]?.layers ?? EMPTY_LAYERS);
  const baseColor = useDesignStore((s) => s.zones[zoneId]?.baseColor ?? '#888888');
  // A variant switch changes the measured zone aspect (zoneMetrics) the decals
  // are drawn with, so it re-composites too.
  const variant = useDesignStore((s) => s.variant);
  const [textures] = useState(() => getOrCreateTextures(zoneId));

  useEffect(() => {
    const compositor = getCompositor(zoneId);
    let cancelled = false;
    compositor.render(layers, baseColor).then(() => {
      if (cancelled) return;
      textures.map.needsUpdate = true;
      textures.coverage.needsUpdate = true;
    });
    return () => {
      cancelled = true;
    };
  }, [layers, baseColor, variant, zoneId, textures]);

  return textures;
}
