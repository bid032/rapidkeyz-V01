import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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

export function CategoriesShowcase({ activeSlug }: { activeSlug?: string }) {
  const { lang } = useApp();
  const cats = useQuery({
    queryKey: ["cats-showcase"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name_ar, name_en")
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as Category[];
    },
  });

  if (!cats.data || cats.data.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-12 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 sm:mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-4">
          <Sparkles className="size-3.5" />
          {lang === "ar" ? "الأقسام" : "Browse by category"}
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          {lang === "ar" ? (
            <>
              تسوّق حسب <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-cyan-400">القسم</span> :
            </>
          ) : (
            <>
              Shop by <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-cyan-400">category</span> , AI tools & design software in Egypt
            </>
          )}
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {cats.data.map((c, i) => {
          const isActive = activeSlug === c.slug;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to="/shop"
                search={{ category: c.slug }}
                className={`group relative block h-full overflow-hidden rounded-2xl border p-5 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:brand-glow ${
                  isActive
                    ? "border-brand bg-brand/10"
                    : "border-border bg-card hover:border-brand/60"
                }`}
              >
                {/* decorative gradient */}
                <div className="pointer-events-none absolute -top-16 -end-16 size-40 rounded-full bg-brand/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 sm:mb-3">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-base sm:text-xl md:text-2xl font-extrabold leading-tight group-hover:text-brand transition-colors">
                      {lang === "ar" ? c.name_ar : c.name_en}
                    </h3>
                  </div>
                  <span className="shrink-0 grid place-items-center size-9 sm:size-11 rounded-full border border-border bg-background/60 text-muted-foreground group-hover:bg-brand group-hover:text-brand-foreground group-hover:border-brand group-hover:rotate-45 transition-all duration-300">
                    <ArrowUpRight className="size-4 sm:size-5" />
                  </span>
                </div>

                <div className="relative mt-6 sm:mt-8 flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-muted-foreground group-hover:text-brand transition-colors">
                  <span className="h-px flex-1 bg-border group-hover:bg-brand/40 transition-colors" />
                  <span>{lang === "ar" ? "استكشف الآن" : "Explore"}</span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
