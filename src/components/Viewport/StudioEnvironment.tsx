import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Procedural studio environment (spec 1:1). A 1024×512 canvas holds a vertical
 * grey gradient plus three white "softbox" strips; it becomes an equirectangular
 * CanvasTexture, is run through PMREMGenerator, and set as scene.environment so
 * the paint finishes have crisp reflection edges to live on. Reflection source
 * only — never used as the visible backdrop.
 */
export function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Vertical base gradient.
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#3a3d44');
    grad.addColorStop(0.45, '#17181c');
    grad.addColorStop(0.6, '#101114');
    grad.addColorStop(1.0, '#060607');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // White softboxes: vertical transparent → white → transparent gradients.
    const softbox = (x: number, y: number, w: number, h: number, peak: number) => {
      const lg = ctx.createLinearGradient(0, y, 0, y + h);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, `rgba(255,255,255,${peak})`);
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x, y, w, h);
    };
    softbox(80, 60, 300, 90, 0.95);
    softbox(560, 40, 220, 70, 0.7);
    softbox(300, 170, 480, 26, 0.35);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromEquirectangular(tex);
    scene.environment = rt.texture;
    pmrem.dispose();
    tex.dispose();

    return () => {
      scene.environment = null;
      rt.dispose();
    };
  }, [gl, scene]);

  return null;
}
