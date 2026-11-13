import { useEffect, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { dividerUniforms } from '../../rendering/dividers';
import { useUIStore } from '../../state/uiStore';

/** Start angle: the 3/4 view the orbit camera used to open with. */
const START_YAW = -0.7;

/**
 * Turntable for the bike inside the fixed studio. With the camera tool, a
 * horizontal rotate-drag (right mouse / one finger) spins the bike about the
 * vertical axis through x = axisX (the middle of the wheelbase, metres);
 * OrbitControls keeps zoom, pan and the vertical tilt (its azimuth is locked
 * in Viewport). Children live in bike space — at angle 0 exactly the world
 * space — and the inverse transform is published to the divider shader so
 * dividers stay glued to the frame.
 */
export function Turntable({
  axisX,
  enabled = true,
  children,
}: {
  axisX: number;
  /** false while the bike is hidden (wheel designer): drags don't spin it. */
  enabled?: boolean;
  children: ReactNode;
}) {
  const spin = useRef<THREE.Group>(null);
  const bike = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const tool = useUIStore((s) => s.tool);

  useEffect(() => {
    if (tool !== 'camera' || !enabled) return;
    const dom = gl.domElement;
    let lastX: number | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button === 2 || (e.pointerType === 'touch' && e.isPrimary)) lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (lastX === null || !spin.current || !e.isPrimary) return;
      // Same speed as OrbitControls' rotate: a full canvas height = one turn.
      spin.current.rotation.y += (2 * Math.PI * (e.clientX - lastX)) / dom.clientHeight;
      lastX = e.clientX;
    };
    const onUp = () => {
      lastX = null;
    };
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [tool, gl, enabled]);

  useFrame(() => {
    if (!bike.current) return;
    bike.current.updateWorldMatrix(true, false);
    dividerUniforms.uDivBikeInv.value.copy(bike.current.matrixWorld).invert();
  });

  return (
    <group ref={spin} position={[axisX, 0, 0]} rotation={[0, START_YAW, 0]}>
      <group ref={bike} position={[-axisX, 0, 0]}>
        {children}
      </group>
    </group>
  );
}
