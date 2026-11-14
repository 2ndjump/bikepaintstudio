import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { BikeModel } from '../../geometry/bikeModel';
import type { RimZone } from '../../state/types';
import { useUIStore } from '../../state/uiStore';
import { FLOOR_Y } from './StudioEnvironment';
import { Wheel } from './Wheel';

/** Where the preview wheel stands (x) and how far the camera sits from it. */
const STAGE_X = 0.09;
const CAMERA_DIST = 1.7;
/** Auto-spin speed (rad/s): one turn in ~16 s, slow enough to read decals. */
const SPIN_SPEED = 0.4;

/**
 * Wheel designer preview: the selected wheel alone, standing face-on in the
 * studio and slowly rolling. Dragging on the canvas turns it about its axle
 * (grab-and-turn around the hub). The camera is moved to face the wheel while
 * the stage is mounted and put back afterwards. Same Wheel component and zone
 * material as on the bike, so both always show the same paint.
 */
export function WheelStage({ zone, model }: { zone: RimZone; model: BikeModel }) {
  const spin = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const playing = useUIStore((s) => s.wheelSpin);
  const get = useThree((s) => s.get);
  const hubY = FLOOR_Y + model.wheelRadius;

  // Face the wheel; restore the bike view on leave.
  useEffect(() => {
    const { camera, controls } = get() as unknown as {
      camera: THREE.Camera;
      controls: { target: THREE.Vector3; update(): void } | null;
    };
    if (!controls) return;
    const prevPos = camera.position.clone();
    const prevTarget = controls.target.clone();
    camera.position.set(STAGE_X, hubY + 0.04, CAMERA_DIST);
    controls.target.set(STAGE_X, hubY, 0);
    controls.update();
    return () => {
      camera.position.copy(prevPos);
      controls.target.copy(prevTarget);
      controls.update();
    };
  }, [get, hubY]);

  // Grab-and-turn: the wheel follows the pointer's angle around the hub.
  useEffect(() => {
    const { gl, camera } = get();
    const dom = gl.domElement;
    let last: number | null = null;
    const hubAngle = (e: PointerEvent) => {
      const p = new THREE.Vector3(STAGE_X, hubY, 0).project(camera);
      const r = dom.getBoundingClientRect();
      const hx = r.left + (p.x * 0.5 + 0.5) * r.width;
      const hy = r.top + (-p.y * 0.5 + 0.5) * r.height;
      return Math.atan2(-(e.clientY - hy), e.clientX - hx); // y up, like the wheel
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      last = hubAngle(e);
      dragging.current = true;
    };
    const onMove = (e: PointerEvent) => {
      if (last === null || !spin.current) return;
      const a = hubAngle(e);
      let d = a - last;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      spin.current.rotation.z += d;
      last = a;
    };
    const onUp = () => {
      last = null;
      dragging.current = false;
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    dom.addEventListener('contextmenu', onContextMenu);
    dom.style.cursor = 'grab';
    return () => {
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dom.removeEventListener('contextmenu', onContextMenu);
      dom.style.cursor = '';
    };
  }, [get, hubY]);

  useFrame((_, dt) => {
    // Clockwise seen from the camera = rolling forward (towards +x).
    const hold = dragging.current || useUIStore.getState().spinHold;
    if (playing && !hold && spin.current) spin.current.rotation.z -= dt * SPIN_SPEED;
  });

  return (
    <group position={[STAGE_X, hubY, 0]}>
      <group ref={spin}>
        <Wheel
          position={[0, 0, 0]}
          zone={zone}
          tireWidth={model.tireWidth / 2}
          wheelRadius={model.wheelRadius}
          hubHalf={zone === 'frontRim' ? model.hubHalfFront : model.hubHalfRear}
        />
      </group>
    </group>
  );
}
