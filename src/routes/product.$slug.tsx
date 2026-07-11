import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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

  const parsePlan = (pl: any) => {
    const en = String(pl.label_en ?? "");
    const ar = String(pl.label_ar ?? "");
    let acct: "private" | "shared" | "any" = "any";
    if (/private/i.test(en) || /خاص|برايفت/i.test(ar)) acct = "private";
    else if (/shared/i.test(en) || /مشترك|شير/i.test(ar)) acct = "shared";
    const durEn = en.replace(/^(private|shared)\s*account\s*-\s*/i, "").trim() || en;
    const durAr = ar.replace(/^(Private|Shared)\s*Account\s*-\s*/i, "").trim() || ar;
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

  const plans = (product.product_plans ?? []).filter((p: any) => p.is_active);
  const selected = plans.find((p: any) => p.id === planId) ?? plans[0];
  const name = lang === "ar" ? product.name_ar : product.name_en;
  const desc = lang === "ar" ? product.description_ar : product.description_en;

  const handleAdd = (goToCart: boolean) => {
    if (!selected) return;
    addToCart({
      productId: product.id,
      planId: selected.id,
      productName: name,
      planLabel: lang === "ar" ? selected.label_ar : selected.label_en,
      price: Number(selected.price),
      quantity: 1,
      iconUrl: product.icon_url,
      deliveryType: product.delivery_type,
      accountType: product.account_type,
    });
    if (goToCart) navigate({ to: "/cart" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12">
        <div>
          <div className="aspect-square bg-card border border-border rounded-2xl overflow-hidden grid place-items-center">
            {product.icon_url ? (
              <img src={product.icon_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl font-black text-brand">{name.slice(0, 2).toUpperCase()}</span>
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
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {product.account_type === "private" ? t.badges.private : t.badges.shared}
            </span>
          </div>
          <h1 className="text-4xl font-extrabold mb-4">{name}</h1>
          {desc && <p className="text-muted-foreground text-lg mb-8 leading-relaxed">{desc}</p>}

          <div className="mb-6">
            <p className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">
              {t.product.chooseDuration}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {plans.map((pl: any) => {
                const isSelected = (planId ?? plans[0]?.id) === pl.id;
                return (
                  <button
                    key={pl.id}
                    onClick={() => setPlanId(pl.id)}
                    className={`text-start p-4 rounded-xl border transition ${
                      isSelected
                        ? "border-brand bg-brand/5"
                        : "border-border bg-card hover:border-brand/40"
                    }`}
                  >
                    <div className="text-sm font-bold">{lang === "ar" ? pl.label_ar : pl.label_en}</div>
                    <div className="text-lg font-extrabold mt-1">
                      {pl.price} {t.common.currency}
                    </div>
                    {pl.compare_price && (
                      <div className="text-xs text-muted-foreground line-through">
                        {pl.compare_price}
                      </div>
                    )}
                  </button>
                );
              })}
              {plans.length === 0 && (
                <div className="col-span-2 text-muted-foreground text-sm">
                  {lang === "ar" ? "لا توجد خطط متاحة حالياً" : "No plans available"}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAdd(true)}
              disabled={!selected}
              className="flex-1 px-6 py-4 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow disabled:opacity-50"
            >
              {t.product.buyNow}
            </button>
            <button
              onClick={() => handleAdd(false)}
              disabled={!selected}
              className="px-6 py-4 border border-border rounded-xl font-bold hover:bg-muted disabled:opacity-50"
            >
              {t.product.addToCart}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
