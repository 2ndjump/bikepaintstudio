import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
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

  return (
    <Canvas
      shadows
      camera={{ position: [1.5, 0.9, 2.2], fov: 35 }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.NoToneMapping,
      }}
      dpr={[1, 2]}
    >
      {solidColor && <color attach="background" args={[solidColor]} />}

      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 2]} intensity={0.9} />
      <directionalLight position={[-2, 3, -4]} intensity={0.3} />

      <Environment preset="studio" background={useHdriBackground} environmentIntensity={1.0} />

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

      <OrbitControls
        makeDefault
        enablePan
        minDistance={0.8}
        maxDistance={20}
        target={[0.1, 0.3, 0]}
      />
    </Canvas>
  );
}
