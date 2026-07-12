import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Refund & Privacy — الاسترداد والخصوصية | RapidKeyz" },
      { name: "description", content: "سياسة الإلغاء والاسترداد وسياسة الخصوصية في RapidKeyz." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useApp();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-brand text-center mb-8 sm:mb-12">{t.privacy.title}</h1>


        <section className="mb-12">
          <h2 className="text-xl font-bold text-brand mb-3">{t.privacy.refundTitle}</h2>
          <ul className="space-y-2 list-disc list-inside text-muted-foreground marker:text-brand">
            {t.privacy.refund.map((it) => <li key={it} className="leading-relaxed">{it}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-brand mb-3">{t.privacy.privacyTitle}</h2>
          <ul className="space-y-2 list-disc list-inside text-muted-foreground marker:text-brand">
            {t.privacy.privacy.map((it) => <li key={it} className="leading-relaxed">{it}</li>)}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
