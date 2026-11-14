import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AccumulativeShadows, RandomizedLight } from '@react-three/drei';
import * as THREE from 'three';
import { useUIStore } from '../../state/uiStore';
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

/** Accumulated floor shadow: blend window (frames) while something moves —
 *  short, so the shadow follows. Once everything is still the window grows
 *  with every sample (a true running average, so the noisy moving-phase
 *  samples fade out) for SHADOW_BLEND_STILL frames. */
const SHADOW_BLEND_MOVING = 10;
const SHADOW_BLEND_STILL = 200;
/** Frames the short window is kept after the last change. */
const SHADOW_MOVING_FRAMES = 12;
/** Share of the floor's light from the open sky dome (contact darkening);
 *  the rest comes from the softboxes by energy. */
const SHADOW_SKY = 0.25;
/** What an unoccluded floor point actually sums to per channel (measured;
 *  a bit under 1 since the lights aim at the origin, not at each point). */
const SHADOW_OPEN = 0.86;
/** Darkening per occluded share (the thin bike blocks only part of the
 *  softboxes, so the plain share reads too faint next to Blender's). */
const SHADOW_GAIN = 2;

const BILINEAR = /* glsl */ `
vec4 bilinear(sampler2D m, vec2 uv) {
  ivec2 n = textureSize(m, 0) - 1;
  vec2 p = uv * vec2(textureSize(m, 0)) - 0.5;
  vec2 f = fract(p);
  ivec2 i = ivec2(floor(p));
  vec4 a = texelFetch(m, clamp(i, ivec2(0), n), 0);
  vec4 b = texelFetch(m, clamp(i + ivec2(1, 0), ivec2(0), n), 0);
  vec4 c = texelFetch(m, clamp(i + ivec2(0, 1), ivec2(0), n), 0);
  vec4 d = texelFetch(m, clamp(i + ivec2(1, 1), ivec2(0), n), 0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

/** Whether the floor shadow is still converging (read by the thumbnail
 *  script so it never captures a half-accumulated shadow). */
let shadowAccumulating = true;
export function shadowSettled(): boolean {
  return !shadowAccumulating;
}

type ShadowApi = {
  blend: number;
  count: number;
  reset(): void;
  update(frames?: number): void;
  getMesh(): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
};

/**
 * Soft studio shadow on the floor, fixed in the studio: drei's
 * AccumulativeShadows averages many shadow maps of randomised directional
 * lights spread over each softbox (weighted by its energy) and over a wide
 * patch of sky overhead (contact darkening) into a lightmap on a floor plane. Each light is
 * scaled by its Lambert term so an unoccluded floor point sums to about 1
 * per channel; with alphaTest = 3 × that the plane's alpha is the occluded share.
 * The accumulation restarts whenever a shadow caster moves (turntable, spinning
 * wheel) or the casters change (variant, wheel designer, rim geometry).
 */
function FloorShadow() {
  const ref = useRef<ShadowApi>(null);
  const scene = useThree((s) => s.scene);
  const last = useRef({ structure: 0, pose: 0, moving: 0 });
  const patched = useRef<ShadowApi | null>(null);

  useFrame(() => {
    const api = ref.current;
    if (!api) return;
    if (patched.current !== api) {
      // The lightmap's Lambert pass would also pick up scene.environment as
      // unshadowed ambient light, which the alpha mapping can't tell apart.
      const update = api.update;
      api.update = (frames) => {
        const env = scene.environment;
        scene.environment = null;
        update(frames);
        scene.environment = env;
      };
      // Alpha = gain × occluded share, capped at 1 (opacity carries the gain);
      // the lightmap (nearest-filtered) is read bilinearly so it isn't blocky.
      const mat = api.getMesh().material;
      mat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader
          .replace('void main', BILINEAR + 'void main')
          .replace('texture2D(map, vUv)', 'bilinear(map, vUv)')
          .replace('* opacity);', '* opacity);\n gl_FragColor.a = min(gl_FragColor.a, 1.0);');
      };
      mat.needsUpdate = true;
      patched.current = api;
    }
    let structure = 0;
    let pose = 0;
    scene.traverseVisible((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.castShadow) return;
      structure += m.id * 7919 + m.geometry.id;
      const e = m.matrixWorld.elements;
      for (let i = 0; i < 16; i++) pose += e[i] * (i + 1);
    });
    const s = last.current;
    if (structure !== s.structure) {
      // Other casters: the lightmap pass must re-collect the scene's meshes.
      api.reset();
      s.moving = SHADOW_MOVING_FRAMES;
    } else if (pose !== s.pose) {
      s.moving = SHADOW_MOVING_FRAMES;
    }
    s.structure = structure;
    s.pose = pose;
    if (s.moving > 0) {
      s.moving--;
      api.count = 0; // (re)start accumulating
    }
    api.blend = s.moving > 0 ? SHADOW_BLEND_MOVING : Math.max(SHADOW_BLEND_MOVING, api.count + 1);
    shadowAccumulating = s.moving > 0 || api.count < SHADOW_BLEND_STILL;
  });

  const origin = new THREE.Vector3(CENTER.x, FLOOR_Y + 0.002, 0);
  const total = SOFTBOXES.reduce((a, b) => a + b.energy, 0);
  return (
    <AccumulativeShadows
      ref={ref as never}
      temporal
      frames={SHADOW_BLEND_STILL}
      position={origin}
      scale={3.6}
      resolution={2048}
      alphaTest={3 * SHADOW_OPEN}
      opacity={SHADOW_GAIN}
      color="#000000"
    >
      {SOFTBOXES.map((b, i) => {
        const p = b.pos.clone().sub(origin);
        // Lambert term on the floor (a directional light aims at the world origin).
        const cos = b.pos.y / b.pos.length();
        return (
          <RandomizedLight
            key={i}
            position={[p.x, p.y, p.z]}
            // One light per softbox: each shadow map is a texture unit in
            // every material compiled while they're on.
            amount={1}
            radius={Math.max(b.w, b.h) * 0.6}
            intensity={(Math.PI * (1 - SHADOW_SKY) * b.energy) / total / cos}
            ambient={0}
            size={1.4}
            near={0.5}
            far={8}
            mapSize={1024}
            bias={0.0005}
          />
        );
      })}
      {/* Sky: a wide patch overhead (no grazing samples — they streak). */}
      <RandomizedLight
        position={[0, 3, 0]}
        amount={1}
        radius={4}
        ambient={0}
        intensity={(Math.PI * SHADOW_SKY) / 0.9}
        size={1.4}
        near={0.5}
        far={8}
        mapSize={1024}
        bias={0.0005}
      />
    </AccumulativeShadows>
  );
}

/** Backdrop self-glow in the path-traced still (see the cyclorama below). */
const PT_BACKDROP_GLOW = 0.12;

/**
 * The reflection environment: the white studio (cyclorama + the five softbox
 * panels) baked in Blender from the bike's centre as an equirect Radiance HDR
 * (blender/bake_studio_hdri.py; three's equirect orientation, so no turn).
 * The path tracer doesn't use it: it traces the real cyclorama and softbox
 * lights the HDRI was baked from (using both would count them twice).
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
 * and the accumulated soft floor shadow (FloorShadow).
 * The baked studio HDRI (STUDIO_HDRI) goes through PMREM into
 * scene.environment so glossy/metallic paint reflects the softboxes.
 * Everything here is fixed in world space; only the bike turns (see Turntable).
 */
export function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const cyclo = useMemo(() => cycloramaGeometry(), []);
  // Path-traced still: real area light only (no raster helpers).
  const tracing = useUIStore((s) => s.pathTrace);

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
          brightening the bike, while the key shadow still reads on it. The
          path tracer has no environment light on it, so it gets more. */}
      <mesh geometry={cyclo}>
        <meshStandardMaterial
          color={BACKDROP_COLOR}
          emissive={BACKDROP_COLOR}
          emissiveIntensity={tracing ? PT_BACKDROP_GLOW : 0.06}
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
          intensity={i === 0 && !tracing ? b.radiance * KEY_AREA_SHARE : b.radiance}
          onUpdate={(l) => l.lookAt(CENTER)}
        />
      ))}

      {!tracing && <FloorShadow />}

      {/* The bike's self-shadow (tube on tube): along the key, aimed at the
          bike centre, PCF-softened. The floor takes FloorShadow instead. */}
      <directionalLight
        visible={!tracing}
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
