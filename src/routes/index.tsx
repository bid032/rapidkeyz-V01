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
  const mapRow = (p: any): ProductCardData => {
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
      discount_percent: p.discount_percent ?? 0,
      minPrice: cheapest ? Number(cheapest.price) : null,
      cheapestPlanId: cheapest?.id ?? null,
      planLabel_ar: cheapest?.label_ar ?? null,
      planLabel_en: cheapest?.label_en ?? null,
    };
  };

  const productSelect =
    "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, is_bestseller, product_plans(id, price, label_ar, label_en, is_active, sort_order)";

  // 1) Manually flagged products by admin
  const { data: manual } = await supabase
    .from("products")
    .select(productSelect)
    .eq("status", "active")
    .eq("is_bestseller", true)
    .order("sort_order", { ascending: true })
    .limit(12);
  const manualList = (manual ?? []).map(mapRow);
  if (manualList.length >= 4) return manualList.slice(0, 8);

  // 2) Fallback: auto-compute from paid/delivered order items
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity, orders!inner(status)")
    .in("orders.status", ["paid", "delivered"]);
  const counts = new Map<string, number>();
  for (const it of (items ?? []) as any[]) {
    if (!it.product_id) continue;
    counts.set(it.product_id, (counts.get(it.product_id) ?? 0) + Number(it.quantity ?? 1));
  }
  const excludeIds = new Set(manualList.map((p) => p.id));
  const topIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .filter((id) => !excludeIds.has(id))
    .slice(0, 8 - manualList.length);
  if (topIds.length === 0) return manualList;
  const { data } = await supabase
    .from("products")
    .select(productSelect)
    .in("id", topIds)
    .eq("status", "active");
  const byId = new Map((data ?? []).map((p: any) => [p.id, p]));
  const autoList = topIds.flatMap((id) => {
    const p: any = byId.get(id);
    return p ? [mapRow(p)] : [];
  });
  return [...manualList, ...autoList];
}



