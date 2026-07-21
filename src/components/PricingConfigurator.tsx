import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/contexts/AppContext";

type Plan = {
  id: string;
  price: number;
  compare_price?: number | null;
  stock?: number | null;
  durAr: string;
  durEn: string;
  acct: "private" | "shared" | "own" | "any";
};

type Props = {
  accountTypes: ("private" | "shared" | "own")[];
  effectiveAcct: "private" | "shared" | "own" | undefined;
  onAcctChange: (a: "private" | "shared" | "own") => void;
  plans: Plan[];
  selectedId: string | undefined;
  onSelectPlan: (id: string) => void;
  discount: number;
  minRawPrice: number;
  variants?: string[];
  effectiveVariant?: string | null;
  onVariantChange?: (v: string) => void;
};


const acctMeta = {
  private: {
    ar: { title: "خاص", sub: "تحكم كامل • أجهزة متعددة" },
    en: { title: "Private", sub: "Full control • Multi-device" },
  },
  shared: {
    ar: { title: "مشترك", sub: "اقتصادي • جهاز واحد" },
    en: { title: "Shared", sub: "Best value • Single device" },
  },
  own: {
    ar: { title: "خاص", sub: "تحكم كامل • أجهزة متعددة" },
    en: { title: "Private", sub: "Full control • Multi-device" },
  },
} as const;

