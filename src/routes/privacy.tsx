import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/contexts/AppContext";

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
  const { t } = useApp();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageHero title={t.privacy.title} eyebrow={t.nav.privacy} />
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pb-10 sm:pb-16">



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
