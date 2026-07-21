import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "الشروط والأحكام ، Terms & Conditions | RapidKeyz" },
      {
        name: "description",
        content: "الشروط والأحكام الخاصة باستخدام خدمات RapidKeyz ومنتجاتها الرقمية.",
      },
      { property: "og:title", content: "الشروط والأحكام ، RapidKeyz" },
      { property: "og:description", content: "بنود استخدام خدمات RapidKeyz." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});


function TermsPage() {
  const { t, lang } = useApp();
  const custom = useQuery({
    queryKey: ["site-setting", "page_terms"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "page_terms").maybeSingle();
      return (data?.value ?? null) as { ar?: string; en?: string } | null;
    },
  });
  const customText = (lang === "ar" ? custom.data?.ar : custom.data?.en)?.trim();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero title={t.terms.title} eyebrow={t.nav.terms} />
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pb-10 sm:pb-16">
        {customText ? (
          <div className="mb-10 rounded-2xl border border-border bg-card/60 p-5 sm:p-7">
            <p data-gsap="scroll-fade" className="leading-loose text-foreground whitespace-pre-line">
              {customText}
            </p>
          </div>
        ) : (
          <>
            <div data-gsap="scroll-scrub" className="mb-10">
              <h2 data-gsap="split-words" className="text-xl font-bold text-brand mb-3">{t.terms.welcome}</h2>
              <p data-gsap="scroll-fade" className="leading-loose text-muted-foreground">{t.terms.welcomeBody}</p>
            </div>

            {t.terms.sections.map((s) => (
              <section key={s.h} data-gsap="scroll-scrub" className="mb-8">
                <h3 data-gsap="split-words" className="text-lg font-bold text-brand mb-3">{s.h}</h3>
                <ul data-gsap="reveal-stagger" className="space-y-2 list-disc list-inside text-muted-foreground marker:text-brand">
                  {s.items.map((it) => <li key={it} className="leading-relaxed">{it}</li>)}
                </ul>
              </section>
            ))}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
