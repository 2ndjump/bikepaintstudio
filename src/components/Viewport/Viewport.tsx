import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { BikeFrame } from './BikeFrame';
import { BACKDROP_COLOR, StudioEnvironment } from './StudioEnvironment';
import { DividerHandles } from './DividerHandles';
import { EditControls } from './EditControls';
import { Turntable } from './Turntable';
import { Wheel } from './Wheel';
import { ROAD_GEO } from '../../geometry/frame';
import { FRONT_HUB, REAR_HUB } from '../../geometry/frameModel';
import { useEffect } from 'react';
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

/** Push the global colour dividers into the shared shader uniforms. */
function DividerSync() {
  const dividers = useDesignStore((s) => s.dividers);
  useEffect(() => {
    syncDividerUniforms(dividers);
    syncDividerPatterns(dividers);
  }, [dividers]);
  return null;
}

export function Viewport() {
  const tool = useUIStore((s) => s.tool);
  const geo = ROAD_GEO;

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
      <DividerSync />
      <EditControls />
      <Turntable>
        <DividerHandles />
        <BikeFrame />
        <Wheel
          position={[FRONT_HUB.x, FRONT_HUB.y, FRONT_HUB.z]}
          zone="frontRim"
          tireWidth={geo.tireWidth}
          wheelRadius={geo.wheelRadius}
        />
        <Wheel
          position={[REAR_HUB.x, REAR_HUB.y, REAR_HUB.z]}
          zone="rearRim"
          tireWidth={geo.tireWidth}
          wheelRadius={geo.wheelRadius}
        />
      </Turntable>

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
