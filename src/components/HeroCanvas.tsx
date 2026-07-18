import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";

/**
 * Interactive Three.js hero background:
 * - Floating "key" tori (nod to RapidKeyz) drifting in 3D space
 * - Cyan particle field reacting to pointer movement
 * - GSAP intro timeline for a cinematic reveal
 */
export function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const brand = new THREE.Color("#22c3e6");
    const brandDeep = new THREE.Color("#1e40af");

    // Particle field
    const particleCount = 900;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: brand,
      size: 0.035,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // (3D torus + icosahedron shapes removed per design request — keep only particles)
    const toruses: THREE.Mesh[] = [];

    // GSAP intro
    const tl = gsap.timeline();
    tl.to(camera.position, { z: 6, duration: 1.6, ease: "power3.out" }, 0)
      .to(pMat, { opacity: 0.9, duration: 1.5 }, 0);


    // Pointer parallax
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    const startTime = performance.now();
    const animate = () => {
      const t = (performance.now() - startTime) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      points.rotation.y = t * 0.04 + pointer.x * 0.2;
      points.rotation.x = pointer.y * 0.15;

      toruses.forEach((m, i) => {
        m.rotation.x += 0.004 + i * 0.001;
        m.rotation.y += 0.006;
        m.position.y += Math.sin(t + i) * 0.002;
      });


      camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
      camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      tl.kill();
      pGeo.dispose();
      pMat.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="absolute inset-0 -z-10 pointer-events-none opacity-90"
      style={{ maskImage: "radial-gradient(ellipse at center, black 60%, transparent 100%)" }}
    />
  );
}
