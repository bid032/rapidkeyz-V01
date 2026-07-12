import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Testimonials } from "@/components/Testimonials";
import { TrustSection } from "@/components/TrustSection";
import { CategoriesShowcase } from "@/components/CategoriesShowcase";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RapidKeyz — اشتراكات ChatGPT Plus وMidjourney وNetflix بأسعار منافسة" },
      {
        name: "description",
        content:
          "اشترِ اشتراكات ChatGPT Plus وMidjourney وNetflix وأدوات الذكاء الاصطناعي بتسليم فوري ودعم عربي 24/7. دفع آمن عبر Paymob وKashier.",
      },
      { property: "og:title", content: "RapidKeyz — اشتراكات الذكاء الاصطناعي والترفيه" },
      {
        property: "og:description",
        content: "متجر عربي موثوق لاشتراكات ChatGPT Plus وMidjourney وNetflix — تسليم فوري ودعم مستمر.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});


async function fetchFeaturedProducts(): Promise<ProductCardData[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, product_plans(price, label_ar, label_en, is_active, sort_order)",
    )
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(9);
  if (error) throw error;
  return (data ?? []).map((p) => {
    const activePlans = (p.product_plans ?? []).filter((pl: any) => pl.is_active);
    const cheapest = activePlans.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
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
      discount_percent: (p as any).discount_percent ?? 0,
      minPrice: cheapest ? Number(cheapest.price) : null,
      planLabel_ar: cheapest?.label_ar ?? null,
      planLabel_en: cheapest?.label_en ?? null,
    };
  });
}

function HomePage() {
  const { t, lang } = useApp();

  const products = useQuery({ queryKey: ["featured-products"], queryFn: fetchFeaturedProducts });
  const heroSetting = useQuery({
    queryKey: ["site-settings", "hero"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "hero").maybeSingle();
      return (data?.value as any) ?? {};
    },
  });
  const h = heroSetting.data ?? {};
  const pick = (ar: string, en: string, fallback: string) =>
    (lang === "ar" ? h[ar] : h[en])?.toString().trim() || fallback;
  const hero = {
    badge: pick("badge_ar", "badge_en", t.home.badge),
    title1: pick("title1_ar", "title1_en", t.home.title1),
    title2: pick("title2_ar", "title2_en", t.home.title2),
    subtitle: pick("subtitle_ar", "subtitle_en", t.home.subtitle),
    cta: pick("cta_ar", "cta_en", t.home.cta),
    ctaSecondary: pick("cta_secondary_ar", "cta_secondary_en", t.home.ctaSecondary),
    trusted: pick("trusted_ar", "trusted_en", t.home.trusted),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <header className="relative py-12 sm:py-20 md:py-24 px-3 sm:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold mb-4 sm:mb-6 tracking-wide uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
            </span>
            {hero.badge}
          </motion.div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-4 sm:mb-6 leading-[1.1] max-w-4xl">
            <motion.span
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block"
            >
              {hero.title1}
            </motion.span>{" "}
            <br />
            <motion.span
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-brand to-cyan-400"
            >
              {hero.title2}
            </motion.span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="max-w-2xl text-muted-foreground text-sm sm:text-base md:text-lg mb-6 sm:mb-10 leading-relaxed px-2"
          >
            {hero.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-3 sm:gap-4"
          >
            <Link
              to="/shop"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-brand text-brand-foreground rounded-xl text-sm sm:text-base font-bold hover:brand-glow transition-all hover:scale-[1.03]"
            >
              {hero.cta}
            </Link>
            <a
              href="https://wa.me/201284234815"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-bold border border-border hover:bg-muted transition-all"
            >
              {hero.ctaSecondary}
            </a>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="mt-8 sm:mt-10 flex items-center gap-3"
          >
            <div className="flex -space-x-3 rtl:space-x-reverse">
              {["AI", "DS", "EN"].map((i) => (
                <div
                  key={i}
                  className="size-9 sm:size-10 rounded-full border-2 border-background bg-card grid place-items-center text-[10px] font-bold"
                >
                  {i}
                </div>
              ))}
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">{hero.trusted}</span>
          </motion.div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand/20 blur-[120px] rounded-full -z-0 opacity-50"></div>
      </header>

      {/* Categories — centered creative pill grid */}
      <CategoriesShowcase />



      {/* Products */}
      <main id="trending" className="max-w-7xl mx-auto px-3 sm:px-6 pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8 sm:mb-12"
        >
          <h2 className="text-xl sm:text-2xl font-bold">{t.home.trending}</h2>
          <Link to="/shop" className="text-xs sm:text-sm font-bold text-brand hover:underline">
            {t.home.viewAll} →
          </Link>
        </motion.div>

        {products.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        )}
        {products.data && products.data.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">
              {lang === "ar" ? "لا توجد منتجات بعد — أضفها من لوحة الأدمن." : "No products yet — add them from the admin panel."}
            </p>
          </div>
        )}
        {products.data && products.data.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.data.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProductCard p={p} />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <TrustSection />

      <Testimonials />

      <Footer />
    </div>
  );
}

