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

    // Floating torus "keys"
    const torusGroup = new THREE.Group();
    const torusGeo = new THREE.TorusGeometry(0.7, 0.22, 24, 80);
    const torusMat = new THREE.MeshBasicMaterial({
      color: brand,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const toruses: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Mesh(torusGeo, torusMat);
      t.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 4 - 1,
      );
      t.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      t.scale.setScalar(0);
      toruses.push(t);
      torusGroup.add(t);
    }
    scene.add(torusGroup);

    // Central glowing icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(1.1, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: brand,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.scale.setScalar(0);
    scene.add(core);

    // GSAP intro
    const tl = gsap.timeline();
    tl.to(camera.position, { z: 6, duration: 1.6, ease: "power3.out" }, 0)
      .to(core.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: "elastic.out(1,0.6)" }, 0.2)
      .to(
        toruses.map((t) => t.scale),
        { x: 1, y: 1, z: 1, duration: 1, ease: "back.out(1.7)", stagger: 0.1 },
        0.4,
      )
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
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      points.rotation.y = t * 0.04 + pointer.x * 0.2;
      points.rotation.x = pointer.y * 0.15;

      core.rotation.x = t * 0.3;
      core.rotation.y = t * 0.4 + pointer.x * 0.5;

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
      torusGeo.dispose();
      torusMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
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
