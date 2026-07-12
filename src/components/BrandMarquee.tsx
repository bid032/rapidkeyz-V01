import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const ITEMS = [
  "ChatGPT Plus",
  "Midjourney",
  "Canva Pro",
  "Office 365",
  "Claude Pro",
  "Perplexity",
  "Notion AI",
  "Adobe Creative",
  "Netflix",
  "Spotify",
  "YouTube Premium",
];

/**
 * Infinite GSAP marquee with pause-on-hover.
 * Uses two mirrored tracks + xPercent from 0 → -100 for seamless loop.
 */
export function BrandMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const tween = gsap.to(track, {
      xPercent: -50,
      duration: 30,
      ease: "none",
      repeat: -1,
    });
    const wrap = track.parentElement!;
    const onEnter = () => tween.timeScale(0.15);
    const onLeave = () => tween.timeScale(1);
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      tween.kill();
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const items = [...ITEMS, ...ITEMS];

  return (
    <div className="relative overflow-hidden py-6 border-y border-border/60 bg-gradient-to-r from-transparent via-brand/5 to-transparent">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent"
        aria-hidden="true"
      />
      <div ref={trackRef} className="flex gap-10 whitespace-nowrap w-max">
        {items.map((label, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 text-lg sm:text-xl font-bold text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-brand shadow-[0_0_10px_var(--brand)]" />
            <span className="hover:text-brand transition-colors">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
