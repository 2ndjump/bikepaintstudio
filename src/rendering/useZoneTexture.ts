import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../state/designStore';
import type { ZoneId } from '../state/types';
import { getCompositor } from './LayerCompositor';

const zoneTextures = new Map<ZoneId, THREE.CanvasTexture>();

function getOrCreateTexture(zoneId: ZoneId): THREE.CanvasTexture {
  let tex = zoneTextures.get(zoneId);
  if (tex) return tex;
  const compositor = getCompositor(zoneId);
  tex = new THREE.CanvasTexture(compositor.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  zoneTextures.set(zoneId, tex);
  return tex;
}

export function useZoneTexture(zoneId: ZoneId): THREE.CanvasTexture {
  const layers = useDesignStore((s) => s.zones[zoneId].layers);
  const [texture] = useState(() => getOrCreateTexture(zoneId));

  useEffect(() => {
    const compositor = getCompositor(zoneId);
    let cancelled = false;
    compositor.render(layers).then(() => {
      if (cancelled) return;
      texture.needsUpdate = true;
    });
    return () => {
      cancelled = true;
    };
  }, [layers, zoneId, texture]);

  return texture;
}
