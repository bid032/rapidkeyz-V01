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
import { FAQ, FAQ_ITEMS_AR } from "@/components/FAQ";
import { HeroCanvas } from "@/components/HeroCanvas";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "اشتراكات ChatGPT Plus و Midjourney في مصر | RapidKeyz" },
      {
        name: "description",
        content:
          "اشترِ اشتراكات ChatGPT Plus، Midjourney، Office 365 وأدوات الذكاء الاصطناعي بأسعار مصرية وتسليم فوري خلال دقائق. ضمان 100% ودعم 24/7.",
      },
      { name: "keywords", content: "شراء ChatGPT Plus مصر, اشتراك Midjourney بالجنيه, Canva Pro اشتراك, Office 365, أدوات ذكاء اصطناعي, RapidKeyz" },
      { property: "og:title", content: "اشتراكات ChatGPT Plus و Midjourney في مصر | RapidKeyz" },
      {
        property: "og:description",
        content: "اشترِ اشتراكات ChatGPT Plus، Midjourney، Office 365 وأدوات الذكاء الاصطناعي بأسعار مصرية وتسليم فوري خلال دقائق. ضمان 100% ودعم 24/7.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS_AR.map((it) => ({
            "@type": "Question",
            name: it.q,
            acceptedAnswer: { "@type": "Answer", text: it.a },
          })),
        }),
      },
    ],
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
      <header className="relative py-16 sm:py-24 md:py-28 px-4 sm:px-6 overflow-hidden">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand/5 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(hsl(var(--brand)) 0.5px, transparent 0.5px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <section className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 sm:mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand/20 bg-brand/5 text-brand text-xs sm:text-sm font-medium"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
            </span>
            <span>{hero.badge}</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight mb-5 sm:mb-6"
            style={{ lineHeight: 1.15 }}
          >
            {hero.title1}
          </motion.h1>

          {/* Gradient subline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.6 }}
            className="inline-block mb-6 sm:mb-8"
          >
            <p className="text-xl sm:text-2xl md:text-3xl font-semibold bg-gradient-to-r from-brand via-foreground to-brand bg-clip-text text-transparent">
              {hero.title2}
            </p>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="max-w-2xl mx-auto text-muted-foreground text-base sm:text-lg md:text-xl leading-relaxed mb-10 sm:mb-12 px-2"
          >
            {hero.subtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16"
          >
            <Link
              to="/shop"
              className="group relative w-full sm:w-auto px-8 py-4 bg-brand text-brand-foreground font-bold rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-[0_0_20px_-4px_color-mix(in_oklab,var(--brand)_50%,transparent)] hover:shadow-[0_0_30px_-4px_color-mix(in_oklab,var(--brand)_70%,transparent)] text-center"
            >
              {hero.cta}
            </Link>
            <a
              href="https://wa.me/201284234815"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-card/50 hover:bg-card border border-border text-foreground font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>{hero.ctaSecondary}</span>
              <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-muted-foreground text-xs sm:text-sm font-medium">{hero.trusted}</p>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {["AI", "DS", "EN"].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-card border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-tighter"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1 text-brand">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-bold tracking-wide">4.9/5</span>
              </div>
            </div>
          </motion.div>
        </section>
      </header>


      {/* Categories , centered creative pill grid */}
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
              {lang === "ar" ? "لا توجد منتجات بعد ، أضفها من لوحة الأدمن." : "No products yet ، add them from the admin panel."}
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

      <FAQ />

      <Footer />

    </div>
  );
}

