import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { BikeFrame } from './BikeFrame';
import { BACKDROP_COLOR, FLOOR_Y, StudioEnvironment } from './StudioEnvironment';
import { DividerHandles } from './DividerHandles';
import { EditControls } from './EditControls';
import { Turntable } from './Turntable';
import { Wheel } from './Wheel';
import { ALL_VARIANTS, useBikeModel, variantUrl } from '../../geometry/bikeModel';
import { Suspense, useEffect } from 'react';
import { useUIStore } from '../../state/uiStore';
import { useDesignStore } from '../../state/designStore';
import { syncDividerUniforms, syncDividerPatterns } from '../../rendering/dividers';

function DebugExpose() {
  const state = useThree();
  useEffect(() => {
    (window as unknown as { __r3f: unknown }).__r3f = state;
  }, [state]);
  return null;
}

/** Width the bike needs (incl. turntable swing), as a multiple of the canvas
 *  height at camera zoom 1 — below that, the view zooms out to fit. */
const FIT_ASPECT = 1.2;

/**
 * Keep the subject centred and fully visible in the free area between the
 * floating panels (elements marked `data-overlay="left|right|top"`): the
 * projection's centre is shifted onto that area (setViewOffset) and the view
 * zooms out when the area is narrower than FIT_ASPECT × its height.
 */
function ViewFit() {
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const update = () => {
      const { camera, gl } = get() as { camera: THREE.PerspectiveCamera; gl: THREE.WebGLRenderer };
      const c = gl.domElement.getBoundingClientRect();
      const W = size.width;
      const H = size.height;
      let left = 0;
      let right = W;
      let top = 0;
      document.querySelectorAll<HTMLElement>('[data-overlay]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0) return; // hidden (e.g. the right panel below lg)
        const side = el.dataset.overlay;
        if (side === 'left') left = Math.max(left, r.right - c.left);
        else if (side === 'right') right = Math.min(right, r.left - c.left);
        else if (side === 'top') top = Math.max(top, r.bottom - c.top);
      });
      const fw = Math.max(1, right - left);
      const fh = Math.max(1, H - top);
      camera.setViewOffset(W, H, W / 2 - (left + right) / 2, H / 2 - (top + H) / 2, W, H);
      camera.zoom = Math.min(1, fw / (FIT_ASPECT * H), fh / H);
      camera.updateProjectionMatrix();
    };
    update();
    const ro = new ResizeObserver(update);
    document.querySelectorAll('[data-overlay]').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [size, get]);

  return null;
}

/** Push the global colour dividers into the shared shader uniforms. */
function DividerSync() {
  const dividers = useDesignStore((s) => s.dividers);
  useEffect(() => {
    syncDividerUniforms(dividers);
    syncDividerPatterns(dividers);
  }, [dividers]);
  return null;
}

/**
 * The selected variant's bike on the turntable: Blender frameset + procedural
 * wheels at its hubs, standing on the studio floor. Suspends while the GLB loads.
 */
function Bike() {
  const variant = useDesignStore((s) => s.variant);
  const model = useBikeModel(variant);
  const { frontHub, rearHub } = model;

  // Fetch the other variants once the first bike is up, so switching is instant.
  useEffect(() => {
    ALL_VARIANTS.forEach((v) => useGLTF.preload(variantUrl(v)));
  }, []);

  return (
    <Turntable axisX={(frontHub.x + rearHub.x) / 2}>
      <DividerHandles />
      <group position={[0, FLOOR_Y, 0]}>
        <BikeFrame model={model} />
        <Wheel
          position={[frontHub.x, frontHub.y, frontHub.z]}
          zone="frontRim"
          tireWidth={model.tireWidth / 2}
          wheelRadius={model.wheelRadius}
          hubHalf={model.hubHalfFront}
        />
        <Wheel
          position={[rearHub.x, rearHub.y, rearHub.z]}
          zone="rearRim"
          tireWidth={model.tireWidth / 2}
          wheelRadius={model.wheelRadius}
          hubHalf={model.hubHalfRear}
        />
      </group>
    </Turntable>
  );
}

export function Viewport() {
  const tool = useUIStore((s) => s.tool);

  return (
    <Canvas
      shadows="soft"
      // Straight at the back wall; the bike's start angle gives the 3/4 view.
      camera={{ position: [0.09, 0.75, 2.48], fov: 33 }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        // Khronos PBR Neutral instead of ACES: in the bright white studio ACES
        // washed saturated paint out (red → pink) and greyed the white backdrop;
        // Neutral keeps the picked colours true and only rolls off highlights.
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1.0,
      }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[BACKDROP_COLOR]} />

      {/* Fixed studio: cyclorama, softbox lights, reflection environment. */}
      <StudioEnvironment />

      <DebugExpose />
      <ViewFit />
      <DividerSync />
      <EditControls />
      <Suspense fallback={null}>
        <Bike />
      </Suspense>

      {/* The studio stays put: the camera only zooms, pans and tilts within
          limits (azimuth locked straight at the back wall); horizontal
          rotate-drag spins the bike instead (Turntable). */}
      <OrbitControls
        makeDefault
        enabled={tool === 'camera'}
        enablePan
        minDistance={0.5}
        maxDistance={6}
        minAzimuthAngle={0}
        maxAzimuthAngle={0}
        minPolarAngle={0.9}
        maxPolarAngle={1.62}
        target={[0.09, 0.32, 0]}
        // Swap drag/turn: left mouse pans (drag), right mouse rotates (turn).
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
    </Canvas>
  );
}
