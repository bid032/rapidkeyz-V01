import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, Clock, Lock, Users, SlidersHorizontal } from "lucide-react";
import { PageHero } from "@/components/PageHero";
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
      { title: "المتجر ، اشتراكات الذكاء الاصطناعي والترفيه | RapidKeyz" },
      {
        name: "description",
        content:
          "تصفّح جميع اشتراكات RapidKeyz: ChatGPT Plus، Midjourney، Canva Pro وأكثر ، بأسعار تنافسية وتسليم فوري.",
      },
      { property: "og:title", content: "المتجر ، RapidKeyz" },
      {
        property: "og:description",
        content: "كل اشتراكات الذكاء الاصطناعي والترفيه في مكان واحد بتسليم فوري ودفع آمن.",
      },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
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

      <PageHero
        title={t.nav.shop}
        eyebrow={lang === "ar" ? "كل الاشتراكات في مكان واحد" : "All subscriptions in one place"}
      />

      <div className="max-w-4xl mx-auto px-3 sm:px-6 -mt-4 mb-2 text-center">
        <p className="text-sm sm:text-base text-muted-foreground leading-loose">
          {lang === "ar"
            ? "تصفّح متجر RapidKeyz لشراء اشتراكات ChatGPT Plus وMidjourney وCanva Pro وأدوات الذكاء الاصطناعي والترفيه بالجنيه المصري. كل الاشتراكات أصلية 100%، مع تسليم فوري خلال دقائق وضمان طوال مدة الاشتراك."
            : "Browse RapidKeyz to buy ChatGPT Plus, Midjourney, Canva Pro and AI-tool subscriptions in EGP. Every plan is 100% genuine, delivered within minutes and guaranteed for its full duration."}
        </p>
      </div>

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


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto mb-12 max-w-4xl"
        >
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[160px] bg-brand/15 blur-[100px] rounded-full" />
          </div>
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-card/60 backdrop-blur px-4 sm:px-8 py-6 sm:py-8 shadow-lg">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
              <SlidersHorizontal className="size-3.5" />
              {lang === "ar" ? "فلترة سريعة" : "Quick filters"}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {([
                { key: "instant", type: "delivery", label: t.badges.instant, Icon: Zap, tone: "success" },
                { key: "manual", type: "delivery", label: t.badges.manual, Icon: Clock, tone: "success" },
                { key: "private", type: "account", label: t.badges.private, Icon: Lock, tone: "brand" },
                { key: "shared", type: "account", label: t.badges.shared, Icon: Users, tone: "brand" },
              ] as const).map(({ key, type, label, Icon, tone }, i) => {
                const active =
                  (type === "delivery" && search.delivery === key) ||
                  (type === "account" && search.account === key);
                const next =
                  type === "delivery"
                    ? { ...search, delivery: search.delivery === key ? undefined : (key as "instant" | "manual") }
                    : { ...search, account: search.account === key ? undefined : (key as "private" | "shared") };
                const activeCls =
                  tone === "success"
                    ? "bg-success/15 text-success border-success/50 shadow-[0_0_20px_-6px_hsl(var(--success)/0.6)]"
                    : "bg-brand/15 text-brand border-brand/50 brand-glow";
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.05 * i, duration: 0.35 }}
                  >
                    <Link
                      to="/shop"
                      search={next}
                      className={`group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all duration-300 hover:-translate-y-0.5 ${
                        active
                          ? activeCls
                          : "border-border bg-background/60 text-muted-foreground hover:border-brand/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {products.isLoading && <p className="text-muted-foreground">{t.common.loading}</p>}
        {products.data && products.data.length === 0 && (
          <p className="text-center text-muted-foreground py-16">
            {lang === "ar" ? "لا توجد منتجات تطابق البحث." : "No products match your filters."}
          </p>
        )}
        {products.data && (
          <div
            data-gsap="card-pop"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
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
