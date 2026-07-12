import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { translations } from "@/lib/i18n";


export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { t } = useApp();
  const qc = useQueryClient();
  const [brand, setBrand] = useState<any>({ name_ar: "", name_en: "", tagline_ar: "", tagline_en: "" });
  const [contact, setContact] = useState<any>({ whatsapp: "", telegram: "", email: "" });
  const [payments, setPayments] = useState<any>({ paymob_enabled: true, kashier_enabled: true, manual_enabled: true });
  const [hero, setHero] = useState<any>({
    badge_ar: "", badge_en: "",
    title1_ar: "", title1_en: "",
    title2_ar: "", title2_en: "",
    subtitle_ar: "", subtitle_en: "",
    cta_ar: "", cta_en: "",
    cta_secondary_ar: "", cta_secondary_en: "",
    trusted_ar: "", trusted_en: "",
  });

  const settings = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*")).data ?? [],
  });

  useEffect(() => {
    if (!settings.data) return;
    for (const s of settings.data) {
      if (s.key === "brand") setBrand(s.value);
      if (s.key === "contact") setContact(s.value);
      if (s.key === "payments") setPayments(s.value);
      if (s.key === "hero") setHero((h: any) => ({ ...h, ...(s.value as any) }));
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("site_settings").upsert([
        { key: "brand", value: brand },
        { key: "contact", value: contact },
        { key: "payments", value: payments },
        { key: "hero", value: hero },
      ]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-settings"] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold">{t.admin.settings}</h1>

      <section className="p-4 sm:p-6 bg-card border border-border rounded-2xl">
        <h2 className="font-bold mb-1">Hero Section / سيكشن الصفحة الرئيسية</h2>
        <p className="text-xs text-muted-foreground mb-4">
          عدّل نصوص سيكشن الهيرو اللي في أعلى الصفحة الرئيسية. النص الرمادي تحت كل خانة هو الظاهر حالياً على الموقع (لو الخانة فاضية بيتم استخدام النص الافتراضي).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4">
          {([
            ["badge_ar", "شارة علوية (AR)", "badge_en", "Top Badge (EN)", "badge"],
            ["title1_ar", "العنوان الأول (AR)", "title1_en", "Title Line 1 (EN)", "title1"],
            ["title2_ar", "العنوان الثاني — ملوّن (AR)", "title2_en", "Title Line 2 — accent (EN)", "title2"],
            ["subtitle_ar", "الوصف (AR)", "subtitle_en", "Subtitle (EN)", "subtitle"],
            ["cta_ar", "زر أساسي (AR)", "cta_en", "Primary CTA (EN)", "cta"],
            ["cta_secondary_ar", "زر ثانوي (AR)", "cta_secondary_en", "Secondary CTA (EN)", "ctaSecondary"],
            ["trusted_ar", "نص الثقة (AR)", "trusted_en", "Trust text (EN)", "trusted"],
          ] as const).map(([kAr, phAr, kEn, phEn, fallbackKey]) => {
            const isLong = kAr === "subtitle_ar";
            const Cmp: any = isLong ? "textarea" : "input";
            // Live-shown defaults come from i18n so admin sees what's actually on the site
            const defAr = (translations.ar.home as any)?.[fallbackKey] ?? "";
            const defEn = (translations.en.home as any)?.[fallbackKey] ?? "";

            const valAr = hero[kAr] ?? "";
            const valEn = hero[kEn] ?? "";
            const shownAr = (valAr || "").toString().trim() || defAr;
            const shownEn = (valEn || "").toString().trim() || defEn;
            return (
              <div key={kAr} className="contents">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-muted-foreground">{phAr}</label>
                  <Cmp
                    placeholder={defAr || phAr}
                    value={valAr}
                    onChange={(e: any) => setHero({ ...hero, [kAr]: e.target.value })}
                    className="px-3 py-2 bg-background border border-border rounded text-right"
                    dir="rtl"
                    rows={isLong ? 3 : undefined}
                  />
                  <p className="text-[10px] text-muted-foreground truncate" dir="rtl" title={shownAr}>
                    الظاهر حالياً: {shownAr}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-muted-foreground">{phEn}</label>
                  <Cmp
                    placeholder={defEn || phEn}
                    value={valEn}
                    onChange={(e: any) => setHero({ ...hero, [kEn]: e.target.value })}
                    className="px-3 py-2 bg-background border border-border rounded"
                    rows={isLong ? 3 : undefined}
                  />
                  <p className="text-[10px] text-muted-foreground truncate" title={shownEn}>
                    Currently shown: {shownEn}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      </section>


      <section className="p-4 sm:p-6 bg-card border border-border rounded-2xl">
        <h2 className="font-bold mb-4">Brand</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Name AR" value={brand.name_ar ?? ""}
            onChange={(e) => setBrand({ ...brand, name_ar: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
          <input placeholder="Name EN" value={brand.name_en ?? ""}
            onChange={(e) => setBrand({ ...brand, name_en: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
          <input placeholder="Tagline AR" value={brand.tagline_ar ?? ""}
            onChange={(e) => setBrand({ ...brand, tagline_ar: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
          <input placeholder="Tagline EN" value={brand.tagline_en ?? ""}
            onChange={(e) => setBrand({ ...brand, tagline_en: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
        </div>
      </section>

      <section className="p-4 sm:p-6 bg-card border border-border rounded-2xl">
        <h2 className="font-bold mb-4">Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input placeholder="WhatsApp" value={contact.whatsapp ?? ""}
            onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
          <input placeholder="Telegram" value={contact.telegram ?? ""}
            onChange={(e) => setContact({ ...contact, telegram: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
          <input placeholder="Email" value={contact.email ?? ""}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
        </div>
      </section>

      <section className="p-4 sm:p-6 bg-card border border-border rounded-2xl">
        <h2 className="font-bold mb-4">Payment Gateways</h2>
        <div className="space-y-2">
          {(["paymob_enabled", "kashier_enabled", "manual_enabled"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={!!payments[k]}
                onChange={(e) => setPayments({ ...payments, [k]: e.target.checked })} />
              {k.replace("_enabled", "").toUpperCase()}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          To fully enable Paymob or Kashier live payments, provide their API keys via the app settings. This admin toggles their visibility on checkout.
        </p>
      </section>

      <button onClick={() => save.mutate()} disabled={save.isPending}
        className="px-6 py-3 bg-brand text-brand-foreground rounded-lg font-bold hover:brand-glow">
        {save.isPending ? t.common.loading : t.admin.save}
      </button>
    </div>
  );
}
