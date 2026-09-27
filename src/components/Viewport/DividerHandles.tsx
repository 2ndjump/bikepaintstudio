import { Html, Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import { useUIStore } from '../../state/uiStore';
import type { Divider } from '../../state/types';

// The divider line lives in the scene's XY plane (z = 0, the bike centreline).
const PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();

// Shape size limits (metres) — same as the panel sliders.
const MIN_SIZE = 0.02;
const MAX_W = 2;
const MAX_H = 0.8;
/** Distance of the rotate handle above the box's top edge (metres). */
const ROT_OFFSET = 0.05;

type Pt = [number, number, number];

/**
 * Draggable handles + an always-on-top guide for the global divider being
 * edited, in the side profile (mapped onto the z = 0 plane):
 *  - line: one handle per end of the cut line.
 *  - shape: a classic transform box — centre handle moves, corner handles
 *    resize both axes and edge handles one axis (opposite side stays put),
 *    the handle above the top edge rotates (Shift snaps to 15°).
 */
export function DividerHandles() {
  const dividers = useDesignStore((s) => s.dividers);
  const updateDivider = useDesignStore((s) => s.updateDivider);
  const activeId = useUIStore((s) => s.activeDividerId);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;

  /** Track the pointer on the z = 0 plane until release, calling onMove(x, y). */
  function startDrag(e: React.PointerEvent, onMove: (x: number, y: number, ev: PointerEvent) => void) {
    e.stopPropagation();
    const prevEnabled = controls?.enabled ?? true;
    if (controls) controls.enabled = false; // don't orbit while dragging a handle

    const rect = gl.domElement.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      _ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      _ray.setFromCamera(_ndc, camera);
      if (_ray.ray.intersectPlane(PLANE, _hit)) onMove(_hit.x, _hit.y, ev);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (controls) controls.enabled = prevEnabled;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /**
   * Resize from the handle at local sign (sx, sy) ∈ {-1, 0, 1}²: the opposite
   * side stays fixed, an axis with sign 0 keeps its size.
   */
  function startResize(d: Divider, sx: number, sy: number, e: React.PointerEvent) {
    const a = ((d.rotation ?? 0) * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const cx0 = d.cx ?? 0;
    const cy0 = d.cy ?? 0;
    const w0 = d.w ?? 0.1;
    const h0 = d.h ?? 0.1;
    startDrag(e, (x, y) => {
      // Pointer in the box's local frame (relative to the start centre).
      const px = x - cx0;
      const py = y - cy0;
      const qx = c * px + s * py;
      const qy = -s * px + c * py;
      let w = w0;
      let h = h0;
      let lx = 0;
      let ly = 0;
      if (sx !== 0) {
        const ax = (-sx * w0) / 2; // fixed opposite edge
        w = THREE.MathUtils.clamp(sx * (qx - ax), MIN_SIZE, MAX_W);
        lx = ax + (sx * w) / 2;
      }
      if (sy !== 0) {
        const ay = (-sy * h0) / 2;
        h = THREE.MathUtils.clamp(sy * (qy - ay), MIN_SIZE, MAX_H);
        ly = ay + (sy * h) / 2;
      }
      updateDivider(d.id, { w, h, cx: cx0 + c * lx - s * ly, cy: cy0 + s * lx + c * ly });
    });
  }

  function startRotate(d: Divider, e: React.PointerEvent) {
    const cx = d.cx ?? 0;
    const cy = d.cy ?? 0;
    startDrag(e, (x, y, ev) => {
      // The rotate handle sits on the box's local +y axis.
      let deg = (Math.atan2(y - cy, x - cx) * 180) / Math.PI - 90;
      if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
      updateDivider(d.id, { rotation: ((Math.round(deg) % 360) + 360) % 360 });
    });
  }

  function handle(
    key: string,
    [x, y]: [number, number],
    color: string,
    onDown: (e: React.PointerEvent) => void,
    look: { size?: number; square?: boolean; cursor?: string } = {},
  ) {
    const size = look.size ?? 16;
    return (
      <Html key={key} position={[x, y, 0]} center zIndexRange={[100, 100]} style={{ pointerEvents: 'auto' }}>
        <div
          onPointerDown={onDown}
          title="Divider"
          style={{
            width: size,
            height: size,
            borderRadius: look.square ? 2 : '50%',
            background: color,
            border: '2px solid #fff',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
            cursor: look.cursor ?? 'grab',
            touchAction: 'none',
          }}
        />
      </Html>
    );
  }

  // Only the divider being edited shows its guide + handles; the colour itself
  // is always applied (in the shader).
  const shown = dividers.filter((d) => d.id === activeId);

  return (
    <>
      {shown.map((d) => {
        if (d.kind === 'shape') {
          const cx = d.cx ?? 0;
          const cy = d.cy ?? 0;
          const a = ((d.rotation ?? 0) * Math.PI) / 180;
          const c = Math.cos(a);
          const s = Math.sin(a);
          const hw = (d.w ?? 0.1) / 2;
          const hh = (d.h ?? 0.1) / 2;
          // Local box point (lx, ly) → world.
          const at = (lx: number, ly: number): [number, number] => [cx + c * lx - s * ly, cy + s * lx + c * ly];
          const box: Pt[] = [
            [-hw, -hh],
            [hw, -hh],
            [hw, hh],
            [-hw, hh],
            [-hw, -hh],
          ].map(([x, y]) => [...at(x, y), 0]);
          const rot = at(0, hh + ROT_OFFSET);
          // Resize handles at local signs; cursors follow the screen direction
          // only roughly (box rotation ignored), which is fine for a guide.
          const grips: [number, number, string][] = [
            [-1, -1, 'nesw-resize'],
            [1, -1, 'nwse-resize'],
            [1, 1, 'nesw-resize'],
            [-1, 1, 'nwse-resize'],
            [0, -1, 'ns-resize'],
            [0, 1, 'ns-resize'],
            [-1, 0, 'ew-resize'],
            [1, 0, 'ew-resize'],
          ];
          return (
            <group key={d.id}>
              <Line
                points={box}
                color={d.color}
                lineWidth={1.5}
                dashed
                dashSize={0.01}
                gapSize={0.006}
                depthTest={false}
                renderOrder={999}
                transparent
              />
              <Line
                points={[[...at(0, hh), 0], [...rot, 0]]}
                color={d.color}
                lineWidth={1.5}
                depthTest={false}
                renderOrder={999}
                transparent
              />
              {handle('c', [cx, cy], d.color, (e) =>
                startDrag(e, (x, y) => updateDivider(d.id, { cx: x, cy: y })),
              )}
              {grips.map(([sx, sy, cursor]) =>
                handle(`r${sx}${sy}`, at(sx * hw, sy * hh), '#fff', (e) => startResize(d, sx, sy, e), {
                  size: 10,
                  square: true,
                  cursor,
                }),
              )}
              {handle('rot', rot, '#fff', (e) => startRotate(d, e), { size: 12, cursor: 'crosshair' })}
            </group>
          );
        }
        // Extend the drawn line well past the handles so it reads as a full cut.
        const dx = d.bx - d.ax;
        const dy = d.by - d.ay;
        const len = Math.hypot(dx, dy) || 1;
        const ux = (dx / len) * 3;
        const uy = (dy / len) * 3;
        return (
          <group key={d.id}>
            <Line
              points={[
                [d.ax - ux, d.ay - uy, 0],
                [d.bx + ux, d.by + uy, 0],
              ]}
              color={d.color}
              lineWidth={2}
              depthTest={false}
              renderOrder={999}
              transparent
            />
            {handle('a', [d.ax, d.ay], d.color, (e) =>
              startDrag(e, (x, y) => updateDivider(d.id, { ax: x, ay: y })),
            )}
            {handle('b', [d.bx, d.by], d.color, (e) =>
              startDrag(e, (x, y) => updateDivider(d.id, { bx: x, by: y })),
            )}
          </group>
        );
      })}
    </>
  );
}
