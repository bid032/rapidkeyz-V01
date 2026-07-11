import { useApp } from "@/contexts/AppContext";

export function Testimonials() {
  const { lang } = useApp();
  const isAr = lang === "ar";

  const items = isAr
    ? [
        {
          name: "أحمد مصطفى",
          role: "مصمم جرافيك — القاهرة",
          quote:
            "أفضل موقع اشتراكات جربته. أخذت اشتراك Adobe Creative Cloud وتم تفعيله خلال 5 دقائق بدون أي مشاكل. الدعم الفني محترم جداً.",
          rating: 5,
          initials: "أم",
        },
        {
          name: "سارة عبد الله",
          role: "صانعة محتوى — الرياض",
          quote:
            "بجد تجربة ممتازة! جربت CapCut PRO وكانت الأسعار مناسبة جداً مقارنة بأي مكان تاني. مستمرة معاهم من 6 شهور.",
          rating: 5,
          initials: "سع",
        },
        {
          name: "محمد إبراهيم",
          role: "مطور ويب — الإسكندرية",
          quote:
            "التفعيل تلقائي والخدمة موثوقة. ولما احتجت مساعدة ردوا عليّ في أقل من ساعة. أنصح بيهم لأي حد.",
          rating: 5,
          initials: "مإ",
        },
      ]
    : [
        {
          name: "Ahmed Mostafa",
          role: "Graphic Designer — Cairo",
          quote:
            "Best subscription store I've tried. Got my Adobe Creative Cloud activated in 5 minutes with zero issues. Their support is top-tier.",
          rating: 5,
          initials: "AM",
        },
        {
          name: "Sara Abdullah",
          role: "Content Creator — Riyadh",
          quote:
            "Genuinely excellent experience. I tried CapCut PRO and the pricing was unbeatable. Been with them for 6 months now.",
          rating: 5,
          initials: "SA",
        },
        {
          name: "Mohamed Ibrahim",
          role: "Web Developer — Alexandria",
          quote:
            "Activation is automatic and reliable. When I needed help they replied in under an hour. Highly recommended.",
          rating: 5,
          initials: "MI",
        },
      ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand mb-3">
            {isAr ? "آراء العملاء" : "Testimonials"}
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold max-w-xl leading-tight">
            {isAr ? "قالوا عنّا الأصدق من الجميع" : "Words from the people who matter most"}
          </h2>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-3xl font-extrabold">4.9<span className="text-brand">/5</span></div>
            <div className="text-xs text-muted-foreground">
              {isAr ? "متوسط تقييم العملاء" : "Average customer rating"}
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-3xl font-extrabold">2K+</div>
            <div className="text-xs text-muted-foreground">
              {isAr ? "عميل سعيد" : "Happy customers"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {items.map((it, i) => (
          <figure
            key={it.name}
            className={`group relative p-6 rounded-2xl border border-border bg-card hover:border-brand/40 transition-all ${
              i === 1 ? "md:-translate-y-4 md:border-brand/30 md:bg-gradient-to-br md:from-brand/5 md:to-card" : ""
            }`}
          >
            <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-6xl leading-none font-serif text-brand/15">
              "
            </div>
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: it.rating }).map((_, s) => (
                <span key={s} className="text-brand text-sm">
                  ★
                </span>
              ))}
            </div>
            <blockquote className="text-sm leading-relaxed mb-6">{it.quote}</blockquote>
            <figcaption className="flex items-center gap-3 pt-4 border-t border-border">
              <div className="size-10 rounded-full bg-gradient-to-br from-brand to-cyan-400 grid place-items-center text-xs font-black text-brand-foreground">
                {it.initials}
              </div>
              <div>
                <div className="font-bold text-sm">{it.name}</div>
                <div className="text-xs text-muted-foreground">{it.role}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
