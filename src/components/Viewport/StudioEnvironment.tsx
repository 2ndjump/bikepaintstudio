import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

/** Studio floor height (metres); the bike's tires stand on it. */
export const FLOOR_Y = -0.266;

/** Blender studio coords (x fwd, y away from the side camera, z up, floor at
 *  z = 0) → scene coords (x fwd, y up, z toward the camera). */
const fromBlender = (x: number, y: number, z: number) => new THREE.Vector3(x, z + FLOOR_Y, -y);

/** What the lights aim at (Blender `studio(center)`). */
const CENTER = fromBlender(0.09, 0, 0.42);

/** White cyclorama paint (Blender's is near-black). */
export const BACKDROP_COLOR = '#f6f7f9';

/** Radiance per Blender watt per m² of panel — the one global light knob. */
const LIGHT_SCALE = 0.033;
/** Share of the key softbox left to its RectAreaLight; the rest of its
 *  diffuse light comes from the directional light so it can cast the shadow. */
const KEY_AREA_SHARE = 0.2;

/**
 * The Blender rig (build_studio.py): name, panel size (m), position, energy (W).
 * Radiance ∝ energy / area keeps their relative strengths.
 */
const SOFTBOXES = [
  { w: 1.6, h: 1.1, pos: fromBlender(-1.2, -2.6, 2.0), energy: 260 }, // key, front-left
  { w: 2.5, h: 1.5, pos: fromBlender(2.6, -2.2, 0.8), energy: 50 }, // fill, front-right
  { w: 3.0, h: 0.35, pos: fromBlender(0.1, -0.6, 2.6), energy: 140 }, // overhead strip
  { w: 0.35, h: 2.2, pos: fromBlender(-2.6, 1.6, 1.4), energy: 160 }, // rim, back-left
  { w: 0.35, h: 2.2, pos: fromBlender(2.8, 1.6, 1.4), energy: 160 }, // rim, back-right
].map((b) => ({ ...b, radiance: (LIGHT_SCALE * b.energy) / (b.w * b.h) }));

/** Cyclorama: flat floor sweeping up into the back wall (Blender profile). */
function cycloramaGeometry(): THREE.BufferGeometry {
  const floorBack = 1.2;
  const r = 1.4;
  const prof: [number, number][] = [[-6, 0], [floorBack, 0]]; // (Blender y, height)
  for (let k = 1; k <= 24; k++) {
    const a = ((Math.PI / 2) * k) / 24;
    prof.push([floorBack + Math.sin(a) * r, r - Math.cos(a) * r]);
  }
  prof.push([floorBack + r, 5]);
  const pos: number[] = [];
  for (const [y, h] of prof) pos.push(-7, FLOOR_Y + h, -y, 7, FLOOR_Y + h, -y);
  const idx: number[] = [];
  for (let j = 0; j < prof.length - 1; j++) {
    const a = 2 * j;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Bright white product studio, a web port of the Blender studio: a visible
 * cyclorama, the five softboxes as RectAreaLights (no shadows), and one
 * shadow-casting directional light along the key for the contact shadow.
 * A copy of the studio (backdrop + glowing softbox panels, open front kept
 * darker for contrast) is rendered through PMREM into scene.environment so
 * glossy/metallic paint reflects the softboxes. Everything here is fixed in
 * world space; only the bike turns (see Turntable).
 */
export function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const cyclo = useMemo(() => cycloramaGeometry(), []);

  useEffect(() => () => cyclo.dispose(), [cyclo]);

  useEffect(() => {
    const env = new THREE.Scene();
    // Dim backdrop + darker open front keep reflections contrasty (black
    // paint stays black); the softbox panels glow at their light's radiance.
    env.background = new THREE.Color(0.018, 0.018, 0.02);
    const backdropMat = new THREE.MeshBasicMaterial({ color: BACKDROP_COLOR, side: THREE.DoubleSide });
    backdropMat.color.multiplyScalar(0.22);
    env.add(new THREE.Mesh(cyclo, backdropMat));
    const panelGeo = new THREE.PlaneGeometry(1, 1);
    const panelMats = SOFTBOXES.map((b) => {
      const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      m.color.setScalar(b.radiance);
      const panel = new THREE.Mesh(panelGeo, m);
      panel.position.copy(b.pos);
      panel.scale.set(b.w, b.h, 1);
      panel.lookAt(CENTER);
      env.add(panel);
      return m;
    });

    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(env, 0, 0.05, 50, { position: CENTER });
    scene.environment = rt.texture;
    pmrem.dispose();
    backdropMat.dispose();
    panelGeo.dispose();
    panelMats.forEach((m) => m.dispose());

    return () => {
      scene.environment = null;
      rt.dispose();
    };
  }, [gl, scene, cyclo]);

  const key = SOFTBOXES[0].pos;

  return (
    <>
      {/* A touch of emissive lifts the backdrop to clean white without
          brightening the bike, while the key shadow still reads on it. */}
      <mesh geometry={cyclo} receiveShadow>
        <meshStandardMaterial
          color={BACKDROP_COLOR}
          emissive={BACKDROP_COLOR}
          emissiveIntensity={0.06}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {SOFTBOXES.map((b, i) => (
        <rectAreaLight
          key={i}
          position={b.pos}
          width={b.w}
          height={b.h}
          intensity={i === 0 ? b.radiance * KEY_AREA_SHARE : b.radiance}
          onUpdate={(l) => l.lookAt(CENTER)}
        />
      ))}

      {/* The only shadow map: along the key, aimed at the bike centre. */}
      <directionalLight
        intensity={2.0}
        position={[key.x - CENTER.x, key.y - CENTER.y, key.z - CENTER.z]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-near={0.1}
        shadow-camera-far={8}
        shadow-camera-left={-1.6}
        shadow-camera-right={1.6}
        shadow-camera-top={1.6}
        shadow-camera-bottom={-1.6}
      />
    </>
  );
}
