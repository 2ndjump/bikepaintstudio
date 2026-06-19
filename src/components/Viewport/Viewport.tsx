import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { BikeFrame } from './BikeFrame';
import { Wheel } from './Wheel';
import { buildBikeFrame, ROAD_GEO } from '../../geometry/frame';
import { useEffect, useMemo } from 'react';
import { useUIStore } from '../../state/uiStore';

const BG_COLORS: Record<'dark' | 'light', string> = {
  dark: '#0b0d11',
  light: '#f2f3f5',
};

function DebugExpose() {
  const state = useThree();
  useEffect(() => {
    (window as unknown as { __r3f: unknown }).__r3f = state;
  }, [state]);
  return null;
}

export function Viewport() {
  const background = useUIStore((s) => s.background);
  const geo = ROAD_GEO;
  const frame = useMemo(() => buildBikeFrame(geo), [geo]);
  const useHdriBackground = background === 'studio';
  const solidColor = useHdriBackground ? null : BG_COLORS[background];
  const shadowOpacity = background === 'light' ? 0.35 : 0.5;

  // Ground plane sits at the bottom of the wheels.
  const groundY = frame.rearHub.y - geo.wheelRadius - 0.002;

  return (
    <Canvas
      shadows
      camera={{ position: [1.7, 0.75, 1.9], fov: 33 }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        // Khronos PBR-neutral: realistic highlight rolloff with accurate
        // mid-tone colors — exactly what a paint configurator needs.
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1.0,
      }}
      dpr={[1, 2]}
    >
      {solidColor && <color attach="background" args={[solidColor]} />}

      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 2]} intensity={0.7} />
      <directionalLight position={[-2.5, 3, -3.5]} intensity={0.25} />
      {/* Ground bounce: lifts downward-facing surfaces (crown shoulder, BB
          shell underside) so they don't read as black holes. */}
      <directionalLight position={[0.5, -3, 1]} intensity={0.18} />

      <Environment preset="studio" background={useHdriBackground} environmentIntensity={0.7} />

      <DebugExpose />
      <BikeFrame geo={geo} />
      <Wheel
        position={[frame.frontHub.x, frame.frontHub.y, frame.frontHub.z]}
        zone="frontRim"
        tireWidth={geo.tireWidth}
        wheelRadius={geo.wheelRadius}
      />
      <Wheel
        position={[frame.rearHub.x, frame.rearHub.y, frame.rearHub.z]}
        zone="rearRim"
        tireWidth={geo.tireWidth}
        wheelRadius={geo.wheelRadius}
      />

      {/* Soft grounding shadow (no shadow-map = no tube self-shadow seams). */}
      <ContactShadows
        position={[0.09, groundY, 0]}
        opacity={shadowOpacity}
        scale={3.2}
        blur={2.4}
        far={0.9}
        resolution={512}
      />

      <OrbitControls
        makeDefault
        enablePan
        minDistance={0.5}
        maxDistance={20}
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
