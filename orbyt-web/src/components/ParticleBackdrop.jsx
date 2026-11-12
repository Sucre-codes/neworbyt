import { useEffect, useRef } from "react";
import * as THREE from "three";

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// A tilted ring of gold particles with a halo of dust, echoing the Orbyt logo.
// 2600 points on desktop, 1200 on phones. Pixel ratio capped at 2.
// Pointer parallax. Static single frame when the visitor prefers reduced motion.
export default function ParticleBackdrop({ dark }) {
  const host = useRef(null);

  useEffect(() => {
    const el = host.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // no WebGL: the page still works without the backdrop
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "block h-full w-full";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 11);

    const small = el.clientWidth < 700;
    const count = small ? 1200 : 2600;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let x, y, z;
      if (i < count * 0.72) {
        const a = Math.random() * Math.PI * 2;
        const r = 4.4 + (Math.random() - 0.5) * 1.4 * Math.random();
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = (Math.random() - 0.5) * 0.3;
      } else {
        const r = 0.4 + Math.random() * 7;
        const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        x = r * s * Math.cos(t); y = r * u; z = r * s * Math.sin(t);
      }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const tex = dotTexture();
    const mat = new THREE.PointsMaterial({
      size: small ? 0.13 : 0.1,
      map: tex,
      transparent: true,
      depthWrite: false,
      color: dark ? 0xe4c978 : 0x8a6414,
      opacity: dark ? 0.9 : 0.75,
      blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const points = new THREE.Points(geo, mat);
    const tilt = new THREE.Group();
    tilt.rotation.set(1.0, 0, -0.45);
    tilt.add(points);
    scene.add(tilt);

    const pointer = { x: 0, y: 0 };
    const onMove = (e) => {
      pointer.x = e.clientX / window.innerWidth - 0.5;
      pointer.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      tilt.scale.setScalar(w < 700 ? 0.62 : 1);
      tilt.position.set(w > 900 ? 3.4 : 0, w > 900 ? 0 : 1.7, 0);
      if (reduce) renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf;
    const tick = () => {
      points.rotation.y += 0.0014;
      tilt.rotation.x += (1.0 + pointer.y * 0.25 - tilt.rotation.x) * 0.04;
      tilt.rotation.z += (-0.45 + pointer.x * 0.25 - tilt.rotation.z) * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    if (!reduce) tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      geo.dispose(); mat.dispose(); tex.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [dark]);

  return <div ref={host} className="h-full w-full" aria-hidden="true" />;
}
