import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductDetails } from "@/components/ProductDetails";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background text-foreground">
      <p className="text-muted-foreground">Product not found</p>
    </div>
  ),
});

async function fetchProduct(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_plans(*)")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();
  return data;
}

function ProductPage() {
  const { slug } = Route.useParams();
  const { t, lang, addToCart } = useApp();
  const navigate = useNavigate();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct(slug),
  });
  const [accountType, setAccountType] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  // Live viewers counter — seeded per-slug for stability, drifts every few seconds.
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

  const plans = (product.product_plans ?? [])
    .filter((p: any) => p.is_active)
    .sort((a: any, b: any) => Number(a.duration_days ?? 0) - Number(b.duration_days ?? 0));
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


  const handleAdd = (goToCart: boolean) => {
    if (!selected) return;
    const acct: "private" | "shared" | "both" | "own" =
      product.account_type === "both"
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
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12">
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
          <h1 className="text-4xl font-extrabold mb-3">{name}</h1>

          <div className="flex items-center gap-2 mb-5 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground">{viewers}</span> {t.product.viewersNow}
            </span>
          </div>

          {desc && <p className="text-muted-foreground text-lg mb-8 leading-relaxed">{desc}</p>}

          <div className="mb-6 space-y-5">
            {hasAcctChoice && (
              <div>
                <p className="text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">
                  {lang === "ar" ? "نوع الحساب" : "Account Type"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {accountTypes.map((a) => {
                    const isSel = effectiveAcct === a;
                    return (
                      <button
                        key={a}
                        onClick={() => { setAccountType(a); setPlanId(null); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                          isSel
                            ? "border-brand bg-brand text-brand-foreground"
                            : "border-border bg-card hover:border-brand/40"
                        }`}
                      >
                        {acctLabel(a)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">
                {t.product.chooseDuration}
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredPlans.map((pl: any) => {
                  const isSelected = (selected?.id) === pl.id;
                  const planStock = Number(pl.stock ?? 0);
                  const planSoldOut = planStock <= 0;
                  return (
                    <button
                      key={pl.id}
                      onClick={() => setPlanId(pl.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition inline-flex items-center gap-2 ${
                        planSoldOut
                          ? isSelected
                            ? "border-destructive/60 bg-destructive/10 text-destructive"
                            : "border-border bg-muted text-muted-foreground hover:border-destructive/40"
                          : isSelected
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border bg-card hover:border-brand/40"
                      }`}
                    >
                      <span className={planSoldOut ? "line-through opacity-70" : ""}>
                        {lang === "ar" ? pl.durAr : pl.durEn}
                      </span>
                      {planSoldOut && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-destructive/15 text-destructive">
                          {t.product.soldOut}
                        </span>
                      )}
                    </button>
                  );
                })}
                {filteredPlans.length === 0 && (
                  <div className="text-muted-foreground text-sm">
                    {lang === "ar" ? "لا توجد خطط متاحة حالياً" : "No plans available"}
                  </div>
                )}
              </div>
            </div>

            {selected && (
              <div className="flex items-baseline gap-3 pt-2 flex-wrap">
                <span className="text-3xl font-extrabold text-brand">
                  {finalPrice} {t.common.currency}
                </span>
                {hasDiscount ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {rawPrice} {t.common.currency}
                    </span>
                    <span className="text-xs font-black bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                      -{discount}%
                    </span>
                  </>
                ) : (
                  selected.compare_price && Number(selected.compare_price) > Number(selected.price) && (
                    <span className="text-sm text-muted-foreground line-through">
                      {selected.compare_price} {t.common.currency}
                    </span>
                  )
                )}
              </div>
            )}

            {selected && !selectedSoldOut && selectedStock > 0 && selectedStock <= 10 && (
              <p className="text-xs font-bold text-warning">
                🔥 {t.product.stockLeft(selectedStock)}
              </p>
            )}
            {selectedSoldOut && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm font-bold">
                {t.product.soldOutHint}
              </div>
            )}
          </div>



          <div className="flex gap-3">
            <button
              onClick={() => handleAdd(true)}
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
        </div>
      </div>
      <ProductDetails productName={name} accountTypes={accountTypes} />
      <Footer />
    </div>
  );
}
