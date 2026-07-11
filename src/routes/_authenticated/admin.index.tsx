import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { t } = useApp();

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [orders, products, users, pending] = await Promise.all([
        supabase.from("orders").select("total", { count: "exact" }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const revenue = (orders.data ?? []).reduce((s, o: any) => s + Number(o.total ?? 0), 0);
      return {
        revenue,
        products: products.count ?? 0,
        users: users.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
  });

  const cards = [
    { label: t.admin.revenue, value: `${stats.data?.revenue ?? 0} ${t.common.currency}` },
    { label: t.admin.pendingOrders, value: stats.data?.pending ?? 0 },
    { label: t.admin.totalProducts, value: stats.data?.products ?? 0 },
    { label: t.admin.totalUsers, value: stats.data?.users ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">{t.admin.overview}</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="p-6 bg-card border border-border rounded-2xl">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              {c.label}
            </div>
            <div className="text-3xl font-extrabold">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
