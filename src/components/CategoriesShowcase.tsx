import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles } from "lucide-react";
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
      {/* decorative moving orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          data-gsap="parallax"
          data-speed="0.6"
          className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-brand/15 blur-3xl"
        />
        <div
          data-gsap="parallax"
          data-speed="0.35"
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-[--brand-deep]/25 blur-3xl"
        />
      </div>

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



      <div
        data-gsap="card-pop"
        className={
          mini
            ? "grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 max-w-4xl mx-auto"
            : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
        }
      >
        {cats.data.map((c, i) => {
          const isActive = activeSlug === c.slug;
          if (mini) {
            return (
              <Link
                key={c.id}
                to="/shop"
                search={{ category: c.slug }}
                data-gsap="magnetic"
                data-strength="0.2"
                className={`group relative flex items-center gap-2.5 sm:gap-3 overflow-hidden rounded-xl border px-3 py-2.5 sm:px-3.5 sm:py-3 text-start transition-all duration-500 hover:-translate-y-0.5 hover:brand-glow ${
                  isActive
                    ? "border-brand bg-brand/10"
                    : "border-border bg-card hover:border-brand"
                }`}
              >
                {/* dotted grid background */}
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

                {/* diagonal shine sweep */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-brand/25 to-transparent"
                />

                {/* index badge */}
                <span className="relative shrink-0 grid place-items-center size-8 sm:size-9 rounded-lg border border-brand/40 bg-background/70 backdrop-blur font-mono text-[10px] sm:text-[11px] font-black text-brand">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* title — always visible */}
                <div className="relative min-w-0 flex-1">
                  <h3 className="font-display text-[13px] sm:text-sm md:text-base font-extrabold leading-tight text-foreground group-hover:text-brand transition-colors truncate">
                    {lang === "ar" ? c.name_ar : c.name_en}
                  </h3>
                  <div className="mt-1 h-[2px] w-5 rounded-full bg-gradient-to-r from-brand via-accent to-transparent group-hover:w-full transition-all duration-500" />
                </div>

                {/* arrow */}
                <span className="relative shrink-0 grid place-items-center size-7 sm:size-8 rounded-full border border-border bg-background/70 backdrop-blur text-muted-foreground transition-all duration-500 group-hover:bg-brand group-hover:text-brand-foreground group-hover:border-brand group-hover:rotate-45">
                  <ArrowUpRight className="size-3 sm:size-3.5" />
                </span>
              </Link>
            );


          }
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
                {/* gradient border glow on hover */}
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


                {/* glow blobs */}
                <div className="pointer-events-none absolute -top-16 -end-16 size-40 rounded-full bg-brand/25 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="pointer-events-none absolute -bottom-16 -start-16 size-40 rounded-full bg-[--brand-deep]/25 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* shine sweep */}
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
    </section>
  );
}

