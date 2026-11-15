import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

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

let blobTexture: THREE.CanvasTexture | null = null;
/** A soft black blob fading out to its edge (shared by all floor shadows). */
function getBlobTexture(): THREE.CanvasTexture {
  if (!blobTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    blobTexture = new THREE.CanvasTexture(c);
  }
  return blobTexture;
}

/**
 * Faint static shadow on the floor under the bike or wheel: a stretched soft
 * blob, `length` (x) by `width` (z) metres around `x`, lying on the floor
 * of its parent group (y = 0). Costs nothing per frame; turns with its parent.
 */
export function FloorShadow({ x, length, width }: { x: number; length: number; width: number }) {
  return (
    <mesh position={[x, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[length, width, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={getBlobTexture()} transparent opacity={0.45} depthWrite={false} />
    </mesh>
  );
}

/**
 * The reflection environment: the white studio (cyclorama + the five softbox
 * panels) baked in Blender from the bike's centre as an equirect Radiance HDR
 * (blender/bake_studio_hdri.py; three's equirect orientation, so no turn).
 */
const STUDIO_HDRI = 'assets/hdri/studio_2k.hdr';
/** Turn (about +y) and strength of the HDRI: 0.3 puts the softbox panels near
 *  the RectAreaLights' radiance and keeps black paint black. */
const HDRI_ROTATION = 0;
const HDRI_INTENSITY = 0.3;

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
 * cyclorama, the five softboxes as RectAreaLights (no shadows), one
 * shadow-casting directional light along the key for the bike's self-shadow
 * and no floor shadow of its own (see FloorShadow, placed under the bike).
 * The baked studio HDRI (STUDIO_HDRI) goes through PMREM into
 * scene.environment so glossy/metallic paint reflects the softboxes.
 * Everything here is fixed in world space; only the bike turns (see Turntable).
 */
export function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const cyclo = useMemo(() => cycloramaGeometry(), []);

  useEffect(() => () => cyclo.dispose(), [cyclo]);

  useEffect(() => {
    let rt: THREE.WebGLRenderTarget | null = null;
    let hdr: THREE.Texture | null = null;
    let disposed = false;
    new HDRLoader().load(`${import.meta.env.BASE_URL}${STUDIO_HDRI}`, (tex) => {
      if (disposed) return tex.dispose();
      tex.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(gl);
      rt = pmrem.fromEquirectangular(tex); // 512 px cube faces from the 2k map
      pmrem.dispose();
      hdr = tex;
      scene.environment = rt.texture;
      scene.environmentRotation.set(0, HDRI_ROTATION, 0);
      scene.environmentIntensity = HDRI_INTENSITY;
    });
    return () => {
      disposed = true;
      scene.environment = null;
      rt?.dispose();
      hdr?.dispose();
    };
  }, [gl, scene]);

  const key = SOFTBOXES[0].pos;

  return (
    <>
      {/* A touch of emissive lifts the backdrop to clean white without
          brightening the bike, while the key shadow still reads on it. */}
      <mesh geometry={cyclo}>
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

      {/* The bike's self-shadow (tube on tube): along the key, aimed at the
          bike centre, PCF-softened. */}
      <directionalLight
        intensity={2.0}
        position={[key.x - CENTER.x, key.y - CENTER.y, key.z - CENTER.z]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-radius={6}
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
