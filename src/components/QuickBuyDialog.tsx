import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Zap, Check, ExternalLink, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { ProductCardData } from "@/components/ProductCard";

type Plan = {
  id: string;
  price: number;
  label_ar: string | null;
  label_en: string | null;
  is_active: boolean;
  sort_order: number | null;
  stock?: number | null;
};

export function QuickBuyDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: ProductCardData;
}) {
  const { lang, t, addToCart, notify } = useApp() as any;
  const isAr = lang === "ar";
  const name = isAr ? product.name_ar : product.name_en;
  const nameAlt = isAr ? product.name_en : product.name_ar;
  const discount = Number(product.discount_percent ?? 0);
  const hasDiscount = discount > 0;

  const plansQ = useQuery({
    queryKey: ["quickbuy-plans", product.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_plans")
        .select("id, price, label_ar, label_en, is_active, sort_order, stock")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data ?? []) as Plan[];
    },
    enabled: open,
  });

  const plans = plansQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    if (plans.length && !plans.find((p) => p.id === selectedId)) {
      const cheap = [...plans].sort((a, b) => Number(a.price) - Number(b.price))[0];
      setSelectedId(cheap?.id ?? null);
    }
  }, [open, plans, selectedId]);

  const selected = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? plans[0],
    [plans, selectedId],
  );

  const rawUnit = selected ? Number(selected.price) : 0;
  const unit = hasDiscount ? Math.round(rawUnit * (100 - discount)) / 100 : rawUnit;
  const total = Math.round(unit * qty * 100) / 100;
  const stock = Number(selected?.stock ?? 0);
  const soldOut = !!selected && stock <= 0;

  const doAdd = (goCheckout: boolean) => {
    if (!selected) return;
    if (soldOut) {
      notify?.(isAr ? "نفدت الكمية" : "Sold out", "error");
      return;
    }
    addToCart({
      productId: product.id,
      planId: selected.id,
      productName: name,
      planLabel: (isAr ? selected.label_ar : selected.label_en) ?? "",
      price: unit,
      quantity: qty,
      iconUrl: product.icon_url ?? null,
      deliveryType: product.delivery_type,
      accountType: product.account_type,
    });
    notify?.(isAr ? "تمت الإضافة للسلة" : "Added to cart", "success");
    if (goCheckout) {
      onOpenChange(false);
      setTimeout(() => {
        window.location.href = "/checkout";
      }, 60);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 border-border/60 bg-card overflow-hidden
                   w-[calc(100vw-1rem)] sm:w-auto
                   max-w-[calc(100vw-1rem)] sm:max-w-3xl lg:max-w-[min(96vw,1240px)]
                   max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-4rem)]
                   flex flex-col rounded-2xl"
      >
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-7 py-4 pe-14 border-b border-border/60 bg-gradient-to-b from-brand/[0.06] to-transparent">
          <DialogTitle className="text-base sm:text-lg font-black leading-tight">
            {isAr ? "الشراء السريع" : "Quick Buy"}
          </DialogTitle>
          <DialogDescription className="text-xs mt-0.5 text-muted-foreground leading-tight">
            {isAr ? "اختر الخطة المناسبة والكمية" : "Pick a plan and quantity"}
          </DialogDescription>
        </div>

        {/* Body: sidebar + main */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* SIDEBAR: product identity + actions */}
            <aside className="p-5 sm:p-6 lg:p-7 border-b lg:border-b-0 lg:border-s border-border/60 bg-gradient-to-b from-brand/[0.04] to-transparent flex flex-col gap-5">
              <div className="flex lg:flex-col items-center gap-4">
                <div className="shrink-0 size-20 lg:size-full lg:aspect-square lg:max-w-[220px] lg:mx-auto rounded-2xl border border-border/60 bg-background overflow-hidden shadow-lg">
                  {product.icon_url ? (
                    <img src={product.icon_url} alt={name} className="size-full object-cover" />
                  ) : (
                    <div className="size-full grid place-items-center bg-brand/10 text-brand font-black text-3xl lg:text-5xl">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 lg:flex-none lg:text-center">
                  <h3 className="text-lg lg:text-xl font-black leading-tight break-words">
                    {name}
                  </h3>
                  {nameAlt && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {nameAlt}
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand/15 text-brand px-3 py-1 text-[11px] font-black">
                      <Zap className="size-3" />
                      {isAr ? `خصم ${discount}%` : `${discount}% OFF`}
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden lg:block flex-1" />

              {plans.length > 0 && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => doAdd(true)}
                    disabled={!selected || soldOut}
                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full bg-brand text-brand-foreground font-black text-sm shadow-lg hover:brand-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="size-4" />
                    {isAr ? "اشترِ الآن" : "Buy now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => doAdd(false)}
                    disabled={!selected || soldOut}
                    className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full border border-border bg-background text-foreground font-bold text-sm hover:border-brand/60 hover:text-brand transition disabled:opacity-50"
                  >
                    <ShoppingCart className="size-4" />
                    {isAr ? "أضف للسلة" : "Add to cart"}
                  </button>
                  <Link
                    to="/product/$slug"
                    params={{ slug: product.slug }}
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full text-brand font-bold text-xs hover:bg-brand/5 transition"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>{isAr ? "عرض التفاصيل الكاملة" : "View full details"}</span>
                  </Link>
                </div>
              )}
            </aside>

            {/* MAIN: plans + qty/total */}
            <section className="p-5 sm:p-6 lg:p-7 flex flex-col gap-5 min-w-0">
              <div className="flex-1 min-h-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-brand">
                    {isAr ? "اختر الخطة" : "Choose a plan"}
                  </div>
                  {plans.length > 0 && (
                    <div className="text-[10px] font-bold text-muted-foreground">
                      {plans.length} {isAr ? "خطط متاحة" : "plans"}
                    </div>
                  )}
                </div>

                {plansQ.isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    {isAr ? "لا توجد خطط متاحة" : "No plans available"}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {plans.map((pl) => {
                      const isSel = selected?.id === pl.id;
                      const so = Number(pl.stock ?? 0) <= 0;
                      const raw = Number(pl.price);
                      const price = hasDiscount ? Math.round(raw * (100 - discount)) / 100 : raw;
                      const label = (isAr ? pl.label_ar : pl.label_en) || (isAr ? "خطة" : "Plan");
                      return (
                        <button
                          key={pl.id}
                          type="button"
                          onClick={() => !so && setSelectedId(pl.id)}
                          disabled={so}
                          className={`group relative text-start p-4 rounded-2xl border-2 transition-all overflow-hidden ${
                            so
                              ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                              : isSel
                                ? "border-brand bg-brand/[0.06] shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_12%,transparent)]"
                                : "border-border bg-background hover:border-brand/50 hover:bg-brand/[0.02]"
                          }`}
                        >
                          {/* Selected check */}
                          {isSel && !so && (
                            <span className="absolute top-3 end-3 grid place-items-center size-6 rounded-full bg-brand text-brand-foreground shadow-md">
                              <Check className="size-3.5" strokeWidth={3} />
                            </span>
                          )}
                          {/* Plan name */}
                          <div className={`text-sm font-black leading-snug pe-8 mb-3 min-h-[2.5rem] ${so ? "line-through" : ""}`}>
                            {label}
                          </div>
                          {/* Divider */}
                          <div className="h-px bg-border/60 -mx-4 mb-3" />
                          {/* Price row */}
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-2xl font-black tabular-nums leading-none ${isSel ? "text-brand" : "text-foreground"}`}>
                                {price}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-bold">{t.common.currency}</span>
                            </div>
                            {hasDiscount && (
                              <span className="text-xs text-muted-foreground/70 line-through tabular-nums">
                                {raw}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {plans.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-4">
                  <div className="flex items-center justify-between sm:justify-start gap-3">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brand">
                      {isAr ? "الكمية" : "Qty"}
                    </span>
                    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="size-9 rounded-full grid place-items-center hover:bg-muted transition"
                        aria-label="decrease"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-9 text-center font-black tabular-nums text-base">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.min(99, q + 1))}
                        className="size-9 rounded-full grid place-items-center hover:bg-muted transition"
                        aria-label="increase"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  {selected && (
                    <div className="flex items-baseline justify-between sm:justify-end gap-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-brand">
                        {isAr ? "الإجمالي" : "Total"}
                      </span>
                      <div className="flex items-baseline gap-2">
                        {hasDiscount && (
                          <span className="text-sm text-muted-foreground line-through tabular-nums">
                            {Math.round(rawUnit * qty * 100) / 100}
                          </span>
                        )}
                        <span className="text-3xl sm:text-4xl font-black text-brand tabular-nums leading-none">
                          {total}
                        </span>
                        <span className="text-sm font-black text-brand/80">{t.common.currency}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

