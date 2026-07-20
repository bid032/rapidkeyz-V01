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
                   max-w-[calc(100vw-1rem)] sm:max-w-2xl lg:max-w-[min(98vw,1500px)]
                   max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-4rem)]
                   flex flex-col"
      >
        {/* Sticky header */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 pe-14 border-b border-border/60 bg-card">
          <DialogTitle className="text-base sm:text-lg font-black leading-tight truncate">
            {isAr ? "الشراء السريع" : "Quick Buy"}
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs mt-0.5 text-muted-foreground leading-tight">
            {isAr ? "اختر الخطة والكمية للشراء السريع" : "Pick a plan and quantity to buy fast"}
          </DialogDescription>
        </div>


        {/* Scrollable body: split-pane on lg, stacked on mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-x-reverse divide-border">
            {/* LEFT: product hero + actions */}
            <aside className="lg:col-span-3 p-4 sm:p-6 lg:p-8 order-1 bg-gradient-to-br from-brand/5 via-transparent to-transparent flex flex-col gap-4 sm:gap-5">
              <div className="flex lg:flex-col items-center lg:items-stretch gap-3 lg:gap-5">
                <div className="shrink-0 size-14 sm:size-20 lg:size-auto lg:w-full lg:aspect-square rounded-2xl border border-border bg-background overflow-hidden shadow-md lg:shadow-xl">
                  {product.icon_url ? (
                    <img src={product.icon_url} alt={name} className="size-full object-cover" />
                  ) : (
                    <div className="size-full grid place-items-center bg-brand/10 text-brand font-black text-2xl lg:text-6xl">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 lg:flex-none text-start lg:text-center">
                  <h3 className="text-base sm:text-xl lg:text-2xl font-black leading-tight break-words">
                    {name}
                  </h3>
                  {nameAlt && (
                    <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 lg:mt-1 truncate">
                      {nameAlt}
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand/15 text-brand px-2.5 py-1 text-[11px] font-black">
                      <Zap className="size-3" />
                      {isAr ? `خصم ${discount}%` : `${discount}% OFF`}
                    </div>
                  )}
                </div>
              </div>

              {/* Spacer pushes actions to bottom on desktop so both columns bottom-align */}
              <div className="hidden lg:block flex-1" />

              {/* Actions — under the image */}
              {plans.length > 0 && (
                <div className="flex flex-col gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => doAdd(true)}
                    disabled={!selected || soldOut}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-full bg-brand text-brand-foreground font-black text-sm shadow-lg hover:brand-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="size-4" />
                    {isAr ? "اشترِ الآن" : "Buy now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => doAdd(false)}
                    disabled={!selected || soldOut}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-full border border-border bg-background text-foreground font-bold text-sm hover:border-brand/60 hover:text-brand transition disabled:opacity-50"
                  >
                    <ShoppingCart className="size-4" />
                    {isAr ? "أضف للسلة" : "Add to cart"}
                  </button>
                  <Link
                    to="/product/$slug"
                    params={{ slug: product.slug }}
                    onClick={() => onOpenChange(false)}
                    className="group flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full border-2 border-dashed border-brand/40 bg-brand/5 text-brand font-black text-xs sm:text-sm hover:bg-brand/10 hover:border-brand transition-all"
                  >
                    <ExternalLink className="size-3.5 sm:size-4" />
                    <span>{isAr ? "عرض التفاصيل الكاملة" : "View full details"}</span>
                  </Link>
                </div>
              )}
            </aside>

            {/* RIGHT: plans + qty/total */}
            <section className="lg:col-span-7 p-4 sm:p-6 lg:p-8 order-2 flex flex-col gap-4 sm:gap-5 min-w-0">
              <div className="flex-1 min-h-0">
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-brand mb-2 sm:mb-3">
                  {isAr ? "اختر الخطة" : "Choose a plan"}
                </div>
                {plansQ.isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-16 sm:h-24 rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {isAr ? "لا توجد خطط متاحة" : "No plans available"}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {plans.map((pl) => {
                      const isSel = selected?.id === pl.id;
                      const so = Number(pl.stock ?? 0) <= 0;
                      const raw = Number(pl.price);
                      const price = hasDiscount ? Math.round(raw * (100 - discount)) / 100 : raw;
                      return (
                        <button
                          key={pl.id}
                          type="button"
                          onClick={() => !so && setSelectedId(pl.id)}
                          disabled={so}
                          className={`group relative text-start px-3 sm:px-4 py-3 sm:py-4 rounded-xl border-2 transition-all ${
                            so
                              ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                              : isSel
                                ? "border-brand bg-brand/5 shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_15%,transparent)]"
                                : "border-border bg-background hover:border-brand/50"
                          }`}
                        >
                          {isSel && !so && (
                            <span className="absolute top-2.5 end-2.5 grid place-items-center size-6 rounded-full bg-brand text-brand-foreground shadow">
                              <Check className="size-3.5" />
                            </span>
                          )}
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                            {isAr ? "المدة" : "Plan"}
                          </div>
                          <div className={`text-sm sm:text-base font-extrabold mb-2 pe-8 ${so ? "line-through" : ""}`}>
                            {(isAr ? pl.label_ar : pl.label_en) || (isAr ? "خطة" : "Plan")}
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-xl sm:text-2xl font-black tabular-nums ${isSel ? "text-brand" : ""}`}>
                              {price}
                            </span>
                            <span className="text-xs text-muted-foreground font-bold">{t.common.currency}</span>
                            {hasDiscount && (
                              <span className="text-xs text-muted-foreground line-through tabular-nums ms-1">
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
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                      {isAr ? "الكمية" : "Qty"}
                    </span>
                    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5 sm:p-1">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="size-8 sm:size-9 rounded-full grid place-items-center hover:bg-muted transition"
                        aria-label="decrease"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-7 sm:min-w-8 text-center font-black tabular-nums text-sm sm:text-base">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.min(99, q + 1))}
                        className="size-8 sm:size-9 rounded-full grid place-items-center hover:bg-muted transition"
                        aria-label="increase"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  {selected && (
                    <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0">
                      {hasDiscount && (
                        <span className="text-[10px] sm:text-sm text-muted-foreground line-through tabular-nums">
                          {Math.round(rawUnit * qty * 100) / 100}
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-brand">
                        {isAr ? "الإجمالي" : "Total"}
                      </span>
                      <span className="text-2xl sm:text-4xl font-black text-brand tabular-nums leading-none">
                        {total}
                      </span>
                      <span className="text-xs sm:text-base font-black text-brand/80">{t.common.currency}</span>
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
