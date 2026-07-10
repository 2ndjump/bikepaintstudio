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

  function startDrag(id: string, which: 'a' | 'b', e: React.PointerEvent) {
    e.stopPropagation();
    const prevEnabled = controls?.enabled ?? true;
    if (controls) controls.enabled = false; // don't orbit while dragging a handle

    const rect = gl.domElement.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      _ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      _ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      _ray.setFromCamera(_ndc, camera);
      if (_ray.ray.intersectPlane(PLANE, _hit)) {
        updateDivider(id, which === 'a' ? { ax: _hit.x, ay: _hit.y } : { bx: _hit.x, by: _hit.y });
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

  // Only the divider being edited shows its guide line + handles; the colour
  // cut itself is always applied (in the shader).
  const shown = dividers.filter((d) => d.id === activeId);

  return (
    <>
      {shown.map((d) => {
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
            {(['a', 'b'] as const).map((which) => {
              const x = which === 'a' ? d.ax : d.bx;
              const y = which === 'a' ? d.ay : d.by;
              return (
                <Html
                  key={which}
                  position={[x, y, 0]}
                  center
                  zIndexRange={[100, 100]}
                  style={{ pointerEvents: 'auto' }}
                >
                  <div
                    onPointerDown={(e) => startDrag(d.id, which, e)}
                    title="Divider"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: d.color,
                      border: '2px solid #fff',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                      cursor: 'grab',
                      touchAction: 'none',
                    }}
                  />
                </Html>
              );
            })}
          </group>
        );
      })}
    </>
  );
}
