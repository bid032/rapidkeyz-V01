import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
import { BrandsStrip } from "@/components/BrandsStrip";
import { lazyClient } from "@/components/ClientOnly";

const HeroCanvas = lazyClient(() => import("@/components/HeroCanvas").then((m) => ({ default: m.HeroCanvas })));
const Logo3D = lazyClient(() => import("@/components/Logo3D").then((m) => ({ default: m.Logo3D })));
const FloatingLogos = lazyClient(() => import("@/components/FloatingLogos").then((m) => ({ default: m.FloatingLogos })));
import { CategoryRows } from "@/components/CategoryRows";
import { ViewAllButton } from "@/components/ViewAllButton";

import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "اشتراكات ChatGPT Plus و Midjourney في مصر | RapidKeyz" },
      {
        name: "description",
        content:
          "اشترِ اشتراكات ChatGPT Plus، Midjourney، Office 365 وأدوات الـ Ai بأسعار مصرية وتسليم فوري خلال دقائق. ضمان 100% ودعم 24/7.",
      },
      { name: "keywords", content: "شراء ChatGPT Plus مصر, اشتراك Midjourney بالجنيه, Canva Pro اشتراك, Office 365, أدوات ذكاء اصطناعي, RapidKeyz" },
      { property: "og:title", content: "اشتراكات ChatGPT Plus و Midjourney في مصر | RapidKeyz" },
      {
        property: "og:description",
        content: "اشترِ اشتراكات ChatGPT Plus، Midjourney، Office 365 وأدوات الـ Ai بأسعار مصرية وتسليم فوري خلال دقائق. ضمان 100% ودعم 24/7.",
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
      "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, product_plans(id, price, label_ar, label_en, is_active, sort_order)",
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
      cheapestPlanId: cheapest?.id ?? null,
      planLabel_ar: cheapest?.label_ar ?? null,
      planLabel_en: cheapest?.label_en ?? null,
    };
  });
}

async function fetchBestSellers(): Promise<ProductCardData[]> {
  // Sum quantities per product across paid/delivered orders
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity, orders!inner(status)")
    .in("orders.status", ["paid", "delivered"]);
  const counts = new Map<string, number>();
  for (const it of (items ?? []) as any[]) {
    if (!it.product_id) continue;
    counts.set(it.product_id, (counts.get(it.product_id) ?? 0) + Number(it.quantity ?? 1));
  }
  const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
  if (topIds.length === 0) return [];
  const { data } = await supabase
    .from("products")
    .select("id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, product_plans(id, price, label_ar, label_en, is_active, sort_order)")
    .in("id", topIds)
    .eq("status", "active");
  const byId = new Map((data ?? []).map((p: any) => [p.id, p]));
  return topIds.flatMap((id) => {
    const p: any = byId.get(id);
    if (!p) return [];
    const activePlans = (p.product_plans ?? []).filter((pl: any) => pl.is_active);
    const cheapest = activePlans.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
    return [{
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
      cheapestPlanId: cheapest?.id ?? null,
      planLabel_ar: cheapest?.label_ar ?? null,
      planLabel_en: cheapest?.label_en ?? null,
    }];
  });
}


