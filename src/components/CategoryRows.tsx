import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { ViewAllButton } from "@/components/ViewAllButton";
import { useApp } from "@/contexts/AppContext";


type CategoryRow = {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string | null;
  products: ProductCardData[];
};

async function fetchCategoryRows(slugs?: string[]): Promise<CategoryRow[]> {
  let q = supabase
    .from("categories")
    .select("id, slug, name_ar, name_en, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (slugs && slugs.length) q = q.in("slug", slugs);
  else q = q.limit(4);
  const { data: cats, error } = await q;
  if (error) throw error;

  const rows = await Promise.all(
    (cats ?? []).map(async (c) => {
      const { data: prods } = await supabase
        .from("products")
        .select(
          "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, product_plans(id, price, label_ar, label_en, is_active, sort_order)",
        )
        .eq("status", "active")
        .or(`category_id.eq.${c.id},category_ids.cs.{${c.id}}`)
        .order("sort_order", { ascending: true })
        .limit(8);
      const mapped: ProductCardData[] = (prods ?? []).map((p: any) => {
        const active = (p.product_plans ?? []).filter((pl: any) => pl.is_active);
        const cheapest = active.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
        return {
          id: p.id,
          slug: p.slug,
          name_ar: p.name_ar,
          name_en: p.name_en,
          description_ar: p.description_ar,
          description_en: p.description_en,
          icon_url: p.icon_url,
          delivery_type: p.delivery_type,
          account_type: p.account_type,
          discount_percent: p.discount_percent,
          minPrice: cheapest ? Number(cheapest.price) : null,
          cheapestPlanId: cheapest?.id ?? null,
          planLabel_ar: cheapest?.label_ar ?? null,
          planLabel_en: cheapest?.label_en ?? null,
        } as ProductCardData;
      });
      return { id: c.id, slug: c.slug, name_ar: c.name_ar, name_en: c.name_en, products: mapped };
    }),
  );
  // Preserve requested slug order if provided
  const ordered = slugs && slugs.length
    ? slugs.map((s) => rows.find((r) => r.slug === s)).filter(Boolean) as CategoryRow[]
    : rows;
  return ordered.filter((r) => r.products.length > 0);
}

export function CategoryRows({ slugs }: { slugs?: string[] } = {}) {
  const { lang } = useApp();
  const { data } = useQuery({
    queryKey: ["category-rows", slugs?.join(",") ?? "top4"],
    queryFn: () => fetchCategoryRows(slugs),
  });
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

