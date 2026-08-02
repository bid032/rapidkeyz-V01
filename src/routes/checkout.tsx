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
  const [gateway, setGateway] = useState<Gateway>("wallet_instapay");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockIssues, setStockIssues] = useState<
    { planId: string; productName: string; planLabel: string; requested: number; available: number }[]
  >([]);

  const [senderPhone, setSenderPhone] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [successOrder, setSuccessOrder] = useState<{
    number: string;
    items: { name: string; mode: "instant_delivered" | "instant_pending" | "manual" }[];
  } | null>(null);
  // New state for wallet and instapay numbers
  const [walletCopied, setWalletCopied] = useState(false);
  const [instapayCopied, setInstapayCopied] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount: number;
  } | null>(null);

  const discount = appliedCoupon?.discount ?? 0;
  const finalTotal = Math.max(0, cartTotal - discount);

  // Auto-remove coupon if cart changes (subtotal or products) invalidate min-order or scope
  useEffect(() => {
    if (!appliedCoupon) return;
    // Re-validate on cart change
    (async () => {
      const productIds = Array.from(new Set(cart.map((c) => c.productId)));
      const { data, error } = await supabase.rpc("validate_coupon", {
        _code: appliedCoupon.code,
        _subtotal: cartTotal,
        _product_ids: productIds,
      });
      if (error || !data || !data[0]?.valid) {
        setAppliedCoupon(null);
      } else {
        const d = data[0] as any;
        if (Number(d.discount) !== appliedCoupon.discount) {
          setAppliedCoupon({ id: d.coupon_id, code: d.code, discount: Number(d.discount) });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartTotal, cart.length]);

  const applyCoupon = async () => {
    setCouponError(null);
    const code = couponCode.trim();
    if (!code) return;
    setCouponApplying(true);
    try {
      const productIds = Array.from(new Set(cart.map((c) => c.productId)));
      const { data, error } = await supabase.rpc("validate_coupon", {
        _code: code,
        _subtotal: cartTotal,
        _product_ids: productIds,
      });
      if (error) throw error;
      const row = data?.[0] as any;
      if (!row?.valid) {
        setCouponError(row?.message || (lang === "ar" ? "كود غير صالح" : "Invalid code"));
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({ id: row.coupon_id, code: row.code, discount: Number(row.discount) });
    } catch (e: any) {
      setCouponError(e.message);
    } finally {
      setCouponApplying(false);
    }
  };
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_NUMBER);
      setWalletCopied(true);
      setTimeout(() => setWalletCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const settings = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*")).data ?? [],
    staleTime: 0,
    refetchOnMount: "always" as const,
  });
  const checkoutSettings = (settings.data?.find((s: any) => s.key === "checkout")?.value ?? {}) as any;
  const paymentSettings = (settings.data?.find((s: any) => s.key === "payments")?.value ?? {}) as any;
  const requireLogin = checkoutSettings.require_login ?? false;
  // تم إزالة خيار الدفع التجريبي نهائيًا
  const instantPaymentEnabled = false;

  // Payment numbers are derived straight from the settings query so a dashboard
  // save (pushed by realtime invalidation) is reflected immediately, and clearing
  // a number in the dashboard actually clears it on the site.
  const settingValue = (key: string) => {
    const raw = settings.data?.find((s: any) => s.key === key)?.value;
    return raw == null ? "" : String(raw);
  };
  const walletNumber = settingValue("wallet_number");
  const instapayNumber = settingValue("instapay_number");

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
    // Allow guest checkout regardless of requireLogin setting
    // if (requireLogin && !user) {
    //   setError(lang === "ar" ? "يجب تسجيل الدخول لإتمام عملية الشراء" : "You need to sign in to complete your purchase");
    //   return;
    // }
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
      const sp = senderPhone.replace(/\D/g, "");
      if (sp.length < 7 || sp.length > 15 || /^(\d)\1+$/.test(sp)) {
        setError(
          lang === "ar"
            ? "برجاء إدخال رقم هاتف صحيح للتحويل منه"
            : "Please enter a valid phone number used for the transfer"
        );
        return;
      }
    }
    // Main contact phone must be a real number
    if (phone.length < 7 || phone.length > 15 || /^(\d)\1+$/.test(phone)) {
      setError(lang === "ar" ? "رقم الهاتف غير صحيح" : "Invalid phone number");
      return;
    }

    // Re-check live stock right before charging so a customer who orders 4
    // when someone else just bought 1 gets told "only 3 available" instead
    // of failing after payment.
    setStockIssues([]);
    try {
      const planIds = Array.from(new Set(cart.map((c) => c.planId)));
      const { data: stockRows, error: stockErr } = await supabase
        .from("product_plans")
        .select("id, stock")
        .in("id", planIds);
      if (stockErr) throw stockErr;
      const stockMap = new Map<string, number>(
        (stockRows ?? []).map((r: any) => [
          r.id as string,
          Math.max(0, Number(r.stock ?? 0)),
        ]),
      );
      const requestedMap = new Map<string, number>();
      for (const c of cart) {
        requestedMap.set(c.planId, (requestedMap.get(c.planId) ?? 0) + c.quantity);
      }
      const seen = new Set<string>();
      const issues: typeof stockIssues = [];
      for (const c of cart) {
        if (seen.has(c.planId)) continue;
        seen.add(c.planId);
        const req = requestedMap.get(c.planId) ?? 0;
        const avail = stockMap.get(c.planId) ?? 0;
        if (req > avail) {
          issues.push({
            planId: c.planId,
            productName: c.productName,
            planLabel: c.planLabel,
            requested: req,
            available: avail,
          });
        }
      }
      if (issues.length > 0) {
        setStockIssues(issues);
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
    } catch (err) {
      console.error("stock precheck failed", err);
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

      // Generate the order id client-side so guest checkout doesn't rely on a
      // post-insert SELECT (guest / anon has no SELECT policy on orders).
      const orderId =
        (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

      const { error: oErr } = await supabase
        .from("orders")
        .insert({
          id: orderId,
          user_id: user?.id ?? null,
          status: "pending",
          payment_gateway: (gateway === "simulate" ? "manual" : gateway) as any,
          subtotal: cartTotal,
          total: finalTotal,
          discount_amount: discount,
          coupon_id: appliedCoupon?.id ?? null,
          customer_email: email,
          customer_name: name.trim() || null,
          customer_phone: phone,
          payment_proof_url: proofUrl,
          payment_sender_phone: gateway === "wallet_instapay" ? senderPhone.replace(/\D/g, "") : null,
          payment_reference: gateway === "simulate" ? "SIMULATION" : null,
        });
      if (oErr) throw oErr;

      // Split every quantity>1 into individual order_items so each unit gets
      // its own delivery credentials (one account per unit) and its own status.
      // frozen_unit_price is set explicitly here so historical revenue is not
      // affected by future plan price changes.
      const items = cart.flatMap((c) =>
        Array.from({ length: Math.max(1, c.quantity) }, () => ({
          order_id: orderId,
          product_id: c.productId,
          plan_id: c.planId,
          product_name: c.productName,
          plan_label: c.planLabel,
          unit_price: c.price,
          frozen_unit_price: c.price,
          quantity: 1,
          delivery_type: c.deliveryType,
          account_type: c.accountType,
          subscription_email: null,
        })),
      );
      const { error: iErr } = await supabase.from("order_items").insert(items);
      if (iErr) throw iErr;

      // Redeem coupon (best-effort, non-blocking for order success)
      if (appliedCoupon) {
        try {
          await supabase.rpc("redeem_coupon", {
            _coupon_id: appliedCoupon.id,
            _order_id: orderId,
            _amount: appliedCoupon.discount,
          });
        } catch (e) {
          console.error("redeem_coupon failed", e);
        }
      }

      // Every order starts as pending. Admin reviews and delivers each item manually
      // (either by claiming instant inventory or entering credentials for manual items).
      const itemStatuses: { name: string; mode: "instant_delivered" | "instant_pending" | "manual" }[] =
        items.map((it) => ({
          name: it.product_name,
          mode: it.delivery_type === "instant" ? "instant_pending" : "manual",
        }));

      // Notify admin by email (non-blocking, best-effort)
      // For guest users, we need to ensure notifications are sent immediately
      // as they might not be processed later due to recency checks
      try {
        await notifyNewOrder({ data: { orderId } });
      } catch (e) {
        console.error("notifyNewOrder failed", e);
        // For guest users, try to send notification directly if the first attempt failed
        if (!user) {
          try {
            const { notifyNewOrderDirect } = await import('@/lib/notify-order.functions');
            await notifyNewOrderDirect({ data: { orderId } });
          } catch (directErr) {
            console.error("Direct notifyNewOrder failed", directErr);
          }
        }
      }

      // Notify customer by email (non-blocking, best-effort)
      // This works for both guest and authenticated users
      try {
        await notifyCustomerDelivery({ data: { orderId } });
      } catch (e) {
        console.error("notifyCustomerDelivery failed", e);
        // For guest users, try to send notification directly if the first attempt failed
        if (!user) {
          try {
            const { notifyCustomerDeliveryDirect } = await import('@/lib/notify-order.functions');
            await notifyCustomerDeliveryDirect({ data: { orderId } });
          } catch (directErr) {
            console.error("Direct notifyCustomerDelivery failed", directErr);
          }
        }
      }

      clearCart();
      setSuccessOrder({
        number: orderId.slice(0, 8).toUpperCase(),
        items: itemStatuses,
      });
     } catch (err: any) {
       console.error("checkout failed", err);
       setError(friendlyErrorMessage(err, lang));
       // Do NOT clear the cart on failure — the customer needs to be able to
       // retry (fix the payment proof, phone, etc.) without re-adding items.
       if (typeof window !== "undefined") {
         window.scrollTo({ top: 0, behavior: "smooth" });
       }
     } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-4xl font-extrabold mb-6 sm:mb-8">{t.checkout.title}</h1>

        {!user && requireLogin && cart.length > 0 && (
          <div className="mb-6 sm:mb-8 relative overflow-hidden rounded-2xl border-2 border-warning/50 bg-gradient-to-r from-warning/15 via-warning/10 to-warning/15 p-4 sm:p-5 animate-[pulse_3s_ease-in-out_infinite]">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="shrink-0 size-10 sm:size-12 grid place-items-center rounded-full bg-warning/20 text-warning text-xl sm:text-2xl">
                🔒
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm sm:text-base text-foreground mb-0.5">
                  {t.checkout.loginRequired}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {lang === "ar"
                    ? "سجّل دخولك عشان نقدر نحفظ طلبك ونوصّلك بيه."
                    : "Sign in so we can save and deliver your order."}
                </p>
              </div>
              <Link
                to="/auth"
                search={{ redirect: "/checkout" }}
                className="shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                {t.auth.signIn}
              </Link>
            </div>
          </div>
        )}

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
              {stockIssues.length > 0 && (
                <section className="p-4 sm:p-5 bg-destructive/10 border-2 border-destructive/40 rounded-2xl min-w-0">
                  <h2 className="font-bold text-destructive mb-2">
                    {lang === "ar" ? "تنبيه: المخزون تغيّر" : "Heads up: stock changed"}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {lang === "ar"
                      ? "الكميات المطلوبة أكبر من المتاح الآن. عدّل سلتك ثم أعد المحاولة."
                      : "Requested quantities exceed current availability. Adjust your cart and try again."}
                  </p>
                  <ul className="space-y-2 mb-3">
                    {stockIssues.map((i) => (
                      <li
                        key={i.planId}
                        className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-lg p-3 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate">{i.productName}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {i.planLabel}
                          </div>
                          <div className="text-xs mt-1">
                            {lang === "ar"
                              ? `طلبت ${i.requested} — المتاح ${i.available}`
                              : `You requested ${i.requested} — only ${i.available} available`}
                          </div>
                        </div>
                        {i.available > 0 ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await updateQty(
                                cart.find((c) => c.planId === i.planId)?.productId ?? "",
                                i.planId,
                                i.available,
                              );
                              setStockIssues((prev) => prev.filter((x) => x.planId !== i.planId));
                            }}
                            className="px-3 py-1.5 rounded-lg bg-brand text-brand-foreground text-xs font-bold hover:opacity-90"
                          >
                            {lang === "ar"
                              ? `اشترِ المتاح (${i.available})`
                              : `Buy available (${i.available})`}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const pid = cart.find((c) => c.planId === i.planId)?.productId;
                              if (pid) removeFromCart(pid, i.planId);
                              setStockIssues((prev) => prev.filter((x) => x.planId !== i.planId));
                            }}
                            className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90"
                          >
                            {lang === "ar" ? "إزالة من السلة" : "Remove from cart"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        for (const i of stockIssues) {
                          const pid = cart.find((c) => c.planId === i.planId)?.productId;
                          if (!pid) continue;
                          if (i.available > 0) await updateQty(pid, i.planId, i.available);
                          else removeFromCart(pid, i.planId);
                        }
                        setStockIssues([]);
                      }}
                      className="px-4 py-2 rounded-lg border border-destructive/50 text-destructive text-sm font-bold hover:bg-destructive/10"
                    >
                      {lang === "ar" ? "تعديل السلة تلقائياً" : "Auto-adjust cart"}
                    </button>
                  </div>
                </section>
              )}
              <section className="p-4 sm:p-6 bg-card border border-border rounded-2xl min-w-0">

                <h2 className="font-bold mb-4">{t.checkout.contact}</h2>
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
                  <div className="space-y-1">
                    <input
                      required
                      type="email"
                      placeholder={lang === "ar" ? "البريد للتواصل ، هنبعتلك عليه بيانات الطلب" : "Contact email , we'll send your order details here"}
                      value={email}
                      onChange={(e) => setEmail(filterEmail(e.target.value))}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground px-1">
                      {lang === "ar"
                        ? "ده الإيميل اللي هيوصلك عليه بيانات الطلب ، تقدر تغيّره."
                        : "This is where we'll send your order details , you can change it."}
                    </p>
                  </div>
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
                      placeholder={lang === "ar" ? "تأكد إن الرقم عليه واتساب" : "Make sure this number has WhatsApp"}
                      value={phone}
                      onChange={(e) => setPhone(filterDigits(e.target.value, 15))}
                      className="flex-1 px-4 py-3 bg-transparent outline-none placeholder:text-xs sm:placeholder:text-sm"
                      dir="ltr"
                    />
                  </div>

                </div>
              </section>

              <section className="p-4 sm:p-6 bg-card border border-border rounded-2xl min-w-0">
                <h2 className="font-bold mb-4">{t.checkout.payment}</h2>
                <div className="space-y-2">
                  {(
                    [
                      {
                        id: "wallet_instapay",
                        label: lang === "ar" ? "محفظة / انستاباي (تحويل يدوي)" : "Wallet / Instapay (manual transfer)",
                      },
                    ].filter(Boolean) as { id: Gateway; label: string; hint?: string }[]
                  ).map((g) => (
                    <label
                      key={g.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                        gateway === g.id
                          ? "border-brand bg-brand/5"
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

                    {/* Copy-number pill - show wallet and instapay numbers separately */}
                     {((walletNumber && walletNumber.trim()) || (instapayNumber && instapayNumber.trim())) ? (
                       // إذا كان فيه أرقام من الإعدادات، نظهر كل رقم في قسم منفصل
                       <div className="space-y-3">
                         {walletNumber && walletNumber.trim() && (
                           <div className="rounded-xl bg-background border border-brand/40 p-3 space-y-2">
                             <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold text-center">
                               {lang === "ar" ? "رقم المحفظة" : "Wallet number"}
                             </div>
                             <div className="flex items-center gap-2">
                               <div dir="ltr" className="flex-1 min-w-0 text-center font-mono font-extrabold text-brand text-lg sm:text-xl tracking-widest truncate">
                                 {walletNumber.trim()}
                               </div>
                               <button
                                 type="button"
                                 onClick={async () => {
                                   try {
                                     await navigator.clipboard.writeText(walletNumber.trim());
                                     setWalletCopied(true);
                                     setTimeout(() => setWalletCopied(false), 1500);
                                   } catch {
                                     /* ignore */
                                   }
                                 }}
                                 className={`shrink-0 text-xs px-3 py-2 rounded-lg font-bold transition ${walletCopied ? "bg-success/20 text-success" : "bg-brand/15 text-brand hover:bg-brand/25"}`}
                                 title={lang === "ar" ? "اضغط للنسخ" : "Click to copy"}
                               >
                                 {walletCopied
                                   ? (lang === "ar" ? "تم ✓" : "Copied ✓")
                                   : (lang === "ar" ? "نسخ" : "Copy")}
                               </button>
                             </div>
                           </div>
                         )}

                         {instapayNumber && instapayNumber.trim() && (
                           <div className="rounded-xl bg-background border border-brand/40 p-3 space-y-2">
                             <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold text-center">
                               {lang === "ar" ? "رقم انستاباي" : "Instapay number"}
                             </div>
                             <div className="flex items-center gap-2">
                               <div dir="ltr" className="flex-1 min-w-0 text-center font-mono font-extrabold text-brand text-lg sm:text-xl tracking-widest truncate">
                                 {instapayNumber.trim()}
                               </div>
                               <button
                                 type="button"
                                 onClick={async () => {
                                   try {
                                     await navigator.clipboard.writeText(instapayNumber.trim());
                                     setInstapayCopied(true);
                                     setTimeout(() => setInstapayCopied(false), 1500);
                                   } catch {
                                     /* ignore */
                                   }
                                 }}
                                 className={`shrink-0 text-xs px-3 py-2 rounded-lg font-bold transition ${instapayCopied ? "bg-success/20 text-success" : "bg-brand/15 text-brand hover:bg-brand/25"}`}
                                 title={lang === "ar" ? "اضغط للنسخ" : "Click to copy"}
                               >
                                 {instapayCopied
                                   ? (lang === "ar" ? "تم ✓" : "Copied ✓")
                                   : (lang === "ar" ? "نسخ" : "Copy")}
                               </button>
                             </div>
                           </div>
                         )}
                       </div>
                     ) : (
                       // إذا ما كانش فيه أرقام من الإعدادات، نظهر الرقم الافتراضي
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
                             className={`shrink-0 text-xs px-3 py-2 rounded-lg font-bold transition ${walletCopied ? "bg-success/20 text-success" : "bg-brand/15 text-brand hover:bg-brand/25"}`}
                             title={lang === "ar" ? "اضغط للنسخ" : "Click to copy"}
                           >
                             {walletCopied
                               ? (lang === "ar" ? "تم ✓" : "Copied ✓")
                               : (lang === "ar" ? "نسخ" : "Copy")}
                           </button>
                         </div>
                       </div>
                     )}

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
              {/* Coupon code */}
              <div className="pt-4 border-t border-border">
                <label className="text-xs font-bold text-muted-foreground mb-2 block">
                  {lang === "ar" ? "كود الخصم" : "Coupon code"}
                </label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
                    <div className="min-w-0">
                      <div className="font-mono font-extrabold text-success text-sm truncate">
                        {appliedCoupon.code}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {lang === "ar" ? "تم تطبيق الخصم" : "Coupon applied"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-border font-bold hover:bg-muted"
                    >
                      {lang === "ar" ? "إزالة" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                      placeholder={lang === "ar" ? "أدخل الكود" : "Enter code"}
                      className="flex-1 min-w-0 px-3 py-2.5 bg-background border border-border rounded-lg font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponApplying || !couponCode.trim()}
                      className="shrink-0 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-bold disabled:opacity-50"
                    >
                      {couponApplying ? "..." : (lang === "ar" ? "تطبيق" : "Apply")}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-xs text-destructive mt-2">{couponError}</p>
                )}
              </div>

              <div className="mt-4 space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{lang === "ar" ? "المجموع الفرعي" : "Subtotal"}</span>
                  <span className="font-bold">{cartTotal} {t.common.currency}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-bold">
                      {lang === "ar" ? "الخصم" : "Discount"}
                      {appliedCoupon && <span className="ms-1 text-muted-foreground font-mono">({appliedCoupon.code})</span>}
                    </span>
                    <span className="font-extrabold text-success">−{discount} {t.common.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg pt-2 border-t border-border">
                  <span className="font-bold">{t.cart.total}</span>
                  <span className="font-extrabold text-brand">
                    {finalTotal} {t.common.currency}
                  </span>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
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