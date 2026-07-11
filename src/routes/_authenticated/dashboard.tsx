import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useApp();
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold">{t.dashboard.title}</h1>
            <p className="text-muted-foreground mt-1">
              {t.dashboard.welcome}, {user?.email}
            </p>
          </div>
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
              <div key={o.id} className="p-6 bg-card border border-border rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold">{t.dashboard.order} #{o.order_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                    </div>
                  </div>
                  <div className="text-end">
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
                <div className="space-y-2">
                  {o.order_items?.map((it: any) => (
                    <div key={it.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-bold">{it.product_name}</span>{" "}
                          <span className="text-muted-foreground">— {it.plan_label} × {it.quantity}</span>
                        </div>
                        <div className="text-sm font-bold">{it.unit_price * it.quantity} {t.common.currency}</div>
                      </div>
                      {it.delivered_accounts?.map((acc: any) => (
                        <div key={acc.id} className="mt-2 p-3 bg-success/5 border border-success/20 rounded font-mono text-xs">
                          {acc.account_email && <div>Email: {acc.account_email}</div>}
                          {acc.account_username && <div>User: {acc.account_username}</div>}
                          {acc.account_password && <div>Pass: {acc.account_password}</div>}
                          {acc.extra_notes && <div className="text-muted-foreground mt-1">{acc.extra_notes}</div>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
