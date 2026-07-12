import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);

/**
 * Global GSAP effect layer. Mount once at the app root.
 *
 * Sprinkle these data-attributes anywhere in the DOM:
 *   data-gsap="reveal"        → fade + rise on scroll into view
 *   data-gsap="reveal-stagger"→ stagger direct children on scroll
 *   data-gsap="scramble"      → scramble text on mount (uses element text)
 *   data-gsap="magnetic"      → cursor-magnet hover effect
 *   data-gsap="tilt"          → 3D pointer tilt (perspective in parent)
 *   data-gsap="parallax"      → subtle vertical parallax on scroll
 *   data-gsap="pin-scale"     → pins & scales while scrolling through
 */
export function GsapEffects() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      // ─── Reveal on scroll ────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="reveal"]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 40,
          filter: "blur(10px)",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      // ─── Stagger children on scroll ──────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="reveal-stagger"]').forEach((el) => {
        gsap.from(el.children, {
          opacity: 0,
          y: 48,
          scale: 0.95,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
        });
      });

      // ─── Scramble text ───────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="scramble"]').forEach((el) => {
        const finalText = el.textContent ?? "";
        gsap.to(el, {
          duration: 1.6,
          scrambleText: { text: finalText, chars: "01!<>-_/[]{}—=+*^?#________", speed: 0.6 },
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      // ─── Parallax ────────────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="parallax"]').forEach((el) => {
        const speed = Number(el.dataset.speed ?? "0.3");
        gsap.to(el, {
          yPercent: -20 * speed,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        });
      });

      // ─── Magnetic buttons ────────────────────────────────────────────
      const magnetics = gsap.utils.toArray<HTMLElement>('[data-gsap="magnetic"]');
      const magneticCleanups: Array<() => void> = [];
      magnetics.forEach((el) => {
        const strength = Number(el.dataset.strength ?? "0.4");
        const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * strength);
          yTo((e.clientY - (r.top + r.height / 2)) * strength);
        };
        const leave = () => {
          xTo(0);
          yTo(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        magneticCleanups.push(() => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        });
      });

      // ─── 3D Tilt on hover ────────────────────────────────────────────
      const tilts = gsap.utils.toArray<HTMLElement>('[data-gsap="tilt"]');
      const tiltCleanups: Array<() => void> = [];
      tilts.forEach((el) => {
        el.style.transformStyle = "preserve-3d";
        (el.style as any).transformPerspective = "1000px";
        const rxTo = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power2.out" });
        const ryTo = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power2.out" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          ryTo(px * 14);
          rxTo(-py * 14);
        };
        const leave = () => {
          rxTo(0);
          ryTo(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        tiltCleanups.push(() => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        });
      });

      return () => {
        magneticCleanups.forEach((fn) => fn());
        tiltCleanups.forEach((fn) => fn());
      };
    });

    // Refresh after images/fonts settle
    const refresh = () => ScrollTrigger.refresh();
    const t = setTimeout(refresh, 400);
    window.addEventListener("load", refresh);

    return () => {
      clearTimeout(t);
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, []);

  return null;
}
