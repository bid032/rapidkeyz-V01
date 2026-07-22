import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

type Category = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
};

export function CategoriesShowcase({
  activeSlug,
  slugs,
  compact = false,
  mini = false,
}: {
  activeSlug?: string;
  slugs?: string[];
  compact?: boolean;
  mini?: boolean;
}) {
  const { lang } = useApp();
  const cats = useQuery({
    queryKey: ["cats-showcase", slugs?.join(",") ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("categories")
        .select("id, slug, name_ar, name_en")
        .eq("is_active", true)
        .order("sort_order");
      if (slugs && slugs.length) q = q.in("slug", slugs);
      const { data } = await q;
      return (data ?? []) as Category[];
    },
  });

  if (!cats.data || cats.data.length === 0) return null;

  return (
    <section className={`relative max-w-7xl mx-auto px-3 sm:px-6 ${compact ? "py-6 sm:py-10" : "py-12 sm:py-20"}`}>
      <div className={`text-center ${mini ? "mb-5 sm:mb-7" : compact ? "mb-5 sm:mb-7" : "mb-10 sm:mb-14"}`} data-gsap="reveal-stagger">
        {mini ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full neon-border text-brand text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em]">
            <Sparkles className="size-3.5" />
            {lang === "ar" ? "تصفّح حسب القسم" : "Browse by category"}
          </div>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full neon-border text-brand text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em]">
              <Sparkles className="size-3.5" />
              {lang === "ar" ? "كل الخدمات" : "Categories"}
            </div>
            <h2
              className={`mt-3 font-display font-bold tracking-tight leading-[1.15] pb-1 ${
                compact ? "text-2xl sm:text-3xl md:text-4xl" : "text-3xl sm:text-5xl md:text-6xl"
              }`}
            >
              <span className="brand-text">{lang === "ar" ? "كل الخدمات" : "Categories"}</span>
            </h2>
            {!compact && (
              <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-brand to-transparent" />
            )}
          </>
        )}
      </div>

      {mini ? (
        <CategoryStrip cats={cats.data} activeSlug={activeSlug} lang={lang} />
      ) : (
        <div
          data-gsap="card-pop"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
        >
          {cats.data.map((c, i) => {
            const isActive = activeSlug === c.slug;
            return (
              <div
                key={c.id}
                data-gsap="tilt"
                className={
                  i % 4 === 1
                    ? "sm:translate-y-4"
                    : i % 4 === 3
                    ? "sm:-translate-y-4"
                    : ""
                }
              >
                <Link
                  to="/shop"
                  search={{ category: c.slug }}
                  data-gsap="magnetic"
                  data-strength="0.15"
                  className={`group relative block h-full overflow-hidden rounded-2xl border p-5 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:brand-glow ${
                    isActive
                      ? "border-brand bg-brand/10"
                      : "border-border bg-card hover:border-brand/60"
                  }`}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--brand) 0%, transparent 40%, transparent 60%, var(--brand-deep) 100%)",
                      WebkitMask:
                        "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                      padding: 1,
                    }}
                  />
                  <div className="pointer-events-none absolute -top-16 -end-16 size-40 rounded-full bg-brand/25 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="pointer-events-none absolute -bottom-16 -start-16 size-40 rounded-full bg-[--brand-deep]/25 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-brand/25 to-transparent"
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest text-brand/70 mb-2 sm:mb-3">
                        / {String(i + 1).padStart(2, "0")}
                      </div>
                      <h3 className="font-display text-base sm:text-xl md:text-2xl font-bold leading-tight group-hover:text-brand transition-colors">
                        {lang === "ar" ? c.name_ar : c.name_en}
                      </h3>
                    </div>
                    <span className="shrink-0 grid place-items-center size-9 sm:size-11 rounded-full border border-border bg-background/60 text-muted-foreground group-hover:bg-brand group-hover:text-brand-foreground group-hover:border-brand group-hover:rotate-45 group-hover:scale-110 transition-all duration-300">
                      <ArrowUpRight className="size-4 sm:size-5" />
                    </span>
                  </div>
                  <div className="relative mt-6 sm:mt-8 flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-muted-foreground group-hover:text-brand transition-colors">
                    <span className="h-px flex-1 bg-border group-hover:bg-gradient-to-r group-hover:from-brand group-hover:via-accent group-hover:to-transparent transition-colors" />
                    <span className="font-mono uppercase tracking-widest">
                      {lang === "ar" ? "استكشف →" : "Explore →"}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CategoryStrip({
  cats,
  activeSlug,
  lang,
}: {
  cats: Category[];
  activeSlug?: string;
  lang: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState(false);
  const showArrows = cats.length > 5 && overflow;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth - el.clientWidth > 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [cats.length]);

  const scrollBy = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const page = Math.max(240, el.clientWidth * 0.8);
    const isRtl = lang === "ar";
    el.scrollBy({ left: (isRtl ? -1 : 1) * dir * page, behavior: "smooth" });
  };

  return (
    <div className="relative max-w-5xl mx-auto">
      {showArrows && (
        <button
          type="button"
          aria-label="prev"
          onClick={() => scrollBy(-1)}
          className="hidden sm:grid absolute top-1/2 -translate-y-1/2 start-0 -translate-x-1/2 rtl:translate-x-1/2 z-10 place-items-center size-10 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all"
        >
          <ChevronLeft className="size-5 rtl:hidden" />
          <ChevronRight className="size-5 hidden rtl:block" />
        </button>
      )}

      <div
        ref={scrollerRef}
        data-gsap="card-pop"
        className={`flex gap-2.5 sm:gap-3.5 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory ${
          showArrows ? "sm:px-8" : ""
        } ${cats.length <= 5 ? "sm:justify-center" : ""}`}
      >
        {cats.map((c, i) => {
          const isActive = activeSlug === c.slug;
          return (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              data-gsap="magnetic"
              data-strength="0.2"
              className={`snap-start shrink-0 basis-[46%] sm:basis-[calc((100%-3*0.875rem)/4)] lg:basis-[calc((100%-4*0.875rem)/5)] group relative flex items-center gap-2.5 sm:gap-3 overflow-hidden rounded-xl border px-3 py-2.5 sm:px-3.5 sm:py-3 text-start transition-all duration-500 hover:-translate-y-0.5 hover:brand-glow ${
                isActive
                  ? "border-brand bg-brand/10"
                  : "border-border bg-card hover:border-brand"
              }`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, var(--brand) 1px, transparent 1px)",
                  backgroundSize: "12px 12px",
                  maskImage:
                    "radial-gradient(circle at 100% 0%, black 0%, transparent 65%)",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-brand/25 to-transparent"
              />
              <span className="relative shrink-0 grid place-items-center size-8 sm:size-9 rounded-lg border border-brand/40 bg-background/70 backdrop-blur font-mono text-[10px] sm:text-[11px] font-black text-brand">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative min-w-0 flex-1">
                <h3 className="font-display text-[12px] sm:text-sm md:text-base font-extrabold leading-snug text-foreground group-hover:text-brand transition-colors break-words">
                  {lang === "ar" ? c.name_ar : c.name_en}
                </h3>
                <div className="mt-1 h-[2px] w-5 rounded-full bg-gradient-to-r from-brand via-accent to-transparent group-hover:w-full transition-all duration-500" />
              </div>
              <span className="relative shrink-0 grid place-items-center size-7 sm:size-8 rounded-full border border-border bg-background/70 backdrop-blur text-muted-foreground transition-all duration-500 group-hover:bg-brand group-hover:text-brand-foreground group-hover:border-brand group-hover:rotate-45">
                <ArrowUpRight className="size-3 sm:size-3.5" />
              </span>
            </Link>
          );
        })}
      </div>

      {showArrows && (
        <button
          type="button"
          aria-label="next"
          onClick={() => scrollBy(1)}
          className="hidden sm:grid absolute top-1/2 -translate-y-1/2 end-0 translate-x-1/2 rtl:-translate-x-1/2 z-10 place-items-center size-10 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all"
        >
          <ChevronRight className="size-5 rtl:hidden" />
          <ChevronLeft className="size-5 hidden rtl:block" />
        </button>
      )}
    </div>
  );
}
