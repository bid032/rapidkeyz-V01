import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

type MonthKey = string; // YYYY-MM or "all"

function AdminOverview() {
  const { t, lang, notify } = useApp();
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
        supabase.rpc("admin_revenue_stats", { _start: range.start ?? undefined, _end: range.end ?? undefined }),
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

  const sales = useQuery({
    queryKey: ["admin-sales-details", month],
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select("id, product_name, plan_label, plan_id, quantity, unit_price, created_at, orders!inner(order_number, status, customer_email, created_at)")
        .in("orders.status", ["paid", "delivered"])
        .order("created_at", { ascending: false });
      if (range.start) q = q.gte("orders.created_at", range.start);
      if (range.end) q = q.lt("orders.created_at", range.end);
      const { data, error } = await q;
      if (error) throw error;
      const items = (data ?? []) as any[];
      const planIds = Array.from(new Set(items.map((r) => r.plan_id).filter(Boolean)));
      const costMap = new Map<string, number>();
      if (planIds.length) {
        const { data: costs } = await supabase.from("plan_costs").select("plan_id, cost_price").in("plan_id", planIds);
        (costs ?? []).forEach((c: any) => costMap.set(c.plan_id, Number(c.cost_price ?? 0)));
      }
      return items.map((r) => {
        const cost = costMap.get(r.plan_id) ?? 0;
        const profit = (Number(r.unit_price) - cost) * Number(r.quantity);
        return { ...r, _cost: cost, _profit: profit };
      });
    },
  });

  const exportSalesXlsx = () => {
    const rows = (sales.data ?? []).map((r) => {
      const d = new Date(r.orders?.created_at ?? r.created_at);
      const total = Number(r.unit_price) * Number(r.quantity);
      return {
        "رقم الطلب": r.orders?.order_number,
        "الخدمة": r.product_name,
        "الخطة": r.plan_label,
        "الكمية": r.quantity,
        "سعر الوحدة": Number(r.unit_price),
        "الإجمالي": total,
        "سعر الشراء": r._cost ?? 0,
        "الربح": r._profit ?? 0,
        "التاريخ": d.toLocaleDateString("en-GB"),
        "الوقت": d.toLocaleTimeString("en-GB"),
        "الحالة": r.orders?.status,
        "العميل": r.orders?.customer_email,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    const rawTitle = (document.title || "site").split(/[—–|:-]/)[0];
    const siteName = rawTitle.replace(/[\\/:*?"<>|]+/g, "").trim() || "site";
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const suffix = month === "all" ? `all-${today}` : month;
    XLSX.writeFile(wb, `${siteName} - ${suffix}.xlsx`);
  };

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold">{t.admin.overview}</h1>
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="p-4 sm:p-6 bg-card border border-border rounded-2xl">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mb-2">{c.label}</div>
            <div className={`text-xl sm:text-3xl font-extrabold break-words ${
              c.tone === "brand" ? "text-brand" :
              c.tone === "success" ? "text-success" :
              c.tone === "warning" ? "text-warning" : ""
            }`}>{c.value}</div>
          </div>
        ))}
      </div>

      <section className="p-6 bg-card border border-border rounded-2xl mb-6">
        <h2 className="font-bold text-lg mb-1">إعدادات الشراء</h2>
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

      <section className="p-6 bg-card border border-border rounded-2xl mt-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="font-bold text-lg">تفاصيل المبيعات</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {month === "all" ? "كل المبيعات" : `مبيعات شهر ${month}`} — {sales.data?.length ?? 0} عملية
            </p>
          </div>
          <button
            onClick={exportSalesXlsx}
            disabled={!sales.data?.length}
            className="px-4 py-2 bg-brand text-brand-foreground rounded-lg font-bold text-sm disabled:opacity-50"
          >
            ⬇ تحميل Excel
          </button>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-start text-xs uppercase text-muted-foreground border-b border-border">
                <th className="p-2 text-start">الخدمة</th>
                <th className="p-2 text-start">الخطة</th>
                <th className="p-2 text-start">الكمية</th>
                <th className="p-2 text-start">السعر</th>
                <th className="p-2 text-start">الربح</th>
                <th className="p-2 text-start">التاريخ</th>
                <th className="p-2 text-start">الوقت</th>
                <th className="p-2 text-start">الطلب</th>
              </tr>
            </thead>
            <tbody>
              {sales.data?.map((r: any) => {
                const d = new Date(r.orders?.created_at ?? r.created_at);
                const profit = Number(r._profit ?? 0);
                return (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="p-2 font-bold">{r.product_name}</td>
                    <td className="p-2 text-muted-foreground">{r.plan_label}</td>
                    <td className="p-2">{r.quantity}</td>
                    <td className="p-2 font-bold text-brand">{Math.round(Number(r.unit_price) * Number(r.quantity))} {t.common.currency}</td>
                    <td className={`p-2 font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{Math.round(profit)} {t.common.currency}</td>
                    <td className="p-2 font-mono text-xs">{d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}</td>
                    <td className="p-2 font-mono text-xs">{d.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB")}</td>
                    <td className="p-2 font-mono text-xs">#{r.orders?.order_number}</td>
                  </tr>
                );
              })}
              {!sales.data?.length && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">مفيش مبيعات في الفترة دي</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
