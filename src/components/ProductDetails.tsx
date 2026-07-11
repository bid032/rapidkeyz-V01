import { useApp } from "@/contexts/AppContext";

type Props = {
  productName: string;
  accountTypes: ("private" | "shared" | "own" | "any")[];
};

export function ProductDetails({ productName, accountTypes }: Props) {
  const { lang } = useApp();
  const isAr = lang === "ar";
  const hasShared = accountTypes.includes("shared");
  const hasPrivate = accountTypes.includes("private");
  const hasOwn = accountTypes.includes("own");

  const features = isAr
    ? [
        { icon: "⚡", title: "تفعيل فوري", desc: "استلم اشتراكك خلال دقائق من الشراء" },
        { icon: "🛡️", title: "ضمان كامل", desc: "استبدال فوري طوال مدة الاشتراك" },
        { icon: "🎯", title: "خدمة أصلية", desc: "اشتراكات رسمية 100% وليست معدلة" },
        { icon: "💬", title: "دعم فني 24/7", desc: "فريق متاح للرد على كل استفساراتك" },
      ]
    : [
        { icon: "⚡", title: "Instant Activation", desc: "Get your subscription within minutes" },
        { icon: "🛡️", title: "Full Warranty", desc: "Instant replacement throughout your plan" },
        { icon: "🎯", title: "Genuine Service", desc: "100% official subscriptions, never modified" },
        { icon: "💬", title: "24/7 Support", desc: "Team ready to answer all your questions" },
      ];

  return (
    <section className="max-w-6xl mx-auto px-6 pb-16 space-y-16">
      {/* Feature strip */}
      <div className="grid sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative p-5 rounded-2xl border border-border bg-gradient-to-br from-card to-card/40 hover:border-brand/40 hover:-translate-y-1 transition-all duration-300 flex items-center gap-4"
          >
            <div className="shrink-0 w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center text-2xl leading-none">
              {f.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-base mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Account comparison */}
      {(hasShared || hasPrivate || hasOwn) && (
        <div>
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand mb-2">
                {isAr ? "قارن بين الأنواع" : "Compare Types"}
              </p>
              <h3 className="text-2xl md:text-3xl font-extrabold">
                {isAr ? "اختر نوع الحساب المناسب لك" : "Pick the account type that fits you"}
              </h3>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hasShared && (
              <div className="relative p-6 rounded-2xl border border-border bg-card overflow-hidden">
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-brand/5 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    {isAr ? "اقتصادي ومستقر" : "Economical & Stable"}
                  </div>
                  <div className="text-xl font-extrabold mb-4">
                    {isAr ? "حساب مشترك" : "Shared Account"}
                  </div>
                  <ul className="space-y-2.5 text-sm">
                    {(isAr
                      ? [
                          "الاستخدام على جهاز واحد فقط",
                          "جميع مميزات الخدمة بدون نقص",
                          "تحديثات دورية للأداء والأمان",
                          "الخيار الأمثل للفريلانسرز والهواة",
                        ]
                      : [
                          "Use on a single device only",
                          "All service features included",
                          "Regular performance and security updates",
                          "Best fit for freelancers and hobbyists",
                        ]
                    ).map((li) => (
                      <li key={li} className="flex gap-2">
                        <span className="text-brand mt-0.5">✓</span>
                        <span className="text-muted-foreground">{li}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 p-3 rounded-lg bg-muted/50 text-xs leading-relaxed">
                    💡{" "}
                    {isAr
                      ? "مثالي لمن يعمل على جهاز واحد ويريد الاستفادة الكاملة بأقل تكلفة."
                      : "Ideal for anyone working on a single device who wants full value at the lowest cost."}
                  </div>
                </div>
              </div>
            )}

            {hasPrivate && (
              <div className="relative p-6 rounded-2xl border-2 border-brand/50 bg-gradient-to-br from-brand/10 via-card to-card overflow-hidden">
                <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3 text-[10px] font-black px-2 py-1 rounded-full bg-brand text-brand-foreground uppercase tracking-wider">
                  {isAr ? "الأكثر طلباً" : "Most Popular"}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand mb-2">
                  {isAr ? "تحكم ومرونة كاملة" : "Full Control & Flexibility"}
                </div>
                <div className="text-xl font-extrabold mb-4">
                  {isAr ? "حساب خاص" : "Private Account"}
                </div>
                <ul className="space-y-2.5 text-sm">
                  {(isAr
                    ? [
                        "استخدام على أكثر من جهاز في نفس الوقت",
                        "تحكم كامل في الحساب والإعدادات",
                        "تفعيل على البريد الإلكتروني الخاص بك",
                        "دعم أولوية طوال فترة الاشتراك",
                      ]
                    : [
                        "Use on multiple devices at the same time",
                        "Full control over the account and settings",
                        "Activated on your own email address",
                        "Priority support throughout the plan",
                      ]
                  ).map((li) => (
                    <li key={li} className="flex gap-2">
                      <span className="text-brand mt-0.5">✓</span>
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 p-3 rounded-lg bg-brand/10 border border-brand/20 text-xs leading-relaxed">
                  💡{" "}
                  {isAr
                    ? "مثالي للمحترفين والوكالات التي تحتاج مرونة بين أجهزة متعددة."
                    : "Ideal for professionals and agencies needing flexibility across multiple devices."}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Why us */}
      <div className="relative p-8 md:p-12 rounded-3xl border border-border bg-gradient-to-br from-card via-background to-card overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand/10 rounded-full blur-3xl" />
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
