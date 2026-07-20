import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type CredRow = { label: string; value: string };

function looksLikeActivationKey(v?: string | null): boolean {
  if (!v) return false;
  const s = v.trim();
  if (!s || s.includes("@") || /\s/.test(s)) return false;
  if (/^[A-Z0-9]{4,}(-[A-Z0-9]{4,}){1,}$/i.test(s)) return true;
  if (/^[A-Z0-9]{16,}$/.test(s)) return true;
  return false;
}

function buildCredentialRows(acc: any, lang: "ar" | "en"): CredRow[] {
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const rows: CredRow[] = [];
  const email = acc.account_email?.trim();
  const username = acc.account_username?.trim();
  const password = acc.account_password?.trim();

  // Activation-key detection: a lone key value stored in username or password.
  if (!email && username && !password && looksLikeActivationKey(username)) {
    rows.push({ label: L("مفتاح التفعيل", "Activation Key"), value: username });
    return rows;
  }
  if (!email && !username && password && looksLikeActivationKey(password)) {
    rows.push({ label: L("مفتاح التفعيل", "Activation Key"), value: password });
    return rows;
  }

  if (email) rows.push({ label: L("البريد", "Email"), value: email });
  if (username) rows.push({ label: L("اسم المستخدم", "Username"), value: username });
  if (password) rows.push({ label: L("كلمة السر", "Password"), value: password });
  return rows;
}


