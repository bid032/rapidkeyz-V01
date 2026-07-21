import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";

/**
 * Interactive Three.js hero background.
 * Heavy WebGL init is deferred to requestIdleCallback so first paint
 * and first interaction stay snappy (fixes "hang on open").
 * Skipped entirely for users with prefers-reduced-motion.
 */
export function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    const idle = (cb: () => void) => {
      const w = window as any;
      if (typeof w.requestIdleCallback === "function") return w.requestIdleCallback(cb, { timeout: 1500 });
      return window.setTimeout(cb, 250);
    };
    const cancelIdle = (id: any) => {
      const w = window as any;
      if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(id);
      else clearTimeout(id);
    };

    const idleId = idle(() => {
      if (disposed || !mount) return;

      const width = mount.clientWidth;
      const height = mount.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
      camera.position.z = 8;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const brand = new THREE.Color("#22c3e6");

      // Particle count scales with viewport (mobile gets ~half).
      const isSmall = window.innerWidth < 768;
      const particleCount = isSmall ? 250 : 500;
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

      const tl = gsap.timeline();
      tl.to(camera.position, { z: 6, duration: 1.6, ease: "power3.out" }, 0)
        .to(pMat, { opacity: 0.9, duration: 1.5 }, 0);

      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      const onMove = (e: PointerEvent) => {
        const rect = mount.getBoundingClientRect();
        pointer.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      // Pause animation when the tab / canvas is offscreen to save CPU.
      let visible = true;
      const io = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      });
      io.observe(mount);
      const onVis = () => { visible = document.visibilityState === "visible"; };
      document.addEventListener("visibilitychange", onVis);

      let raf = 0;
      const startTime = performance.now();
      const animate = () => {
        raf = requestAnimationFrame(animate);
        if (!visible) return;
        const t = (performance.now() - startTime) / 1000;
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;

        points.rotation.y = t * 0.04 + pointer.x * 0.2;
        points.rotation.x = pointer.y * 0.15;

        camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
        camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
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

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
        io.disconnect();
        tl.kill();
        pGeo.dispose();
        pMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    });

    return () => {
      disposed = true;
      cancelIdle(idleId);
      cleanup?.();
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
