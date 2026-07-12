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
    ar: { title: "من عندنا", sub: "حساب جاهز • فوري" },
    en: { title: "Our Account", sub: "Ready-made • Instant" },
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
}: Props) {
  const { lang, t } = useApp();
  const isAr = lang === "ar";
  const hasDiscount = discount > 0;
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
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-brand/15 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-72 h-72 bg-brand/10 rounded-full blur-3xl" />

      <div className="relative p-5 sm:p-7 space-y-6">
        {/* Account type — segmented pill with sliding indicator */}
        {accountTypes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                {isAr ? "١ · نوع الحساب" : "1 · Account Type"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isAr ? "اختر ما يناسبك" : "Pick a fit"}
              </p>
            </div>
            <div
              className={`grid gap-2 p-1.5 rounded-2xl bg-muted/40 border border-border`}
              style={{ gridTemplateColumns: `repeat(${accountTypes.length}, minmax(0,1fr))` }}
            >
              {accountTypes.map((a) => {
                const isSel = effectiveAcct === a;
                const meta = acctMeta[a][isAr ? "ar" : "en"];
                return (
                  <button
                    key={a}
                    onClick={() => onAcctChange(a)}
                    className="relative px-3 py-3 rounded-xl text-start focus:outline-none"
                  >
                    {isSel && (
                      <motion.span
                        layoutId="acct-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand to-brand/70 shadow-[0_10px_30px_-10px_hsl(var(--brand)/0.6)]"
                      />
                    )}
                    <span className="relative block">
                      <span
                        className={`block text-sm font-extrabold ${
                          isSel ? "text-brand-foreground" : "text-foreground"
                        }`}
                      >
                        {meta.title}
                      </span>
                      <span
                        className={`block text-[10px] mt-0.5 ${
                          isSel ? "text-brand-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {meta.sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Duration cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
              {isAr ? "٢ · المدة" : "2 · Duration"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isAr ? "كل ما زادت المدة، وفرت أكثر" : "Longer plans save more"}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                  className={`relative text-start p-3 rounded-2xl border-2 transition-all overflow-hidden group ${
                    soldOut
                      ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                      : isSel
                      ? "border-brand bg-brand/5 shadow-[0_0_0_4px_hsl(var(--brand)/0.08)]"
                      : "border-border bg-card hover:border-brand/50 hover:-translate-y-0.5"
                  }`}
                >
                  {isSel && !soldOut && (
                    <motion.span
                      layoutId="plan-glow"
                      className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 bg-brand/25 rounded-full blur-2xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  {savePct >= 10 && !soldOut && (
                    <span className="absolute top-1.5 end-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-success/15 text-success border border-success/30">
                      {isAr ? `وفر ${savePct}%` : `Save ${savePct}%`}
                    </span>
                  )}
                  <div className="relative">
                    <div
                      className={`text-[10px] font-black uppercase tracking-wider mb-1 ${
                        isSel ? "text-brand" : "text-muted-foreground"
                      }`}
                    >
                      {isAr ? "المدة" : "Duration"}
                    </div>
                    <div className={`text-sm font-extrabold mb-2 ${soldOut ? "line-through" : ""}`}>
                      {isAr ? pl.durAr : pl.durEn}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-lg font-black tabular-nums ${
                          isSel ? "text-brand" : "text-foreground"
                        }`}
                      >
                        {price}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {t.common.currency}
                      </span>
                    </div>
                    {soldOut && (
                      <span className="mt-1 inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                        {t.product.soldOut}
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

        {/* Total price display — animated */}
        {selected && (
          <div className="relative rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-card to-card p-4 sm:p-5 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--brand)/0.18),transparent_60%)]" />
            <div className="relative flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">
                  {isAr ? "٣ · الإجمالي" : "3 · Total"}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selected.id}-${finalPrice}`}
                    initial={{ y: 12, opacity: 0, scale: 0.96 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -12, opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="flex items-baseline gap-2 flex-wrap"
                  >
                    <span className="text-4xl sm:text-5xl font-black text-brand tabular-nums leading-none">
                      {finalPrice}
                    </span>
                    <span className="text-sm font-black text-brand/80">{t.common.currency}</span>
                    {hasDiscount && (
                      <span className="text-sm text-muted-foreground line-through tabular-nums">
                        {rawPrice} {t.common.currency}
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {isAr ? `يبدأ من ${minRawPrice} ${t.common.currency}` : `From ${minRawPrice} ${t.common.currency}`}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {hasDiscount && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-destructive text-destructive-foreground uppercase tracking-wider">
                    -{discount}%
                  </span>
                )}
                {!selectedSoldOut && selectedStock > 0 && selectedStock <= 10 && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-warning/15 text-warning border border-warning/30">
                    {t.product.stockLeft(selectedStock)}
                  </span>
                )}
                {selectedSoldOut && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-destructive/15 text-destructive border border-destructive/30">
                    {t.product.soldOut}
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
