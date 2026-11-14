import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { WebGLPathTracer } from 'three-gpu-pathtracer';
import { useDesignStore } from '../../state/designStore';
import { useUIStore } from '../../state/uiStore';
import { createDividerBakeMaterial } from '../../rendering/dividers';
import { DEFAULT_CHAMELEON_COLORS, type ZoneId } from '../../state/types';

/** Samples after which the image counts as converged and tracing stops. */
const MAX_SAMPLES = 1000;
/** Resolution of the per-zone baked paint (and of the tracer's texture array). */
const BAKE_SIZE = 2048;
/** Exposure of the traced image: without the raster view's environment
 *  light the studio comes out darker. */
const PT_EXPOSURE = 1.35;
/** Where the tracer's escaping rays end up (Blender's near-black world). */
const PT_BACKGROUND = new THREE.Color(0.008, 0.008, 0.009);

/** Why path tracing can't run on this renderer, or null. */
export function pathTraceUnsupported(gl: THREE.WebGLRenderer): string | null {
  if (!gl.capabilities.isWebGL2) return 'WebGL 2';
  if (!gl.extensions.has('EXT_color_buffer_float')) return 'EXT_color_buffer_float';
  return null;
}

/** UV bounds of a geometry as (min u, min v, size u, size v). */
function uvRect(geo: THREE.BufferGeometry): THREE.Vector4 {
  const uv = geo.getAttribute('uv');
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    u0 = Math.min(u0, u); u1 = Math.max(u1, u);
    v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  return new THREE.Vector4(u0, v0, Math.max(1e-6, u1 - u0), Math.max(1e-6, v1 - v0));
}

/**
 * Bake a frame zone's base colour with its dividers (the live shader's
 * onBeforeCompile code, which the tracer can't run) into a texture that
 * spans the mesh's whole UV rectangle. Drawn 9× with sub-texel offsets so
 * the islands are dilated and bilinear lookups at their edges stay clean.
 */
function bakeZone(gl: THREE.WebGLRenderer, mesh: THREE.Mesh, map: THREE.Texture, coverage: THREE.Texture) {
  const rect = uvRect(mesh.geometry);
  const target = new THREE.WebGLRenderTarget(BAKE_SIZE, BAKE_SIZE, { type: THREE.HalfFloatType });
  const mat = createDividerBakeMaterial(map, coverage, rect);
  const bakeMesh = new THREE.Mesh(mesh.geometry, mat);
  mesh.updateWorldMatrix(true, false);
  bakeMesh.matrixAutoUpdate = false;
  bakeMesh.matrixWorld.copy(mesh.matrixWorld);
  bakeMesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.matrixWorldAutoUpdate = false;
  scene.add(bakeMesh);
  const cam = new THREE.Camera();
  const prevTarget = gl.getRenderTarget();
  const prevClear = gl.getClearColor(new THREE.Color());
  const prevAlpha = gl.getClearAlpha();
  gl.setRenderTarget(target);
  gl.setClearColor(0x000000, 1);
  gl.clear();
  const px = 3 / BAKE_SIZE; // clip-space size of 1.5 texels
  for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [0, 0]]) {
    mat.uniforms.uOffset.value.set(x * px, y * px);
    gl.render(scene, cam);
  }
  gl.setRenderTarget(prevTarget);
  gl.setClearColor(prevClear, prevAlpha);
  mat.dispose();
  // Same UVs as the live mesh: the texture transform maps the rectangle back.
  target.texture.repeat.set(1 / rect.z, 1 / rect.w);
  target.texture.offset.set(-rect.x / rect.z, -rect.y / rect.w);
  return target;
}

/**
 * Path-traced still of the current view (three-gpu-pathtracer), switched on
 * by the toolbar's Render button (uiStore.pathTrace). While on it takes over
 * drawing (the composer is disabled in Viewport) and converges sample by
 * sample; anything that changes the view or the design switches it off and
 * the raster view is back the next frame.
 *
 * The scene is traced as it is (cyclorama, softbox RectAreaLights, the bike)
 * with these swaps for its duration: the painted zones get MeshPhysical copies
 * whose map is the zone's paint baked with its dividers (see bakeZone), the
 * chameleon flip becomes its mid colour plus a sheen in the grazing colour,
 * the floor shadow plane and the key's raster-only directional light are off
 * (StudioEnvironment) and there is no environment map: the tracer lights
 * the scene with the cyclorama and softbox lights the studio HDRI was baked
 * from.
 */
