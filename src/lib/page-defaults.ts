import { translations, type Lang } from "@/lib/i18n";

// Default plain-text content shown on public pages when the admin
// hasn't provided custom content. When the admin fills any of these
// keys in site_settings > Page Content, the custom text REPLACES the
// default content on the page entirely.

export function defaultAboutText(lang: Lang): string {
  const a = translations[lang].about;
  const blocks: string[] = [
    `${a.moreTitle}\n${a.moreBody}`,
    `${a.missionTitle}\n${a.missionBody}`,
    `${a.valuesTitle}\n${a.values.map((v) => `• ${v}`).join("\n")}`,
    `${a.whyTitle}\n${a.why.map((v) => `• ${v}`).join("\n")}`,
    `${a.visionTitle}\n${a.visionBody}`,
  ];
  return blocks.join("\n\n");
}

export function defaultTermsText(lang: Lang): string {
  const t = translations[lang].terms;
  const parts: string[] = [`${t.welcome}\n${t.welcomeBody}`];
  for (const s of t.sections) {
    parts.push(`${s.h}\n${s.items.map((i) => `• ${i}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

export function defaultRefundText(lang: Lang): string {
  const p = translations[lang].privacy;
  return `${p.refundTitle}\n${p.refund.map((i) => `• ${i}`).join("\n")}`;
}

export function defaultPrivacyText(lang: Lang): string {
  const p = translations[lang].privacy;
  return `${p.privacyTitle}\n${p.privacy.map((i) => `• ${i}`).join("\n")}`;
}

export function defaultShopIntro(lang: Lang): string {
  return lang === "ar"
    ? "تصفّح متجر RapidKeyz | متجر الاشتراكات الرقمية والذكاء الاصطناعي والترفيه بالجنيه المصري. كل الاشتراكات أصلية 100%، مع تسليم فوري خلال دقائق وضمان طوال مدة الاشتراك."
    : "Browse RapidKeyz | Your go-to store for digital subscriptions, AI, and entertainment in Egyptian pounds. All subscriptions are 100% genuine, with instant delivery within minutes and a lifetime guarantee.";
}

export const pageDefaults: Record<
  "page_about" | "page_terms" | "page_refund" | "page_privacy" | "shop_intro",
  (lang: Lang) => string
> = {
  page_about: defaultAboutText,
  page_terms: defaultTermsText,
  page_refund: defaultRefundText,
  page_privacy: defaultPrivacyText,
  shop_intro: defaultShopIntro,
};
