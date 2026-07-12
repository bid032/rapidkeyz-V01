import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, HelpCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

type QA = { q: string; a: string };

export const FAQ_ITEMS_AR: QA[] = [
  {
    q: "ازاي أشتري اشتراك ChatGPT Plus أو Midjourney من RapidKeyz؟",
    a: "اختار الاشتراك من المتجر، حدد نوع الحساب (خاص أو مشترك) والمدة، أضفه للسلة وادفع بأمان عبر Paymob أو Kashier أو انستا باي. تصلك بيانات الاشتراك على الإيميل خلال دقائق للتسليم الفوري.",
  },
  {
    q: "هل الاشتراكات أصلية 100%؟",
    a: "نعم، كل اشتراكاتنا في ChatGPT Plus وMidjourney وNetflix وCanva Pro وباقي الأدوات رسمية ومفعّلة من الشركة الأم. لا نبيع حسابات مقرصنة أو معدّلة نهائياً.",
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
    a: "Yes. Every ChatGPT Plus, Midjourney, Netflix, Canva Pro and AI-tool plan is official and activated from source. We never sell cracked or modified accounts.",
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
  const items = lang === "ar" ? FAQ_ITEMS_AR : FAQ_ITEMS_EN;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="max-w-4xl mx-auto px-3 sm:px-6 py-12 sm:py-20" aria-labelledby="faq-heading">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 sm:mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4">
          <HelpCircle className="size-3.5" />
          {lang === "ar" ? "الأسئلة الشائعة" : "FAQ"}
        </div>
        <h2 id="faq-heading" className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
          {lang === "ar" ? (
            <>
              الأسئلة الشائعة عن اشتراكات\u00a0\n<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-cyan-400">ChatGPT وMidjourney في مصر</span>
            </>
          ) : (
            <>
              FAQ about <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-cyan-400">ChatGPT, Netflix & Midjourney in Egypt</span>
            </>
          )}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-3">
          {lang === "ar"
            ? "إجابات سريعة عن ChatGPT Plus وMidjourney وNetflix والدفع والتسليم والضمان."
            : "Quick answers about ChatGPT Plus, Midjourney, Netflix, payment, delivery and warranty."}
        </p>
      </motion.div>

      <div className="space-y-3">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <motion.div
              key={it.q}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className={`rounded-2xl border bg-card/60 backdrop-blur overflow-hidden transition-colors ${
                isOpen ? "border-brand/40" : "border-border hover:border-brand/30"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-start justify-between gap-3 sm:gap-4 p-4 sm:p-5 text-start"
                aria-expanded={isOpen}
              >
                <h3 className="font-bold text-sm sm:text-base leading-relaxed flex-1">{it.q}</h3>
                <span
                  className={`shrink-0 size-8 grid place-items-center rounded-full border transition-all ${
                    isOpen
                      ? "bg-brand text-brand-foreground border-brand rotate-45"
                      : "border-border text-muted-foreground"
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
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 sm:px-5 pb-5 text-sm sm:text-[15px] text-muted-foreground leading-loose">
                      {it.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
