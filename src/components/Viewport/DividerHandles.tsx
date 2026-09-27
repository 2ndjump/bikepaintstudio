import { Html, Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useDesignStore } from '../../state/designStore';
import { useUIStore } from '../../state/uiStore';

// The divider line lives in the scene's XY plane (z = 0, the bike centreline).
const PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();

/**
 * Draggable handles + an always-on-top line for each global divider, in the
 * side profile. Drag a handle to move that end of the cut line (mapped onto the
 * z = 0 plane); the line/colour update live.
 */
export function DividerHandles() {
  const dividers = useDesignStore((s) => s.dividers);
  const updateDivider = useDesignStore((s) => s.updateDivider);
  const activeId = useUIStore((s) => s.activeDividerId);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;

  function startDrag(id: string, which: 'a' | 'b' | 'c', e: React.PointerEvent) {
    e.stopPropagation();
    const prevEnabled = controls?.enabled ?? true;
    if (controls) controls.enabled = false; // don't orbit while dragging a handle

    const rect = gl.domElement.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      _ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      _ray.setFromCamera(_ndc, camera);
      if (_ray.ray.intersectPlane(PLANE, _hit)) {
        updateDivider(
          id,
          which === 'a'
            ? { ax: _hit.x, ay: _hit.y }
            : which === 'b'
              ? { bx: _hit.x, by: _hit.y }
              : { cx: _hit.x, cy: _hit.y },
        );
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (controls) controls.enabled = prevEnabled;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function handle(id: string, which: 'a' | 'b' | 'c', x: number, y: number, color: string) {
    return (
      <Html
        key={which}
        position={[x, y, 0]}
        center
        zIndexRange={[100, 100]}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          onPointerDown={(e) => startDrag(id, which, e)}
          title="Divider"
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: color,
            border: '2px solid #fff',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
            cursor: 'grab',
            touchAction: 'none',
          }}
        />
      </Html>
    );
  }

  // Only the divider being edited shows its guide line + handles; the colour
  // cut itself is always applied (in the shader).
  const shown = dividers.filter((d) => d.id === activeId);

  return (
    <>
      {shown.map((d) => {
        if (d.kind === 'shape') {
          // Outline of the shape's (rotated) box + a centre handle to move it.
          const cx = d.cx ?? 0;
          const cy = d.cy ?? 0;
          const a = ((d.rotation ?? 0) * Math.PI) / 180;
          const c = Math.cos(a);
          const s = Math.sin(a);
          const hw = (d.w ?? 0.1) / 2;
          const hh = (d.h ?? 0.1) / 2;
          const corners = [
            [-hw, -hh],
            [hw, -hh],
            [hw, hh],
            [-hw, hh],
            [-hw, -hh],
          ].map(([x, y]) => [cx + c * x - s * y, cy + s * x + c * y, 0] as [number, number, number]);
          return (
            <group key={d.id}>
              <Line
                points={corners}
                color={d.color}
                lineWidth={1.5}
                dashed
                dashSize={0.01}
                gapSize={0.006}
                depthTest={false}
                renderOrder={999}
                transparent
              />
              {handle(d.id, 'c', cx, cy, d.color)}
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
            {(['a', 'b'] as const).map((which) =>
              handle(d.id, which, which === 'a' ? d.ax : d.bx, which === 'a' ? d.ay : d.by, d.color),
            )}
          </group>
        );
      })}
    </>
  );
}