function HomePage() {
  const { t, lang } = useApp();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const products = useQuery({ queryKey: ["featured-products"], queryFn: fetchFeaturedProducts });
  const bestSellers = useQuery({ queryKey: ["best-sellers"], queryFn: fetchBestSellers });
  const priceOf = (p: any) => {
    if (!p || p.minPrice == null) return null;
    const d = Number(p.discount_percent ?? 0);
    const v = d > 0 ? Math.round(p.minPrice * (100 - d)) / 100 : p.minPrice;
    return `${v} ${lang === "ar" ? "ج.م" : "EGP"}`;
  };
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

  // Resolve trending/new cards: admin-selected slugs take priority, then fall back to featured list
  const trendingSlug = (h.trending_slug || "").toString().trim();
  const newSlug = (h.new_slug || "").toString().trim();
  const heroPicksNeeded = [trendingSlug, newSlug].filter(Boolean);
  const heroPicks = useQuery({
    queryKey: ["hero-picks", trendingSlug, newSlug],
    enabled: heroPicksNeeded.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select(
          "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, product_plans(id, price, label_ar, label_en, is_active, sort_order)",
        )
        .in("slug", heroPicksNeeded);
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
          cheapestPlanId: cheapest?.id ?? null,
          planLabel_ar: cheapest?.label_ar ?? null,
          planLabel_en: cheapest?.label_en ?? null,
        } as ProductCardData;
      });
    },
  });
  const featured = products.data ?? [];
  const bySlug = (s: string) =>
    (heroPicks.data ?? []).find((p) => p.slug === s) ?? featured.find((p) => p.slug === s);
  const trendingCard = (trendingSlug && bySlug(trendingSlug)) || featured[0];
  const newCard = (newSlug && bySlug(newSlug)) || featured.find((p) => p.slug !== trendingCard?.slug) || featured[1];
  const trending = [trendingCard, newCard].filter(Boolean) as ProductCardData[];
  const trendingLabels = ["TRENDING", "NEW", "HOT"];



  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero — Balanced Split */}
      <header className="relative overflow-hidden pt-4 pb-6 sm:pt-8 sm:pb-10 lg:pt-10 lg:pb-12">
        <HeroCanvas />
        <FloatingLogos />

        {/* Ambient radial glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute top-10 -end-24 w-[420px] h-[420px] rounded-full bg-brand/10 blur-[120px]" />
          <div className="absolute -bottom-20 -start-16 w-[380px] h-[380px] rounded-full bg-accent/10 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center">
            {/* Content Side */}
            <div className="md:col-span-7 order-2 md:order-1 flex flex-col items-center md:items-start text-center md:text-end space-y-4 sm:space-y-5">


              {/* Live pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 border border-brand/25">

                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
                </span>
                <span className="text-brand text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase font-mono">
                  {hero.badge || "INSTANT DELIVERY"}
                </span>
              </div>

              {/* Headline + sub-headline + subtitle */}
              <div className="space-y-2.5 sm:space-y-3">
                <h1
                  data-gsap="split-words"
                  className="font-display font-bold text-[clamp(2rem,5.5vw,4rem)] leading-[1.1] tracking-tight text-foreground text-balance"
                >
                  {hero.title1}
                </h1>
                <h2
                  className="font-display font-semibold text-[clamp(1.1rem,2.6vw,1.75rem)] leading-snug tracking-tight text-balance brand-text"
                >
                  {hero.title2}
                </h2>

                <p
                  className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed mx-auto md:mx-0 pt-1"
                >
                  {hero.subtitle}
                </p>
              </div>

              {/* Mobile-only: Trending + New mini cards between text and CTAs */}
              <div className="md:hidden grid grid-cols-2 gap-3 w-full">
                {trending[0] && (
                  <Link
                    to="/product/$slug"
                    params={{ slug: trending[0].slug }}
                    className="p-2.5 bg-card border border-border rounded-2xl shadow-lg hover:brand-glow transition"
                  >
                    <div className="flex items-center gap-2">
                      {trending[0].icon_url ? (
                        <img src={trending[0].icon_url} alt="" loading="lazy" className="w-9 h-9 rounded-lg object-cover ring-1 ring-border/60 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-brand/20 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 text-end">
                        <div className="text-[9px] font-mono uppercase tracking-widest text-brand">
                          {lang === "ar" ? "الأكثر مبيعاً" : "Trending"}
                        </div>
                        <div className="text-foreground text-[12px] font-bold truncate">
                          {lang === "ar" ? trending[0].name_ar : trending[0].name_en}
                        </div>
                        {priceOf(trending[0]) && (
                          <div className="text-brand text-[11px] font-bold font-mono mt-0.5">{priceOf(trending[0])}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                )}
                {trending[1] && (
                  <Link
                    to="/product/$slug"
                    params={{ slug: trending[1].slug }}
                    className="p-2.5 bg-card border border-border rounded-2xl shadow-lg hover:brand-glow transition"
                  >
                    <div className="flex items-center gap-2">
                      {trending[1].icon_url ? (
                        <img src={trending[1].icon_url} alt="" loading="lazy" className="w-9 h-9 rounded-lg object-cover ring-1 ring-border/60 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-accent/20 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 text-end">
                        <div className="text-[9px] font-mono uppercase tracking-widest text-brand">
                          {lang === "ar" ? "جديد" : "New"}
                        </div>
                        <div className="text-foreground text-[12px] font-bold truncate">
                          {lang === "ar" ? trending[1].name_ar : trending[1].name_en}
                        </div>
                        {priceOf(trending[1]) && (
                          <div className="text-brand text-[11px] font-bold font-mono mt-0.5">{priceOf(trending[1])}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  to="/shop"
                  data-gsap="magnetic"
                  data-strength="0.3"
                  className="group inline-flex items-center justify-center gap-3 px-7 sm:px-9 py-3.5 sm:py-4 bg-brand text-brand-foreground font-bold rounded-2xl brand-glow hover:shadow-[0_0_60px_-8px_var(--brand-glow)] transition-shadow font-display"
                >
                  <span>{hero.cta}</span>
                  <span className="grid place-items-center size-7 rounded-full bg-brand-foreground/15 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180">→</span>
                </Link>
                <a
                  href="https://wa.me/201284234815"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-foreground/5 hover:bg-foreground/10 border border-border/60 hover:border-brand/40 rounded-2xl text-foreground font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  <span>{hero.ctaSecondary}</span>
                </a>
              </div>

              {/* Stats Row — divider on top */}
              <div data-gsap="reveal-stagger" className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6 w-full pt-5 sm:pt-6 border-t border-border/40">
                {[
                  { n: "24/7", l: lang === "ar" ? "دعم فوري" : "Support" },
                  { n: "+15k", l: lang === "ar" ? "عميل سعيد" : "Clients" },
                  { n: "4.9★", l: lang === "ar" ? "تقييم" : "Rating" },
                  { n: "60s", l: lang === "ar" ? "تسليم آلي" : "Delivery" },
                ].map((s) => (
                  <div key={s.l} className="space-y-1 text-center md:text-end">
                    <div className="text-brand font-display font-bold text-xl sm:text-2xl text-glow">{s.n}</div>
                    <div className="text-muted-foreground text-xs sm:text-sm">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Side */}
            <div className="md:col-span-5 order-1 md:order-2 relative flex justify-center items-center">
              <div className="relative w-full max-w-[420px] px-2 py-3 sm:py-12 flex justify-center items-center">
                {/* Radial glow */}
                <div aria-hidden className="absolute inset-0 bg-brand/15 blur-[100px] -z-10 rounded-full" />

                {/* NEW Card — top-right overlay (behind logo) */}
                {trending[1] && (
                  <Link
                    to="/product/$slug"
                    params={{ slug: trending[1].slug }}
                    data-gsap="tilt"
                    className="hidden md:block absolute -top-10 -end-24 w-56 p-3 bg-card border border-border rounded-2xl shadow-2xl rotate-3 hover:rotate-0 hover:brand-glow transition z-10"
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      {trending[1].icon_url ? (
                        <img src={trending[1].icon_url} alt="" loading="lazy" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover ring-1 ring-border/60 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent/20 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 text-end">
                        <div className="text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-brand">
                          {lang === "ar" ? "جديد" : "New"}
                        </div>
                        <div className="text-foreground text-[11px] sm:text-xs font-bold truncate">
                          {lang === "ar" ? trending[1].name_ar : trending[1].name_en}
                        </div>
                        {priceOf(trending[1]) && (
                          <div className="text-brand text-[11px] sm:text-xs font-bold font-mono mt-0.5">{priceOf(trending[1])}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                )}

                {/* TRENDING Card — bottom-left overlay (behind logo) */}
                {trending[0] && (
                  <Link
                    to="/product/$slug"
                    params={{ slug: trending[0].slug }}
                    data-gsap="tilt"
                    className="hidden md:block absolute -bottom-10 -start-24 w-64 p-3.5 bg-card border border-border rounded-2xl shadow-2xl -rotate-3 hover:rotate-0 hover:brand-glow transition z-10"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {trending[0].icon_url ? (
                        <img src={trending[0].icon_url} alt="" loading="lazy" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover ring-1 ring-border/60 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-brand/20 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 text-end">
                        <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-brand">
                          {lang === "ar" ? "الأكثر مبيعاً" : "Trending"}
                        </div>
                        <div className="text-foreground text-[12px] sm:text-sm font-bold truncate">
                          {lang === "ar" ? trending[0].name_ar : trending[0].name_en}
                        </div>
                        {priceOf(trending[0]) && (
                          <div className="text-brand text-[12px] sm:text-sm font-bold font-mono mt-0.5">{priceOf(trending[0])}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                )}

                {/* 3D R Monolith card — on top */}
                <div className="relative z-20 group w-44 h-44 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-[1.75rem] sm:rounded-[2rem] bg-card/70 border border-border/60 backdrop-blur-xl shadow-2xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500">
                  <Logo3D className="w-32 sm:w-56 lg:w-64" />

                  {/* Premium badge */}
                  <div className="absolute -top-3 -end-3 bg-brand text-brand-foreground px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest uppercase font-mono shadow-lg">
                    Premium
                  </div>
                </div>

              </div>
            </div>

          </div>
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

