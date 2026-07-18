import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Zap, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 border-border/60 bg-card flex flex-col max-h-[calc(100dvh-1rem)]">
        {/* Header (sticky top) */}
        <div className="shrink-0 px-4 pt-5 pb-3 sm:px-6 border-b border-border/60 bg-card">
          <DialogHeader className="text-start space-y-1 pe-12">
            <div className="flex items-center gap-3">
              <div className="shrink-0 size-10 sm:size-12 rounded-xl border border-border bg-background overflow-hidden shadow-md">
                {product.icon_url ? (
                  <img src={product.icon_url} alt={name} className="size-full object-cover" />
                ) : (
                  <div className="size-full grid place-items-center bg-brand/10 text-brand font-black text-base">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm sm:text-xl font-black leading-tight break-words">{name}</DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs mt-0.5 leading-tight">
                  {isAr ? "اختر الخطة والكمية" : "Pick a plan and quantity"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable plans area */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-2">
            {isAr ? "الخطة" : "Plan"}
          </div>
          {plansQ.isLoading ? (
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {isAr ? "لا توجد خطط متاحة" : "No plans available"}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                    className={`relative flex items-center justify-between gap-2 text-start px-3 py-2 rounded-lg border-2 transition-all ${
                      so
                        ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                        : isSel
                          ? "border-brand bg-brand/5"
                          : "border-border bg-background hover:border-brand/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSel && !so && (
                        <span className="shrink-0 grid place-items-center size-4 rounded-full bg-brand text-brand-foreground">
                          <Check className="size-2.5" />
                        </span>
                      )}
                      <span className={`text-xs sm:text-sm font-extrabold truncate ${so ? "line-through" : ""}`}>
                        {(isAr ? pl.label_ar : pl.label_en) || (isAr ? "خطة" : "Plan")}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-baseline gap-1">
                      <span className={`text-sm font-black tabular-nums ${isSel ? "text-brand" : ""}`}>
                        {price}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{t.common.currency}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky footer with qty + total + actions */}
        {plans.length > 0 && (
          <div className="shrink-0 border-t border-border/60 bg-card px-4 sm:px-6 py-3 space-y-2.5">
            {/* Qty + Total inline */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="size-7 rounded-full grid place-items-center hover:bg-muted transition text-sm"
                  aria-label="decrease"
                >
                  −
                </button>
                <span className="min-w-6 text-center font-black tabular-nums text-sm">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  className="size-7 rounded-full grid place-items-center hover:bg-muted transition text-sm"
                  aria-label="increase"
                >
                  +
                </button>
              </div>
              {selected && (
                <div className="flex items-baseline gap-1.5">
                  {hasDiscount && (
                    <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                      {Math.round(rawUnit * qty * 100) / 100}
                    </span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                    {isAr ? "الإجمالي" : "Total"}
                  </span>
                  <span className="text-2xl font-black text-brand tabular-nums leading-none">
                    {total}
                  </span>
                  <span className="text-xs font-black text-brand/80">{t.common.currency}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => doAdd(true)}
                disabled={!selected || soldOut}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-brand text-brand-foreground font-black text-xs sm:text-sm shadow-lg hover:brand-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="size-3.5" />
                {isAr ? "اشترِ الآن" : "Buy now"}
              </button>
              <button
                type="button"
                onClick={() => doAdd(false)}
                disabled={!selected || soldOut}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full border border-border bg-background text-foreground font-bold text-xs sm:text-sm hover:border-brand/60 hover:text-brand transition disabled:opacity-50"
              >
                <ShoppingCart className="size-3.5" />
                {isAr ? "أضف للسلة" : "Add to cart"}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/product/$slug"
                params={{ slug: product.slug }}
                className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-brand transition"
              >
                {isAr ? "التفاصيل الكاملة →" : "Full details →"}
              </Link>
            </div>
          </div>
        )}
      </DialogContent>

    </Dialog>
  );
}
