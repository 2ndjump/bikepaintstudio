# Development notes

Context to pick up development on a new machine. Captures the project shape,
known bugs/gotchas worth knowing about, and the queued follow-ups.

If you're an AI assistant picking this up: this file is the closest thing to a
shared memory across sessions. Skim it before making changes.

## What this app does

Interactive 3D bike-paint configurator built with **Vite + React +
TypeScript + React Three Fiber + Tailwind + Zustand**.

The user picks a frame zone (top tube, down tube, etc.) and paints it with a
stack of layers (solid color, pattern, image, decal, distortion). The layer
stack composites onto an offscreen canvas per zone; the canvas becomes a
`CanvasTexture` that gets bound to the matching zone mesh's `map`. The
material's `finish` (matte / satin / glossy / metallic / chameleon) drives
PBR params.

## Key files

| File | What it does |
|---|---|
| `src/geometry/frame.ts` | Parametric road-bike geometry (`BikeGeo` + `ROAD_GEO` preset). Builds an array of `TubeDesc` with cross-section path + radius/cs taper + extension at endpoints. |
| `src/geometry/variableTube.ts` | Sweeps a `TubeDesc` into a `BufferGeometry`. Rotation-minimizing frames, superellipse (Lamé) cross-sections via `shapeExponent`, analytical normals from the implicit gradient, end caps. |
| `src/components/Viewport/BikeFrame.tsx` | Renders each `TubeDesc` as a `<ZonedTube>` mesh. Picks material per finish: `MeshBasicMaterial` for matte/satin (diffuse-only kills the PBR joint-seam artifact), `MeshStandardMaterial` for glossy/metallic, `ChameleonMaterial` for chameleon. |
| `src/components/Viewport/Fillets.tsx` | Small ellipsoid bodies at HT-top, HT-bot, ST-top, BB, and the two seatstay attachments. Fills the "armpit" voids where two cylinders cross at an angle. Each fillet inherits its zone's texture/finish so paint applies. |
| `src/components/Viewport/Wheel.tsx` | Wheel geometry: rim profile (lathe), tire (torus), hub (lathe), bladed spokes (boxes). |
| `src/rendering/LayerCompositor.ts` | The offscreen canvas + per-layer draw functions. One compositor per zone, exposed via `getCompositor(zoneId)`. |
| `src/rendering/useZoneTexture.ts` | React hook bridging the compositor canvas → `CanvasTexture` for the meshes. |
| `src/rendering/finish.ts` | Per-finish PBR params (roughness, metalness, clearcoat, specularIntensity, envMapIntensity, etc.). |
| `src/rendering/carbon.ts` | Procedural carbon-fiber 2/2-twill normal map. Currently unused — was disabled during the joint-seam debugging because it amplified the PBR seam artifact. Safe to re-enable if you find a way to apply it without re-introducing the seam. |
| `src/state/designStore.ts` | Zustand store. Zones, layers, finish, rim params, history (undo/redo), import/export. |
| `src/state/types.ts` | All shared types: `ZoneId`, `Layer`, `ZoneState`, `RimParams`, finish constants. |

## Bugs / gotchas worth knowing

### 1. "See-through walls" at tube joints is PBR shading, not geometry

The user reported repeatedly that walls of one tube looked transparent at the
junction with another. Texture was confirmed opaque, materials had
`transparent: false` and `depthWrite: true`. None of it helped.

**Root cause**: with PBR materials (`MeshPhysicalMaterial` /
`MeshStandardMaterial` + normal maps + IBL), two interpenetrating tubes have
surfaces at nearly the same position but with completely different normals
(TT axis vs HT axis). The IBL specular and clearcoat reflections sample
different environment directions on each side of the joint, producing
different brightnesses. The eye reads the sharp brightness boundary as "the
wall has a hole."

**Fix in this repo**: matte/satin use `MeshBasicMaterial` (flat unlit) — no
shading variation → no seam. Glossy/metallic still use
`MeshStandardMaterial` because they *should* show specular highlights, and on
a glossy surface the discontinuity reads as realistic shine rather than a
defect.

**Diagnostic for future complaints**: if "see-through" complaint persists
after confirming materials are opaque, programmatically swap to
`MeshBasicMaterial` via runtime mesh traversal. If the artifact vanishes,
it's PBR shading. If it remains, it's actual geometry (missing triangles,
front-face culling, etc.).