export function PathTracer() {
  const on = useUIStore((s) => s.pathTrace);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const tracer = useRef<WebGLPathTracer | null>(null);
  const view = useRef({ sum: 0 });

  // Report (once) whether this renderer can trace at all.
  useEffect(() => {
    const why = pathTraceUnsupported(gl);
    if (why) useUIStore.getState().setPathTraceError(why);
  }, [gl]);

  useEffect(() => {
    if (!on) return;
    const ui = useUIStore.getState();
    view.current.sum = 0;
    const restore: (() => void)[] = [];
    let cancelled = false;
    const stop = () => {
      if (!cancelled) useUIStore.getState().setPathTrace(false);
    };

    // Any design change (paint, layers, variant, mode, undo …) ends it at once.
    restore.push(useDesignStore.subscribe(stop));
    const dom = gl.domElement;
    dom.addEventListener('pointerdown', stop);
    dom.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('resize', stop);
    restore.push(() => {
      dom.removeEventListener('pointerdown', stop);
      dom.removeEventListener('wheel', stop);
      window.removeEventListener('resize', stop);
    });
    ui.setCapturing(true); // guides and highlights out of the scene
    restore.push(() => useUIStore.getState().setCapturing(false));

    // Two frames for React to apply the path-tracing lighting, then build.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(async () => {
        if (cancelled) return;
        try {
          // Loaded on first use: keeps it out of the app's startup bundle.
          const { WebGLPathTracer } = await import('three-gpu-pathtracer');
          // @ts-expect-error untyped: three-mesh-bvh ships no types for its workers
          const { GenerateMeshBVHWorker } = await import('three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js');
          if (cancelled) return;
          const zones = useDesignStore.getState().zones;
          const swapped: [THREE.Mesh, THREE.Material][] = [];
          const targets: THREE.WebGLRenderTarget[] = [];
          scene.traverseVisible((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh || !o.name.startsWith('zone:')) return;
            const src = mesh.material as THREE.MeshPhysicalMaterial;
            const zone = zones[o.name.slice(5) as ZoneId];
            const pt = src.clone();
            const coverage = src.userData?.divCoverage as THREE.Texture | undefined;
            if (coverage && src.map) {
              const baked = bakeZone(gl, mesh, src.map, coverage);
              targets.push(baked);
              pt.map = baked.texture;
            }
            if (zone?.finish === 'chameleon') {
              const [, b, c] = zone.chameleonColors ?? DEFAULT_CHAMELEON_COLORS;
              pt.color.set(b).multiplyScalar(1.8);
              pt.sheen = 1;
              pt.sheenColor.set(c);
              pt.sheenRoughness = 0.4;
            }
            swapped.push([mesh, src]);
            mesh.material = pt;
          });
          restore.push(() => {
            for (const [mesh, src] of swapped) {
              (mesh.material as THREE.Material).dispose();
              mesh.material = src;
            }
            targets.forEach((t) => t.dispose());
          });

          let t = tracer.current;
          if (!t) {
            t = new WebGLPathTracer(gl);
            // The BVH of the high-res frame builds in a worker: no UI freeze.
            t.setBVHWorker(new GenerateMeshBVHWorker());
            tracer.current = t;
          }
          t.bounces = 6;
          t.filterGlossyFactor = 0.5;
          t.minSamples = 1;
          t.renderDelay = 0;
          t.fadeDuration = 0;
          t.tiles.set(2, 2);
          t.textureSize.set(BAKE_SIZE, BAKE_SIZE);
          t.pausePathTracing = false;

          // Swapped until the build has read them (nothing else draws meanwhile).
          const env = scene.environment;
          const bg = scene.background;
          scene.environment = null; // see STUDIO_HDRI: the tracer uses the real lights
          scene.background = PT_BACKGROUND;
          restore.push(() => {
            scene.environment = env;
            scene.background = bg;
          });
          const t0 = performance.now();
          const sync = t.setSceneAsync(scene, camera);
          const blocked = performance.now() - t0;
          await sync;
          scene.environment = env;
          scene.background = bg;
          if (cancelled) return;
          console.info(
            `path tracer: scene built in ${Math.round(performance.now() - t0)} ms (main thread ${Math.round(blocked)} ms)`,
          );
          view.current.sum = viewSum(camera);
        } catch (e) {
          console.error('path tracer failed to start', e);
          restore.forEach((r) => r());
          restore.length = 0;
          useUIStore.getState().setPathTraceError(String((e as Error)?.message ?? e));
        }
      });
    });

    return () => {
      cancelled = true;
      view.current.sum = 0;
      cancelAnimationFrame(raf);
      restore.reverse().forEach((r) => r());
    };
  }, [on, gl, scene, camera]);

  useEffect(() => () => tracer.current?.dispose(), []);

  // While on: draw the traced image instead of the composer (priority > 0
  // takes the render over from R3F).
  useFrame(() => {
    const t = tracer.current;
    if (!on || !t || view.current.sum === 0) return; // off, or not built yet
    if (viewSum(camera) !== view.current.sum) {
      useUIStore.getState().setPathTrace(false); // camera moved (zoom, pan, resize …)
      return;
    }
    t.pausePathTracing = t.samples >= MAX_SAMPLES;
    const tm = gl.toneMapping;
    const exposure = gl.toneMappingExposure;
    gl.toneMapping = THREE.NeutralToneMapping; // the composer leaves it off
    gl.toneMappingExposure = PT_EXPOSURE;
    t.renderSample();
    gl.toneMapping = tm;
    gl.toneMappingExposure = exposure;
    const n = Math.floor(t.samples);
    if (n !== useUIStore.getState().pathTraceSamples) useUIStore.getState().setPathTraceSamples(n);
  }, on ? 2 : 0);

  return null;
}

/** Cheap fingerprint of the camera's view (pose + projection). */
function viewSum(camera: THREE.Camera): number {
  let s = 0;
  const a = camera.matrixWorld.elements;
  const b = camera.projectionMatrix.elements;
  for (let i = 0; i < 16; i++) s += a[i] * (i + 1) + b[i] * (i + 17);
  return s;
}
