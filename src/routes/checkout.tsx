import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { notifyNewOrder, notifyCustomerDelivery } from "@/lib/notify-order.functions";
import { markInventorySoldOnSheet } from "@/lib/sheet-sync.functions";
import { friendlyErrorMessage } from "@/lib/error-handler";
import { ARAB_COUNTRIES, dialForCountry } from "@/lib/arab-countries";
import { filterName, filterDigits, filterEmail, filterPhone } from "@/lib/input-filters";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الطلب ، RapidKeyz" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutPage,
});


type Gateway = "paymob" | "kashier" | "wallet_instapay" | "manual" | "simulate";

const WHATSAPP_NUMBER = "01284234815";

function CheckoutPage() {
  const { t, cart, cartTotal, clearCart, lang, updateQty, removeFromCart } = useApp();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [gateway, setGateway] = useState<Gateway>("simulate");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [senderPhone, setSenderPhone] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [successOrder, setSuccessOrder] = useState<{
    number: string;
    items: { name: string; mode: "instant_delivered" | "instant_pending" | "manual" }[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const settings = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*")).data ?? [],
  });
  const checkoutSettings = (settings.data?.find((s: any) => s.key === "checkout")?.value ?? {}) as any;
  const requireLogin = checkoutSettings.require_login ?? true;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user?.email) setEmail(data.user.email);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, phone, country")
          .eq("id", data.user.id)
          .maybeSingle();
        const meta: any = data.user.user_metadata ?? {};
        const derived =
          (profile?.display_name && profile.display_name.trim()) ||
          meta.display_name ||
          meta.full_name ||
          meta.name ||
          (data.user.email ? data.user.email.split("@")[0] : "");
        setName(derived || "");
        if (profile?.country) setCountry(profile.country);
        if (profile?.phone) {
          setPhone(String(profile.phone).replace(/^\+?\d+\s*/, "").replace(/[^0-9]/g, ""));
        }
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (requireLogin && !user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
      return;
    }
    if (cart.length === 0) return;
    if (gateway === "wallet_instapay") {
      if (!proofFile) {
        setError(lang === "ar" ? "يرجى رفع صورة إثبات الدفع" : "Please upload the payment screenshot");
        return;
      }
      const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      const MAX_BYTES = 5 * 1024 * 1024;
      if (!ALLOWED_MIME.includes(proofFile.type)) {
        setError(lang === "ar" ? "نوع الملف غير مدعوم. استخدم JPG أو PNG أو PDF" : "Unsupported file type. Use JPG, PNG, or PDF");
        return;
      }
      if (proofFile.size > MAX_BYTES) {
        setError(lang === "ar" ? "حجم الملف كبير جدًا (الحد 5MB)" : "File too large (max 5MB)");
        return;
      }
      if (!/^[0-9+\s-]{6,20}$/.test(senderPhone.trim())) {
        setError(
          lang === "ar"
            ? "يرجى إدخال رقم الهاتف الذي تم التحويل منه"
            : "Please enter the phone number you transferred from"
        );
        return;
      }
    }
    setSubmitting(true);
    try {
      let proofUrl: string | null = null;
      if (gateway === "wallet_instapay" && proofFile) {
        const ext = proofFile.name.split(".").pop() || "jpg";
        const folder = user?.id ?? "guest";
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, proofFile, { contentType: proofFile.type, upsert: false });
        if (upErr) throw upErr;
        proofUrl = path;
      }


      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id ?? null,
          status: gateway === "simulate" ? "paid" : "pending",
          payment_gateway: (gateway === "simulate" ? "manual" : gateway) as any,
          subtotal: cartTotal,
          total: cartTotal,
          customer_email: email,
          customer_name: name.trim() || null,
          customer_phone: phone,
          payment_proof_url: proofUrl,
          payment_sender_phone: gateway === "wallet_instapay" ? senderPhone.trim() : null,
          payment_reference: gateway === "simulate" ? "SIMULATION" : null,
        })
        .select()
        .single();
      if (oErr) throw oErr;

      const items = cart.map((c) => ({
        order_id: order.id,
        product_id: c.productId,
        plan_id: c.planId,
        product_name: c.productName,
        plan_label: c.planLabel,
        unit_price: c.price,
        quantity: c.quantity,
        delivery_type: c.deliveryType,
        account_type: c.accountType,
        subscription_email: null,
      }));
      const { data: insertedItems, error: iErr } = await supabase
        .from("order_items")
        .insert(items)
        .select();
      if (iErr) throw iErr;

      // Auto-claim inventory for instant items
      let allInstantDelivered = true;
      let hasInstant = false;
      const itemStatuses: { name: string; mode: "instant_delivered" | "instant_pending" | "manual" }[] = [];
      for (const it of insertedItems ?? []) {
        if (it.delivery_type === "instant" && it.plan_id) {
          hasInstant = true;
          const { data: claimedId } = await supabase.rpc("claim_inventory_for_item", {
            _order_item_id: it.id,
            _plan_id: it.plan_id,
          });
          if (!claimedId) {
            allInstantDelivered = false;
            itemStatuses.push({ name: it.product_name, mode: "instant_pending" });
          } else {
            itemStatuses.push({ name: it.product_name, mode: "instant_delivered" });
            // Best-effort: mark the row as 'sold' in the source Google Sheet.
            markInventorySoldOnSheet({ data: { inventoryId: claimedId as string } }).catch((e) =>
              console.error("sheet sync failed", e),
            );
          }
        } else {
          itemStatuses.push({ name: it.product_name, mode: "manual" });
        }
      }
      // Auto-flip status when everything was auto-delivered (admins may still adjust).
      if (hasInstant && allInstantDelivered) {
        await supabase.from("orders").update({ status: "delivered" }).eq("id", order.id);
        // Send credentials to the customer (best-effort)
        try {
          await notifyCustomerDelivery({ data: { orderId: order.id } });
        } catch (e) {
          console.error("notifyCustomerDelivery failed", e);
        }
      }

      // Notify admin by email (non-blocking, best-effort)
      try {
        await notifyNewOrder({ data: { orderId: order.id } });
      } catch (e) {
        console.error("notifyNewOrder failed", e);
      }

      clearCart();
      setSuccessOrder({
        number: order.order_number ?? order.id.slice(0, 8).toUpperCase(),
        items: itemStatuses,
      });
    } catch (err: any) {
      console.error("checkout failed", err);
      setError(friendlyErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-4xl font-extrabold mb-6 sm:mb-8">{t.checkout.title}</h1>


        {cart.length === 0 ? (
          <div className="p-8 border border-dashed border-border rounded-2xl text-center">
            <p className="text-muted-foreground mb-4">{t.cart.empty}</p>
            <Link to="/shop" className="text-brand font-bold hover:underline">
              {t.cart.goShopping}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid md:grid-cols-[1fr_360px] gap-6 sm:gap-8">
            <div className="space-y-4 sm:space-y-6 min-w-0">
              <section className="p-4 sm:p-6 bg-card border border-border rounded-2xl min-w-0">

                <h2 className="font-bold mb-4">{t.checkout.contact}</h2>
                {!user && requireLogin && (
                  <p className="text-sm text-warning mb-4">
                    {t.checkout.loginRequired} ,{" "}
                    <Link to="/auth" search={{ redirect: "/checkout" }} className="text-brand underline">
                      {t.auth.signIn}
                    </Link>
                  </p>
                )}
                {!user && !requireLogin && (
                  <p className="text-xs text-muted-foreground mb-4">
                    {lang === "ar"
                      ? "تقدر تكمل الشراء كضيف ، بس بيانات التواصل ضرورية لتسليم الطلب."
                      : "You can check out as a guest , contact details are required for delivery."}
                  </p>
                )}
                <div className="grid gap-3">
                  <input
                    required
                    type="text"
                    placeholder={lang === "ar" ? "الاسم بالكامل" : "Full name"}
                    value={name}
                    onChange={(e) => setName(filterName(e.target.value))}
                    className="px-4 py-3 bg-background border border-border rounded-lg"
                  />
                  <input
                    required
                    type="email"
                    placeholder={t.checkout.email}
                    value={email}
                    onChange={(e) => setEmail(filterEmail(e.target.value))}
                    readOnly={!!user}
                    className={`px-4 py-3 bg-background border border-border rounded-lg ${user ? "opacity-70 cursor-not-allowed" : ""}`}
                  />
                  <select
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="px-4 py-3 bg-background border border-border rounded-lg"
                  >
                    <option value="">{lang === "ar" ? "اختر الدولة" : "Select country"}</option>
                    {ARAB_COUNTRIES.map((c) => (
                      <option key={c.code} value={lang === "ar" ? c.ar : c.en}>
                        {lang === "ar" ? c.ar : c.en} (+{c.dial})
                      </option>
                    ))}
                  </select>
                  <div dir="ltr" className="flex items-stretch rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-brand/40">
                    <span className="px-3 grid place-items-center bg-muted text-sm font-mono font-bold text-muted-foreground select-none" dir="ltr">+{dialForCountry(country)}</span>
                    <input
                      required
                      type="tel"
                      inputMode="tel"
                      placeholder={lang === "ar" ? "1XXXXXXXXX" : "1XXXXXXXXX"}
                      value={phone}
                      onChange={(e) => setPhone(filterDigits(e.target.value, 15))}
                      className="flex-1 px-4 py-3 bg-transparent outline-none"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-warning flex items-center gap-1.5">
                    <span aria-hidden>⚠️</span>
                    {lang === "ar"
                      ? "تأكد إن الرقم ده مفعّل عليه واتساب ، عشان نقدر نوصلك بالطلب."
                      : "Make sure this number has WhatsApp active , so we can reach you about your order."}
                  </p>
                </div>
              </section>




              <section className="p-4 sm:p-6 bg-card border border-border rounded-2xl min-w-0">
                <h2 className="font-bold mb-4">{t.checkout.payment}</h2>
                <div className="space-y-2">
                  {(
                    [
                      {
                        id: "simulate",
                        label: lang === "ar" ? "ادفع الآن ، محاكاة (تجريبي)" : "Pay Now ، Simulation (test)",
                        hint: lang === "ar"
                          ? "دفع فوري وهمي لعرض الشكل ، بيتبعت الإيميل تلقائي لو المنتج instant."
                          : "Instant fake payment for demo , auto-emails credentials when the product is instant.",
                      },
                      {
                        id: "wallet_instapay",
                        label: lang === "ar" ? "محفظة / انستاباي (تحويل يدوي)" : "Wallet / Instapay (manual transfer)",
                      },
                    ] as { id: Gateway; label: string; hint?: string }[]
                  ).map((g) => (
                    <label
                      key={g.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                        gateway === g.id
                          ? g.id === "simulate"
                            ? "border-warning bg-warning/10"
                            : "border-brand bg-brand/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <input
                        type="radio"
                        name="gateway"
                        checked={gateway === g.id}
                        onChange={() => setGateway(g.id)}
                        className="accent-brand mt-1"
                      />
                      <div className="min-w-0">
                        <div className="font-medium">
                          {g.label}
                          {g.id === "simulate" && (
                            <span className="ms-2 text-[10px] px-2 py-0.5 bg-warning/20 text-warning rounded font-bold uppercase tracking-wider">
                              TEST
                            </span>
                          )}
                        </div>
                        {g.hint && <div className="text-xs text-muted-foreground mt-1">{g.hint}</div>}
                      </div>
                    </label>
                  ))}
                </div>

                {gateway === "wallet_instapay" ? (
                  <div className="mt-4 space-y-4 p-3 sm:p-4 rounded-xl bg-brand/5 border border-brand/30 min-w-0 overflow-hidden">

                    <div className="text-sm leading-relaxed break-words">
                      <p className="font-bold mb-2">
                        {lang === "ar" ? "خطوات الدفع:" : "Payment steps:"}
                      </p>
                      <ol className="list-decimal ps-5 space-y-1.5">
                        <li>
                          {lang === "ar" ? (
                            <>حوّل مبلغ <span className="font-bold">{cartTotal} ج.م</span> عبر انستاباي أو أي محفظة إلكترونية على الرقم بالأسفل.</>
                          ) : (
                            <>Transfer <span className="font-bold">{cartTotal} EGP</span> via Instapay or any e-wallet to the number below.</>
                          )}
                        </li>
                        <li>
                          {lang === "ar"
                            ? "ارفع صورة إيصال التحويل واكتب الرقم اللي حولت منه."
                            : "Upload the receipt screenshot and enter the sending number."}
                        </li>
                      </ol>
                    </div>

                    {/* Copy-number pill */}
                    <div className="rounded-xl bg-background border border-brand/40 p-3 space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold text-center">
                        {lang === "ar" ? "رقم التحويل" : "Transfer number"}
                      </div>
                      <div className="flex items-center gap-2">
                        <div dir="ltr" className="flex-1 min-w-0 text-center font-mono font-extrabold text-brand text-lg sm:text-xl tracking-widest truncate">
                          {WHATSAPP_NUMBER}
                        </div>
                        <button
                          type="button"
                          onClick={copyNumber}
                          className={`shrink-0 text-xs px-3 py-2 rounded-lg font-bold transition ${copied ? "bg-success/20 text-success" : "bg-brand/15 text-brand hover:bg-brand/25"}`}
                          title={lang === "ar" ? "اضغط للنسخ" : "Click to copy"}
                        >
                          {copied
                            ? (lang === "ar" ? "تم ✓" : "Copied ✓")
                            : (lang === "ar" ? "نسخ" : "Copy")}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "الرقم الذي تم التحويل منه" : "Phone number you transferred from"}
                      </label>
                      <input
                        required
                        type="tel"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(filterDigits(e.target.value, 15))}
                        placeholder={lang === "ar" ? "01xxxxxxxxx" : "01xxxxxxxxx"}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg"
                        dir="ltr"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "صورة إيصال الدفع" : "Payment receipt screenshot"}
                      </label>
                      <label className="w-full flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-lg cursor-pointer hover:border-brand/60 transition min-w-0">
                        <span className="shrink-0 px-3 py-1.5 rounded-md bg-brand text-brand-foreground text-xs font-bold">
                          {lang === "ar" ? "اختر صورة" : "Choose file"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
                          {proofFile?.name || (lang === "ar" ? "لم يتم اختيار ملف" : "No file selected")}
                        </span>
                        <input
                          required
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                          className="sr-only"
                        />
                      </label>
                    </div>

                  </div>
                ) : gateway === "simulate" ? (
                  <div className="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/30 text-sm leading-relaxed">
                    {lang === "ar" ? (
                      <>
                        <p className="font-bold mb-2">وضع المحاكاة</p>
                        <ol className="list-decimal ps-5 space-y-1 text-muted-foreground">
                          <li>هيتم إنشاء الطلب بحالة <b>paid</b> فورًا بدون بوابة دفع حقيقية.</li>
                          <li>لو المنتج تسليمه <b>instant</b>: هيتم سحب حساب متاح من المخزون تلقائيًا.</li>
                          <li>الحساب هيتعلّم <b>sold</b> في شيت جوجل المربوط بيه.</li>
                          <li>بيانات الحساب هتتبعت للعميل على الإيميل تلقائيًا.</li>
                        </ol>
                      </>
                    ) : (
                      <>
                        <p className="font-bold mb-2">Simulation mode</p>
                        <ol className="list-decimal ps-5 space-y-1 text-muted-foreground">
                          <li>Order is created as <b>paid</b> instantly , no real gateway involved.</li>
                          <li>Instant products auto-claim an account from inventory.</li>
                          <li>The row is marked <b>sold</b> in its linked Google Sheet.</li>
                          <li>Credentials are emailed to the customer automatically.</li>
                        </ol>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-4">
                    {lang === "ar"
                      ? "بعد التأكيد ستُنقل إلى بوابة الدفع لإتمام العملية."
                      : "You will be redirected to the payment gateway after confirming."}
                  </p>
                )}
              </section>

              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            <aside className="h-fit p-4 sm:p-6 bg-card border border-border rounded-2xl min-w-0">
              <h2 className="font-bold mb-4">{t.cart.title}</h2>
              <div className="space-y-3 mb-4">
                {cart.map((c) => (
                  <div
                    key={c.productId + c.planId}
                    className="p-3 rounded-xl border border-border bg-background/60 flex gap-3"
                  >
                    {c.iconUrl ? (
                      <img
                        src={c.iconUrl}
                        alt={c.productName}
                        className="size-14 rounded-lg object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="size-14 rounded-lg bg-muted border border-border shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">{c.productName}</div>
                          <div className="text-xs text-muted-foreground truncate">{c.planLabel}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(c.productId, c.planId)}
                          className="text-destructive/80 hover:text-destructive text-xs shrink-0"
                          aria-label={lang === "ar" ? "حذف" : "Remove"}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQty(c.productId, c.planId, Math.max(1, c.quantity - 1))}
                            className="px-2 py-1 text-sm hover:bg-muted disabled:opacity-40"
                            disabled={c.quantity <= 1}
                          >
                            −
                          </button>
                          <span className="px-3 py-1 text-sm font-bold min-w-[2ch] text-center">
                            {c.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(c.productId, c.planId, c.quantity + 1)}
                            className="px-2 py-1 text-sm hover:bg-muted"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-bold text-brand text-sm">
                          {c.price * c.quantity} {t.common.currency}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-lg pt-4 border-t border-border">
                <span className="font-bold">{t.cart.total}</span>
                <span className="font-extrabold text-brand">
                  {cartTotal} {t.common.currency}
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting || (requireLogin && !user)}
                className="w-full mt-6 px-6 py-3 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow disabled:opacity-50"
              >
                {submitting ? t.common.loading : t.checkout.placeOrder}
              </button>
            </aside>
          </form>
        )}
      </div>
      <Footer />

      {successOrder && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] bg-background/85 backdrop-blur-md grid place-items-center p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-card border border-success/40 rounded-2xl p-6 sm:p-8 shadow-2xl text-center my-auto">
            <div className="mx-auto mb-5 size-16 rounded-full bg-success/15 grid place-items-center">
              <svg viewBox="0 0 24 24" className="size-9 text-success" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold mb-2">
              {lang === "ar" ? "تم إرسال الطلب بنجاح" : "Order sent successfully"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {lang === "ar" ? "رقم الطلب:" : "Order number:"}{" "}
              <span className="font-mono font-bold text-foreground">#{successOrder.number}</span>
            </p>
            <ul className="text-sm leading-relaxed mb-6 space-y-2 text-start">
              {successOrder.items.map((it, i) => (
                <li key={i} className="flex gap-2 items-start bg-muted/40 rounded-lg p-3">
                  <span className="mt-0.5 text-brand">•</span>
                  <span>
                    <span className="font-bold">{it.name}:</span>{" "}
                    {it.mode === "instant_delivered"
                      ? (lang === "ar"
                          ? <>تم إرسال بيانات الحساب / مفتاح التفعيل على بريدك <span className="font-bold text-brand">{email}</span>، وتقدر تلاقيها في <span className="font-bold">حسابي</span>.</>
                          : <>Account details / activation key sent to <span className="font-bold text-brand">{email}</span>. You can find them in <span className="font-bold">My Account</span>.</>)
                      : it.mode === "manual"
                      ? (lang === "ar"
                          ? <>هيتم التواصل معاك على واتساب لتفعيل الاشتراك.</>
                          : <>We'll contact you on WhatsApp to activate your subscription.</>)
                      : (lang === "ar"
                          ? <>هيتم التواصل معاك قريبًا لتسليم بيانات الخدمة.</>
                          : <>We'll contact you shortly to deliver your service details.</>)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setSuccessOrder(null);
                  navigate({ to: user ? "/dashboard" : "/" });
                }}
                className="flex-1 px-5 py-3 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow transition"
              >
                {lang === "ar" ? "الذهاب إلى حسابي" : "Go to my dashboard"}
              </button>
              <button
                onClick={() => setSuccessOrder(null)}
                className="px-4 py-3 border border-border rounded-xl font-bold hover:bg-muted transition"
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