export function PricingConfigurator({
  accountTypes,
  effectiveAcct,
  onAcctChange,
  plans,
  selectedId,
  onSelectPlan,
  discount,
  minRawPrice,
  variants,
  effectiveVariant,
  onVariantChange,
}: Props) {

  const { lang, t } = useApp();
  const isAr = lang === "ar";
  const hasDiscount = discount > 0;
  // Normalize: treat "own" as "private" so users only see Private / Shared
  const normalizedTypes = Array.from(
    new Set(accountTypes.map((a) => (a === "own" ? "private" : a))),
  ) as ("private" | "shared")[];
  const normalizedEffective =
    effectiveAcct === "own" ? "private" : (effectiveAcct as "private" | "shared" | undefined);
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];
  const rawPrice = selected ? Number(selected.price) : 0;
  const finalPrice = hasDiscount ? Math.round(rawPrice * (100 - discount)) / 100 : rawPrice;
  const selectedStock = Number(selected?.stock ?? 0);
  const selectedSoldOut = !!selected && selectedStock <= 0;

  // Compute per-plan savings vs cheapest per-day rate (assumes shortest = highest per-day)
  const perDay = (p: Plan) => {
    const days = parseInt(p.durEn) || parseInt(p.durAr) || 30;
    return Number(p.price) / Math.max(1, days);
  };
  const maxPerDay = plans.reduce((m, p) => Math.max(m, perDay(p)), 0);

  return (
    <div className="relative rounded-3xl border border-border bg-gradient-to-br from-card via-card to-background overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-24 -end-24 w-64 h-64 bg-brand/15 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -start-24 w-72 h-72 bg-brand/10 rounded-full blur-3xl" />

      <div className="relative p-3.5 sm:p-4 space-y-3.5">
        {/* Unified row: Plan type + Account type (same design regardless of count) */}
        {(normalizedTypes.length > 0 || (variants && variants.length > 0)) && (
          <div className="grid gap-2 grid-cols-1">
            {/* Plan variant - segmented buttons like Account */}
            {variants && variants.length > 0 && (
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand mb-1.5">
                  {isAr ? "نوع الخطة" : "Plan"}
                </p>
                <div
                  className="grid gap-1 p-1 rounded-xl bg-muted/40 border border-border h-[54px]"
                  style={{ gridTemplateColumns: `repeat(${variants.length}, minmax(0,1fr))` }}
                >
                  {variants.map((v) => {
                    const isSel = (effectiveVariant ?? variants[0]) === v || variants.length === 1;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onVariantChange?.(v)}
                        className="relative px-2 rounded-lg text-start focus:outline-none overflow-hidden"
                      >
                        {isSel && (
                          <motion.span
                            layoutId="variant-pill"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            className="absolute inset-0 rounded-lg bg-gradient-to-br from-brand to-brand/70 shadow-[0_10px_30px_-10px_hsl(var(--brand)/0.6)]"
                          />
                        )}
                        <span className="relative flex items-center justify-center h-full">
                          <span className={`block text-xs font-extrabold leading-tight truncate text-center ${isSel ? "text-brand-foreground" : "text-foreground"}`}>
                            <bdi>{v}</bdi>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}


            {/* Account type - unified card design (1 or more) */}
            {normalizedTypes.length > 0 && (
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand mb-1.5">
                  {isAr ? "نوع الحساب" : "Account"}
                </p>
                <div
                  className={`grid gap-1 p-1 rounded-xl bg-muted/40 border border-border h-[54px]`}
                  style={{ gridTemplateColumns: `repeat(${normalizedTypes.length}, minmax(0,1fr))` }}
                >
                  {normalizedTypes.map((a) => {
                    const isSel = normalizedEffective === a || normalizedTypes.length === 1;
                    const meta = acctMeta[a][isAr ? "ar" : "en"];
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => onAcctChange(a)}
                        className="relative px-2 rounded-lg text-start focus:outline-none overflow-hidden"
                      >
                        {isSel && (
                          <motion.span
                            layoutId="acct-pill"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            className="absolute inset-0 rounded-lg bg-gradient-to-br from-brand to-brand/70 shadow-[0_10px_30px_-10px_hsl(var(--brand)/0.6)]"
                          />
                        )}
                        <span className="relative flex flex-col justify-center h-full">
                          <span className={`block text-xs font-extrabold leading-tight truncate ${isSel ? "text-brand-foreground" : "text-foreground"}`}>
                            {meta.title}
                          </span>
                          <span className={`block text-[9px] mt-0.5 leading-tight truncate ${isSel ? "text-brand-foreground/85" : "text-muted-foreground"}`}>
                            {meta.sub}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}


        {/* Duration cards */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
              {isAr ? "المدة" : "Duration"}
            </p>
            <p className="text-[9px] text-muted-foreground">
              {isAr ? "وفر أكثر مع المدد الأطول" : "Longer = save more"}
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">

            {plans.map((pl) => {
              const isSel = selected?.id === pl.id;
              const stock = Number(pl.stock ?? 0);
              const soldOut = stock <= 0;
              const raw = Number(pl.price);
              const price = hasDiscount ? Math.round(raw * (100 - discount)) / 100 : raw;
              const savePct =
                maxPerDay > 0 ? Math.round((1 - perDay(pl) / maxPerDay) * 100) : 0;
              return (
                <button
                  key={pl.id}
                  onClick={() => !soldOut && onSelectPlan(pl.id)}
                  disabled={soldOut}
                  className={`relative text-start p-2.5 rounded-xl border-2 transition-all overflow-hidden group ${
                    soldOut
                      ? "border-destructive/40 bg-destructive/5 cursor-not-allowed"
                      : isSel
                      ? "border-brand bg-brand/5 shadow-[0_0_0_3px_hsl(var(--brand)/0.08)]"
                      : "border-border bg-card hover:border-brand/50 hover:-translate-y-0.5"
                  }`}
                >
                  {isSel && !soldOut && (
                    <motion.span
                      layoutId="plan-glow"
                      className="pointer-events-none absolute -top-6 -end-6 w-20 h-20 bg-brand/25 rounded-full blur-2xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  {soldOut && (
                    <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${isAr ? "end-2" : "start-2"} text-[11px] font-black uppercase px-2 py-1 rounded-md bg-destructive text-destructive-foreground shadow-md tracking-wider z-10`}>
                      {t.product.soldOut}
                    </span>
                  )}
                  <div className={`relative flex items-center justify-between gap-2 ${soldOut ? "opacity-70" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-extrabold mb-1 leading-tight truncate ${soldOut ? "line-through" : ""}`}>
                        {isAr ? pl.durAr : pl.durEn}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-base font-black tabular-nums leading-none ${
                            isSel ? "text-brand" : "text-foreground"
                          } ${soldOut ? "line-through" : ""}`}
                        >
                          {price}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground">
                          {t.common.currency}
                        </span>
                      </div>
                    </div>
                    {savePct >= 10 && !soldOut && (
                      <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-success/15 text-success border border-success/30 tabular-nums">
                        -{savePct}%
                      </span>
                    )}
                  </div>
                </button>


              );
            })}
            {plans.length === 0 && (
              <div className="col-span-full text-muted-foreground text-sm p-4 text-center">
                {isAr ? "لا توجد خطط متاحة حالياً" : "No plans available"}
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div
            className={`relative rounded-xl border p-3 overflow-hidden transition-colors ${
              selectedSoldOut
                ? "border-destructive/40 bg-gradient-to-br from-destructive/10 via-card to-card"
                : "border-brand/30 bg-gradient-to-br from-brand/10 via-card to-card"
            }`}
          >
            <div
              className={`pointer-events-none absolute inset-0 ${
                selectedSoldOut
                  ? "bg-[radial-gradient(circle_at_top_right,hsl(var(--destructive)/0.18),transparent_60%)]"
                  : "bg-[radial-gradient(circle_at_top_right,hsl(var(--brand)/0.18),transparent_60%)]"
              }`}
            />
            <div className="relative flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div
                  className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 ${
                    selectedSoldOut ? "text-destructive" : "text-brand"
                  }`}
                >
                  {isAr ? "الإجمالي" : "Total"}
                </div>
                <AnimatePresence mode="wait">
                  {selectedSoldOut ? (
                    <motion.div
                      key={`${selected.id}-sold`}
                      initial={{ y: 8, opacity: 0, scale: 0.96 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: -8, opacity: 0, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      className="flex items-center gap-2"
                    >
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-black uppercase tracking-wider shadow-md">
                        <span className="inline-block size-1.5 rounded-full bg-destructive-foreground/90 animate-pulse" />
                        {t.product.soldOut}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {isAr ? "غير متاح للشراء حالياً" : "Currently unavailable"}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`${selected.id}-${finalPrice}`}
                      initial={{ y: 8, opacity: 0, scale: 0.96 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: -8, opacity: 0, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      className="flex items-baseline gap-2 flex-wrap"
                    >
                      <span className="text-2xl sm:text-3xl font-black text-brand tabular-nums leading-none">
                        {finalPrice}
                      </span>
                      <span className="text-xs font-black text-brand/80">{t.common.currency}</span>
                      {hasDiscount && (
                        <span className="text-xs text-muted-foreground line-through tabular-nums">
                          {rawPrice}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-col items-stretch gap-1.5 shrink-0 max-w-[45%]">
                {!selectedSoldOut && hasDiscount && (
                  <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-success/15 text-success border border-success/30 tabular-nums text-center">
                    -{discount}%
                  </span>
                )}
                {!selectedSoldOut && selectedStock > 0 && selectedStock <= 10 && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-md whitespace-nowrap text-center bg-warning/15 text-warning border border-warning/30">
                    {t.product.stockLeft(selectedStock)}
                  </span>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
