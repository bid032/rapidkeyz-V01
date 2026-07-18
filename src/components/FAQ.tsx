import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, HelpCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { BrandName } from "@/components/BrandName";
import { supabase } from "@/integrations/supabase/client";

type QA = { q: string; a: string };

export const FAQ_ITEMS_AR: QA[] = [
  {
    q: "ازاي أشتري اشتراك ChatGPT Plus أو Midjourney من RapidKeyz؟",
    a: "اختار الاشتراك من المتجر، حدد نوع الحساب (خاص أو مشترك) والمدة، أضفه للسلة وادفع بأمان عبر Paymob أو Kashier أو انستا باي. تصلك بيانات الاشتراك على الإيميل خلال دقائق للتسليم الفوري.",
  },
  {
    q: "هل الاشتراكات أصلية 100%؟",
    a: "نعم، كل اشتراكاتنا في ChatGPT Plus وMidjourney وCanva Pro وباقي الأدوات رسمية ومفعّلة من الشركة الأم. لا نبيع حسابات مقرصنة أو معدّلة نهائياً.",
  },
  {
    q: "كام مدة التسليم؟",
    a: "معظم الاشتراكات تصلك خلال 5-15 دقيقة من الدفع. بعض الخدمات ذات التفعيل اليدوي قد تستغرق من 1 إلى 3 ساعات، وسنخبرك بذلك في صفحة المنتج.",
  },
  {
    q: "إيه الفرق بين الحساب الخاص والحساب المشترك؟",
    a: "الحساب الخاص مخصص لك وحدك على بريدك الإلكتروني ويعمل على أكثر من جهاز، والحساب المشترك يشترك فيه أكثر من مستخدم على جهاز واحد بسعر أقل. الاثنين أصليان ومضمونان.",
  },
  {
    q: "هل تقبلون الدفع بالجنيه المصري؟",
    a: "نعم، كل الأسعار بالجنيه المصري ونقبل فيزا وماستركارد وميزة وانستا باي وفودافون كاش والمحافظ الإلكترونية عبر بوابات Paymob وKashier الآمنة.",
  },
  {
    q: "لو الحساب توقف قبل انتهاء المدة؟",
    a: "نستبدله لك مجاناً وفوراً طوال فترة اشتراكك ، دون أسئلة. تواصل معنا على واتساب وسنعالج الأمر في دقائق.",
  },
  {
    q: "هل يمكنني استرداد المبلغ؟",
    a: "يمكن إلغاء الحسابات المشتركة واسترداد المبلغ خلال 6 ساعات من التفعيل بشرط عدم الاستخدام. الحسابات الخاصة غير قابلة للاسترداد بعد التفعيل. راجع سياسة الاسترداد للتفاصيل.",
  },
  {
    q: "هل الدعم متاح بالعربية؟",
    a: "طبعاً. فريق دعم مصري متاح على واتساب والدردشة المباشرة على مدار الساعة للرد على استفساراتك بالعربية أو الإنجليزية.",
  },
];

export const FAQ_ITEMS_EN: QA[] = [
  {
    q: "How do I buy a ChatGPT Plus or Midjourney subscription from RapidKeyz?",
    a: "Pick a subscription from the shop, choose the plan and account type (private or shared), add to cart and pay securely via Paymob, Kashier or InstaPay. Credentials arrive by email within minutes for instant-delivery plans.",
  },
  {
    q: "Are the subscriptions 100% genuine?",
    a: "Yes. Every ChatGPT Plus, Midjourney, Canva Pro and AI-tool plan is official and activated from source. We never sell cracked or modified accounts.",
  },
  {
    q: "How fast is delivery?",
    a: "Most subscriptions arrive within 5-15 minutes of payment. Manual-activation services may take 1-3 hours and are clearly labeled on the product page.",
  },
  {
    q: "What is the difference between a private and shared account?",
    a: "A private account is yours alone on your own email and works across multiple devices. A shared account has multiple users on a single device at a lower price. Both are genuine and guaranteed.",
  },
  {
    q: "Do you accept payment in EGP?",
    a: "Yes. All prices are in Egyptian Pounds and we accept Visa, Mastercard, Meeza, InstaPay, Vodafone Cash and e-wallets via Paymob and Kashier secure gateways.",
  },
  {
    q: "What if the account stops working before the plan ends?",
    a: "We replace it free and instantly for the full duration of your plan , no questions asked. Message us on WhatsApp and we'll resolve it in minutes.",
  },
  {
    q: "Can I get a refund?",
    a: "Shared accounts can be refunded within 6 hours of activation if unused. Private accounts are non-refundable once activated. See our refund policy for details.",
  },
  {
    q: "Is support available in Arabic?",
    a: "Absolutely. An Egyptian support team is available 24/7 on WhatsApp and live chat in Arabic and English.",
  },
];

export function FAQ() {
  const { lang } = useApp();
  const dbFaqs = useQuery({
    queryKey: ["public-faqs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("faqs")
        .select("question_ar, question_en, answer_ar, answer_en")
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as { question_ar: string; question_en: string; answer_ar: string; answer_en: string }[];
    },
  });
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
              الأسئلة الشائعة عن اشتراكات
              <br />
              <span className="brand-text">ChatGPT و Midjourney في مصر</span>
            </>
          ) : (
            <>
              FAQ about{" "}
              <span className="brand-text">ChatGPT & Midjourney in Egypt</span>
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
                    <p className="px-4 sm:px-5 pb-5 text-sm sm:text-[15px] text-muted-foreground leading-loose">
                      {it.a}
                    </p>
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
