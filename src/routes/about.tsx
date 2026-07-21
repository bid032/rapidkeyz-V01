import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Wrench, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن ، About RapidKeyz" },
      {
        name: "description",
        content:
          "تعرّف على RapidKeyz، شريكك الموثوق لاشتراكات الخدمات الرقمية الأصلية بأسعار تنافسية ودعم عربي 24/7.",
      },
      { property: "og:title", content: "من نحن ، RapidKeyz" },
      {
        property: "og:description",
        content: "قصتنا ورؤيتنا في RapidKeyz لتقديم اشتراكات رقمية موثوقة بأسعار منافسة.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});


function FeaturesStrip() {
  const { t } = useApp();
  const items = [
    { icon: Phone, ...t.features.support },
    { icon: Wrench, ...t.features.fullSupport },
    { icon: ShieldCheck, ...t.features.guarantee },
    { icon: Zap, ...t.features.instant },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 border-t border-border pt-12">
      {items.map((it) => (
        <div key={it.title} className="text-center flex flex-col items-center gap-3">
          <span className="size-12 grid place-items-center rounded-full bg-brand/10 text-brand">
            <it.icon className="size-5" />
          </span>
          <h5 className="font-bold text-sm">{it.title}</h5>
          <p className="text-xs text-muted-foreground max-w-[180px]">{it.desc}</p>
        </div>
      ))}
    </div>
  );
}

function AboutPage() {
  const { t, lang } = useApp();
  const custom = useQuery({
    queryKey: ["site-setting", "page_about"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "page_about").maybeSingle();
      return (data?.value ?? null) as { ar?: string; en?: string } | null;
    },
  });
  const customText = (lang === "ar" ? custom.data?.ar : custom.data?.en)?.trim();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero title={t.about.title} eyebrow="RapidKeyz" />
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pb-10 sm:pb-16">
        {customText ? (
          <div className="mb-10 rounded-2xl border border-border bg-card/60 p-5 sm:p-7">
            <p data-gsap="scroll-fade" className="leading-loose text-foreground whitespace-pre-line">
              {customText}
            </p>
          </div>
        ) : (
          <>
            <Section title={t.about.moreTitle}>
              <p data-gsap="scroll-fade" className="leading-loose text-muted-foreground">{t.about.moreBody}</p>
            </Section>
            <Section title={t.about.missionTitle}>
              <p data-gsap="scroll-fade" className="leading-loose text-muted-foreground">{t.about.missionBody}</p>
            </Section>
            <Section title={t.about.valuesTitle}>
              <ul data-gsap="reveal-stagger" className="space-y-2 list-disc list-inside text-muted-foreground marker:text-brand">
                {t.about.values.map((v) => <li key={v} className="leading-relaxed">{v}</li>)}
              </ul>
            </Section>
            <Section title={t.about.whyTitle}>
              <ul data-gsap="reveal-stagger" className="space-y-2 list-disc list-inside text-muted-foreground marker:text-brand">
                {t.about.why.map((v) => <li key={v} className="leading-relaxed">{v}</li>)}
              </ul>
            </Section>
            <Section title={t.about.visionTitle}>
              <p data-gsap="scroll-fade" className="leading-loose text-muted-foreground">{t.about.visionBody}</p>
            </Section>
          </>
        )}

        <FeaturesStrip />
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section data-gsap="scroll-scrub" className="mb-10">
      <h2 data-gsap="split-words" className="text-xl font-bold text-brand mb-3">{title}</h2>
      {children}
    </section>
  );
}
