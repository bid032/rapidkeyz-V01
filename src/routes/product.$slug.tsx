import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
        .limit(6);
      if (p.category_id) q = q.eq("category_id", p.category_id);
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
  const filteredPlans = hasAcctChoice
    ? enriched.filter((p: any) => p.acct === effectiveAcct || p.acct === "any")
    : enriched;
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


  const [confirmBuy, setConfirmBuy] = useState(false);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-8 sm:py-12 grid md:grid-cols-2 gap-6 sm:gap-12">
        <div>
          <div className="relative aspect-square bg-card border border-border rounded-2xl overflow-hidden grid place-items-center">
            {product.icon_url ? (
              <img src={product.icon_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl font-black text-brand">{name.slice(0, 2).toUpperCase()}</span>
            )}
            {hasDiscount && (
              <span
                className={`absolute top-4 ${lang === "ar" ? "right-4" : "left-4"} bg-destructive text-destructive-foreground text-lg font-black px-3 py-1.5 rounded-xl shadow-lg`}
              >
                -{discount}%
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className={`px-2 py-1 rounded text-xs font-bold border uppercase ${
                product.delivery_type === "instant"
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              {product.delivery_type === "instant" ? t.badges.instant : t.badges.manual}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-bold border uppercase ${
                product.account_type === "private"
                  ? "bg-brand/10 text-brand border-brand/20"
                  : product.account_type === "both"
                  ? "bg-accent/10 text-accent-foreground border-accent/30"
                  : product.account_type === "own"
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {product.account_type === "private"
                ? t.badges.private
                : product.account_type === "both"
                ? (t.badges as any).both
                : product.account_type === "own"
                ? (t.badges as any).own
                : t.badges.shared}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-3">{name}</h1>

          {desc && <p className="text-muted-foreground text-lg mb-5 leading-relaxed">{desc}</p>}

          <div className="flex items-center gap-2 mb-8 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground">{viewers}</span> {t.product.viewersNow}
            </span>
          </div>


          <div className="mb-6">
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
              minRawPrice={Math.min(
                ...filteredPlans.map((p: any) => Number(p.price)),
                Number.POSITIVE_INFINITY,
              ) === Number.POSITIVE_INFINITY ? 0 : Math.min(...filteredPlans.map((p: any) => Number(p.price)))}
            />
          </div>




          <div className="flex gap-3">
            <button
              onClick={() => setConfirmBuy(true)}
              disabled={!selected || selectedSoldOut}
              className={`flex-1 px-6 py-4 rounded-xl font-bold transition disabled:cursor-not-allowed ${
                selectedSoldOut
                  ? "bg-muted text-muted-foreground border border-border"
                  : "bg-brand text-brand-foreground hover:brand-glow disabled:opacity-50"
              }`}
            >
              {selectedSoldOut ? t.product.soldOut : t.product.buyNow}
            </button>
            <button
              onClick={() => handleAdd(false)}
              disabled={!selected || selectedSoldOut}
              className="px-6 py-4 border border-border rounded-xl font-bold hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedSoldOut ? t.product.soldOut : t.product.addToCart}
            </button>
          </div>

          {confirmBuy && (
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
            </div>
          )}
        </div>
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
            <Link
              to="/shop"
              data-gsap="magnetic"
              data-strength="0.3"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full neon-border text-brand font-mono text-[11px] sm:text-sm uppercase tracking-widest shrink-0"
            >
              {lang === "ar" ? "عرض الكل" : "View all"} <span>→</span>
            </Link>
          </div>
          <div data-gsap="card-pop" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {related.data.slice(0, 6).map((p) => (
              <div key={p.id} data-gsap="tilt">
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </section>
      )}
      <Footer />
    </div>
  );
}
