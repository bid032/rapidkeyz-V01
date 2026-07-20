import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

type BrandItem = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  icon_url: string | null;
};

async function fetchBrands(): Promise<BrandItem[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name_ar, name_en, icon_url")
    .eq("status", "active")
    .not("icon_url", "is", null)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(40);
  if (error) throw error;
  return (data ?? []) as BrandItem[];
}

export function BrandsStrip() {
  const { lang } = useApp();
  const { data } = useQuery({ queryKey: ["brands-strip"], queryFn: fetchBrands });
  const items = data ?? [];
  if (items.length === 0) return null;

  // Repeat enough times so the track is always wider than the viewport.
  const repeatCount = Math.max(4, Math.ceil(24 / Math.max(items.length, 1)) * 2);
  const loop = Array.from({ length: repeatCount }, () => items).flat();

  return (
    <section className="relative -mt-2 py-6 sm:py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center mb-4 sm:mb-5">
        <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-brand mb-2">
          {lang === "ar" ? "شركاؤنا الرقميون" : "Our digital lineup"}
        </div>
        <h2
          data-gsap="split-words"
          className="font-display font-bold text-2xl sm:text-4xl leading-tight tracking-tight"
        >
          {lang === "ar" ? "البرامج والأدوات المتوفرة عندنا" : "Apps & tools we cover"}
        </h2>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">
          {lang === "ar"
            ? "اشتراكات أصلية 100% بأفضل الأسعار في مصر"
            : "100% original subscriptions at the best prices"}
        </p>
      </div>

      {/* Edge fade masks , constrained to same width as other home sliders */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-4 sm:start-6 w-16 sm:w-24 z-10 bg-gradient-to-r from-background to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-4 sm:end-6 w-16 sm:w-24 z-10 bg-gradient-to-l from-background to-transparent"
        />

        <div className="brands-marquee overflow-hidden rounded-2xl" dir="ltr">
          <div className="brands-track">
            {loop.map((p, i) => {
              const name = lang === "ar" ? p.name_ar : p.name_en;
              return (
                <Link
                  key={`${p.id}-${i}`}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  aria-label={name}
                  title={name}
                  className="brands-item group shrink-0 flex flex-col items-center justify-center gap-2 mx-2 sm:mx-3"
                >
                  <div className="size-16 sm:size-20 rounded-2xl bg-card/70 backdrop-blur border border-border/60 grid place-items-center overflow-hidden transition-all duration-300 group-hover:border-brand/70 group-hover:brand-glow group-hover:-translate-y-1">
                    {p.icon_url ? (
                      <img
                        src={p.icon_url}
                        alt={name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-display font-bold text-brand text-lg">
                        {name?.[0] ?? "?"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1 max-w-[80px] sm:max-w-[96px] text-center">
                    {name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

    </section>
  );
}
