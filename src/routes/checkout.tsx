import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { notifyNewOrder, notifyCustomerDelivery } from "@/lib/notify-order.functions";
import { markInventorySoldOnSheet } from "@/lib/sheet-sync.functions";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

type Gateway = "paymob" | "kashier" | "wallet_instapay" | "manual" | "simulate";

const WHATSAPP_NUMBER = "01284234815";

function CheckoutPage() {
  const { t, cart, cartTotal, clearCart, lang } = useApp();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gateway, setGateway] = useState<Gateway>("paymob");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subEmails, setSubEmails] = useState<Record<string, string>>({});
  const [senderPhone, setSenderPhone] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const privateItems = cart.filter((c) => c.accountType === "private");

  const settings = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*")).data ?? [],
  });
  const checkoutSettings = (settings.data?.find((s: any) => s.key === "checkout")?.value ?? {}) as any;
  const requireLogin = checkoutSettings.require_login ?? true;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user?.email) setEmail(data.user.email);
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
    for (const it of privateItems) {
      const key = it.productId + it.planId;
      const v = (subEmails[key] ?? "").trim();
      if (!emailRegex.test(v)) {
        setError(
          lang === "ar"
            ? `يرجى إدخال بريد إلكتروني صحيح لتفعيل الاشتراك الخاص (${it.productName})`
            : `Please enter a valid email for the private subscription (${it.productName})`
        );
        return;
      }
    }
    if (gateway === "wallet_instapay") {
      if (!proofFile) {
        setError(lang === "ar" ? "يرجى رفع صورة إثبات الدفع" : "Please upload the payment screenshot");
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
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
        subscription_email:
          c.accountType === "private"
            ? (subEmails[c.productId + c.planId] ?? "").trim()
            : null,
      }));
      const { data: insertedItems, error: iErr } = await supabase
        .from("order_items")
        .insert(items)
        .select();
      if (iErr) throw iErr;

      // Auto-claim inventory for instant items
      let allInstantDelivered = true;
      let hasInstant = false;
      for (const it of insertedItems ?? []) {
        if (it.delivery_type === "instant" && it.plan_id) {
          hasInstant = true;
          const { data: claimedId } = await supabase.rpc("claim_inventory_for_item", {
            _order_item_id: it.id,
            _plan_id: it.plan_id,
          });
          if (!claimedId) allInstantDelivered = false;
          else {
            // Best-effort: mark the row as 'sold' in the source Google Sheet.
            markInventorySoldOnSheet({ data: { inventoryId: claimedId as string } }).catch((e) =>
              console.error("sheet sync failed", e),
            );
          }
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
      if (user) navigate({ to: "/dashboard" });
      else navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message ?? "Error");
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
          <form onSubmit={handleSubmit} className="grid md:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-6">
              <section className="p-6 bg-card border border-border rounded-2xl">
                <h2 className="font-bold mb-4">{t.checkout.contact}</h2>
                {!user && requireLogin && (
                  <p className="text-sm text-warning mb-4">
                    {t.checkout.loginRequired} —{" "}
                    <Link to="/auth" search={{ redirect: "/checkout" }} className="text-brand underline">
                      {t.auth.signIn}
                    </Link>
                  </p>
                )}
                {!user && !requireLogin && (
                  <p className="text-xs text-muted-foreground mb-4">
                    {lang === "ar"
                      ? "تقدر تكمل الشراء كضيف — بس بيانات التواصل ضرورية لتسليم الطلب."
                      : "You can check out as a guest — contact details are required for delivery."}
                  </p>
                )}
                <div className="grid gap-3">
                  <input
                    required
                    type="email"
                    placeholder={t.checkout.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-4 py-3 bg-background border border-border rounded-lg"
                  />
                  <input
                    required
                    type="tel"
                    placeholder={t.checkout.phone}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="px-4 py-3 bg-background border border-border rounded-lg"
                  />
                </div>
              </section>

              {privateItems.length > 0 && (
                <section className="p-6 bg-card border border-border rounded-2xl">
                  <h2 className="font-bold mb-1">
                    {lang === "ar" ? "بريد تفعيل الاشتراك الخاص" : "Private subscription email"}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    {lang === "ar"
                      ? "أدخل البريد الإلكتروني الذي تريد تفعيل الاشتراك عليه لكل منتج خاص."
                      : "Enter the email you want the subscription activated on for each private product."}
                  </p>
                  <div className="grid gap-3">
                    {privateItems.map((it) => {
                      const key = it.productId + it.planId;
                      return (
                        <div key={key} className="grid gap-1">
                          <label className="text-xs font-bold text-muted-foreground">
                            {it.productName} — {it.planLabel}
                          </label>
                          <input
                            required
                            type="email"
                            placeholder={lang === "ar" ? "example@email.com" : "example@email.com"}
                            value={subEmails[key] ?? ""}
                            onChange={(e) =>
                              setSubEmails((s) => ({ ...s, [key]: e.target.value }))
                            }
                            className="px-4 py-3 bg-background border border-border rounded-lg"
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}



              <section className="p-6 bg-card border border-border rounded-2xl">
                <h2 className="font-bold mb-4">{t.checkout.payment}</h2>
                <div className="space-y-2">
                  {(
                    [
                      { id: "paymob", label: t.checkout.paymob },
                      { id: "kashier", label: t.checkout.kashier },
                      {
                        id: "wallet_instapay",
                        label: lang === "ar" ? "محفظة / انستاباي (تحويل يدوي)" : "Wallet / Instapay (manual transfer)",
                      },
                      { id: "manual", label: t.checkout.manual },
                    ] as { id: Gateway; label: string }[]
                  ).map((g) => (
                    <label
                      key={g.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                        gateway === g.id ? "border-brand bg-brand/5" : "border-border bg-background"
                      }`}
                    >
                      <input
                        type="radio"
                        name="gateway"
                        checked={gateway === g.id}
                        onChange={() => setGateway(g.id)}
                        className="accent-brand"
                      />
                      <span className="font-medium">{g.label}</span>
                    </label>
                  ))}
                </div>

                {gateway === "wallet_instapay" ? (
                  <div className="mt-4 space-y-4 p-4 rounded-xl bg-brand/5 border border-brand/30">
                    <div className="text-sm leading-relaxed">
                      {lang === "ar" ? (
                        <>
                          <p className="font-bold mb-2">خطوات الدفع:</p>
                          <ol className="list-decimal ps-5 space-y-1">
                            <li>
                              حوّل مبلغ <span className="font-bold">{cartTotal} ج.م</span> عبر
                              انستاباي أو أي محفظة إلكترونية على الرقم:
                            </li>
                            <li>
                              <button
                                type="button"
                                onClick={copyNumber}
                                className="inline-flex items-center gap-2 font-mono font-bold text-brand text-lg underline decoration-dotted hover:text-brand/80"
                                dir="ltr"
                                title="اضغط للنسخ"
                              >
                                {WHATSAPP_NUMBER}
                              </button>{" "}
                              <span className="text-xs text-muted-foreground">
                                {copied ? "(تم النسخ ✓)" : "(اضغط على الرقم لنسخه)"}
                              </span>
                            </li>
                            <li>ارفع صورة إيصال التحويل واكتب الرقم اللي حولت منه بالأسفل.</li>
                          </ol>
                        </>
                      ) : (
                        <>
                          <p className="font-bold mb-2">Payment steps:</p>
                          <ol className="list-decimal ps-5 space-y-1">
                            <li>
                              Transfer <span className="font-bold">{cartTotal} EGP</span> via
                              Instapay or any e-wallet to:
                            </li>
                            <li>
                              <button
                                type="button"
                                onClick={copyNumber}
                                className="inline-flex items-center gap-2 font-mono font-bold text-brand text-lg underline decoration-dotted hover:text-brand/80"
                                dir="ltr"
                                title="Click to copy"
                              >
                                {WHATSAPP_NUMBER}
                              </button>{" "}
                              <span className="text-xs text-muted-foreground">
                                {copied ? "(Copied ✓)" : "(Click the number to copy)"}
                              </span>
                            </li>
                            <li>Upload the receipt screenshot and enter the sending number below.</li>
                          </ol>
                        </>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "الرقم الذي تم التحويل منه" : "Phone number you transferred from"}
                      </label>
                      <input
                        required
                        type="tel"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder={lang === "ar" ? "01xxxxxxxxx" : "01xxxxxxxxx"}
                        className="px-4 py-3 bg-background border border-border rounded-lg"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-bold text-muted-foreground">
                        {lang === "ar" ? "صورة إيصال الدفع" : "Payment receipt screenshot"}
                      </label>
                      <input
                        required
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                        className="px-4 py-3 bg-background border border-border rounded-lg text-sm file:me-3 file:px-3 file:py-1 file:rounded-md file:border-0 file:bg-brand file:text-brand-foreground"
                      />
                      {proofFile && (
                        <p className="text-xs text-muted-foreground truncate">{proofFile.name}</p>
                      )}
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

            <aside className="h-fit p-6 bg-card border border-border rounded-2xl">
              <h2 className="font-bold mb-4">{t.cart.title}</h2>
              <div className="space-y-2 mb-4">
                {cart.map((c) => (
                  <div key={c.productId + c.planId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {c.productName} × {c.quantity}
                    </span>
                    <span className="font-bold">
                      {c.price * c.quantity} {t.common.currency}
                    </span>
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
    </div>
  );
}
