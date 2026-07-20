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
  account_type?: string | null;
};

type AcctType = "private" | "shared" | "own";

function parseAcct(pl: Plan): AcctType | "any" {
  const en = String(pl.label_en ?? "");
  const ar = String(pl.label_ar ?? "");
  if (pl.account_type === "private" || pl.account_type === "shared" || pl.account_type === "own") {
    return pl.account_type;
  }
  if (/private/i.test(en) || /خاص|برايفت/i.test(ar)) return "private";
  if (/shared/i.test(en) || /مشترك|شير/i.test(ar)) return "shared";
  if (/\bown\b|our own/i.test(en) || /من عندنا|من عندك|بحسابك|حسابك/i.test(ar)) return "own";
  return "any";
}

const acctMeta = {
  private: { ar: "خاص", en: "Private" },
  shared: { ar: "مشترك", en: "Shared" },
  own: { ar: "خاص", en: "Private" },
} as const;

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
  const desc = isAr ? (product as any).description_ar : (product as any).description_en;
  const discount = Number(product.discount_percent ?? 0);
  const hasDiscount = discount > 0;

  const plansQ = useQuery({
    queryKey: ["quickbuy-plans", product.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_plans")
        .select("id, price, label_ar, label_en, is_active, sort_order, stock, account_type")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data ?? []) as Plan[];
    },
    enabled: open,
  });

  const allPlans = plansQ.data ?? [];
  const enriched = useMemo(
    () => allPlans.map((p) => ({ ...p, acct: parseAcct(p) })),
    [allPlans],
  );

  // Normalize "own" → "private" for the user-facing selector
  const rawTypes = Array.from(
    new Set(enriched.map((p) => p.acct).filter((a) => a !== "any")),
  ) as AcctType[];
  const normalizedTypes = Array.from(
    new Set(rawTypes.map((a) => (a === "own" ? "private" : a))),
  ) as ("private" | "shared")[];
  const hasAcctChoice = normalizedTypes.length > 1;

  const [acct, setAcct] = useState<"private" | "shared" | null>(null);
  const effectiveAcct = acct ?? normalizedTypes[0] ?? null;

  const plans = useMemo(() => {
    if (!hasAcctChoice || !effectiveAcct) return enriched;
    return enriched.filter(
      (p) =>
        p.acct === "any" ||
        (effectiveAcct === "private" && (p.acct === "private" || p.acct === "own")) ||
        (effectiveAcct === "shared" && p.acct === "shared"),
    );
  }, [enriched, hasAcctChoice, effectiveAcct]);

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
      <DialogContent dir={isAr ? "rtl" : "ltr"} className="max-w-lg md:max-w-[min(95vw,1100px)] p-0 overflow-hidden gap-0 border-border/60 bg-card flex flex-col max-h-[calc(100dvh-1rem)] md:max-h-[min(96dvh,760px)]">
        {/* ============ MOBILE LAYOUT (unchanged) ============ */}
        <div className="md:hidden flex flex-col min-h-0 flex-1">
          {/* Header */}
          <div className="shrink-0 px-4 pt-5 pb-3 border-b border-border/60 bg-card">
            <DialogHeader className="!text-start space-y-1 pe-12 sm:!text-start">
              <div className="flex items-center gap-3">
                <div className="shrink-0 size-10 rounded-xl border border-border bg-background overflow-hidden shadow-md">
                  {product.icon_url ? (
                    <img src={product.icon_url} alt={name} className="size-full object-cover" />
                  ) : (
                    <div className="size-full grid place-items-center bg-brand/10 text-brand font-black text-base">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-sm font-black leading-tight break-words">{name}</DialogTitle>
                  <DialogDescription className="text-[10px] mt-0.5 leading-tight">
                    {isAr ? "اختر الخطة والكمية للشراء السريع" : "Pick a plan and quantity"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Plans */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
            {hasAcctChoice && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1.5">
                  {isAr ? "نوع الحساب" : "Account type"}
                </div>
                <div
                  className="grid gap-1 p-1 rounded-lg bg-muted/40 border border-border"
                  style={{ gridTemplateColumns: `repeat(${normalizedTypes.length}, minmax(0,1fr))` }}
                >
                  {normalizedTypes.map((a) => {
                    const isSel = effectiveAcct === a;
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAcct(a)}
                        className={`px-2 py-1.5 rounded-md text-xs font-extrabold transition ${
                          isSel
                            ? "bg-brand text-brand-foreground shadow"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {acctMeta[a][isAr ? "ar" : "en"]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-2">
              {isAr ? "اختر الخطة" : "Choose a plan"}
            </div>

            {plansQ.isLoading ? (
              <div className="grid grid-cols-1 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {isAr ? "لا توجد خطط متاحة" : "No plans available"}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
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
                      className={`flex items-center justify-between gap-2 text-start px-3 py-2 rounded-lg border-2 transition-all ${
                        so
                          ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                          : isSel
                            ? "border-brand bg-brand/5"
                            : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isSel && !so && (
                          <span className="shrink-0 grid place-items-center size-4 rounded-full bg-brand text-brand-foreground">
                            <Check className="size-2.5" />
                          </span>
                        )}
                        <span className={`text-xs font-extrabold truncate ${so ? "line-through" : ""}`}>
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

          {/* Footer */}
          {plans.length > 0 && (
            <div className="shrink-0 border-t border-border/60 bg-card px-4 py-3 space-y-2.5">
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

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => doAdd(true)}
                  disabled={!selected || soldOut}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-brand text-brand-foreground font-black text-xs shadow-lg hover:brand-glow transition-all disabled:opacity-50"
                >
                  <Zap className="size-3.5" />
                  {isAr ? "اشترِ الآن" : "Buy now"}
                </button>
                <button
                  type="button"
                  onClick={() => doAdd(false)}
                  disabled={!selected || soldOut}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full border border-border bg-background text-foreground font-bold text-xs hover:border-brand/60 hover:text-brand transition disabled:opacity-50"
                >
                  <ShoppingCart className="size-3.5" />
                  {isAr ? "أضف للسلة" : "Add to cart"}
                </button>
              </div>

              <Link
                to="/product/$slug"
                params={{ slug: product.slug }}
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full border-2 border-dashed border-brand/40 bg-brand/5 text-brand font-black text-xs hover:bg-brand/10 hover:border-brand transition-all"
              >
                <ExternalLink className="size-3.5" />
                <span>{isAr ? "التفاصيل الكاملة" : "Full details"}</span>
              </Link>
            </div>
          )}
        </div>

        {/* ============ DESKTOP LAYOUT (redesigned) ============ */}
        <div className="hidden md:flex flex-col min-h-0">
          {/* Top strip: title + subtitle */}
          <div className="shrink-0 px-6 pt-4 pb-3 border-b border-border/60 bg-gradient-to-b from-brand/5 to-transparent">
            <DialogHeader className="!text-start space-y-0.5 pe-12 sm:!text-start">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-brand">
                {isAr ? "شراء سريع" : "Quick buy"}
              </div>
              <DialogTitle className="text-xl font-black leading-tight break-words">
                {name}
              </DialogTitle>
              <DialogDescription className="text-xs leading-snug text-muted-foreground line-clamp-2">
                {desc || (isAr ? "اختر الخطة والكمية وأتمّ شراءك في ثوانٍ" : "Pick a plan and quantity to check out in seconds")}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Split body — auto height, no scroll */}
          <div className="min-h-0">
            <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-0 items-stretch">
              {/* RIGHT column (start in RTL): image + 3 actions */}
              <aside className="border-e border-border/60 bg-muted/20 p-4 flex flex-col gap-3 min-h-0">
                <div className="relative w-full rounded-2xl border border-border bg-background overflow-hidden shadow-lg shrink-0" style={{ aspectRatio: "1 / 1", maxHeight: "220px" }}>
                  {product.icon_url ? (
                    <img src={product.icon_url} alt={name} className="size-full object-cover" />
                  ) : (
                    <div className="size-full grid place-items-center bg-brand/10 text-brand font-black text-5xl">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {hasDiscount && (
                    <div className={`absolute top-3 ${isAr ? "start-3" : "end-3"} bg-destructive text-destructive-foreground px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase font-mono shadow-lg`}>
                      -{discount}%
                    </div>
                  )}
                </div>

                {/* 3 stacked action buttons */}
                <div className="flex flex-col gap-2 shrink-0 mt-auto">
                  <button
                    type="button"
                    onClick={() => doAdd(true)}
                    disabled={!selected || soldOut}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-brand text-brand-foreground font-black text-xs shadow-lg hover:brand-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="size-3.5" />
                    {isAr ? "اشترِ الآن" : "Buy now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => doAdd(false)}
                    disabled={!selected || soldOut}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border-2 border-border bg-background text-foreground font-bold text-xs hover:border-brand/60 hover:text-brand transition disabled:opacity-50"
                  >
                    <ShoppingCart className="size-3.5" />
                    {isAr ? "أضف للسلة" : "Add to cart"}
                  </button>
                  <Link
                    to="/product/$slug"
                    params={{ slug: product.slug }}
                    onClick={() => onOpenChange(false)}
                    className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border-2 border-dashed border-brand/40 bg-brand/5 text-brand font-black text-xs hover:bg-brand/10 hover:border-brand transition-all"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>{isAr ? "التفاصيل الكاملة" : "Full details"}</span>
                  </Link>
                </div>

              </aside>

              {/* LEFT column (end in RTL): plans only, fills width, no scroll */}
              <section className="p-4 flex flex-col gap-2.5 min-w-0 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-brand">
                    {isAr ? "اختر الخطة" : "Choose a plan"}
                  </div>
                  {plans.length > 0 && (
                    <div className="text-[10px] font-bold text-muted-foreground">
                      {plans.length} {isAr ? "خطط متاحة" : "plans available"}
                    </div>
                  )}
                </div>

                {hasAcctChoice && (
                  <div
                    className="grid gap-1.5 p-1 rounded-xl bg-muted/40 border border-border shrink-0"
                    style={{ gridTemplateColumns: `repeat(${normalizedTypes.length}, minmax(0,1fr))` }}
                  >
                    {normalizedTypes.map((a) => {
                      const isSel = effectiveAcct === a;
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAcct(a)}
                          className={`px-3 py-2 rounded-lg text-xs font-extrabold transition ${
                            isSel
                              ? "bg-gradient-to-br from-brand to-brand/70 text-brand-foreground shadow-[0_10px_30px_-10px_hsl(var(--brand)/0.6)]"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {acctMeta[a][isAr ? "ar" : "en"]}
                        </button>
                      );
                    })}
                  </div>
                )}


                {plansQ.isLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    {isAr ? "لا توجد خطط متاحة" : "No plans available"}
                  </p>
                ) : (
                  <div
                    className={`grid gap-2 content-start auto-rows-min ${
                      plans.length <= 4 ? "grid-cols-2" : plans.length <= 9 ? "grid-cols-3" : "grid-cols-4"
                    }`}
                  >
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
                          className={`group relative text-start p-2.5 rounded-lg border-2 transition-all ${
                            so
                              ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                              : isSel
                                ? "border-brand bg-brand/5 shadow-[0_0_0_2px_color-mix(in_oklab,var(--brand)_15%,transparent)]"
                                : "border-border bg-background hover:border-brand/50"
                          }`}
                        >
                          {isSel && !so && (
                            <span className="absolute top-1.5 end-1.5 grid place-items-center size-4 rounded-full bg-brand text-brand-foreground shadow">
                              <Check className="size-2.5" />
                            </span>
                          )}
                          <div className={`text-[11px] font-extrabold mb-1 pe-5 truncate leading-tight ${so ? "line-through" : ""}`}>
                            {(isAr ? pl.label_ar : pl.label_en) || (isAr ? "خطة" : "Plan")}
                          </div>
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <span className={`text-base font-black tabular-nums leading-none ${isSel ? "text-brand" : ""}`}>
                              {price}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-bold">{t.common.currency}</span>
                            {hasDiscount && (
                              <span className="text-[9px] text-muted-foreground line-through tabular-nums">
                                {raw}
                              </span>
                            )}
                          </div>
                          {so && (
                            <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-destructive">
                              {isAr ? "نفدت" : "Sold out"}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Total + qty — sits right after plans, aligned with the details button */}
                {plans.length > 0 && (
                  <div className="mt-auto pt-2">
                    <div className="rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/10 via-brand/5 to-transparent p-3 flex items-center justify-between gap-4">
                      {/* qty */}
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                          {isAr ? "الكمية" : "Qty"}
                        </span>
                        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5 shadow-sm">
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
                      </div>

                      {/* total */}
                      {selected && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                            {isAr ? "الإجمالي" : "Total"}
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] text-muted-foreground line-through tabular-nums">
                              {Math.round(rawUnit * qty * 100) / 100}
                            </span>
                          )}
                          <span className="text-2xl font-black text-brand tabular-nums leading-none">
                            {total}
                          </span>
                          <span className="text-xs font-black text-brand/80">{t.common.currency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
