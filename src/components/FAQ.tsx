import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, HelpCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { publicFaqsQuery } from "@/lib/public-queries";
import { BrandName } from "@/components/BrandName";
import { MarkdownContent } from "@/components/MarkdownContent";

import { FAQ_ITEMS_AR, FAQ_ITEMS_EN, type QA } from "@/lib/faq-items";
export { FAQ_ITEMS_AR, FAQ_ITEMS_EN };


export function FAQ() {
  const { lang } = useApp();
  const dbFaqs = useQuery(publicFaqsQuery());
  const items: QA[] =
    dbFaqs.data && dbFaqs.data.length > 0
      ? dbFaqs.data.map((r) => ({
          q: lang === "ar" ? r.question_ar : r.question_en,
          a: lang === "ar" ? r.answer_ar : r.answer_en,
        }))
      : lang === "ar"
      ? FAQ_ITEMS_AR
      : FAQ_ITEMS_EN;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="max-w-4xl mx-auto px-3 sm:px-6 py-12 sm:py-20" aria-labelledby="faq-heading">
      <div data-gsap="reveal" className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4">
          <HelpCircle className="size-3.5" />
          {lang === "ar" ? "الأسئلة الشائعة" : "FAQ"}
        </div>
        <h2 id="faq-heading" className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.2] pb-1">
          {lang === "ar" ? (
            <>
              الأسئلة الشائعة عن اشتراكات RapidKeyz
              <br />
              <span className="brand-text">متجر الاشتراكات الرقمية والذكاء الاصطناعي</span>
            </>
          ) : (
            <>
              FAQ About RapidKeyz{" "}
              <span className="brand-text">Digital Subscriptions and Artificial Intelligence Store</span>
            </>
          )}

        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-3">
          {lang === "ar" ? (
            <>إجابات سريعة عن اشتراكات <BrandName className="text-sm sm:text-base" /> والدفع والتسليم والضمان.</>
          ) : (
            <>Quick answers about <BrandName className="text-sm sm:text-base" /> subscriptions, payment, delivery and warranty.</>
          )}
        </p>
      </div>

      <div data-gsap="card-pop" className="space-y-3">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <div
              key={it.q}
              className={`group rounded-2xl border bg-card/60 backdrop-blur overflow-hidden transition-all hover:-translate-y-0.5 ${
                isOpen ? "border-brand/50 brand-glow" : "border-border hover:border-brand/30"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-start justify-between gap-3 sm:gap-4 p-4 sm:p-5 text-start"
                aria-expanded={isOpen}
              >
                <h3 className={`font-bold text-sm sm:text-base leading-relaxed flex-1 transition-colors ${isOpen ? "text-brand" : "group-hover:text-brand"}`}>
                  {it.q}
                </h3>
                <span
                  className={`shrink-0 size-8 grid place-items-center rounded-full border transition-all duration-300 ${
                    isOpen
                      ? "bg-brand text-brand-foreground border-brand rotate-45 scale-110"
                      : "border-border text-muted-foreground group-hover:border-brand/50 group-hover:text-brand"
                  }`}
                  aria-hidden
                >
                  <Plus className="size-4" />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-5 text-sm sm:text-[15px] text-muted-foreground leading-loose">
                      <MarkdownContent content={it.a} dir={lang === "ar" ? "rtl" : "ltr"} />
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
