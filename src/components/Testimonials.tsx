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
    <section className="max-w-7xl mx-auto px-6 py-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-end justify-between mb-12 flex-wrap gap-4">
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
    </section>
  );
}

function TestimonialsSlider({ images }: { images: { id: string; image_url: string }[] }) {
  // Duplicate so we can navigate infinitely without visible jumps
  const items = useMemo(() => (images.length < 3 ? [...images, ...images, ...images] : images), [images]);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % items.length);
    }, 4500);
    return () => clearInterval(id);
  }, [items.length]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + items.length) % items.length);

  return (
    <div
      className="relative"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="relative h-[440px] md:h-[520px] flex items-center justify-center [perspective:1400px]">
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
              className="absolute top-1/2 left-1/2 -mt-[220px] md:-mt-[260px] -ml-[160px] md:-ml-[200px] w-[320px] md:w-[400px] h-[440px] md:h-[520px] rounded-3xl overflow-hidden border border-border bg-card shadow-2xl transition-all duration-[900ms] cursor-pointer"
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
      <div className="relative mt-8 flex items-center justify-center gap-4">
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
