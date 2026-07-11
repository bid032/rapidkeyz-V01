import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

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
      <h1 className="text-3xl font-extrabold">{t.admin.settings}</h1>

      <section className="p-6 bg-card border border-border rounded-2xl">
        <h2 className="font-bold mb-4">Brand</h2>
        <div className="grid grid-cols-2 gap-3">
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

      <section className="p-6 bg-card border border-border rounded-2xl">
        <h2 className="font-bold mb-4">Contact</h2>
        <div className="grid grid-cols-3 gap-3">
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

      <section className="p-6 bg-card border border-border rounded-2xl">
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