function Dashboard() {
  const { t, lang } = useApp();
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const profile = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone, country")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });
  const displayName =
    profile.data?.display_name?.trim() ||
    (user?.user_metadata as any)?.full_name ||
    (user?.user_metadata as any)?.name ||
    user?.email?.split("@")[0] ||
    "";

  // Force profile completion for Google/social sign-ups missing WhatsApp or country.
  useEffect(() => {
    if (!user || !profile.data) return;
    const missing = !profile.data.phone?.trim() || !profile.data.country?.trim();
    if (missing) navigate({ to: "/account", search: { complete: "1" } });
  }, [user, profile.data, navigate]);


  const orders = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, delivered_accounts(*))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refunds = useQuery({
    queryKey: ["my-refunds", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("refunds")
        .select("id, order_id, order_item_id, amount, type, notes, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const fullRefundByOrder = new Map<string, any>();
  const refundByItem = new Map<string, any>();
  (refunds.data ?? []).forEach((r: any) => {
    if (r.type === "full" && r.order_id && !r.order_item_id) {
      fullRefundByOrder.set(r.order_id, r);
    }
    if (r.order_item_id) {
      refundByItem.set(r.order_item_id, r);
    }
  });



  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <PageHero
        title={t.dashboard.title}
        eyebrow={displayName ? `${t.dashboard.welcome} · ${displayName}` : t.dashboard.welcome}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12">
        <div className="flex justify-end gap-2 mb-6">
          <Link
            to="/account"
            className="px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-muted"
          >
            {lang === "ar" ? "معلومات الحساب" : "Account info"}
          </Link>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
          >
            {t.nav.logout}
          </button>
        </div>



        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">{t.dashboard.myOrders}</h2>
          {orders.isLoading && <p className="text-muted-foreground">{t.common.loading}</p>}
          {orders.data && orders.data.length === 0 && (
            <div className="p-8 border border-dashed border-border rounded-2xl text-center">
              <p className="text-muted-foreground mb-4">{t.dashboard.noOrders}</p>
              <Link to="/shop" className="text-brand font-bold hover:underline">
                {t.cart.goShopping}
              </Link>
            </div>
          )}
          <div className="space-y-4">
            {orders.data?.map((o: any) => (
              <div key={o.id} className="p-4 sm:p-6 bg-card border border-border rounded-2xl">
                <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-bold">{t.dashboard.order} #{o.order_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      o.status === "delivered" || o.status === "paid" ? "bg-success/10 text-success" :
                      o.status === "pending" ? "bg-warning/10 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>{o.status}</span>
                    <div className="text-lg font-extrabold mt-2 text-brand">
                      {o.total} {t.common.currency}
                    </div>
                  </div>
                </div>
                {(() => {
                  const fullRefund = fullRefundByOrder.get(o.id);
                  const isCancelled = o.status === "cancelled" || o.status === "canceled";
                  const isRefunded = o.status === "refunded";
                  if (fullRefund || isCancelled || isRefunded) {
                    const reason = fullRefund?.notes?.trim();
                    const refundedFlag = !!fullRefund || isRefunded;
                    const title = refundedFlag
                      ? (lang === "ar" ? "تم استرداد قيمة الطلب" : "Order refunded")
                      : (lang === "ar" ? "تم إلغاء الطلب" : "Order cancelled");
                    const fallback = lang === "ar"
                      ? "لا يمكن عرض بيانات الحساب لأن الطلب "
                        + (refundedFlag ? "تم استرداده." : "تم إلغاؤه.")
                      : "Account details are unavailable because the order has been "
                        + (refundedFlag ? "refunded." : "cancelled.");
                    return (
                      <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg text-center">
                        <div className="text-sm font-bold text-destructive mb-1">{title}</div>
                        <div className="text-xs text-muted-foreground">
                          {reason || fallback}
                        </div>
                      </div>
                    );
                  }

                  if (o.status === "processing") {

                    return (
                      <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg text-center">
                        <div className="text-sm font-bold text-warning mb-1">
                          {lang === "ar" ? "الطلب تحت التجهيز" : "Order is being processed"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lang === "ar"
                            ? "جاري تجهيز الاشتراك وسيتم التواصل معك قريباً."
                            : "We're preparing your subscription and will contact you shortly."}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {o.order_items?.map((it: any) => {
                        const itemRefund = refundByItem.get(it.id);
                        return (
                        <div key={it.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <div className="text-sm min-w-0">
                              <span className="font-bold">{it.product_name}</span>{" "}
                              <span className="text-muted-foreground">, {it.plan_label} × {it.quantity}</span>
                            </div>
                            <div className="text-sm font-bold shrink-0">{it.unit_price * it.quantity} {t.common.currency}</div>
                          </div>
                          {itemRefund && itemRefund.type === "full" ? (
                            <div className="mt-2 p-3 bg-destructive/5 border border-destructive/20 rounded text-center">
                              <div className="text-xs font-bold text-destructive mb-1">
                                {lang === "ar" ? "تم استرداد قيمة هذه الخدمة" : "This item has been refunded"}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {itemRefund.notes?.trim() || (lang === "ar"
                                  ? "بيانات الحساب لم تعد متاحة."
                                  : "Account details are no longer available.")}
                              </div>
                            </div>
                          ) : (
                            <>
                              {itemRefund && itemRefund.type === "partial" && (
                                <div className="mt-2 p-2.5 bg-warning/5 border border-warning/30 rounded text-center">
                                  <div className="text-xs font-bold text-warning mb-0.5">
                                    {lang === "ar"
                                      ? `تم استرداد جزئي بمبلغ ${itemRefund.amount} ${t.common.currency}`
                                      : `Partial refund of ${itemRefund.amount} ${t.common.currency}`}
                                  </div>
                                  {itemRefund.notes?.trim() && (
                                    <div className="text-[11px] text-muted-foreground">{itemRefund.notes}</div>
                                  )}
                                </div>
                              )}
                              {it.delivered_accounts?.length > 0 ? (
                                it.delivered_accounts.map((acc: any) => {
                                  const rows = buildCredentialRows(acc, lang);
                                  return (
                                    <div key={acc.id} className="mt-2 p-3 bg-success/5 border border-success/20 rounded space-y-1.5">
                                      <div className="text-[11px] font-bold text-success mb-1">
                                        {lang === "ar" ? "✓ تم التسليم" : "✓ Delivered"}
                                      </div>
                                      {rows.map((r, i) => (
                                        <CopyRow key={i} label={r.label} value={r.value} lang={lang} />
                                      ))}
                                      {acc.extra_notes && (
                                        <div className="text-xs text-muted-foreground pt-1 border-t border-success/10">
                                          {acc.extra_notes}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="mt-2 p-3 bg-warning/5 border border-warning/20 rounded text-xs text-muted-foreground text-center">
                                  {lang === "ar"
                                    ? "⏳ جاري التواصل عن طريق الواتس اب للأشتراك"
                                    : "⏳ We're contacting you on WhatsApp to complete the subscription"}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        );
                      })}

                    </div>
                  );
                })()}

              </div>
            ))}
          </div>
        </section>

        {refunds.data && refunds.data.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">{lang === "ar" ? "التعويضات" : "Compensations"}</h2>
            <div className="space-y-3">
              {refunds.data.map((r: any) => (
                <div key={r.id} className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-bold text-sm">
                      {r.type === "full_refund"
                        ? (lang === "ar" ? "ريفاند كامل" : "Full refund")
                        : r.type === "partial_refund"
                        ? (lang === "ar" ? "ريفاند جزئي" : "Partial refund")
                        : (lang === "ar" ? "حساب بديل" : "Replacement account")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}
                    </div>
                    {r.notes && <div className="text-xs text-muted-foreground mt-1">{r.notes}</div>}
                  </div>
                  <div className="text-lg font-extrabold text-success">
                    +{r.amount} {t.common.currency}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}

function CopyRow({ label, value, lang }: { label: string; value: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-bold text-muted-foreground shrink-0 min-w-[70px]">{label}:</span>
      <code className="flex-1 min-w-0 text-xs font-mono bg-background/60 px-2 py-1 rounded border border-border/60 break-all">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold border transition ${
          copied
            ? "bg-success/15 border-success/40 text-success"
            : "bg-brand/10 border-brand/30 text-brand hover:bg-brand hover:text-brand-foreground"
        }`}
        aria-label={lang === "ar" ? "نسخ" : "Copy"}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        <span>{copied ? (lang === "ar" ? "تم" : "Copied") : (lang === "ar" ? "نسخ" : "Copy")}</span>
      </button>
    </div>
  );
}
