import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { BrandName } from "@/components/BrandName";
import {
  Award,
  MessagesSquare,
  Monitor,
  ShoppingBag,
  Users,
  Phone,
  Settings2,
  ShieldCheck,
  Zap,
} from "lucide-react";

type StatKey = "years" | "staff" | "services" | "orders" | "customers";
type StatItem = {
  key: StatKey;
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label_ar: string;
  label_en: string;
};

const DEFAULT_STATS: StatItem[] = [
  { key: "years",     icon: <Award className="size-8" />,          value: 3,     suffix: "+", label_ar: "سنين خبرة في المجال",           label_en: "Years of experience" },
  { key: "staff",     icon: <MessagesSquare className="size-8" />, value: 5,     suffix: "+", label_ar: "موظفين دعم في خدمتك",           label_en: "Support staff at your service" },
  { key: "services",  icon: <Monitor className="size-8" />,        value: 30,    suffix: "+", label_ar: "اشتراك وخدمة رقمية مختلفة",     label_en: "Different digital services" },
  { key: "orders",    icon: <ShoppingBag className="size-8" />,    value: 12000, suffix: "+", label_ar: "عملية شراء ناجحة",              label_en: "Successful orders" },
  { key: "customers", icon: <Users className="size-8" />,          value: 2100,  suffix: "+", label_ar: "شخص وشركة يثق بينا",             label_en: "Customers & companies trust us" },
];

const FEATURES = [
  { icon: <Phone className="size-8" />,        title_ar: "خدمة عملاء",       title_en: "Customer Care",       desc_ar: "متواجدون دائماً للرد على استفساراتك وحل مشاكلك",  desc_en: "Always available to answer & solve your issues" },
  { icon: <Settings2 className="size-8" />,    title_ar: "دعم كامل للخدمة", title_en: "Full Support",        desc_ar: "نضمن استمرارية الخدمة طوال فترة الاشتراك",         desc_en: "We ensure continuity through your subscription" },
  { icon: <ShieldCheck className="size-8" />,  title_ar: "ضمان 100%",         title_en: "100% Guarantee",      desc_ar: "جميع خدماتنا مضمونة وتعمل بكفاءة",                  desc_en: "All services guaranteed and working" },
  { icon: <Zap className="size-8" />,          title_ar: "استلام سريع",       title_en: "Instant Delivery",    desc_ar: "احصل على اشتراكاتك وخدماتك فوراً",                  desc_en: "Get your subscriptions instantly" },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const dur = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  const formatted = n >= 1000 ? n.toLocaleString("en-US") : String(n);
  return (
    <span ref={ref} className="tabular-nums" dir="ltr">
      {formatted}
      {suffix}
    </span>
  );
}

export function TrustSection() {
  const { lang } = useApp();

  const settings = useQuery({
    queryKey: ["site-settings", "stats"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "stats").maybeSingle();
      return (data?.value as any) ?? {};
    },
  });

  const overrides = settings.data ?? {};
  const stats: StatItem[] = DEFAULT_STATS.map((s) => ({
    ...s,
    value: Number(overrides[s.key] ?? s.value) || s.value,
  }));

  const subtitle = lang === "ar" ? "أرقام حقيقية من أرض الواقع، مش مجرد كلام" : "Real numbers from the field , not just words";

  return (
    <section className="relative py-10 sm:py-14 px-3 sm:px-6 overflow-hidden">
      {/* soft ambient bg */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-10 start-1/2 -translate-x-1/2 w-[520px] h-[260px] bg-brand/15 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 end-1/4 w-[380px] h-[220px] bg-[--brand-deep]/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div data-gsap="reveal" className="text-center mb-7 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4">
            <span className="size-1.5 rounded-full bg-brand animate-pulse" />
            {lang === "ar" ? "الثقة" : "Trust in numbers"}
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.25] pb-1">
            {lang === "ar" ? (
              <>
                آلاف العملاء في مصر يثقون بـ <BrandName className="text-2xl sm:text-4xl md:text-5xl" />
                <br />لشراء اشتراكاتهم الرقمية
              </>
            ) : (
              <>
                Thousands trust <BrandName className="text-2xl sm:text-4xl md:text-5xl" /> for their digital subscriptions
              </>
            )}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-3">{subtitle}</p>
        </div>

        {/* Stats row */}
        <div data-gsap="card-pop" className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {stats.map((s) => (
            <div
              key={s.key}
              data-gsap="tilt"
              className="group relative p-4 sm:p-5 rounded-2xl bg-card border border-border overflow-hidden hover:border-brand/50 transition-colors"
            >
              <div className="absolute -top-10 -end-10 size-28 rounded-full bg-brand/15 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-4 sm:text-start">
                <div className="size-14 sm:size-16 shrink-0 grid place-items-center rounded-2xl bg-brand/10 text-brand border border-brand/20 mb-3 sm:mb-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                  {s.icon}
                </div>
                <div className="min-w-0 flex-1 flex flex-col items-center sm:items-start">
                  <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-foreground to-brand leading-none">
                    <AnimatedNumber value={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground leading-snug mt-1.5">
                    {lang === "ar" ? s.label_ar : s.label_en}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Features intro */}
        <div data-gsap="reveal" className="text-center mt-8 sm:mt-10 mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4">
            <span className="size-1.5 rounded-full bg-brand animate-pulse" />
            {lang === "ar" ? "مميزاتنا" : "What sets us apart"}
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.25] pb-1">
            {lang === "ar" ? (
              <>
                ليه <BrandName className="text-2xl sm:text-4xl md:text-5xl" /> أفضل متجر اشتراكات في مصر؟
              </>
            ) : (
              <>
                Why <BrandName className="text-2xl sm:text-4xl md:text-5xl" /> is Egypt&apos;s best subscription store
              </>
            )}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-3">
            {lang === "ar"
              ? "دي الأسباب اللي بتخلي عملاءنا يرجعوا لنا كل مرة"
              : "The reasons our customers keep coming back"}
          </p>
        </div>

        {/* Features row */}
        <div data-gsap="card-pop" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title_en}
              data-gsap="tilt"
              className="group relative p-5 sm:p-6 rounded-2xl bg-card/60 border border-border hover:border-brand/50 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-brand/8 via-transparent to-[--brand-deep]/10" />
              <div className="absolute -bottom-16 -start-16 size-32 rounded-full bg-brand/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-center sm:gap-4 sm:text-start">
                <div className="size-14 sm:size-16 shrink-0 grid place-items-center rounded-2xl bg-brand/10 text-brand border border-brand/20 group-hover:brand-glow group-hover:scale-110 transition-all duration-500 mb-3 sm:mb-0">
                  {f.icon}
                </div>
                <div className="min-w-0 flex-1 flex flex-col items-center sm:items-start">
                  <h3 className="font-bold text-sm sm:text-base mb-1 group-hover:text-brand transition-colors">
                    {lang === "ar" ? f.title_ar : f.title_en}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {lang === "ar" ? f.desc_ar : f.desc_en}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
