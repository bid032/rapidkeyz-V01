import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { translations } from "@/lib/i18n";
import { pageDefaults } from "@/lib/page-defaults";
import { RichTextEditor } from "@/components/RichTextEditor";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { t, lang, notify } = useApp();
  const qc = useQueryClient();
  const [brand, setBrand] = useState<any>({ name_ar: "", name_en: "", tagline_ar: "", tagline_en: "" });
  const [contact, setContact] = useState<any>({ whatsapp: "", telegram: "", email: "" });
  const [payments, setPayments] = useState<any>({
    paymob_enabled: true,
    kashier_enabled: true,
    manual_enabled: true
  });
  const [manualPaymentDetails, setManualPaymentDetails] = useState<any>({
    instapay_number: "",
    wallet_number: ""
  });
  const [checkout, setCheckout] = useState<any>({ require_login: true });
  const [socials, setSocials] = useState<any>({
    facebook: "", instagram: "", tiktok: "", youtube: "", x: "", linkedin: "", discord: "",
  });
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "both">("both");
  const [stats, setStats] = useState<any>({
    years: 3, staff: 5, services: 30, orders: 12000, customers: 2100,
  });
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [storedPassword, setStoredPassword] = useState<string>("");
  const [hero, setHero] = useState<any>({
    badge_ar: "", badge_en: "",
    title1_ar: "", title1_en: "",
    title2_ar: "", title2_en: "",
    subtitle_ar: "", subtitle_en: "",
    cta_ar: "", cta_en: "",
    cta_secondary_ar: "", cta_secondary_en: "",
    trusted_ar: "", trusted_en: "",
    trending_slug: "", new_slug: "",
  });
  const [pageContent, setPageContent] = useState<Record<string, { ar: string; en: string }>>({
    shop_intro: { ar: "", en: "" },
    page_about: { ar: "", en: "" },
    page_terms: { ar: "", en: "" },
    page_refund: { ar: "", en: "" },
    page_privacy: { ar: "", en: "" },
  });

  const heroProducts = useQuery({
    queryKey: ["admin-hero-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("slug, name_ar, name_en")
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      return (data ?? []) as { slug: string; name_ar: string; name_en: string }[];
    },
  });

  const settings = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*")).data ?? [],
  });

  useEffect(() => {
    if (!settings.data) return;
    // إعداد القيم الافتراضية للأرقام
    let walletNumber = "";
    let instapayNumber = "";

    for (const s of settings.data) {
      if (s.key === "brand") setBrand(s.value);
      if (s.key === "contact") setContact(s.value);
      if (s.key === "payments") {
        // إزالة instant_payment_enabled من الإعدادات القديمة
        const value = s.value as Record<string, any>;
        const { instant_payment_enabled, ...rest } = value;
        setPayments(rest);
      }
      // التعامل مع الأرقام الجديدة كمفاتيح فردية
      if (s.key === "wallet_number") walletNumber = String(s.value || "");
      if (s.key === "instapay_number") instapayNumber = String(s.value || "");
      // التعامل مع البيانات القديمة في حالة الترحيل
      if (s.key === "manual_payment_details" && typeof s.value === 'object' && s.value !== null && !Array.isArray(s.value)) {
        const oldDetails = s.value as { wallet_number?: string; instapay_number?: string };
        walletNumber = String(oldDetails.wallet_number || "") || walletNumber;
        instapayNumber = String(oldDetails.instapay_number || "") || instapayNumber;
      }
      if (s.key === "checkout") setCheckout((v: any) => ({ ...v, ...(s.value as any) }));
      if (s.key === "hero") setHero((h: any) => ({ ...h, ...(s.value as any) }));
      if (s.key === "socials") setSocials((v: any) => ({ ...v, ...(s.value as any) }));
      if (s.key === "stats") setStats((v: any) => ({ ...v, ...(s.value as any) }));
      if (s.key === "theme_mode") {
        const m = (s.value as any)?.mode;
        if (m === "light" || m === "dark" || m === "both") setThemeMode(m);
      }
      if (s.key === "admin_password") {
        // ما بنعرضهوش في الواجهة — بنستخدمه فقط للتحقق قبل التغيير
        setStoredPassword(typeof s.value === "string" ? s.value : String((s.value as any) ?? ""));
      }
      if (["shop_intro", "page_about", "page_terms", "page_refund", "page_privacy"].includes(s.key)) {
        setPageContent((prev) => ({
          ...prev,
          [s.key]: { ar: (s.value as any)?.ar ?? "", en: (s.value as any)?.en ?? "" },
        }));
      }
    }

    // تحديث حالة الأرقام بعد الانتهاء من الحلقة
    setManualPaymentDetails({
      wallet_number: walletNumber,
      instapay_number: instapayNumber
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
       // إعداد قائمة الإعدادات الأساسية
        const settingsToSave = [
          { key: "brand", value: brand },
          { key: "contact", value: contact },
          { key: "payments", value: payments },
          { key: "wallet_number", value: manualPaymentDetails.wallet_number },
          { key: "instapay_number", value: manualPaymentDetails.instapay_number },
          { key: "checkout", value: checkout },
          { key: "hero", value: hero },
          { key: "socials", value: socials },
          { key: "stats", value: stats },
          { key: "theme_mode", value: { mode: themeMode } },
          ...Object.entries(pageContent).map(([key, value]) => ({ key, value })),
        ];

      // تغيير باسورد الأمان: لازم الباسورد الحالي (لو موجود) + تأكيد مطابق
      if (adminPassword || confirmPassword || currentPassword) {
        if (!adminPassword || !confirmPassword) {
          throw new Error(lang === "ar" ? "اكتب الباسورد الجديد وأكّده" : "Enter and confirm the new password");
        }
        if (adminPassword !== confirmPassword) {
          throw new Error(lang === "ar" ? "الباسورد غير متطابق" : "Passwords do not match");
        }
        if (adminPassword.length < 6) {
          throw new Error(lang === "ar" ? "الباسورد لازم 6 حروف على الأقل" : "Password must be at least 6 characters");
        }
        if (storedPassword && currentPassword !== storedPassword) {
          throw new Error(lang === "ar" ? "الباسورد الحالي غير صحيح" : "Current password is incorrect");
        }
        settingsToSave.push({ key: "admin_password", value: adminPassword });
      }

      // `onConflict: "key"` is explicit on purpose: without it PostgREST can
      // silently fall back to an INSERT that violates the primary key, so the
      // save appears to succeed while nothing changes in the database.
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          settingsToSave.map((s) => ({ ...s, updated_at: now })),
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh every cached read so the change is live everywhere at once.
      qc.invalidateQueries();
      // The public site reads the theme mode from this exact key.
      qc.invalidateQueries({ queryKey: ["site-settings", "theme_mode"] });
      settings.refetch();
      notify(lang === "ar" ? "تم حفظ الإعدادات" : "Settings saved", "success");
      // إعادة تعيين حقول الباسورد بعد الحفظ الناجح
      setAdminPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    },
    onError: (e: any) => notify(e?.message ?? (lang === "ar" ? "فشل الحفظ" : "Save failed"), "error"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold">{t.admin.settings}</h1>

      <Section title={"Hero Section / سيكشن الصفحة الرئيسية"}>
        <p className="text-xs text-muted-foreground mb-4">
          عدّل نصوص سيكشن الهيرو اللي في أعلى الصفحة الرئيسية. النص الرمادي تحت كل خانة هو الظاهر حالياً على الموقع (لو الخانة فاضية بيتم استخدام النص الافتراضي).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4">
          {([
            ["badge_ar", "شارة علوية (AR)", "badge_en", "Top Badge (EN)", "badge"],
            ["title1_ar", "العنوان الأول (AR)", "title1_en", "Title Line 1 (EN)", "title1"],
            ["title2_ar", "العنوان الثاني ، ملوّن (AR)", "title2_en", "Title Line 2 ، accent (EN)", "title2"],
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
                    className="px-3 py-2 bg-background border border-border rounded text-end"
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

        <div className="mt-6 pt-5 border-t border-border">
          <h3 className="font-bold text-sm mb-1">كروت الخدمات في الهيرو</h3>
          <p className="text-xs text-muted-foreground mb-3">
            اختار الخدمة اللي تظهر في كارت "الأكثر مبيعاً" وكارت "جديد" في الهيرو. لو سبتها فاضية هيتم اختيار خدمة تلقائياً.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-muted-foreground">كارت "الأكثر مبيعاً" (Trending)</label>
              <select
                value={hero.trending_slug ?? ""}
                onChange={(e) => setHero({ ...hero, trending_slug: e.target.value })}
                className="px-3 py-2 bg-background border border-border rounded"
              >
                <option value="">— اختيار تلقائي —</option>
                {(heroProducts.data ?? []).map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name_ar} / {p.name_en}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-muted-foreground">كارت "جديد" (New)</label>
              <select
                value={hero.new_slug ?? ""}
                onChange={(e) => setHero({ ...hero, new_slug: e.target.value })}
                className="px-3 py-2 bg-background border border-border rounded"
              >
                <option value="">— اختيار تلقائي —</option>
                {(heroProducts.data ?? []).map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name_ar} / {p.name_en}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Section>

      <Section title={"Brand"}>
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
      </Section>

      <Section title={"Contact"}>
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
      </Section>

      <Section title={"إعدادات الشراء"}>
        <p className="text-xs text-muted-foreground mb-4">تحكم في تجربة الدفع للعملاء الجدد.</p>
        <label className="flex items-start gap-3 p-4 bg-background border border-border rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={checkout.require_login ?? true}
            onChange={(e) => setCheckout({ ...checkout, require_login: e.target.checked })}
            className="mt-1"
          />
          <div>
            <div className="font-bold">إجبار العميل على تسجيل الدخول قبل الشراء</div>
            <div className="text-xs text-muted-foreground mt-1">
              لو مفعّل: العميل لازم يعمل تسجيل دخول علشان يكمل الشراء.<br />
              لو مقفول: العميل يقدر يشتري كضيف (بس هيدخل إيميل وموبايل).
            </div>
          </div>
        </label>
       </Section>

      <Section title={"الدفع اليدوي"}>
        <p className="text-xs text-muted-foreground mb-4">
          الأرقام اللي بتظهر للعميل في صفحة الدفع. اكتب أرقام فقط بدون مسافات.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            ["wallet_number", "رقم المحفظة الإلكترونية", "فودافون كاش / اتصالات / أورنج", "01xxxxxxxxx", "📱"],
            ["instapay_number", "رقم أو عنوان الانستاباي", "InstaPay", "01xxxxxxxxx", "🏦"],
          ] as const).map(([k, title, hint, ph, icon]) => {
            const val = (manualPaymentDetails as any)[k] ?? "";
            return (
              <div key={k} className="p-4 rounded-2xl bg-background border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 grid place-items-center rounded-xl bg-brand/10 text-base">{icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{hint}</div>
                  </div>
                </div>
                <input
                  dir="ltr"
                  inputMode="tel"
                  placeholder={ph}
                  value={val}
                  onChange={(e) =>
                    setManualPaymentDetails({ ...manualPaymentDetails, [k]: e.target.value.replace(/[^\d+]/g, "") })
                  }
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-xl font-mono tracking-wider focus:outline-none focus:border-brand"
                />
                <div className="text-[11px] text-muted-foreground">
                  {val ? <>هيظهر للعميل: <b className="text-foreground font-mono">{val}</b></> : "الخانة فاضية — مش هتظهر للعميل."}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={"إعدادات الأمان"}>
        <p className="text-xs text-muted-foreground mb-4">
          باسورد الحماية للعمليات الحساسة (الحذف) في الداشبورد.
        </p>
        <div className="max-w-xl p-4 rounded-2xl bg-background border border-border space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 grid place-items-center rounded-xl bg-brand/10">🔒</span>
              <div>
                <div className="font-bold text-sm">باسورد العمليات الحساسة</div>
                <div className="text-[11px] text-muted-foreground">
                  {storedPassword ? "متعيّن حالياً — لازم الباسورد الحالي للتغيير" : "لسه مش متعيّن"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[11px] font-bold text-brand hover:underline shrink-0"
            >
              {showPassword ? "إخفاء" : "إظهار"}
            </button>
          </div>

          <div className="space-y-3">
            {storedPassword && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-muted-foreground">الباسورد الحالي</label>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="الباسورد المستخدم حالياً"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="px-3 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-brand"
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-muted-foreground">الباسورد الجديد</label>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="6 حروف على الأقل"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="px-3 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-brand"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-muted-foreground">تأكيد الباسورد الجديد</label>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="أعد إدخال الباسورد"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="px-3 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          {adminPassword && confirmPassword && adminPassword !== confirmPassword && (
            <p className="text-xs text-destructive">الباسورد غير متطابق</p>
          )}
          {adminPassword && adminPassword.length < 6 && (
            <p className="text-xs text-warning">الباسورد قصير — لازم 6 حروف على الأقل</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            سيب الخانات فاضية لو مش عايز تغيّر الباسورد — الحفظ مش هيلمسه.
          </p>
        </div>
      </Section>

      <Section title={"Social Media / حسابات السوشيال"}>
        <p className="text-xs text-muted-foreground mb-4">
          حط اللينك كامل (https://...). الخانات الفاضية مش هتظهر في الفوتر.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            ["facebook",  "Facebook URL"],
            ["instagram", "Instagram URL"],
            ["tiktok",    "TikTok URL"],
            ["youtube",   "YouTube URL"],
            ["x",         "X (Twitter) URL"],
            ["linkedin",  "LinkedIn URL"],
            ["discord",   "Discord Invite URL"],
          ] as const).map(([k, ph]) => (
            <input
              key={k}
              placeholder={ph}
              value={socials[k] ?? ""}
              onChange={(e) => setSocials({ ...socials, [k]: e.target.value })}
              className="px-3 py-2 bg-background border border-border rounded"
              dir="ltr"
            />
          ))}
        </div>
      </Section>

      <Section title={"Trust Stats / أرقام الثقة"}>
        <p className="text-xs text-muted-foreground mb-4">
          الأرقام اللي بتظهر في سيكشن "ليه العملاء بيثقوا فينا" على الصفحة الرئيسية.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {([
            ["years",     "سنين خبرة",   "📅"],
            ["staff",     "موظفين دعم",  "🎧"],
            ["services",  "خدمات",       "🧩"],
            ["orders",    "عمليات شراء", "🛒"],
            ["customers", "عملاء",       "👥"],
          ] as const).map(([k, label, icon]) => (
            <div key={k} className="p-3 rounded-2xl bg-background border border-border text-center space-y-2">
              <div className="w-9 h-9 mx-auto grid place-items-center rounded-xl bg-brand/10">{icon}</div>
              <label className="block text-[11px] font-bold text-muted-foreground">{label}</label>
              <input
                type="number"
                min={0}
                value={stats[k] ?? 0}
                onChange={(e) => setStats({ ...stats, [k]: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full px-2 py-2 bg-card border border-border rounded-xl text-center font-black text-lg focus:outline-none focus:border-brand"
                dir="ltr"
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title={"Theme Mode / وضع الألوان"}>
        <p className="text-xs text-muted-foreground mb-4">
          تحكم في وضع الألوان للموقع بالكامل: فاتح فقط، داكن فقط، أو خليه اليوزر يختار.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            ["light", "Light Only / فاتح فقط", "إجبار الوضع الفاتح على كل الزوار"],
            ["dark",  "Dark Only / داكن فقط",  "إجبار الوضع الداكن على كل الزوار"],
            ["both",  "User Choice / حسب اليوزر", "إظهار زر التبديل وترك اليوزر يختار"],
          ] as const).map(([val, label, desc]) => (
            <button
              key={val}
              type="button"
              onClick={() => setThemeMode(val)}
              className={`text-end p-4 rounded-xl border-2 transition ${
                themeMode === val
                  ? "border-brand bg-brand/10"
                  : "border-border hover:border-brand/50"
              }`}
            >
              <div className="font-bold mb-1">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title={"محتوى الصفحات / Page Content"}>
        <div className="mb-4 rounded-xl border border-brand/30 bg-brand/5 p-3 text-xs leading-relaxed space-y-1">
          <p className="font-bold text-brand">👇 تحكم كامل في نصوص الصفحات</p>
          <p className="text-muted-foreground">
            كل خانة هنا بتتحكم في محتوى صفحة كاملة أو قسم منها. الشكل الجديد:
          </p>
          <ul className="text-muted-foreground list-disc list-inside space-y-0.5 ps-2">
            <li>لو الخانة <b>فاضية</b> ← بيتم عرض النص الافتراضي الظاهر تحتها (اللي بيبان دلوقتي على الموقع).</li>
            <li>لو <b>ملأتها</b> ← النص اللي بتكتبه هيستبدل المحتوى الافتراضي بالكامل في الصفحة دي.</li>
            <li>ينفع تكتب أكتر من فقرة (اضغط Enter عشان تنزل سطر).</li>
          </ul>
        </div>
        <div className="space-y-6">
          {([
            ["shop_intro", "مقدمة صفحة المتجر (تحت \"كل الخدمات\")", "Shop page intro (under \"All services\")"],
            ["page_about", "صفحة \"من نحن\" بالكامل", "About page (full replace)"],
            ["page_terms", "صفحة الشروط والأحكام بالكامل", "Terms page (full replace)"],
            ["page_refund", "قسم الاسترداد في صفحة (الاسترداد والخصوصية)", "Refund section in Refund & Privacy page"],
            ["page_privacy", "قسم الخصوصية في صفحة (الاسترداد والخصوصية)", "Privacy section in Refund & Privacy page"],
          ] as const).map(([key, labelAr, labelEn]) => {
            const defAr = pageDefaults[key]("ar");
            const defEn = pageDefaults[key]("en");
            const valAr = pageContent[key]?.ar ?? "";
            const valEn = pageContent[key]?.en ?? "";
            const usingCustomAr = valAr.trim().length > 0;
            const usingCustomEn = valEn.trim().length > 0;
            return (
              <details key={key} className="rounded-2xl bg-background/60 border border-border overflow-hidden [&[open]>summary_.chev]:rotate-180">
                <summary className="list-none cursor-pointer select-none flex items-center gap-3 p-4 hover:bg-muted/30 transition">
                  <span className="w-8 h-8 shrink-0 grid place-items-center rounded-xl bg-brand/10 text-xs">📄</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-sm truncate">{labelAr}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{labelEn}</span>
                  </span>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${usingCustomAr || usingCustomEn ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground"}`}>
                    {usingCustomAr || usingCustomEn ? "مخصص ✓" : "افتراضي"}
                  </span>
                  <svg className="chev shrink-0 w-4 h-4 text-muted-foreground transition-transform" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-0 border-t border-border">
                  {/* Arabic */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-muted-foreground">النص بالعربي</label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${usingCustomAr ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground"}`}>
                        {usingCustomAr ? "نص مخصص ✓" : "افتراضي"}
                      </span>
                    </div>
                    <RichTextEditor
                      value={valAr}
                      onChange={(v) =>
                        setPageContent({ ...pageContent, [key]: { ...pageContent[key], ar: v } })
                      }
                      dir="rtl"
                      lang="ar"
                      minHeight={180}
                      placeholder="اسيبها فاضية عشان تفضل النص الافتراضي..."
                    />

                    <details className="mt-1 group">
                      <summary className="cursor-pointer text-[10px] font-bold text-muted-foreground hover:text-brand select-none">
                        عرض النص الافتراضي الظاهر حالياً ▾
                      </summary>
                      <pre dir="rtl" className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed p-2 bg-muted/40 border border-border rounded text-muted-foreground font-sans text-end">
{defAr}
                      </pre>
                      <button
                        type="button"
                        onClick={() => setPageContent({ ...pageContent, [key]: { ...pageContent[key], ar: defAr } })}
                        className="mt-1 text-[10px] font-bold text-brand hover:underline"
                      >
                        نسخ الافتراضي للخانة عشان أعدّل عليه
                      </button>
                    </details>
                  </div>
                  {/* English */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-muted-foreground">English text</label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${usingCustomEn ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground"}`}>
                        {usingCustomEn ? "Custom ✓" : "Default"}
                      </span>
                    </div>
                    <RichTextEditor
                      value={valEn}
                      onChange={(v) =>
                        setPageContent({ ...pageContent, [key]: { ...pageContent[key], en: v } })
                      }
                      dir="ltr"
                      lang="en"
                      minHeight={180}
                      placeholder="Leave empty to keep the default text..."
                    />

                    <details className="mt-1 group">
                      <summary className="cursor-pointer text-[10px] font-bold text-muted-foreground hover:text-brand select-none">
                        Show default text currently shown ▾
                      </summary>
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed p-2 bg-muted/40 border border-border rounded text-muted-foreground font-sans">
{defEn}
                      </pre>
                      <button
                        type="button"
                        onClick={() => setPageContent({ ...pageContent, [key]: { ...pageContent[key], en: defEn } })}
                        className="mt-1 text-[10px] font-bold text-brand hover:underline"
                      >
                        Copy default into the field to edit it
                      </button>
                    </details>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </Section>

      <button onClick={() => save.mutate()} disabled={save.isPending}
        className="px-6 py-3 bg-brand text-brand-foreground rounded-lg font-bold hover:brand-glow">
        {save.isPending ? t.common.loading : t.admin.save}
      </button>
    </div>
  );
}

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details
      open={defaultOpen}
      className="group bg-card border border-border rounded-2xl overflow-hidden [&[open]>summary_.chev]:rotate-180"
    >
      <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3 p-4 sm:p-5 hover:bg-muted/40 transition">
        <h2 className="font-bold text-sm sm:text-base min-w-0 truncate">{title}</h2>
        <svg className="chev shrink-0 w-4 h-4 text-muted-foreground transition-transform" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </summary>
      <div className="p-4 sm:p-6 pt-0 sm:pt-0 border-t border-border">
        {children}
      </div>
    </details>
  );
}