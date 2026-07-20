import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "@tanstack/react-router";
import { ProductDetails } from "@/components/ProductDetails";
import { ProductTabs } from "@/components/ProductTabs";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { PricingConfigurator } from "@/components/PricingConfigurator";
import { ViewAllButton } from "@/components/ViewAllButton";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    try {
      const { data } = await supabase
        .from("products")
        .select(
          "slug, name_ar, name_en, description_ar, description_en, icon_url, product_plans(price, is_active)",
        )
        .eq("slug", params.slug)
        .eq("status", "active")
        .maybeSingle();
      if (!data) return null;
      const active = ((data as any).product_plans ?? []).filter((p: any) => p.is_active);
      const cheapest = active.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
      return {
        slug: data.slug as string,
        name_ar: data.name_ar as string,
        name_en: data.name_en as string,
        description_ar: (data as any).description_ar as string | null,
        description_en: (data as any).description_en as string | null,
        icon_url: (data as any).icon_url as string | null,
        minPrice: cheapest ? Number(cheapest.price) : null,
      };
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const p = loaderData;
    if (!p) {
      return {
        meta: [
          { title: "المنتج غير موجود ، RapidKeyz" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const name = p.name_ar || p.name_en;
    const nameEn = p.name_en || p.name_ar;
    const desc =
      (p.description_ar || p.description_en || `اشتراك ${name} أصلي بأفضل سعر وتسليم فوري من RapidKeyz.`)
        .toString()
        .slice(0, 160);
    const title = `${name} ، اشتراك أصلي بأفضل سعر | RapidKeyz`;
    const url = `/product/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} | RapidKeyz` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(p.icon_url ? [{ property: "og:image", content: p.icon_url }] : []),
        ...(p.icon_url ? [{ name: "twitter:image", content: p.icon_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: nameEn,
            description: p.description_en || p.description_ar || undefined,
            image: p.icon_url || undefined,
            brand: { "@type": "Brand", name: "RapidKeyz" },
            offers: p.minPrice
              ? {
                  "@type": "Offer",
                  price: p.minPrice,
                  priceCurrency: "EGP",
                  availability: "https://schema.org/InStock",
                  url,
                }
              : undefined,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "/" },
              { "@type": "ListItem", position: 2, name: "Shop", item: "/shop" },
              { "@type": "ListItem", position: 3, name: nameEn, item: url },
            ],
          }),
        },
      ],

    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background text-foreground">
      <p className="text-muted-foreground">Product not found</p>
    </div>
  ),
});


