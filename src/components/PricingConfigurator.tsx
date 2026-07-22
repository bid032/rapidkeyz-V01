import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
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

  const sectionLabel = (text: string) => (
    <h3 className="text-brand text-sm font-semibold mb-3">{text}</h3>
  );

  return (
    <div className="relative rounded-3xl border border-white/10 bg-card/80 backdrop-blur-xl overflow-hidden shadow-2xl">
      {/* Soft ambient glow */}
      <div className="pointer-events-none absolute -top-24 -end-24 w-64 h-64 bg-brand/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -start-24 w-72 h-72 bg-brand/5 rounded-full blur-3xl" />

      <div className="relative p-4 sm:p-6 space-y-6">
        {/* Account type selector — segmented pill */}
        {normalizedTypes.length > 0 && (
          <section>
            {sectionLabel(isAr ? "نوع الحساب" : "Account")}
            <div
              className="grid gap-2 p-1.5 rounded-2xl bg-black/30 border border-white/5"
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
                    className={`relative py-2.5 px-2 rounded-xl transition-all focus:outline-none overflow-hidden ${
                      isSel
                        ? "bg-brand text-brand-foreground shadow-lg shadow-brand/20"
                        : "text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    <span className="relative block text-center leading-tight">
                      <span className="block text-sm font-bold truncate">{meta.title}</span>
                      <span className={`block text-[10px] mt-0.5 truncate ${isSel ? "text-brand-foreground/80" : "text-muted-foreground/80"}`}>
                        {meta.sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Plan variant selector — dropdown */}
        {variants && variants.length > 0 && (
          <section>
            {sectionLabel(isAr ? "نوع الخطة" : "Plan")}
            <PlanVariantDropdown
              variants={variants}
              value={effectiveVariant ?? variants[0]}
              onChange={(v) => onVariantChange?.(v)}
              isAr={isAr}
            />
          </section>
        )}


        {/* Duration grid */}
        <section>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            {sectionLabel(isAr ? "المدة" : "Duration")}
            <span className="text-[11px] text-muted-foreground">
              {isAr ? "وفر أكثر مع المدد الأطول" : "Longer = save more"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {plans.map((pl) => {
              const isSel = selected?.id === pl.id;
              const stock = Number(pl.stock ?? 0);
              const soldOut = stock <= 0;
              const raw = Number(pl.price);
              const price = hasDiscount ? Math.round(raw * (100 - discount)) / 100 : raw;
              const savePct = maxPerDay > 0 ? Math.round((1 - perDay(pl) / maxPerDay) * 100) : 0;
              const showSave = savePct >= 10 && !soldOut;

              return (
                <button
                  key={pl.id}
                  onClick={() => !soldOut && onSelectPlan(pl.id)}
                  disabled={soldOut}
                  className={`relative p-3 pt-7 rounded-2xl border-2 text-center transition-all overflow-hidden ${
                    soldOut
                      ? "border-destructive/30 bg-destructive/5 cursor-not-allowed"
                      : isSel
                      ? "border-brand bg-brand/5 shadow-[0_0_0_3px_hsl(var(--brand)/0.08)]"
                      : "border-white/10 bg-white/5 hover:border-brand/40 hover:-translate-y-0.5"
                  }`}
                >
                  {isSel && !soldOut && (
                    <motion.span
                      layoutId="plan-glow"
                      className="pointer-events-none absolute -top-6 -end-6 w-20 h-20 bg-brand/25 rounded-full blur-2xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  {soldOut ? (
                    <span className="pointer-events-none absolute top-1.5 start-1.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-destructive text-destructive-foreground shadow-md tracking-wider z-10">
                      {t.product.soldOut}
                    </span>
                  ) : showSave ? (
                    <span className={`pointer-events-none absolute top-1.5 start-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full tabular-nums z-10 ${
                      isSel
                        ? "bg-success/20 text-success border border-success/30"
                        : "bg-white/10 text-foreground/60 border border-white/10"
                    }`}>
                      -{savePct}%
                    </span>
                  ) : null}

                  <div className={`relative flex flex-col items-center gap-1.5 ${soldOut ? "opacity-60" : ""}`}>
                    <div className={`text-sm font-bold leading-tight ${soldOut ? "line-through" : ""}`}>
                      {isAr ? pl.durAr : pl.durEn}
                    </div>
                    <div className="flex items-baseline gap-1 justify-center">
                      <span
                        className={`text-lg font-black tabular-nums leading-none ${
                          isSel ? "text-brand" : soldOut ? "text-foreground/50" : "text-foreground"
                        } ${soldOut ? "line-through" : ""}`}
                      >
                        {price}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {t.common.currency}
                      </span>
                    </div>
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
        </section>

        {/* Summary card */}
        {selected && (
          <div
            className={`relative rounded-2xl border p-4 sm:p-5 overflow-hidden transition-colors ${
              selectedSoldOut
                ? "border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card"
                : "border-white/10 bg-gradient-to-br from-brand/10 via-card to-card"
            }`}
          >
            <div
              className={`pointer-events-none absolute inset-0 ${
                selectedSoldOut
                  ? "bg-[radial-gradient(circle_at_top_start,hsl(var(--destructive)/0.15),transparent_60%)]"
                  : "bg-[radial-gradient(circle_at_top_start,hsl(var(--brand)/0.15),transparent_60%)]"
              }`}
            />

            {/* MOBILE layout */}
            <div className="relative sm:hidden">
              <AnimatePresence mode="wait">
                {selectedSoldOut ? (
                  <motion.div
                    key={`${selected.id}-sold-m`}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="flex flex-col items-center text-center gap-2"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive">
                      {isAr ? "الإجمالي" : "Total"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-black uppercase tracking-wider shadow-md">
                      <span className="inline-block size-1.5 rounded-full bg-destructive-foreground/90 animate-pulse" />
                      {t.product.soldOut}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`${selected.id}-${finalPrice}-m`}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                        {isAr ? "الإجمالي" : "Total"}
                      </span>
                      {hasDiscount && (
                        <span className="text-[11px] text-muted-foreground line-through tabular-nums mt-0.5">
                          {rawPrice} {t.common.currency}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-3xl font-black text-brand tabular-nums leading-none">
                        {finalPrice}
                      </span>
                      <span className="text-xs font-black text-brand/80">{t.common.currency}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!selectedSoldOut && (hasDiscount || (selectedStock > 0 && selectedStock <= 10)) && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                  {hasDiscount && (
                    <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-md bg-success/15 text-success border border-success/30 tabular-nums shrink-0">
                      -{discount}%
                    </span>
                  )}
                  {selectedStock > 0 && selectedStock <= 10 && (
                    <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-md bg-warning/15 text-warning border border-warning/30 min-w-0 truncate">
                      {t.product.stockLeft(selectedStock)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* DESKTOP layout */}
            <div className="relative hidden sm:flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div
                  className={`text-xs font-black uppercase tracking-[0.2em] mb-1 ${
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
                      className="flex flex-col gap-1"
                    >
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-black uppercase tracking-wider shadow-md w-fit">
                        <span className="inline-block size-1.5 rounded-full bg-destructive-foreground/90 animate-pulse" />
                        {t.product.soldOut}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">
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
                      className="flex flex-col"
                    >
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-3xl font-black text-brand tabular-nums leading-none">
                          {finalPrice}
                        </span>
                        <span className="text-sm font-black text-brand/80">{t.common.currency}</span>
                      </div>
                      {hasDiscount && (
                        <span className="text-sm text-muted-foreground line-through tabular-nums">
                          {rawPrice} {t.common.currency}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {!selectedSoldOut && hasDiscount && (
                  <span className="inline-flex items-center justify-center w-fit text-xs font-black px-2.5 py-1 rounded-lg bg-success/15 text-success border border-success/30 tabular-nums">
                    -{discount}% {isAr ? "خصم" : "off"}
                  </span>
                )}
                {!selectedSoldOut && selectedStock > 0 && selectedStock <= 10 && (
                  <span className="inline-flex items-center justify-center w-fit text-xs font-black px-2.5 py-1 rounded-lg whitespace-nowrap bg-warning/15 text-warning border border-warning/30">
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

function PlanVariantDropdown({
  variants,
  value,
  onChange,
  isAr,
}: {
  variants: string[];
  value: string;
  onChange: (v: string) => void;
  isAr: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border bg-black/30 text-start transition-all focus:outline-none ${
          open ? "border-brand shadow-lg shadow-brand/10" : "border-white/10 hover:border-brand/40"
        }`}
      >
        <span className="flex flex-col min-w-0">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand/80">
            {isAr ? "الخطة المختارة" : "Selected plan"}
          </span>
          <span className="mt-0.5 text-sm font-bold truncate">
            <bdi>{value}</bdi>
          </span>
        </span>
        <span
          className={`shrink-0 grid place-items-center size-8 rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-transform ${
            open ? "rotate-180 text-brand border-brand/40" : ""
          }`}
        >
          <ChevronDown className="size-4" />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-2 w-full max-h-72 overflow-auto rounded-2xl border border-border/70 shadow-2xl p-1.5 bg-background/95 backdrop-blur-xl"
          >
            {variants.map((v) => {
              const isSel = v === value;
              return (
                <li key={v}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => {
                      onChange(v);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-start transition-all ${
                      isSel
                        ? "bg-brand text-brand-foreground shadow-md shadow-brand/20"
                        : "hover:bg-white/5 text-foreground"
                    }`}
                  >
                    <span className="text-sm font-bold truncate">
                      <bdi>{v}</bdi>
                    </span>
                    {isSel && <Check className="size-4 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

