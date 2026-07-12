import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, SplitText);

/**
 * Global GSAP effect layer. Mount once at the app root.
 *
 * Data-attributes (sprinkle anywhere):
 *   data-gsap="reveal"          → fade + rise on scroll into view
 *   data-gsap="reveal-stagger"  → stagger direct children on scroll
 *   data-gsap="split-words"     → SplitText: words rise + blur out on scroll in
 *   data-gsap="split-chars"     → SplitText: chars typewriter on scroll in
 *   data-gsap="scramble"        → scramble text on scroll in
 *   data-gsap="magnetic"        → cursor-magnet hover
 *   data-gsap="tilt"            → 3D pointer tilt
 *   data-gsap="parallax"        → vertical parallax on scroll (data-speed)
 *   data-gsap="scrub-scale"     → scale up as it enters viewport (scrubbed)
 *   data-gsap="marquee"         → infinite horizontal loop (needs w-max child)
 */
export function GsapEffects() {
  useEffect(() => {
    const splits: SplitText[] = [];
    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      // ─── Reveal ──────────────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="reveal"]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 50,
          filter: "blur(12px)",
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // ─── Stagger children ────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="reveal-stagger"]').forEach((el) => {
        gsap.from(el.children, {
          opacity: 0,
          y: 60,
          scale: 0.9,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        });
      });

      // ─── SplitText words ─────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="split-words"]').forEach((el) => {
        const s = new SplitText(el, { type: "words", wordsClass: "inline-block will-change-transform" });
        splits.push(s);
        gsap.from(s.words, {
          opacity: 0,
          y: 40,
          rotationX: -60,
          filter: "blur(8px)",
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.055,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // ─── SplitText chars typewriter ──────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="split-chars"]').forEach((el) => {
        const s = new SplitText(el, { type: "chars,words", charsClass: "inline-block" });
        splits.push(s);
        gsap.from(s.chars, {
          opacity: 0,
          y: 20,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.02,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // ─── Scramble ────────────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="scramble"]').forEach((el) => {
        const finalText = el.textContent ?? "";
        gsap.to(el, {
          duration: 1.4,
          scrambleText: { text: finalText, chars: "01!<>-_/[]{}—=+*^?#________", speed: 0.6 },
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      // ─── Parallax ────────────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="parallax"]').forEach((el) => {
        const speed = Number(el.dataset.speed ?? "0.3");
        gsap.to(el, {
          yPercent: -30 * speed,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        });
      });

      // ─── Scrub-scale ─────────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="scrub-scale"]').forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.85, opacity: 0.6 },
          {
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 90%", end: "top 40%", scrub: true },
          },
        );
      });

      // ─── Marquee ─────────────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="marquee"]').forEach((el) => {
        const track = el.firstElementChild as HTMLElement | null;
        if (!track) return;
        const dur = Number(el.dataset.duration ?? "30");
        const tween = gsap.to(track, { xPercent: -50, duration: dur, ease: "none", repeat: -1 });
        const enter = () => tween.timeScale(0.15);
        const leave = () => tween.timeScale(1);
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          tween.kill();
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointerleave", leave);
        });
      });

      // ─── Magnetic ────────────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="magnetic"]').forEach((el) => {
        const strength = Number(el.dataset.strength ?? "0.4");
        const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * strength);
          yTo((e.clientY - (r.top + r.height / 2)) * strength);
        };
        const leave = () => { xTo(0); yTo(0); };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        });
      });

      // ─── 3D Tilt ─────────────────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-gsap="tilt"]').forEach((el) => {
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
        const leave = () => { rxTo(0); ryTo(0); };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        });
      });
    });

    const refresh = () => ScrollTrigger.refresh();
    const t = setTimeout(refresh, 500);
    window.addEventListener("load", refresh);

    return () => {
      clearTimeout(t);
      window.removeEventListener("load", refresh);
      cleanups.forEach((fn) => fn());
      splits.forEach((s) => s.revert());
      ctx.revert();
    };
  }, []);

  return null;
}
