import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FRAME_ZONES, type BikeModel, type FrameZone } from '../../geometry/bikeModel';
import { useDesignStore } from '../../state/designStore';
import { useUIStore } from '../../state/uiStore';
import { pointerState } from './viewportBridge';

const HOVER_OPACITY = 0.14;
const FLASH_OPACITY = 0.4;
const FLASH_SECONDS = 0.7;

/**
 * Selection feedback on the frame: a faint tint on the part under the pointer
 * (it's clickable) and a short flash on the part that just became active.
 * Kept off otherwise so the paint is always judged untinted.
 */
export function ZoneHighlight({ model }: { model: BikeModel }) {
  const activeZone = useDesignStore((s) => s.activeZone);
  const hover = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.Mesh>(null);
  const flashT = useRef(0);
  const seen = useRef(activeZone);
  useEffect(() => {
    if (seen.current !== activeZone) flashT.current = FLASH_SECONDS;
    seen.current = activeZone;
  }, [activeZone]);

  useFrame((_, dt) => {
    const capturing = useUIStore.getState().capturing;
    const hz = pointerState.hoverZone as FrameZone | null;
    if (hover.current) {
      const on = !capturing && !!hz && FRAME_ZONES.includes(hz);
      hover.current.visible = on;
      if (on) hover.current.geometry = model.zones[hz!];
    }
    if (flash.current) {
      flashT.current = Math.max(0, flashT.current - dt);
      const z = activeZone as FrameZone;
      const on = !capturing && flashT.current > 0 && FRAME_ZONES.includes(z);
      flash.current.visible = on;
      if (on) {
        flash.current.geometry = model.zones[z];
        (flash.current.material as THREE.MeshBasicMaterial).opacity =
          FLASH_OPACITY * (flashT.current / FLASH_SECONDS);
      }
    }
  });

  // Drawn on top of the paint (polygon offset), never written to depth.
  const look = {
    color: '#2457d6',
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  };
  return (
    <>
      <mesh ref={hover} visible={false} renderOrder={2}>
        <meshBasicMaterial {...look} opacity={HOVER_OPACITY} />
      </mesh>
      <mesh ref={flash} visible={false} renderOrder={3}>
        <meshBasicMaterial {...look} />
      </mesh>
    </>
  );
}
