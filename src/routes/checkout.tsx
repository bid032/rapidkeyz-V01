import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

type Gateway = "paymob" | "kashier" | "wallet_instapay" | "manual";

const WHATSAPP_NUMBER = "201284234815";

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
    setSubmitting(true);
    try {
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id ?? null,
          status: "pending",
          payment_gateway: gateway,
          subtotal: cartTotal,
          total: cartTotal,
          customer_email: email,
          customer_phone: phone,
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
        }
      }
      // Auto-flip status when everything was auto-delivered (admins may still adjust).
      if (hasInstant && allInstantDelivered) {
        await supabase.from("orders").update({ status: "delivered" }).eq("id", order.id);
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
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold mb-8">{t.checkout.title}</h1>

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
                <p className="text-xs text-muted-foreground mt-4">
                  {lang === "ar"
                    ? "بعد التأكيد ستُنقل إلى بوابة الدفع لإتمام العملية."
                    : "You will be redirected to the payment gateway after confirming."}
                </p>
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