### 2. Self-shadow seams look identical to PBR seams

If you re-enable `<Canvas shadows>` plus per-tube `castShadow={true}` and a
`<directionalLight castShadow />`, you'll see a dark line at every tube
junction. **It's a self-shadow**, not a real seam. The shadow map renders
tube A's silhouette onto tube B at the joint.

**Fix**: default `castShadow={false}` on tube meshes. Keep `receiveShadow`
and use `<ContactShadows>` for grounding.

**Diagnostic**: if the line moves when you orbit the camera (i.e. it tracks
the light direction), it's a shadow not geometry.

### 3. Junction armpits need fillets

Two cylinders crossing at an angle leave a small triangular **armpit void**
between them — neither cylinder's surface covers that region, so background
shows through at extreme zoom. This is geometric, not material.

**Fix in this repo**: `src/components/Viewport/Fillets.tsx` adds small
ellipsoid bodies at each major junction, scaled to just barely engulf both
joining tubes. They inherit their zone's texture/finish.

**Trade-off**: too-large fillets look like "balls stuck on the bike." Too
small and the armpit shows again. Current scales are tuned conservatively.

### 4. `useSyncExternalStore` infinite loop in `DecalLayer.tsx`

`getAllFontOptions()` builds a *fresh* array on every call. `useSyncExternalStore`
sees a new reference each render → treats it as a store change → re-renders
infinitely. Clicking "+ Text" crashes with "Maximum update depth exceeded."

**Fix**: cache the result inside `fontLoader.ts` — keep
`cachedEntries: FontEntry[] | null`, invalidate to `null` inside `notify()`,
rebuild only when cache is null. Then `getAllFontOptions()` returns a stable
reference between emissions.

**Status**: still pending as of this writing. Fix before relying on the
decal feature.

## Other notes

- **The repo currently has no glossy/metallic carbon-weave normal map.** The
  procedural one in `src/rendering/carbon.ts` is intact but not wired into
  the materials in `BikeFrame.tsx`. Reason: it amplified the PBR seam
  artifact described in note 1. If you reintroduce it, do it only on
  glossy/metallic finishes (where seams are tolerable) or solve the seam
  another way first.
- **Camera state isn't persisted.** OrbitControls resets to default on HMR.
- **The `road_bike.glb` asset in `public/assets/`** is leftover from when the
  app supported both a parametric model and a GLB model. The GLB-rendering
  code path was removed (`src/components/Viewport/GLBFrame.tsx` is gone);
  the asset itself is dead weight and can be removed if size is a concern.
- **Tests**: there are no tests yet. Worth adding before any serious refactor
  to the geometry or painting pipeline.

## Phase 3 follow-up todos (queued, don't touch unless asked)

1. **Mehr Modell-Details** — Sattel, Lenker, Tretlager-Muffe, Ausfallenden,
   Schaltzüge, sichtbare Lackdetails an Muffen. Inkl. **Dropped Seatstays als
   Variante** (Seatstays setzen weiter unten am Sitzrohr an — moderner
   Endurance/Aero-Look). *Update 2026-06-05: dropped seatstays sind inzwischen
   default geworden, der Rest steht noch aus.*
2. **Layer-Duplikation mit Spiegelung** — Aktion im Layer-Stack-UI, die
   einen Layer dupliziert und optional horizontal/vertikal spiegelt (pro Achse
   wählbar, nicht binär).
3. **XML-Export/Import-Format** — zusätzlich zum JSON, menschenlesbar +
   diffbar. Schema soll 1:1 zum `DesignState` mappen. *Update: XML export
   existiert bereits in `src/state/xmlFormat.ts`.*
4. **Material You M3 Farbwähler überall** — `<input type="color">`-Vorkommen
   durch M3-Picker mit Hue-Wheel, Hex/RGB/HSL, Opacity, Swatches ersetzen.
   *Update: ein react-colorful-basierter Picker existiert in `src/components/ui/ColorPicker.tsx` — nicht voll M3 aber funktional.*
5. **Google Material You (M3) UI** — App von raw-Tailwind-Dark auf M3
   umstellen: dynamic color, elevated surfaces, M3 typography, card-based
   Sidebar.
6. **Mehr kreative Fonts im Decal-Picker** — `CURATED_GOOGLE_FONTS` in
   `src/fonts/fontLoader.ts` mit Display-Fonts, Handlettering, Graffiti,
   Racing erweitern.
