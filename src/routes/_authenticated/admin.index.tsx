import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

type MonthKey = string; // YYYY-MM or "all"

function AdminOverview() {
  const { t, notify } = useApp();
  const qc = useQueryClient();
  const [month, setMonth] = useState<MonthKey>("all");

  const range = useMemo(() => {
    if (month === "all") return { start: null as string | null, end: null as string | null };
    const [y, m] = month.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    const end = new Date(Date.UTC(y, m, 1)).toISOString();
    return { start, end };
  }, [month]);

  const stats = useQuery({
    queryKey: ["admin-stats", month],
    queryFn: async () => {
      const [rev, products, users, pending] = await Promise.all([
        supabase.rpc("admin_revenue_stats", { _start: range.start, _end: range.end }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const row = (rev.data as any[])?.[0] ?? { revenue: 0, profit: 0, orders_count: 0, items_count: 0 };
      return {
        revenue: Number(row.revenue ?? 0),
        profit: Number(row.profit ?? 0),
        ordersCount: Number(row.orders_count ?? 0),
        products: products.count ?? 0,
        users: users.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
  });

  const monthly = useQuery({
    queryKey: ["admin-revenue-monthly"],
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_revenue_by_month");
      return (data ?? []) as { month: string; revenue: number; profit: number; orders_count: number }[];
    },
  });

  const settings = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*")).data ?? [],
  });
  const checkoutSettings = (settings.data?.find((s: any) => s.key === "checkout")?.value ?? {}) as any;
  const requireLogin = checkoutSettings.require_login ?? true;

  const setRequireLogin = useMutation({
    mutationFn: async (val: boolean) => {
      const next = { ...checkoutSettings, require_login: val };
      const { error } = await supabase.from("site_settings").upsert({ key: "checkout", value: next });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      notify("تم التحديث", "success");
    },
    onError: (e: any) => notify(e.message || "خطأ", "error"),
  });

  const monthOptions = useMemo(() => {
    const arr = (monthly.data ?? []).map((r) => r.month.slice(0, 7));
    // ensure current month present
    const now = new Date();
    const cur = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!arr.includes(cur)) arr.unshift(cur);
    return arr;
  }, [monthly.data]);

  const cards = [
    { label: t.admin.revenue, value: `${Math.round(stats.data?.revenue ?? 0)} ${t.common.currency}`, tone: "brand" },
    { label: "الأرباح (بيع − شراء)", value: `${Math.round(stats.data?.profit ?? 0)} ${t.common.currency}`, tone: "success" },
    { label: "عدد الطلبات", value: stats.data?.ordersCount ?? 0, tone: "default" },
    { label: t.admin.pendingOrders, value: stats.data?.pending ?? 0, tone: "warning" },
    { label: t.admin.totalProducts, value: stats.data?.products ?? 0, tone: "default" },
    { label: t.admin.totalUsers, value: stats.data?.users ?? 0, tone: "default" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-3xl font-extrabold">{t.admin.overview}</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-muted-foreground">فلتر الشهر:</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm font-bold"
          >
            <option value="all">كل الفترات</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="p-6 bg-card border border-border rounded-2xl">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{c.label}</div>
            <div className={`text-3xl font-extrabold ${
              c.tone === "brand" ? "text-brand" :
              c.tone === "success" ? "text-success" :
              c.tone === "warning" ? "text-warning" : ""
            }`}>{c.value}</div>
          </div>
        ))}
      </div>

      <section className="p-6 bg-card border border-border rounded-2xl mb-6">
        <h2 className="font-bold text-lg mb-1">⚙️ إعدادات الشراء</h2>
        <p className="text-xs text-muted-foreground mb-4">تحكم في تجربة الدفع للعملاء الجدد.</p>
        <label className="flex items-start gap-3 p-4 bg-background border border-border rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={requireLogin}
            onChange={(e) => setRequireLogin.mutate(e.target.checked)}
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
      </section>

      <section className="p-6 bg-card border border-border rounded-2xl">
        <h2 className="font-bold text-lg mb-4">📊 الإيرادات شهر بشهر</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs uppercase text-muted-foreground border-b border-border">
                <th className="p-2 text-start">الشهر</th>
                <th className="p-2 text-start">الإيراد</th>
                <th className="p-2 text-start">الأرباح</th>
                <th className="p-2 text-start">عدد الطلبات</th>
              </tr>
            </thead>
            <tbody>
              {monthly.data?.map((r) => (
                <tr key={r.month} className="border-b border-border/60">
                  <td className="p-2 font-mono">{r.month.slice(0, 7)}</td>
                  <td className="p-2 font-bold">{Math.round(Number(r.revenue))} {t.common.currency}</td>
                  <td className="p-2 font-bold text-success">{Math.round(Number(r.profit))} {t.common.currency}</td>
                  <td className="p-2">{r.orders_count}</td>
                </tr>
              ))}
              {!monthly.data?.length && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">مفيش بيانات إيرادات لسه</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
