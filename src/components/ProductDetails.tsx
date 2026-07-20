import { useApp } from "@/contexts/AppContext";

type Props = {
  productName: string;
  accountTypes: ("private" | "shared" | "own" | "any")[];
};

export function ProductDetails({ productName, accountTypes }: Props) {
  const { lang } = useApp();
  const isAr = lang === "ar";
  void accountTypes;

  const features = isAr
    ? [
        { title: "تفعيل فوري", desc: "استلم اشتراكك خلال دقائق من الشراء" },
        { title: "ضمان كامل", desc: "استبدال فوري طوال مدة الاشتراك" },
        { title: "خدمة أصلية", desc: "اشتراكات رسمية 100% وليست معدلة" },
        { title: "دعم فني 24/7", desc: "فريق متاح للرد على كل استفساراتك" },
      ]
    : [
        { title: "Instant Activation", desc: "Get your subscription within minutes" },
        { title: "Full Warranty", desc: "Instant replacement throughout your plan" },
        { title: "Genuine Service", desc: "100% official subscriptions, never modified" },
        { title: "24/7 Support", desc: "Team ready to answer all your questions" },
      ];


  return (
    <section className="max-w-6xl mx-auto px-3 sm:px-5 pb-12 sm:pb-16 space-y-10 sm:space-y-16">
      {/* Feature strip */}
      <div className="grid sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative p-5 rounded-2xl border border-border bg-gradient-to-br from-card to-card/40 hover:border-brand/40 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="font-extrabold text-base mb-1">{f.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
          </div>

        ))}
      </div>

      {/* Account comparison removed to keep the page compact */}

      {/* Why us */}
      <div className="relative p-8 md:p-12 rounded-3xl border border-border bg-gradient-to-br from-card via-background to-card overflow-hidden">
        <div className="absolute -top-24 -start-24 w-64 h-64 bg-brand/10 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand mb-2">
            {isAr ? "ليه تختارنا" : "Why us"}
          </p>
          <h3 className="text-2xl md:text-3xl font-extrabold mb-8 max-w-2xl">
            {isAr
              ? `احصل على ${productName} بأفضل تجربة شراء في مصر والوطن العربي`
              : `Get ${productName} with the best buying experience in the region`}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(isAr
              ? [
                  { n: "01", t: "تفعيل سريع ومضمون" },
                  { n: "02", t: "باقات تناسب الجميع" },
                  { n: "03", t: "دعم فني مستمر" },
                  { n: "04", t: "ضمان طوال فترة الاشتراك" },
                ]
              : [
                  { n: "01", t: "Fast & guaranteed activation" },
                  { n: "02", t: "Plans for every budget" },
                  { n: "03", t: "Ongoing technical support" },
                  { n: "04", t: "Full warranty during the plan" },
                ]
            ).map((it) => (
              <div key={it.n} className="border-t border-border pt-4">
                <div className="text-xs font-mono text-brand mb-2">{it.n}</div>
                <div className="font-bold text-sm leading-snug">{it.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
