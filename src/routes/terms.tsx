import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — الشروط والأحكام | RapidKeyz" },
      { name: "description", content: "الشروط والأحكام الخاصة باستخدام خدمات RapidKeyz ومنتجاتها الرقمية." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { t } = useApp();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-10 sm:py-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-brand text-center mb-8 sm:mb-12">{t.terms.title}</h1>


        <div className="mb-10">
          <h2 className="text-xl font-bold text-brand mb-3">{t.terms.welcome}</h2>
          <p className="leading-loose text-muted-foreground">{t.terms.welcomeBody}</p>
        </div>

        {t.terms.sections.map((s) => (
          <section key={s.h} className="mb-8">
            <h3 className="text-lg font-bold text-brand mb-3">{s.h}</h3>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground marker:text-brand">
              {s.items.map((it) => <li key={it} className="leading-relaxed">{it}</li>)}
            </ul>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
