import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

type Gateway = "paymob" | "kashier" | "manual";

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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const privateItems = cart.filter((c) => c.accountType === "private");


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
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
          user_id: user.id,
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
      const { error: iErr } = await supabase.from("order_items").insert(items);
      if (iErr) throw iErr;

      clearCart();
      navigate({ to: "/dashboard" });
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
                {!user && (
                  <p className="text-sm text-warning mb-4">
                    {t.checkout.loginRequired} —{" "}
                    <Link to="/auth" search={{ redirect: "/checkout" }} className="text-brand underline">
                      {t.auth.signIn}
                    </Link>
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
                disabled={submitting || !user}
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