function ProductPage() {
  const { slug } = Route.useParams();
  const { t, lang, addToCart } = useApp();
  const navigate = useNavigate();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_plans(*)")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const related = useQuery({
    queryKey: ["related", (product as any)?.category_id, (product as any)?.id],
    enabled: !!product,
    queryFn: async (): Promise<ProductCardData[]> => {
      const p: any = product;
      let q = supabase
        .from("products")
        .select("id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, product_plans(id, price, label_ar, label_en, is_active, sort_order)")
        .eq("status", "active")
        .neq("id", p.id)
        .limit(8);
      const cats: string[] = Array.isArray(p.category_ids) && p.category_ids.length > 0 ? p.category_ids : (p.category_id ? [p.category_id] : []);
      if (cats.length > 0) q = q.overlaps("category_ids", cats);
      else if (p.category_id) q = q.eq("category_id", p.category_id);
      const { data } = await q;
      return (data ?? []).map((r: any) => {
        const active = (r.product_plans ?? []).filter((pl: any) => pl.is_active);
        const cheap = active.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
        return {
          id: r.id, slug: r.slug, name_ar: r.name_ar, name_en: r.name_en,
          description_ar: r.description_ar, description_en: r.description_en,
          icon_url: r.icon_url, delivery_type: r.delivery_type, account_type: r.account_type,
          discount_percent: r.discount_percent ?? 0,
          minPrice: cheap ? Number(cheap.price) : null,
          cheapestPlanId: cheap?.id ?? null,
          planLabel_ar: cheap?.label_ar ?? null,
          planLabel_en: cheap?.label_en ?? null,
        };
      });
    },
  });

  const [accountType, setAccountType] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [confirmBuy, setConfirmBuy] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);


  // Live viewers counter , seeded per-slug for stability, drifts every few seconds.
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
    return h;
  }, [slug]);
  const [viewers, setViewers] = useState(() => 9 + (seed % 22));
  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2..+2
        return Math.max(6, Math.min(48, v + delta));
      });
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const parsePlan = (pl: any) => {
    const en = String(pl.label_en ?? "");
    const ar = String(pl.label_ar ?? "");
    let acct: "private" | "shared" | "own" | "any" = "any";
    if (/private/i.test(en) || /خاص|برايفت/i.test(ar)) acct = "private";
    else if (/shared/i.test(en) || /مشترك|شير/i.test(ar)) acct = "shared";
    else if (/\bown\b|our own/i.test(en) || /من عندنا|من عندك|بحسابك|حسابك/i.test(ar)) acct = "own";
    const durEn = en.replace(/^(private|shared|own|our own)\s*account\s*-\s*/i, "").trim() || en;
    const durAr = ar.replace(/^(Private|Shared|Own|من عندنا)\s*(Account\s*-\s*)?/i, "").trim() || ar;
    return { acct, durEn, durAr };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-5xl mx-auto p-12 text-muted-foreground">{t.common.loading}</div>
      </div>
    );
  }
  if (!product) return null;

  const parseDays = (p: any): number => {
    const s = `${p.label_en ?? ""} ${p.label_ar ?? ""}`;
    const m = s.match(/(\d+)\s*(year|month|week|day|سنة|سنه|شهر|شهور|أسبوع|اسبوع|يوم|أيام|ايام)/i);
    if (m) {
      const n = parseInt(m[1]);
      const unit = m[2].toLowerCase();
      if (/year|سنة|سنه/.test(unit)) return n * 365;
      if (/month|شهر|شهور/.test(unit)) return n * 30;
      if (/week|أسبوع|اسبوع/.test(unit)) return n * 7;
      return n;
    }
    const d = Number(p.duration_days);
    if (Number.isFinite(d) && d > 0) return d;
    const n = parseInt(s);
    return Number.isFinite(n) ? n : 0;
  };

  const plans = (product.product_plans ?? [])
    .filter((p: any) => p.is_active)
    .sort((a: any, b: any) => parseDays(a) - parseDays(b));
  const enriched = plans.map((p: any) => ({ ...p, ...parsePlan(p) }));

  const productAcctTypes = (Array.isArray((product as any).account_types)
    ? ((product as any).account_types as string[]).filter((a) => a === "private" || a === "shared" || a === "own")
    : []) as ("private" | "shared" | "own")[];
  const derivedFromPlans = Array.from(new Set(enriched.map((p: any) => p.acct))).filter(
    (a) => a === "private" || a === "shared" || a === "own",
  ) as ("private" | "shared" | "own")[];
  const accountTypes = (
    productAcctTypes.length > 0 ? productAcctTypes : derivedFromPlans
  ) as ("private" | "shared" | "own")[];
  const hasAcctChoice = accountTypes.length > 0;
  const effectiveAcct = (accountType as "private" | "shared" | "own" | undefined) ?? accountTypes[0];
  const filteredPlans = enriched;
  const selected =
    filteredPlans.find((p: any) => p.id === planId) ?? filteredPlans[0];
  const selectedStock = Number(selected?.stock ?? 0);
  const selectedSoldOut = !!selected && selectedStock <= 0;
  const name = lang === "ar" ? product.name_ar : product.name_en;
  const desc = lang === "ar" ? product.description_ar : product.description_en;
  const discount = Number((product as any).discount_percent ?? 0);
  const hasDiscount = discount > 0;
  const rawPrice = selected ? Number(selected.price) : 0;
  const finalPrice = hasDiscount ? Math.round(rawPrice * (100 - discount)) / 100 : rawPrice;

  const acctLabel = (a: string) =>
    a === "private"
      ? t.badges.private
      : a === "own"
      ? (t.badges as any).own
      : t.badges.shared;




  const handleAdd = (goToCart: boolean) => {
    if (!selected) return;
    const acct: "private" | "shared" | "both" | "own" =
      effectiveAcct === "own"
        ? "own"
        : product.account_type === "both"
        ? (effectiveAcct === "shared" ? "shared" : "private")
        : (product.account_type as "private" | "shared" | "both" | "own");
    addToCart({
      productId: product.id,
      planId: selected.id,
      productName: name,
      planLabel: lang === "ar" ? selected.label_ar : selected.label_en,
      price: finalPrice,
      quantity: 1,
      iconUrl: product.icon_url,
      deliveryType: product.delivery_type,
      accountType: acct,
    });
    if (goToCart) navigate({ to: "/cart" });
  };

  const minPriceAcrossPlans =
    filteredPlans.length > 0
      ? Math.min(...filteredPlans.map((p: any) => Number(p.price)))
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6 pb-28 md:pb-6">
        {/* Glass product panel , viewport-fit hero */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute -top-32 -end-32 w-96 h-96 bg-brand/20 rounded-full blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-32 -start-32 w-96 h-96 bg-brand/10 rounded-full blur-[120px]" />

          <div className="relative grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-4 sm:p-5 md:p-6">
            {/* LEFT , identity */}
            <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-3 min-w-0">
              {/* Mobile: horizontal identity row. Desktop: stacked. */}
              <div className="flex md:flex-col items-start gap-3 md:gap-3 min-w-0">
                {/* Image */}
                <div className="relative shrink-0 w-24 sm:w-32 md:w-full aspect-square md:max-w-none">
                  <div className="absolute inset-0 bg-brand/25 blur-[80px] rounded-full opacity-60 animate-pulse" />
                  <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border border-border/60 bg-card grid place-items-center shadow-2xl">
                    {product.icon_url ? (
                      <img src={product.icon_url} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl md:text-5xl font-black text-brand">
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {hasDiscount && (
                      <span
                        className={`absolute top-1.5 ${lang === "ar" ? "right-1.5" : "left-1.5"} md:top-2 md:${lang === "ar" ? "right-2" : "left-2"} bg-destructive text-destructive-foreground text-[10px] md:text-xs font-black px-1.5 md:px-2 py-0.5 rounded-md md:rounded-lg shadow-lg`}
                      >
                        -{discount}%
                      </span>
                    )}
                    {/* Viewers chip , desktop only on image */}
                    <div className={`hidden md:flex absolute bottom-2 ${lang === "ar" ? "left-2" : "right-2"} items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 border border-brand/25 backdrop-blur-md`}>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-60 animate-ping" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
                      </span>
                      <span className="text-brand text-[10px] font-bold whitespace-nowrap">
                        <span className="tabular-nums">{viewers}</span> {t.product.viewersNow}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Name + desc */}
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-[1.6rem] font-extrabold tracking-tight leading-tight break-words">
                    {name}
                  </h1>
                  {/* Viewers chip , mobile inline */}
                  <div className="md:hidden mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/80 border border-brand/25 backdrop-blur-md">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-60 animate-ping" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
                    </span>
                    <span className="text-brand text-[10px] font-bold whitespace-nowrap">
                      <span className="tabular-nums">{viewers}</span> {t.product.viewersNow}
                    </span>
                  </div>
                  {desc && (
                    <div className="mt-1.5">
                      <p
                        className={`text-muted-foreground text-xs sm:text-[13px] leading-relaxed ${
                          descExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {desc}
                      </p>
                      {desc.length > 100 && (
                        <button
                          onClick={() => setDescExpanded((v) => !v)}
                          className="mt-0.5 text-[11px] font-bold text-brand hover:underline"
                        >
                          {descExpanded
                            ? lang === "ar" ? "أقل" : "Less"
                            : lang === "ar" ? "المزيد" : "More"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Trust chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { ar: "تسليم فوري", en: "Instant" },
                  { ar: "ضمان كامل", en: "Warranty" },
                  { ar: "دعم 24/7", en: "24/7" },
                ].map((it, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/40 border border-border/50 text-[10px] font-bold text-muted-foreground"
                  >
                    <span className="w-1 h-1 rounded-full bg-brand shrink-0" />
                    <span>{lang === "ar" ? it.ar : it.en}</span>
                  </div>
                ))}
              </div>
            </div>


            {/* RIGHT , configurator + actions */}
            <div className="md:col-span-7 lg:col-span-8 flex flex-col min-w-0 gap-3">
              <PricingConfigurator
                accountTypes={accountTypes}
                effectiveAcct={effectiveAcct}
                onAcctChange={(a) => {
                  setAccountType(a);
                  setPlanId(null);
                }}
                plans={filteredPlans as any}
                selectedId={selected?.id}
                onSelectPlan={(id) => setPlanId(id)}
                discount={discount}
                minRawPrice={minPriceAcrossPlans}
              />

              <div className="hidden md:flex gap-2.5">
                <button
                  onClick={() => setConfirmBuy(true)}
                  disabled={!selected || selectedSoldOut}
                  className={`flex-[2] px-5 py-3 rounded-xl font-black text-sm transition disabled:cursor-not-allowed ${
                    selectedSoldOut
                      ? "bg-muted text-muted-foreground border border-border"
                      : "bg-brand text-brand-foreground hover:brightness-110 hover:-translate-y-0.5 shadow-[0_20px_40px_-12px_hsl(var(--brand)/0.5)] disabled:opacity-50"
                  }`}
                >
                  {selectedSoldOut ? t.product.soldOut : t.product.buyNow}
                </button>
                <button
                  onClick={() => handleAdd(false)}
                  disabled={!selected || selectedSoldOut}
                  className="flex-1 px-5 py-3 border border-border rounded-xl font-bold text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {selectedSoldOut ? t.product.soldOut : t.product.addToCart}
                </button>
              </div>
            </div>
          </div>
        </div>




        {confirmBuy && typeof document !== "undefined" && createPortal(
          <div
            className="fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm p-4"
            onClick={() => setConfirmBuy(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-extrabold mb-2">
                {lang === "ar" ? "تأكيد الشراء" : "Confirm purchase"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {lang === "ar"
                  ? `هتشتري ${name} , ${lang === "ar" ? selected?.label_ar : selected?.label_en} بسعر ${finalPrice} ج.م. تتابع للدفع؟`
                  : `You are about to buy ${name} , ${selected?.label_en} for ${finalPrice} EGP. Continue to checkout?`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmBuy(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-border font-bold hover:bg-muted transition"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={() => {
                    setConfirmBuy(false);
                    handleAdd(true);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-brand text-brand-foreground font-bold hover:brand-glow transition"
                >
                  {lang === "ar" ? "تأكيد" : "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

        {/* Mobile sticky buy bar */}
        {selected && typeof document !== "undefined" && createPortal(
          <div className="fixed bottom-0 inset-x-0 z-40 md:hidden p-3 bg-background/90 backdrop-blur-2xl border-t border-border flex items-center justify-between gap-3">
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                {lang === "ar" ? "الإجمالي" : "Total"}
              </span>
              <span className="text-xl font-black text-brand tabular-nums truncate">
                {finalPrice} {t.common.currency}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleAdd(false)}
                disabled={selectedSoldOut}
                className="px-3 py-3 rounded-xl border border-border font-bold text-xs hover:bg-muted disabled:opacity-50"
              >
                {t.product.addToCart}
              </button>
              <button
                onClick={() => setConfirmBuy(true)}
                disabled={selectedSoldOut}
                className={`px-5 py-3 rounded-xl font-black text-sm shadow-lg ${
                  selectedSoldOut
                    ? "bg-muted text-muted-foreground"
                    : "bg-brand text-brand-foreground shadow-[0_0_20px_hsl(var(--brand)/0.35)]"
                }`}
              >
                {selectedSoldOut ? t.product.soldOut : t.product.buyNow}
              </button>
            </div>
          </div>,
          document.body,
        )}
      </div>
      <ProductTabs productId={product.id} productName={name} description={desc} deliveryType={product.delivery_type} />
      <ProductDetails productName={name} accountTypes={accountTypes} />
      {related.data && related.data.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 pb-16 sm:pb-24">
          <div className="mb-6 sm:mb-10 flex items-end justify-between gap-6">
            <div>
              <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-brand mb-2">
                {lang === "ar" ? "قد يعجبك أيضاً" : "You may also like"}
              </div>
              <h2 data-gsap="split-words" className="font-display font-bold text-3xl sm:text-5xl leading-[1.05] tracking-tight">
                {lang === "ar" ? "منتجات مشابهة" : "Related products"}
              </h2>
            </div>
            <ViewAllButton to="/shop" />
          </div>
          <RelatedStrip items={related.data} lang={lang} />
        </section>
      )}
      <Footer />
    </div>
  );
}

function RelatedStrip({ items, lang }: { items: ProductCardData[]; lang: string }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const list = items.slice(0, 8);

  const scrollByPage = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const page = el.clientWidth;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    const isRtl = lang === "ar";
    const currentAbs = Math.abs(el.scrollLeft);
    let nextAbs = currentAbs + (dir > 0 ? page : -page);
    if (nextAbs > max - 4) nextAbs = 0;
    if (nextAbs < 0) nextAbs = max;
    el.scrollTo({ left: isRtl ? -nextAbs : nextAbs, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (!isDesktop) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      scrollByPage(1);
    }, 4500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const nudge = (dir: number) => {
    pausedRef.current = true;
    scrollByPage(dir);
    window.setTimeout(() => (pausedRef.current = false), 2500);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        aria-label="prev"
        onClick={() => nudge(-1)}
        className="hidden md:grid shrink-0 place-items-center size-11 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all"
      >
        <ChevronLeft className="size-5 rtl:hidden" />
        <ChevronRight className="size-5 hidden rtl:block" />
      </button>

      <div
        ref={scrollerRef}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
        className="flex-1 min-w-0 flex gap-3 sm:gap-4 overflow-x-auto pb-3 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
      >
        {list.map((p, i) => (
          <div
            key={`${p.id}-${i}`}
            className="snap-start shrink-0 w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1rem*2)/3)] lg:w-[calc((100%-1rem*3)/4)]"
          >
            <ProductCard p={p} />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="next"
        onClick={() => nudge(1)}
        className="hidden md:grid shrink-0 place-items-center size-11 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all"
      >
        <ChevronRight className="size-5 rtl:hidden" />
        <ChevronLeft className="size-5 hidden rtl:block" />
      </button>
    </div>
  );
}
