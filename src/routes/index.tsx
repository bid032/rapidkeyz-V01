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
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  const products = useQuery({ queryKey: ["featured-products"], queryFn: fetchFeaturedProducts });
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

      {/* Hero , Broken Grid with GSAP */}
      <header className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24">
        {/* Grid noise background */}
        <div aria-hidden className="absolute inset-0 -z-20 grid-noise opacity-40" />
        {/* Blurred glow orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-[-15%] left-[10%] w-[45%] h-[55%] rounded-full bg-brand/20 blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[5%] w-[35%] h-[45%] rounded-full bg-accent/20 blur-[120px]" />
        </div>
        <HeroCanvas />

        {/* Desktop: broken grid. Mobile: clean stacked flow */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          {/* MOBILE (single column, ordered flow) */}
          <div className="md:hidden flex flex-col gap-2 pt-4 pb-8">
            <div data-gsap="reveal" className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full neon-border bg-background/60 backdrop-blur text-brand text-[11px] font-mono uppercase tracking-widest">
                <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                {hero.badge}
              </span>
              <span className="font-mono text-xs text-muted-foreground">// 01</span>
            </div>

            <h1
              data-gsap="split-words"
              className="font-display font-bold text-[clamp(2.25rem,10vw,3.75rem)] leading-[1.1] tracking-tight text-foreground"
            >
              {hero.title1}
            </h1>

            <p
              data-gsap="split-words"
              className="brand-text font-display text-[clamp(1.25rem,5vw,1.75rem)] leading-tight"
            >
              {hero.title2}
            </p>


            <div data-gsap="card-pop" className="-mt-1 flex gap-3 -mx-4 px-4 py-2 overflow-x-auto overflow-y-visible no-scrollbar snap-x snap-mandatory">
              <div className="snap-start shrink-0 w-[62%] p-4 rounded-2xl neon-border bg-card/70 backdrop-blur rotate-[-3deg]">
                <div className="text-[10px] font-mono uppercase tracking-widest text-brand mb-1.5">TRENDING</div>
                <div className="font-display font-bold text-base leading-tight mb-1.5">ChatGPT Plus</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-xl text-foreground">450</span>
                  <span className="text-[10px] text-muted-foreground">EGP / شهر</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-brand/20 overflow-hidden">
                  <div className="h-full w-3/4 bg-brand animate-pulse" />
                </div>
              </div>
              <div className="snap-start shrink-0 w-[50%] p-4 rounded-2xl neon-border bg-card/70 backdrop-blur rotate-[2deg]">
                <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">NEW</div>
                <div className="font-display font-bold text-sm mb-1">Midjourney V7</div>
                <div className="text-[10px] text-muted-foreground">إصدار جديد · تسليم فوري</div>
              </div>
              <div className="snap-start shrink-0 w-[55%] p-4 rounded-2xl neon-border bg-card/70 backdrop-blur rotate-[-2deg]">
                <div className="text-[10px] font-mono uppercase tracking-widest text-brand mb-1">HOT</div>
                <div className="font-display font-bold text-sm mb-1">Canva Pro</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-lg">150</span>
                  <span className="text-[10px] text-muted-foreground">EGP</span>
                </div>
              </div>
            </div>



            <p
              data-gsap="reveal"
              className="max-w-xl text-muted-foreground text-base leading-relaxed"
            >
              {hero.subtitle}
            </p>


            <div className="flex flex-col gap-3">
              <Link
                to="/shop"
                data-gsap="magnetic"
                data-strength="0.25"
                className="group relative inline-flex items-center justify-center gap-3 px-7 py-4 bg-brand text-brand-foreground font-bold rounded-full brand-glow font-display"
              >
                <span>{hero.cta}</span>
                <span className="grid place-items-center size-7 rounded-full bg-brand-foreground/15 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">→</span>
              </Link>
              <a
                href="https://wa.me/201284234815"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-border/60 rounded-full text-foreground font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                <span>{hero.ctaSecondary}</span>
              </a>
            </div>

            <div data-gsap="reveal-stagger" className="grid grid-cols-4 gap-2 pt-3 border-t border-border/60">
              {[
                { n: "24/7", l: "دعم" },
                { n: "+15k", l: "عملاء" },
                { n: "4.9★", l: "تقييم" },
                { n: "60s", l: "تسليم" },
              ].map((s) => (
                <div key={s.l} className="flex flex-col items-center text-center gap-0.5">
                  <span className="font-display font-bold text-lg text-brand text-glow">{s.n}</span>
                  <span className="text-[10px] text-muted-foreground">{s.l}</span>
                </div>
              ))}
            </div>

          </div>

          {/* DESKTOP: broken grid */}
          <div className="hidden md:grid grid-cols-12 gap-6 items-center min-h-[70vh]">
            <div className="col-span-2 pt-8">
              <div className="flex flex-col items-start gap-3">
                <div
                  data-gsap="split-chars"
                  className="font-display font-bold text-8xl leading-none text-brand text-glow"
                >
                  01
                </div>
                <div className="h-24 w-px bg-gradient-to-b from-brand via-brand/40 to-transparent" />
                <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground rotate-180" style={{ writingMode: "vertical-rl" }}>
                  {hero.badge}
                </div>
              </div>
            </div>

            <div className="col-span-8 relative">
              <div className="flex absolute -top-6 -right-4 items-center gap-2 px-3 py-1.5 rounded-full neon-border bg-background/60 backdrop-blur text-brand text-[11px] font-mono uppercase tracking-widest rotate-3">
                <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                live · instant delivery
              </div>

              <h1
                data-gsap="split-words"
                className="font-display font-bold text-[clamp(3rem,7vw,5.5rem)] leading-[1.05] tracking-tight text-foreground"
              >
                {hero.title1}
              </h1>

              <p
                data-gsap="split-words"
                className="brand-text mt-6 font-display text-[clamp(1.5rem,3vw,2.5rem)] leading-tight"
              >
                {hero.title2}
              </p>


              <p
                data-gsap="reveal"
                className="mt-8 max-w-xl text-muted-foreground text-lg leading-relaxed"
              >
                {hero.subtitle}
              </p>

              <div className="mt-10 flex flex-row items-center gap-4">
                <Link
                  to="/shop"
                  data-gsap="magnetic"
                  data-strength="0.35"
                  className="group relative inline-flex items-center gap-3 px-8 py-4 bg-brand text-brand-foreground font-bold rounded-full brand-glow hover:shadow-[0_0_60px_-8px_var(--brand-glow)] transition-shadow font-display"
                >
                  <span>{hero.cta}</span>
                  <span className="grid place-items-center size-7 rounded-full bg-brand-foreground/15 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">→</span>
                </Link>
                <a
                  href="https://wa.me/201284234815"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-gsap="magnetic"
                  data-strength="0.25"
                  className="inline-flex items-center gap-2 px-6 py-4 border border-border/60 hover:border-brand/50 rounded-full text-foreground font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  <span>{hero.ctaSecondary}</span>
                </a>
              </div>

              <div data-gsap="reveal-stagger" className="mt-14 flex flex-wrap gap-10">
                {[
                  { n: "24/7", l: "دعم فوري" },
                  { n: "+15k", l: "عملاء" },
                  { n: "4.9★", l: "تقييم" },
                  { n: "60s", l: "تسليم" },
                ].map((s) => (
                  <div key={s.l} className="flex items-baseline gap-2">
                    <span className="font-display font-bold text-3xl text-brand text-glow">{s.n}</span>
                    <span className="text-sm text-muted-foreground">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 relative">
              <div
                data-gsap="tilt"
                className="relative -translate-y-6 translate-x-4 rotate-[-6deg] p-5 rounded-2xl neon-border bg-card/70 backdrop-blur"
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-brand mb-2">TRENDING</div>
                <div className="font-display font-bold text-lg leading-tight mb-2">ChatGPT Plus</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-2xl text-foreground">450</span>
                  <span className="text-xs text-muted-foreground">EGP / شهر</span>
                </div>
                <div className="mt-3 h-1 rounded-full bg-brand/20 overflow-hidden">
                  <div className="h-full w-3/4 bg-brand animate-pulse" />
                </div>
              </div>
              <div
                data-gsap="tilt"
                className="absolute top-40 -left-6 p-4 rounded-2xl neon-border bg-card/70 backdrop-blur rotate-[4deg]"
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">NEW</div>
                <div className="font-display font-bold text-sm">Midjourney V7</div>
              </div>
            </div>
          </div>
        </div>
      </header>





      {/* Categories , centered creative pill grid */}
      <CategoriesShowcase />





      {/* Products , Broken grid */}
      <main id="trending" className="relative max-w-7xl mx-auto px-3 sm:px-6 pb-16 sm:pb-24">
        <div className="relative mb-10 sm:mb-16 flex items-end justify-between gap-6">
          <div>
            
            <h2
              data-gsap="split-words"
              className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] tracking-tight"
            >
              {t.home.trending}
            </h2>
          </div>
          <Link
            to="/shop"
            data-gsap="magnetic"
            data-strength="0.3"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-3 rounded-full neon-border text-brand font-mono text-sm uppercase tracking-widest"
          >
            {t.home.viewAll} <span>→</span>
          </Link>
        </div>

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
          <div data-gsap="card-pop" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.data.map((p, i) => (
              <div
                key={p.id}
                data-gsap="tilt"
                className={i % 5 === 2 ? "sm:translate-y-6" : i % 5 === 4 ? "sm:-translate-y-4" : ""}
              >
                <ProductCard p={p} />
              </div>
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