function HomePage() {
  const { t, lang } = useApp();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const products = useQuery({ queryKey: ["featured-products"], queryFn: fetchFeaturedProducts });
  const bestSellers = useQuery({ queryKey: ["best-sellers"], queryFn: fetchBestSellers });
  const trending = (products.data ?? []).slice(0, 3);
  const trendingLabels = ["TRENDING", "NEW", "HOT"];
  const heroSetting = useQuery({
    queryKey: ["site-settings", "hero"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "hero").maybeSingle();
      return (data?.value as any) ?? {};
    },
  });
  const h = hydrated ? (heroSetting.data ?? {}) : {};
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

      {/* Hero — Kinetic Brand Monolith */}
      <header className="relative overflow-hidden pt-4 pb-10 sm:pt-8 sm:pb-16">
        <HeroCanvas />
        <FloatingLogos />

        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6">
          <section
            className="relative rounded-[1.75rem] sm:rounded-[2.5rem] bg-card/60 backdrop-blur-xl border border-border/40 overflow-hidden shadow-[0_30px_120px_-40px_rgba(0,0,0,0.6)]"
          >
            {/* Ambient blurred orbs inside frame */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 -right-24 w-[55%] h-[55%] rounded-full bg-brand/15 blur-[120px]" />
              <div className="absolute -bottom-24 -left-16 w-[45%] h-[50%] rounded-full bg-accent/15 blur-[120px]" />
            </div>

            {/* Oversized ghost brand mark */}
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 sm:-left-24 sm:-top-24 opacity-[0.06]">
              <svg width="620" height="620" viewBox="0 0 100 100" fill="none">
                <path d="M20 20H50C65 20 75 30 75 45C75 60 65 70 50 70H35V90M35 70L75 90"
                      stroke="hsl(var(--brand))" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Grid overlay */}
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
                 style={{
                   backgroundImage:
                     "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
                   backgroundSize: "44px 44px",
                 }} />

            <div className="relative grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-10 lg:gap-14 items-center p-6 sm:p-10 lg:p-16 min-h-[560px] lg:min-h-[680px]">
              {/* Content column */}
              <div className="relative order-2 lg:order-1 text-right">
                {/* Live pill */}
                <div data-gsap="reveal" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 border border-brand/25 mb-5 sm:mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
                  </span>
                  <span className="text-brand text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase font-mono">
                    {hero.badge || "INSTANT DELIVERY"}
                  </span>
                </div>

                <h1
                  data-gsap="split-words"
                  className="font-display font-bold text-[clamp(2.4rem,7vw,5rem)] leading-[1.08] tracking-tight text-foreground"
                >
                  {hero.title1}
                  <br />
                  <span className="brand-text">{hero.title2}</span>
                </h1>

                <p
                  data-gsap="reveal"
                  className="mt-5 sm:mt-7 text-base sm:text-xl text-muted-foreground max-w-xl leading-relaxed"
                >
                  {hero.subtitle}
                </p>

                <div className="mt-7 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link
                    to="/shop"
                    data-gsap="magnetic"
                    data-strength="0.3"
                    className="group relative inline-flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 bg-brand text-brand-foreground font-bold rounded-2xl brand-glow hover:shadow-[0_0_60px_-8px_var(--brand-glow)] transition-shadow font-display"
                  >
                    <span>{hero.cta}</span>
                    <span className="grid place-items-center size-7 rounded-full bg-brand-foreground/15 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">→</span>
                  </Link>
                  <a
                    href="https://wa.me/201284234815"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 bg-foreground/5 hover:bg-foreground/10 border border-border/60 hover:border-brand/40 rounded-2xl text-foreground font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    <span>{hero.ctaSecondary}</span>
                  </a>
                </div>

                {/* Stat cards */}
                <div data-gsap="reveal-stagger" className="mt-8 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {[
                    { n: "24/7", l: "دعم فوري" },
                    { n: "+15k", l: "عملاء" },
                    { n: "4.9★", l: "تقييم" },
                    { n: "60s", l: "تسليم" },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="rounded-xl sm:rounded-2xl bg-foreground/5 border border-border/50 backdrop-blur px-3 py-3 sm:px-4 sm:py-4"
                    >
                      <div className="font-display font-bold text-xl sm:text-2xl text-foreground mb-1 text-glow">{s.n}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-tight">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual column — R Monolith (desktop only) */}
              <div className="hidden lg:flex order-1 lg:order-2 relative justify-center items-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-brand opacity-25 blur-[110px] group-hover:opacity-40 transition-opacity" />

                  <div className="relative">
                    <Logo3D className="w-72 xl:w-80" />

                    {/* Floating badge */}
                    <div className="absolute -bottom-2 -right-2 bg-card/95 border border-brand/60 px-4 py-3 rounded-2xl rotate-3 shadow-xl backdrop-blur">
                      <p className="text-brand text-xs font-bold tracking-widest uppercase font-mono">Premium Access</p>
                    </div>

                    {/* Trending mini-card */}
                    {trending[0] && (
                      <Link
                        to="/product/$slug"
                        params={{ slug: trending[0].slug }}
                        data-gsap="tilt"
                        className="absolute -top-4 -left-6 block p-3.5 rounded-2xl bg-card/90 border border-border/60 backdrop-blur -rotate-6 hover:brand-glow transition w-52"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {trending[0].icon_url && (
                            <img src={trending[0].icon_url} alt="" loading="lazy" className="size-6 rounded-md object-cover ring-1 ring-border/60" />
                          )}
                          <div className="text-[10px] font-mono uppercase tracking-widest text-brand">TRENDING</div>
                        </div>
                        <div className="font-display font-bold text-sm leading-tight line-clamp-1">
                          {lang === "ar" ? trending[0].name_ar : trending[0].name_en}
                        </div>
                        {trending[0].minPrice !== null && (
                          <div className="mt-1 text-xs text-brand font-bold">
                            {trending[0].minPrice} {t.common.currency}
                          </div>
                        )}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </header>

      {/* Brands strip , auto-scrolling logos of every tool we cover */}
      <BrandsStrip />

      {/* Categories , small 4-across clickable pills */}
      <CategoriesShowcase
        compact
        mini
        slugs={["design", "ai-tools", "software", "educational"]}
      />

      {/* AI Tools + Designers rows */}
      <CategoryRows slugs={["ai-tools", "design"]} />

      {/* Best Sellers , fallback to featured products when no order history yet */}
      {(() => {
        const list = (bestSellers.data && bestSellers.data.length > 0)
          ? bestSellers.data
          : (products.data ?? []);
        if (!list.length) return null;
        return (
          <section className="relative max-w-7xl mx-auto px-3 sm:px-6 py-12 sm:py-20">
            <div className="mb-6 sm:mb-10 flex items-end justify-between gap-6">
              <div>
                <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-brand mb-2">
                  {lang === "ar" ? "الأكثر طلباً" : "Top ordered"}
                </div>
                <h2
                  data-gsap="split-words"
                  className="font-display font-bold text-3xl sm:text-5xl leading-[1.05] tracking-tight"
                >
                  {lang === "ar" ? "الأكثر مبيعاً" : "Best Sellers"}
                </h2>
              </div>
              <ViewAllButton to="/shop" />
            </div>
            <div data-gsap="card-pop" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {list.slice(0, 8).map((p) => (
                <div key={p.id} data-gsap="tilt">
                  <ProductCard p={p} />
                </div>
              ))}
            </div>
          </section>
        );
      })()}


      <TrustSection />

      <Testimonials />

      <FAQ />

      <Footer />

    </div>
  );
}

