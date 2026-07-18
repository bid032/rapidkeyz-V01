import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw redirect({ to: "/admin/products" });
  },
  component: AdminOverview,
});


type MonthKey = string; // YYYY-MM or "all"

function AdminOverview() {
  const { t, lang } = useApp();
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
      let refundsQ = supabase.from("refunds").select("amount");
      if (range.start) refundsQ = refundsQ.gte("created_at", range.start);
      if (range.end) refundsQ = refundsQ.lt("created_at", range.end);
      const [rev, products, users, pending, refundsRes] = await Promise.all([
        supabase.rpc("admin_revenue_stats", { _start: range.start ?? undefined, _end: range.end ?? undefined }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        refundsQ,
      ]);
      const row = (rev.data as any[])?.[0] ?? { revenue: 0, profit: 0, orders_count: 0, items_count: 0 };
      const refundsTotal = (refundsRes.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      return {
        revenue: Number(row.revenue ?? 0),
        profit: Number(row.profit ?? 0),
        ordersCount: Number(row.orders_count ?? 0),
        products: products.count ?? 0,
        users: users.count ?? 0,
        pending: pending.count ?? 0,
        refunds: refundsTotal,
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

  const refundsMonthly = useQuery({
    queryKey: ["admin-refunds-monthly"],
    queryFn: async () => {
      const { data } = await supabase.from("refunds").select("amount, created_at");
      const map = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        const d = new Date(r.created_at);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        map.set(key, (map.get(key) ?? 0) + Number(r.amount ?? 0));
      });
      return map;
    },
  });

  const chartData = useMemo(() => {
    const rows = (monthly.data ?? []).map((r) => {
      const key = r.month.slice(0, 7);
      return {
        month: key,
        revenue: Math.round(Number(r.revenue ?? 0)),
        profit: Math.round(Number(r.profit ?? 0)),
        refunds: Math.round(refundsMonthly.data?.get(key) ?? 0),
      };
    });
    // include refund-only months
    refundsMonthly.data?.forEach((amount, key) => {
      if (!rows.find((r) => r.month === key)) {
        rows.push({ month: key, revenue: 0, profit: 0, refunds: Math.round(amount) });
      }
    });
    rows.sort((a, b) => a.month.localeCompare(b.month));
    if (month !== "all") return rows.filter((r) => r.month === month);
    return rows;
  }, [monthly.data, refundsMonthly.data, month]);


  const sales = useQuery({
    queryKey: ["admin-sales-details", month],
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select("id, product_name, plan_label, plan_id, quantity, unit_price, created_at, orders!inner(order_number, status, customer_email, customer_name, customer_phone, notes, user_id, created_at)")
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
      const userIds = Array.from(new Set(items.map((r) => r.orders?.user_id).filter(Boolean)));
      const profileMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, display_name, phone, country").in("id", userIds);
        (profs ?? []).forEach((p: any) => profileMap.set(p.id, p));
      }
      return items.map((r) => {
        const cost = costMap.get(r.plan_id) ?? 0;
        const profit = (Number(r.unit_price) - cost) * Number(r.quantity);
        const prof = profileMap.get(r.orders?.user_id) ?? {};
        return { ...r, _cost: cost, _profit: profit, _profile: prof };
      });
    },
  });

  const exportSalesXlsx = () => {
    const rows = (sales.data ?? []).map((r) => {
      const d = new Date(r.orders?.created_at ?? r.created_at);
      const total = Number(r.unit_price) * Number(r.quantity);
      const p = r._profile ?? {};
      return {
        "رقم الطلب": r.orders?.order_number,
        "اسم العميل": r.orders?.customer_name ?? p.display_name ?? "",
        "البريد الإلكتروني": r.orders?.customer_email ?? "",
        "رقم الواتساب": r.orders?.customer_phone ?? p.phone ?? "",
        "الدولة": p.country ?? "",
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
        "ملاحظات": r.orders?.notes ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    const rawTitle = (document.title || "site").split(/[,–|:-]/)[0];
    const siteName = rawTitle.replace(/[\\/:*?"<>|]+/g, "").trim() || "site";
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const suffix = month === "all" ? `all-${today}` : month;
    XLSX.writeFile(wb, `${siteName} - ${suffix}.xlsx`);
  };



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
    { label: "التعويضات", value: `-${Math.round(stats.data?.refunds ?? 0)} ${t.common.currency}`, tone: "danger" },
    { label: "عدد الطلبات", value: stats.data?.ordersCount ?? 0, tone: "default" },
    { label: t.admin.pendingOrders, value: stats.data?.pending ?? 0, tone: "warning" },
    { label: t.admin.totalProducts, value: stats.data?.products ?? 0, tone: "default" },
    { label: t.admin.totalUsers, value: stats.data?.users ?? 0, tone: "default" },
  ];


  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-4 sm:mb-6 sm:flex sm:flex-wrap sm:justify-between">
        <h1 className="min-w-0 truncate text-xl sm:text-3xl font-extrabold">{t.admin.overview}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-[10px] sm:text-xs font-bold text-muted-foreground hidden sm:inline">فلتر الشهر:</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-card border border-border rounded-lg text-xs sm:text-sm font-bold"
          >
            <option value="all">كل الفترات</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>


      <section className="relative overflow-hidden p-4 sm:p-6 bg-card border border-border rounded-3xl mb-6 shadow-xl">
        <div className="absolute inset-0 pointer-events-none opacity-60" style={{
          background: "radial-gradient(ellipse at top left, color-mix(in oklab, var(--brand) 18%, transparent), transparent 60%), radial-gradient(ellipse at bottom right, color-mix(in oklab, var(--success) 15%, transparent), transparent 60%)",
        }} />
        <div className="relative">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="font-extrabold text-xl sm:text-2xl bg-gradient-to-r from-brand to-success bg-clip-text text-transparent">لوحة الأداء المالي</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {month === "all" ? "الإيرادات والأرباح والتعويضات لكل الشهور" : `بيانات شهر ${month}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
            {(() => {
              const totRev = chartData.reduce((s, r) => s + r.revenue, 0);
              const totProf = chartData.reduce((s, r) => s + r.profit, 0);
              const totRef = chartData.reduce((s, r) => s + r.refunds, 0);
              const margin = totRev ? Math.round((totProf / totRev) * 100) : 0;
              const chip = (label: string, val: string, tone: string) => (
                <div key={label} className={`rounded-2xl p-3 border ${tone}`}>
                  <div className="text-[10px] uppercase tracking-widest opacity-70">{label}</div>
                  <div className="text-base sm:text-xl font-extrabold mt-1">{val}</div>
                </div>
              );
              return [
                chip("الإيرادات", `${totRev} ${t.common.currency}`, "border-brand/40 bg-brand/10 text-brand"),
                chip("الأرباح", `${totProf} ${t.common.currency}`, "border-success/40 bg-success/10 text-success"),
                chip("التعويضات", `${totRef} ${t.common.currency}`, "border-destructive/40 bg-destructive/10 text-destructive"),
                chip("هامش الربح", `${margin}%`, "border-warning/40 bg-warning/10 text-warning"),
              ];
            })()}
          </div>

          <div className="w-full h-80 sm:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="gRef" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" opacity={0.35} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: "color-mix(in oklab, var(--brand) 8%, transparent)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    fontSize: 12,
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.4)",
                  }}
                  formatter={(v: any) => `${v} ${t.common.currency}`}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                <Bar dataKey="revenue" name="الإيرادات" fill="url(#gRev)" radius={[8, 8, 0, 0]} maxBarSize={44} animationDuration={900} />
                <Bar dataKey="refunds" name="التعويضات" fill="url(#gRef)" radius={[8, 8, 0, 0]} maxBarSize={44} animationDuration={900} />
                <Area type="monotone" dataKey="profit" name="منطقة الأرباح" stroke="none" fill="url(#gProf)" animationDuration={1200} legendType="none" />
                <Line type="monotone" dataKey="profit" name="الأرباح" stroke="var(--success)" strokeWidth={3} dot={{ r: 4, fill: "var(--success)" }} activeDot={{ r: 6 }} animationDuration={1200} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="p-4 sm:p-6 bg-card border border-border rounded-2xl">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mb-2">{c.label}</div>
            <div className={`text-xl sm:text-3xl font-extrabold break-words ${
              c.tone === "brand" ? "text-brand" :
              c.tone === "success" ? "text-success" :
              c.tone === "warning" ? "text-warning" :
              c.tone === "danger" ? "text-destructive" : ""
            }`}>{c.value}</div>

          </div>
        ))}
      </div>


      <section className="p-4 sm:p-6 bg-card border border-border rounded-2xl mt-6">

        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="font-bold text-lg">تفاصيل المبيعات</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {month === "all" ? "كل المبيعات" : `مبيعات شهر ${month}`} ، {sales.data?.length ?? 0} عملية
            </p>
          </div>
          <button
            onClick={exportSalesXlsx}
            disabled={!sales.data?.length}
            className="px-4 py-2 bg-brand text-brand-foreground rounded-lg font-bold text-sm disabled:opacity-50"
          >
            تحميل Excel
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
