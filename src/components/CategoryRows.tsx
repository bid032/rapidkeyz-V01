import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { ViewAllButton } from "@/components/ViewAllButton";
import { useApp } from "@/contexts/AppContext";
import { categoryRowsQuery, type CategoryRow } from "@/lib/public-queries";


export function CategoryRows({ slugs }: { slugs?: string[] } = {}) {
  const { lang } = useApp();
  const { data } = useQuery(categoryRowsQuery(slugs));
  if (!data || data.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-10 sm:py-16 space-y-12">
      {data.map((cat) => (
        <CategoryRowStrip key={cat.id} cat={cat} lang={lang} />
      ))}
    </section>
  );
}

function CategoryRowStrip({ cat, lang }: { cat: CategoryRow; lang: string }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  // In RTL, browsers report scrollLeft as negative. Normalize to a positive
  // logical position in [0, max] so pagination works in both directions.
  const scrollByPage = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const page = el.clientWidth;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    const isRtl = lang === "ar";
    const currentAbs = Math.abs(el.scrollLeft);
    let nextAbs = currentAbs + (dir > 0 ? page : -page);
    if (nextAbs > max - 4) nextAbs = 0;
    if (nextAbs < 0) nextAbs = max;
    el.scrollTo({ left: isRtl ? -nextAbs : nextAbs, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (!isDesktop) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      scrollByPage(1);
    }, 4500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const nudge = (dir: number) => {
    pausedRef.current = true;
    scrollByPage(dir);
    window.setTimeout(() => (pausedRef.current = false), 2500);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-4 sm:mb-6 gap-4">
        <h2 className="font-display font-bold text-2xl sm:text-4xl tracking-tight">
          {lang === "ar" ? cat.name_ar : cat.name_en}
        </h2>
        <ViewAllButton to="/shop" search={{ category: cat.slug }} />
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="prev"
          onClick={() => nudge(-1)}
          className="hidden md:grid shrink-0 place-items-center size-11 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all"
        >
          <ChevronLeft className="size-5 rtl:hidden" />
          <ChevronRight className="size-5 hidden rtl:block" />
        </button>

        <div
          ref={scrollerRef}
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onTouchStart={() => (pausedRef.current = true)}
          onTouchEnd={() => (pausedRef.current = false)}
          className="flex-1 min-w-0 flex gap-3 sm:gap-4 overflow-x-auto pb-3 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
        >
          {cat.products.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className="snap-start shrink-0 w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1rem*2)/3)] lg:w-[calc((100%-1rem*3)/4)]"
            >
              <ProductCard p={p} />
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="next"
          onClick={() => nudge(1)}
          className="hidden md:grid shrink-0 place-items-center size-11 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all"
        >
          <ChevronRight className="size-5 rtl:hidden" />
          <ChevronLeft className="size-5 hidden rtl:block" />
        </button>
      </div>


    </div>
  );
}

