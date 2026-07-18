import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export function Testimonials() {
  const { lang } = useApp();
  const isAr = lang === "ar";

  const { data: images } = useQuery({
    queryKey: ["testimonial-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonial_images")
        .select("id, image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!images || images.length === 0) return null;

  return (
    <section className="relative">
      {/* Blue glow at bottom, rising upward and fading out , only inside testimonials */}
      {/* Gradient glow disabled , uncomment to restore
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] bg-gradient-to-t from-brand/35 via-cyan-300/15 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2 w-[1200px] h-[380px] bg-brand/25 rounded-full blur-3xl" />
      */}


      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative">
        <div className="relative flex items-end justify-between mb-5 sm:mb-7 flex-wrap gap-4">

        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand mb-3">
            {isAr ? "آراء العملاء" : "Testimonials"}
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold max-w-xl leading-tight">
            {isAr ? "قالوا عنّا الأصدق من الجميع" : "Words from the people who matter most"}
          </h2>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-3xl font-extrabold">
              4.9<span className="text-brand">/5</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {isAr ? "متوسط تقييم العملاء" : "Average customer rating"}
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-3xl font-extrabold">2K+</div>
            <div className="text-xs text-muted-foreground">
              {isAr ? "عميل سعيد" : "Happy customers"}
            </div>
          </div>
        </div>
      </div>

        <TestimonialsSlider images={images} />
      </div>
    </section>
  );
}

function TestimonialsSlider({ images }: { images: { id: string; image_url: string }[] }) {
  // Duplicate so we can navigate infinitely without visible jumps
  const items = useMemo(() => (images.length < 3 ? [...images, ...images, ...images] : images), [images]);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % items.length);
    }, 4500);
    return () => clearInterval(id);
  }, [items.length]);

  // Scroll-driven advance: as user scrolls the page, advance slides too (web + mobile)
  useEffect(() => {
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    let acc = 0;
    const THRESHOLD = 220; // pixels of scroll per slide step

    const onScroll = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const inView = rect.bottom > vh * 0.15 && rect.top < vh * 0.85;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (!inView) return;
      acc += delta;
      while (acc >= THRESHOLD) {
        acc -= THRESHOLD;
        setIndex((i) => (i + 1) % items.length);
      }
      while (acc <= -THRESHOLD) {
        acc += THRESHOLD;
        setIndex((i) => (i - 1 + items.length) % items.length);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + items.length) % items.length);
  const goRef = useRef(go);
  goRef.current = go;

  // Desktop: while hovering the slider, capture wheel , stop page scroll and step slides
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let acc = 0;
    let t: number | null = null;
    const onWheel = (e: WheelEvent) => {
      // Only hijack when a real mouse is hovering (desktop). Touch scroll unaffected.
      if (!paused.current) return;
      e.preventDefault();
      acc += e.deltaY || e.deltaX;
      if (t) return;
      t = window.setTimeout(() => {
        const v = acc; acc = 0; t = null;
        if (Math.abs(v) < 20) return;
        goRef.current(v > 0 ? 1 : -1);
      }, 80);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, []);

  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >

      <div className="relative h-[340px] md:h-[460px] flex items-center justify-center [perspective:1400px] overflow-hidden">

        {items.map((img, i) => {
          // Relative offset with wrap-around
          let offset = i - index;
          if (offset > items.length / 2) offset -= items.length;
          if (offset < -items.length / 2) offset += items.length;

          const abs = Math.abs(offset);
          const hidden = abs > 2;
          const translateX = offset * 42; // percent
          const scale = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.66;
          const rotateY = offset === 0 ? 0 : offset > 0 ? -22 : 22;
          const opacity = hidden ? 0 : abs === 0 ? 1 : abs === 1 ? 0.85 : 0.45;
          const z = 50 - abs;
          const blur = abs >= 2 ? "blur(3px)" : "blur(0px)";

          return (
            <button
              type="button"
              key={img.id + "-" + i}
              onClick={() => setIndex(i)}
              aria-hidden={hidden}
              tabIndex={hidden ? -1 : 0}
              className="absolute top-1/2 left-1/2 -mt-[170px] md:-mt-[230px] -ml-[125px] md:-ml-[176px] w-[250px] md:w-[352px] h-[340px] md:h-[460px] rounded-3xl overflow-hidden border border-border bg-card shadow-2xl transition-all duration-[900ms] cursor-pointer"
              style={{
                transform: `translateX(${translateX}%) scale(${scale}) rotateY(${rotateY}deg)`,
                opacity,
                zIndex: z,
                filter: blur,
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                pointerEvents: hidden ? "none" : "auto",
              }}
            >
              <img
                src={img.image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
              />
              {abs === 0 && (
                <div className="absolute inset-0 ring-2 ring-brand/60 rounded-3xl pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="relative mt-5 flex items-center justify-center gap-4">
        <button
          onClick={() => go(-1)}
          aria-label="Previous"
          className="w-11 h-11 rounded-full border border-border bg-card hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index ? "w-8 bg-brand" : "w-1.5 bg-border hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => go(1)}
          aria-label="Next"
          className="w-11 h-11 rounded-full border border-border bg-card hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all"
        >
          ›
        </button>
      </div>
    </div>
  );
}
