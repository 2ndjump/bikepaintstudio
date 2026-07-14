# Bike Paint Studio

An interactive 3D bike‑frame paint configurator. Design a road/gravel bike's
paint scheme in real time on a fully procedural 3D model — pick colours and
finishes per part, stack patterns / images / text / shapes, cut the frame into
colour zones, and drag decals straight onto the model.

**Live:** https://2ndjump.github.io/bikepaintstudio/

## Features

### 3D model & view
- Fully procedural frameset (head tube, top/down/seat tubes, seat & chain
  stays, fork) plus both wheels, lit in a studio environment.
- Orbit / pan / zoom camera, dark or light background, PNG snapshot export.

### Paint zones
- Paint each part independently: the frame tubes, the fork, and each rim are
  separate zones (the frame shares one global base colour; the rims are their
  own).
- **Finishes:** matte, satin, glossy, metallic, and an iridescent chameleon
  finish.

### Layers (per zone)
Stack any number of layers, each with its own blend mode, opacity, visibility,
reordering, and duplicate (with horizontal/vertical mirror):
- **Patterns** — hexagons, stripes, carbon, smoke, thread, splashes,
  topographic, marble, voronoi, camo, digital camo, circuit, mesh (procedural
  or texture source).
- **Images** — upload your own, with brightness / contrast / saturation / hue,
  dodge & burn, and levels adjustments.
- **Text** — upload fonts or use system fonts; size, colour, outline, letter
  spacing, per‑letter rotation, and **bold / italic / underline / strikethrough**.
- **Shapes** — 13 shapes (rectangle, triangle, circle, diamond, pentagon,
  hexagon, star, heart, ring, cross, arrow, lightning, chevron).
- **Per‑layer effects** — Gaussian, directional, and motion blur.
- **Clipping masks** — link a layer to the one below so a pattern only shows
  inside a shape.

### Colour dividers
- Global, world‑space cut lines that recolour across parts with one clean line
  (e.g. everything below the line turns blue), positioned by dragging handles in
  the viewport.
- Each layer can sit **above or below** the divider.

### Direct editing on the model
- A tool switch in the header toggles between orbiting the bike and editing
  layers.
- In edit mode, **drag** a text/shape layer on the model to move it and
  **Shift‑drag or right‑drag** to rotate it — on the frame and the rims.

### Wheels
- Adjustable rim geometry: depth, width, and spoke count.

### Project & palette
- A session colour palette of favourites, shown in every colour picker.
- **Save / load** the whole design as JSON (choose the filename), including the
  palette.
- Undo / redo, and German / English UI.

## Getting started

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # preview the production build
npm run lint       # run ESLint
```

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **three.js** via **@react-three/fiber** and **@react-three/drei**
- **zustand** for state, **Tailwind CSS v4** for styling, **react-colorful** for
  colour pickers

Paint is composited per zone onto a 2D canvas that is applied as the material's
colour map, so patterns, images, text, and shapes all share one layer pipeline;
colour dividers are drawn in the material shader in world space.

## Deployment

Pushing to `Main` triggers a GitHub Actions workflow that builds the app and
deploys it to GitHub Pages.
