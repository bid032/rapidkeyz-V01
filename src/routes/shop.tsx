import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { CategoriesShowcase } from "@/components/CategoriesShowcase";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  category: z.string().optional(),
  delivery: z.enum(["instant", "manual"]).optional(),
  account: z.enum(["private", "shared"]).optional(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "المتجر — RapidKeyz" },
      { name: "description", content: "تصفّح جميع اشتراكات الذكاء الاصطناعي والترفيه على RapidKeyz." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ShopPage,
});

async function fetchProducts(filters: z.infer<typeof searchSchema>): Promise<ProductCardData[]> {
  let q = supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, categories!inner(slug), product_plans(price, label_ar, label_en, is_active)",
    )
    .eq("status", "active");
  if (filters.category) q = q.eq("categories.slug", filters.category);
  if (filters.delivery) q = q.eq("delivery_type", filters.delivery);
  if (filters.account) q = q.eq("account_type", filters.account);
  const { data, error } = await q.order("sort_order");
  if (error) throw error;
  return (data ?? []).map((p: any) => {
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
      discount_percent: p.discount_percent ?? 0,
      minPrice: cheapest ? Number(cheapest.price) : null,
      planLabel_ar: cheapest?.label_ar ?? null,
      planLabel_en: cheapest?.label_en ?? null,
    };
  });
}

function ShopPage() {
  const search = Route.useSearch();
  const { t, lang } = useApp();
  const products = useQuery({
    queryKey: ["products", search],
    queryFn: () => fetchProducts(search),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero title — centered animated */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[260px] bg-brand/20 blur-[120px] rounded-full opacity-60" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,hsl(var(--background))_70%)]" />
        </div>
        <div className="max-w-4xl mx-auto px-3 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] mb-5"
          >
            <span className="size-1.5 rounded-full bg-brand animate-pulse" />
            {lang === "ar" ? "كل الاشتراكات في مكان واحد" : "All subscriptions in one place"}
          </motion.div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-[0.95]">
            <motion.span
              initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-brand via-cyan-400 to-brand"
            >
              {t.nav.shop}
            </motion.span>
          </h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 h-1 w-24 sm:w-32 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent origin-center"
          />
        </div>
      </section>

      <CategoriesShowcase activeSlug={search.category} />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-12">
        {search.category && (
          <div className="mb-6 flex justify-center">
            <Link
              to="/shop"
              search={{}}
              className="px-5 py-2 rounded-full text-xs sm:text-sm font-bold border border-border bg-card hover:border-brand hover:text-brand transition"
            >
              {t.filters.all}
            </Link>
          </div>
        )}


        <div className="flex flex-wrap gap-2 mb-8">
          {(["instant", "manual"] as const).map((d) => (
            <Link
              key={d}
              to="/shop"
              search={{ ...search, delivery: search.delivery === d ? undefined : d }}
              className={`px-3 py-1.5 rounded text-xs font-bold border ${
                search.delivery === d ? "bg-success/20 text-success border-success/40" : "border-border text-muted-foreground"
              }`}
            >
              {d === "instant" ? t.badges.instant : t.badges.manual}
            </Link>
          ))}
          {(["private", "shared"] as const).map((a) => (
            <Link
              key={a}
              to="/shop"
              search={{ ...search, account: search.account === a ? undefined : a }}
              className={`px-3 py-1.5 rounded text-xs font-bold border ${
                search.account === a ? "bg-brand/20 text-brand border-brand/40" : "border-border text-muted-foreground"
              }`}
            >
              {a === "private" ? t.badges.private : t.badges.shared}
            </Link>
          ))}
        </div>

        {products.isLoading && <p className="text-muted-foreground">{t.common.loading}</p>}
        {products.data && products.data.length === 0 && (
          <p className="text-center text-muted-foreground py-16">
            {lang === "ar" ? "لا توجد منتجات تطابق البحث." : "No products match your filters."}
          </p>
        )}
        {products.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.data.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
