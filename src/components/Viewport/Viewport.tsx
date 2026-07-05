import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { BikeFrame } from './BikeFrame';
import { StudioEnvironment } from './StudioEnvironment';
import { Wheel } from './Wheel';
import { ROAD_GEO } from '../../geometry/frame';
import { FRONT_HUB, REAR_HUB } from '../../geometry/frameModel';
import { useEffect } from 'react';
import { useUIStore } from '../../state/uiStore';

const BG_COLORS: Record<'dark' | 'light', string> = {
  dark: '#0e0f12', // studio spec flat background
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
  const solidColor = BG_COLORS[background];

  // Ground plane sits at the bottom of the wheels.
  const groundY = REAR_HUB.y - geo.wheelRadius - 0.002;

  return (
    <Canvas
      shadows="soft"
      camera={{ position: [1.7, 0.75, 1.9], fov: 33 }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        // Studio paint spec: ACES filmic tone mapping for realistic highlight
        // rolloff on the glossy/metallic reflections.
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[solidColor]} />
      {/* Atmospheric depth. Spec fog (near 1400 / far 3200 mm) is authored for a
          ~400 mm object; scaled proportionally to this metre-scale bike + camera
          distance so the bike stays clear and only the ground rim fades to bg. */}
      <fog attach="fog" args={[solidColor, 3.8, 8.8]} />

      {/* Studio light rig (based on the spec). Physically-correct light units
          (r155+); directional intensities are scale-independent, positions keep
          the spec's direction. The key is pushed out along its direction so its
          shadow-camera frustum comfortably covers the whole bike.
          Deviation from the raw spec (approved): the hemisphere sky is
          neutralised (was 0x3d4250) and the cool rim dialled back (was 2.51) so
          a neutral base colour reads neutral instead of periwinkle — the cool
          back-left accent + warm fill mood is kept. */}
      <hemisphereLight color={0x4c4e52} groundColor={0x0a0a0c} intensity={2.1} />
      <directionalLight
        color={0xffffff}
        intensity={3.0}
        position={[1.15, 1.43, 1.32]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-near={0.1}
        shadow-camera-far={6}
        shadow-camera-left={-1.6}
        shadow-camera-right={1.6}
        shadow-camera-top={1.6}
        shadow-camera-bottom={-1.6}
      />
      <directionalLight color={0xd9e6ff} intensity={1.0} position={[-0.5, 0.26, -0.42]} />
      <directionalLight color={0xffe7c4} intensity={1.4} position={[-0.26, -0.08, 0.46]} />

      <StudioEnvironment />

      <DebugExpose />
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

      {/* Invisible shadow-catcher floor: a ShadowMaterial circle that shows only
          the key light's soft cast shadow (spec: opacity 0.38). Radius scaled
          from the spec's 900 mm to this scene. */}
      <mesh position={[0.09, groundY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.5, 64]} />
        <shadowMaterial opacity={0.38} />
      </mesh>

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
