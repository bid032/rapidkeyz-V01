import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "الاسترداد والخصوصية ، Refund & Privacy | RapidKeyz" },
      {
        name: "description",
        content: "سياسة الإلغاء والاسترداد وسياسة الخصوصية في RapidKeyz.",
      },
      { property: "og:title", content: "الاسترداد والخصوصية ، RapidKeyz" },
      { property: "og:description", content: "كيفية تعاملنا مع بياناتك وسياسة الاسترداد." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});


function PrivacyPage() {
  const { t, lang } = useApp();
  const custom = useQuery({
    queryKey: ["site-setting", "page_privacy"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "page_privacy").maybeSingle();
      return (data?.value ?? null) as { ar?: string; en?: string } | null;
    },
  });
  const refundCustom = useQuery({
    queryKey: ["site-setting", "page_refund"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "page_refund").maybeSingle();
      return (data?.value ?? null) as { ar?: string; en?: string } | null;
    },
  });
  const customText = (lang === "ar" ? custom.data?.ar : custom.data?.en)?.trim();
  const refundText = (lang === "ar" ? refundCustom.data?.ar : refundCustom.data?.en)?.trim();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero title={t.privacy.title} eyebrow={t.nav.privacy} />
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pb-10 sm:pb-16">
        {(customText || refundText) && (
          <div className="mb-10 space-y-5">
            {refundText && (
              <div className="rounded-2xl border border-border bg-card/60 p-5 sm:p-7">
                <h3 className="text-lg font-bold text-brand mb-3">{t.privacy.refundTitle}</h3>
                <p className="leading-loose text-foreground whitespace-pre-line">{refundText}</p>
              </div>
            )}
            {customText && (
              <div className="rounded-2xl border border-border bg-card/60 p-5 sm:p-7">
                <h3 className="text-lg font-bold text-brand mb-3">{t.privacy.privacyTitle}</h3>
                <p className="leading-loose text-foreground whitespace-pre-line">{customText}</p>
              </div>
            )}
          </div>
        )}

        <section data-gsap="scroll-scrub" className="mb-12">
          <h2 data-gsap="split-words" className="text-xl font-bold text-brand mb-3">{t.privacy.refundTitle}</h2>
          <ul data-gsap="reveal-stagger" className="space-y-2 list-disc list-inside text-muted-foreground marker:text-brand">
            {t.privacy.refund.map((it) => <li key={it} className="leading-relaxed">{it}</li>)}
          </ul>
        </section>

        <section data-gsap="scroll-scrub">
          <h2 data-gsap="split-words" className="text-xl font-bold text-brand mb-3">{t.privacy.privacyTitle}</h2>
          <ul data-gsap="reveal-stagger" className="space-y-2 list-disc list-inside text-muted-foreground marker:text-brand">
            {t.privacy.privacy.map((it) => <li key={it} className="leading-relaxed">{it}</li>)}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
