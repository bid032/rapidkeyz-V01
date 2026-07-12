import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/contexts/AppContext";

type Props = {
  productName: string;
  description: string | null;
  deliveryType: "instant" | "manual";
};

type TabKey = "description" | "reviews" | "delivery" | "policy";

export function ProductTabs({ productName, description, deliveryType }: Props) {
  const { lang, t } = useApp();
  const isAr = lang === "ar";
  const [tab, setTab] = useState<TabKey>("description");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: isAr ? "الوصف" : "Description" },
    { key: "reviews", label: isAr ? "التقييمات" : "Reviews" },
    { key: "delivery", label: isAr ? "سياسة التسليم" : "Delivery Policy" },
    { key: "policy", label: isAr ? "سياسة الاسترداد والخصوصية" : "Refund & Privacy" },
  ];

  return (
    <section className="max-w-6xl mx-auto px-3 sm:px-6 pb-6">
      {/* Tabs bar */}
      <div className="relative rounded-2xl border border-border bg-gradient-to-br from-card via-card to-background p-1.5 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 bg-brand/10 rounded-full blur-3xl" />
        <div className="relative flex overflow-x-auto no-scrollbar gap-1">
          {tabs.map((tb) => {
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className="relative px-4 sm:px-5 py-3 shrink-0 rounded-xl text-sm font-extrabold focus:outline-none whitespace-nowrap"
              >
                {active && (
                  <motion.span
                    layoutId="product-tab-active"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand to-brand/70 shadow-[0_10px_30px_-10px_hsl(var(--brand)/0.55)]"
                  />
                )}
                <span
                  className={`relative ${
                    active ? "text-brand-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tb.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="relative mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="rounded-2xl border border-border bg-card/40 p-5 sm:p-8"
          >
            {tab === "description" && (
              <DescriptionTab productName={productName} description={description} isAr={isAr} />
            )}
            {tab === "reviews" && <ReviewsTab isAr={isAr} />}
            {tab === "delivery" && <DeliveryTab deliveryType={deliveryType} isAr={isAr} />}
            {tab === "policy" && <PolicyTab isAr={isAr} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function DescriptionTab({
  productName,
  description,
  isAr,
}: {
  productName: string;
  description: string | null;
  isAr: boolean;
}) {
  const highlights = isAr
    ? [
        "اشتراك رسمي أصلي 100%",
        "تفعيل خلال دقائق من الشراء",
        "دعم فني على مدار الساعة",
        "ضمان طوال فترة الاشتراك",
      ]
    : [
        "100% official original subscription",
        "Activation within minutes of purchase",
        "24/7 technical support",
        "Warranty throughout the plan",
      ];
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand mb-2">
          {isAr ? "نظرة عامة" : "Overview"}
        </p>
        <h3 className="text-xl sm:text-2xl font-extrabold mb-3">{productName}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {description ||
            (isAr
              ? `احصل على ${productName} بأفضل الأسعار مع تفعيل فوري وضمان كامل طوال فترة الاشتراك.`
              : `Get ${productName} at the best price with instant activation and full warranty for the entire plan.`)}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {highlights.map((h, i) => (
          <div
            key={h}
            className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background/40"
          >
            <span className="mt-0.5 size-6 grid place-items-center rounded-lg bg-brand/15 text-brand text-xs font-black">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-sm font-bold">{h}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsTab({ isAr }: { isAr: boolean }) {
  const reviews = isAr
    ? [
        { name: "أحمد م.", rating: 5, body: "تفعيل سريع جداً، الحساب اشتغل في نص ساعة والدعم رد فوراً." },
        { name: "منى ع.", rating: 5, body: "أرخص من أي متجر تاني وأصلي 100%، بجدد اشتراكي هنا دايماً." },
        { name: "Kareem H.", rating: 4, body: "Great value, needed a small clarification and support handled it quickly." },
        { name: "Sara T.", rating: 5, body: "Instant delivery and everything worked exactly as described." },
      ]
    : [
        { name: "Ahmed M.", rating: 5, body: "Super fast activation. Account was ready in 30 min and support replied instantly." },
        { name: "Mona A.", rating: 5, body: "Cheaper than anywhere else and 100% original. I renew here every time." },
        { name: "Kareem H.", rating: 4, body: "Great value, needed a small clarification and support handled it quickly." },
        { name: "Sara T.", rating: 5, body: "Instant delivery and everything worked exactly as described." },
      ];
  const avg = 4.9;
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-[auto,1fr] gap-6 items-center">
        <div className="relative rounded-2xl bg-gradient-to-br from-brand/20 via-card to-card border border-brand/30 p-5 min-w-[180px] text-center">
          <div className="text-5xl font-black text-brand tabular-nums leading-none">{avg}</div>
          <div className="mt-2 text-warning text-lg tracking-wider">★★★★★</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {isAr ? "من ٥ نجوم" : "out of 5"}
          </div>
        </div>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((s) => {
            const pct = s === 5 ? 88 : s === 4 ? 9 : s === 3 ? 2 : s === 2 ? 1 : 0;
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="text-xs font-bold w-4 text-muted-foreground">{s}★</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-brand to-brand/60"
                  />
                </div>
                <span className="text-xs font-bold w-8 text-muted-foreground tabular-nums text-end">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {reviews.map((r) => (
          <div
            key={r.name + r.body}
            className="p-4 rounded-xl border border-border bg-background/40 hover:border-brand/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-sm">{r.name}</span>
              <span className="text-warning text-xs tracking-widest">
                {"★".repeat(r.rating)}
                <span className="text-muted-foreground/40">{"★".repeat(5 - r.rating)}</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryTab({
  deliveryType,
  isAr,
}: {
  deliveryType: "instant" | "manual";
  isAr: boolean;
}) {
  const steps = isAr
    ? deliveryType === "instant"
      ? [
          { t: "ادفع بأمان", d: "استخدم أي وسيلة دفع متاحة على الموقع." },
          { t: "استلام فوري", d: "بيانات الحساب توصلك في نفس اللحظة على البريد." },
          { t: "استخدم فوراً", d: "سجّل دخول وابدأ الاستخدام بدون أي انتظار." },
        ]
      : [
          { t: "اطلب الخدمة", d: "أكمل الطلب واختر باقتك." },
          { t: "تفعيل يدوي", d: "فريقنا يفعّل الاشتراك خلال ١-٣ ساعات." },
          { t: "استلام عبر البريد او الواتس اب", d: "تصلك بيانات الدخول جاهزة للاستخدام." },
        ]
    : deliveryType === "instant"
    ? [
        { t: "Secure Checkout", d: "Pay with any supported method." },
        { t: "Instant Delivery", d: "Account details are emailed immediately." },
        { t: "Start Using", d: "Sign in and enjoy — no waiting." },
      ]
    : [
        { t: "Place Order", d: "Complete checkout and pick your plan." },
        { t: "Manual Activation", d: "Our team activates within 1–3 hours." },
        { t: "Delivery by Email", d: "Login details land in your inbox ready to use." },
      ];
  const eta =
    deliveryType === "instant"
      ? isAr ? "دقائق" : "Minutes"
      : isAr ? "١ – ٣ ساعات" : "1 – 3 hours";
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
            deliveryType === "instant"
              ? "bg-success/10 text-success border-success/30"
              : "bg-warning/10 text-warning border-warning/30"
          }`}
        >
          <span className="size-1.5 rounded-full bg-current animate-pulse" />
          {deliveryType === "instant"
            ? isAr ? "تسليم فوري" : "Instant Delivery"
            : isAr ? "تفعيل يدوي" : "Manual Activation"}
        </span>
        <span className="text-xs text-muted-foreground">
          {isAr ? "متوسط وقت الاستلام:" : "Average delivery time:"}{" "}
          <span className="font-extrabold text-foreground">{eta}</span>
        </span>
      </div>
      <div className="relative">
        <div className="grid sm:grid-cols-3 gap-4 relative">

          {steps.map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-5 rounded-2xl border border-border bg-background/40 hover:border-brand/40 transition-colors"
            >
              <div className="size-12 grid place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand/60 text-brand-foreground text-lg font-black mb-3 shadow-[0_10px_25px_-10px_hsl(var(--brand)/0.6)]">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="font-extrabold mb-1">{s.t}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{s.d}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PolicyTab({ isAr }: { isAr: boolean }) {
  const { t } = useApp();
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="p-5 rounded-2xl border border-border bg-background/40">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand mb-2">
          {isAr ? "الاسترداد" : "Refund"}
        </p>
        <h4 className="text-lg font-extrabold mb-3">{t.privacy.refundTitle}</h4>
        <ul className="space-y-2.5 text-sm text-muted-foreground">
          {t.privacy.refund.map((it) => (
            <li key={it} className="flex gap-2 leading-relaxed">
              <span className="text-brand mt-0.5">✦</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-5 rounded-2xl border border-border bg-background/40">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand mb-2">
          {isAr ? "الخصوصية" : "Privacy"}
        </p>
        <h4 className="text-lg font-extrabold mb-3">{t.privacy.privacyTitle}</h4>
        <ul className="space-y-2.5 text-sm text-muted-foreground">
          {t.privacy.privacy.map((it) => (
            <li key={it} className="flex gap-2 leading-relaxed">
              <span className="text-brand mt-0.5">✦</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
