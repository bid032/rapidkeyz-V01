import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import { brandsStripQuery } from "@/lib/public-queries";

export function BrandsStrip() {
  const { lang } = useApp();
  const { data } = useQuery(brandsStripQuery());
  const items = data ?? [];
  if (items.length === 0) return null;

  // Repeat enough times so the track is always wider than the viewport.
  const repeatCount = Math.max(4, Math.ceil(24 / Math.max(items.length, 1)) * 2);
  const loop = Array.from({ length: repeatCount }, () => items).flat();

  return (
    <section className="relative -mt-2 py-6 sm:py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center mb-4 sm:mb-5">
        <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-brand mb-2">
          {lang === "ar" ? "" : "Our digital lineup"}
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

      {/* True transparency fade via CSS mask , works over any background */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div
          className="brands-marquee rounded-2xl py-4 sm:py-6"
          dir="ltr"
          style={{
            overflowX: "hidden",
            overflowY: "visible",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%)",
          }}
        >
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
                    {p.loading_icon_url ? (
                      <img
                        src={p.loading_icon_url}
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
