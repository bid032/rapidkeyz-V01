import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
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
  const [month, setMonth] = useState<MonthKey>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);

  const range = useMemo(() => {
    if (month === "all") return { start: null as string | null, end: null as string | null };
    const [y, m] = month.split("-").map(Number);
    // Local-time month boundaries so orders bucket by the user's local calendar day.
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    return { start, end };
  }, [month]);

  const prevMonthKey = useMemo(() => {
    if (month === "all") return null;
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [month]);

  const prevRange = useMemo(() => {
    if (!prevMonthKey) return { start: null as string | null, end: null as string | null };
    const [y, m] = prevMonthKey.split("-").map(Number);
    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();
    return { start, end };
  }, [prevMonthKey]);

  const stats = useQuery({
    queryKey: ["admin-stats", month],
    queryFn: async () => {
      // Match SQL RPC exactly: attribute refunds to the ORIGINATING order's date
      // and include the same statuses the RPC uses (paid, delivered, refunded).
      let refundsQ = supabase
        .from("refunds")
        .select("amount, orders!inner(created_at, status)")
        .in("orders.status", ["paid", "delivered", "refunded"]);
      if (range.start) refundsQ = refundsQ.gte("orders.created_at", range.start);
      if (range.end) refundsQ = refundsQ.lt("orders.created_at", range.end);

      let allOrdersQ = supabase.from("orders").select("id", { count: "exact", head: true });
      if (range.start) allOrdersQ = allOrdersQ.gte("created_at", range.start);
      if (range.end) allOrdersQ = allOrdersQ.lt("created_at", range.end);
      let deliveredQ = supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered");
      if (range.start) deliveredQ = deliveredQ.gte("created_at", range.start);
      if (range.end) deliveredQ = deliveredQ.lt("created_at", range.end);
      let processingQ = supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "paid", "processing"]);

      if (range.start) processingQ = processingQ.gte("created_at", range.start);
      if (range.end) processingQ = processingQ.lt("created_at", range.end);
      const [rev, products, users, pending, refundsRes, allOrders, delivered, processing] = await Promise.all([
        supabase.rpc("admin_revenue_stats", { _start: range.start ?? undefined, _end: range.end ?? undefined }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        refundsQ,
        allOrdersQ,
        deliveredQ,
        processingQ,
      ]);
      const row = (rev.data as any[])?.[0] ?? { revenue: 0, profit: 0, orders_count: 0, items_count: 0 };
      const refundsTotal = (refundsRes.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      return {
        revenue: Number(row.revenue ?? 0),
        profit: Number(row.profit ?? 0),
        ordersCount: allOrders.count ?? 0,
        deliveredCount: delivered.count ?? 0,
        processingCount: processing.count ?? 0,
        products: products.count ?? 0,
        users: users.count ?? 0,
        pending: pending.count ?? 0,
        refunds: refundsTotal,
      };
    },
  });

  const prevStats = useQuery({
    queryKey: ["admin-stats-prev", prevMonthKey],
    enabled: !!prevMonthKey && compare,
    queryFn: async () => {
      let refundsQ = supabase
        .from("refunds")
        .select("amount, orders!inner(created_at, status)")
        .in("orders.status", ["paid", "delivered", "refunded"]);
      if (prevRange.start) refundsQ = refundsQ.gte("orders.created_at", prevRange.start);
      if (prevRange.end) refundsQ = refundsQ.lt("orders.created_at", prevRange.end);
      const [rev, refundsRes] = await Promise.all([
        supabase.rpc("admin_revenue_stats", {
          _start: prevRange.start ?? undefined,
          _end: prevRange.end ?? undefined,
        }),
        refundsQ,
      ]);
      const row = (rev.data as any[])?.[0] ?? { revenue: 0, profit: 0 };
      const refundsTotal = (refundsRes.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      return {
        revenue: Number(row.revenue ?? 0),
        profit: Number(row.profit ?? 0),
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

  const refundsAll = useQuery({
    queryKey: ["admin-refunds-all"],
    queryFn: async () => {
      // Pull refunds joined to their order so the chart buckets by order date
      // (matches admin_revenue_by_month / admin_revenue_stats basis).
      const { data } = await supabase
        .from("refunds")
        .select("amount, created_at, orders!inner(created_at, status)")
        .in("orders.status", ["paid", "delivered", "refunded"]);
      return (data ?? []).map((r: any) => ({
        amount: Number(r.amount ?? 0),
        // basis_at = order's created_at; fall back to refund's own date if missing
        basis_at: (r.orders?.created_at as string) ?? r.created_at,
      })) as { amount: number; basis_at: string }[];
    },
  });





  const sales = useQuery({
    queryKey: ["admin-sales-details", month],
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select("id, product_name, plan_label, plan_id, quantity, unit_price, status, created_at, order_id, delivered_accounts(id, account_email, account_username, delivered_at), orders!inner(id, order_number, status, customer_email, customer_name, customer_phone, notes, user_id, created_at, payment_gateway, payment_sender_phone, payment_reference, payment_proof_url, total, subtotal, discount_amount, coupon_id)")
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
      const orderIds = Array.from(new Set(items.map((r) => r.order_id).filter(Boolean)));
      const refundsByOrder = new Map<string, any[]>();
      const refundsByItem = new Map<string, any[]>();
      if (orderIds.length) {
        const { data: refs } = await supabase
          .from("refunds")
          .select("order_id, order_item_id, amount, type, notes, created_at")
          .in("order_id", orderIds);
        (refs ?? []).forEach((r: any) => {
          if (r.order_item_id) {
            const arr = refundsByItem.get(r.order_item_id) ?? [];
            arr.push(r); refundsByItem.set(r.order_item_id, arr);
          } else if (r.order_id) {
            const arr = refundsByOrder.get(r.order_id) ?? [];
            arr.push(r); refundsByOrder.set(r.order_id, arr);
          }
        });
      }
      // Pre-compute each order's gross (pre-discount) total so we can pro-rate
      // both the coupon discount AND order-level refunds across line items.
      const orderGross = new Map<string, number>();
      items.forEach((r) => {
        const t = Number(r.unit_price) * Number(r.quantity);
        orderGross.set(r.order_id, (orderGross.get(r.order_id) ?? 0) + t);
      });
      return items.map((r) => {
        const cost = costMap.get(r.plan_id) ?? 0;
        const grossProfit = (Number(r.unit_price) - cost) * Number(r.quantity);
        const prof = profileMap.get(r.orders?.user_id) ?? {};
        const itemRefs = refundsByItem.get(r.id) ?? [];
        const orderRefs = refundsByOrder.get(r.order_id) ?? [];
        const itemAmount = itemRefs.reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0);
        const lineTotal = Number(r.unit_price) * Number(r.quantity);
        const gross = orderGross.get(r.order_id) ?? 0;
        const share = gross > 0 ? lineTotal / gross : 0;
        const orderAmount = orderRefs.reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0) * share;
        const refundAmount = itemAmount + orderAmount;
        // Proportional coupon discount for this line.
        const orderDiscount = Number(r.orders?.discount_amount ?? 0);
        const lineDiscount = orderDiscount * share;
        const netRevenue = Math.max(0, lineTotal - lineDiscount);
        const profit = grossProfit - lineDiscount; // profit after coupon (before refund)
        const refs = [...itemRefs, ...orderRefs];
        return { ...r, _cost: cost, _profit: profit, _grossProfit: grossProfit, _lineDiscount: lineDiscount, _netRevenue: netRevenue, _profile: prof, _refunds: refs, _refundAmount: refundAmount };
      });

    },
  });

  const chartData = useMemo(() => {
    if (month === "all") {
      const rows = (monthly.data ?? []).map((r) => ({
        bucket: r.month.slice(0, 7),
        revenue: Math.round(Number(r.revenue ?? 0)),
        profit: Math.round(Number(r.profit ?? 0)),
        refunds: 0,
      }));
      (refundsAll.data ?? []).forEach((r) => {
        const d = new Date(r.basis_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const row = rows.find((x) => x.bucket === key);
        const amt = Math.round(Number(r.amount ?? 0));
        if (row) row.refunds += amt;
        else rows.push({ bucket: key, revenue: 0, profit: 0, refunds: amt });
      });
      rows.sort((a, b) => a.bucket.localeCompare(b.bucket));
      return rows;
    }
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const rows = Array.from({ length: daysInMonth }, (_, i) => ({
      bucket: String(i + 1).padStart(2, "0"),
      revenue: 0,
      profit: 0,
      refunds: 0,
    }));
    const validStatuses = new Set(["paid", "delivered", "refunded"]);
    (sales.data ?? []).forEach((it: any) => {
      if (!validStatuses.has(it.orders?.status)) return;
      const d = new Date(it.orders?.created_at ?? it.created_at);
      if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return;
      const idx = d.getDate() - 1;
      rows[idx].revenue += Math.round(Number(it.unit_price) * Number(it.quantity));
      rows[idx].profit += Math.round(Number(it._profit ?? 0));
    });

    (refundsAll.data ?? []).forEach((r) => {
      const d = new Date(r.basis_at);
      if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return;
      const idx = d.getDate() - 1;
      const amt = Math.round(Number(r.amount ?? 0));
      rows[idx].refunds += amt;
      rows[idx].profit -= amt;
    });
    return rows;
  }, [monthly.data, refundsAll.data, sales.data, month]);




  const exportSalesXlsx = () => {
    const rows = (sales.data ?? []).map((r: any) => {
      const d = new Date(r.orders?.created_at ?? r.created_at);
      const total = Number(r.unit_price) * Number(r.quantity);
      const p = r._profile ?? {};
      const applicable = r._refunds ?? [];
      const refundAmount = Number(r._refundAmount ?? 0);
      const refundTypes = Array.from(new Set(applicable.map((x: any) => x.type).filter(Boolean))).join(", ");
      const refundNotes = applicable.map((x: any) => x.notes).filter(Boolean).join(" | ");
      const refundDates = applicable.map((x: any) => new Date(x.created_at).toLocaleDateString("en-GB")).join(", ");
      const netProfit = Number(r._profit ?? 0) - refundAmount;
      const delivered = (r.delivered_accounts ?? [])[0];
      return {
        "رقم الطلب": r.orders?.order_number,
        "اسم العميل": r.orders?.customer_name ?? p.display_name ?? "",
        "البريد الإلكتروني": r.orders?.customer_email ?? "",
        "رقم الواتساب": r.orders?.customer_phone ?? p.phone ?? "",
        "الدولة": p.country ?? "",
        "طريقة الدفع": r.orders?.payment_gateway ?? "",
        "الخدمة": r.product_name,
        "الخطة": r.plan_label,
        "الكمية": r.quantity,
        "سعر الوحدة": Number(r.unit_price),
        "الإجمالي": total,
        "سعر الشراء": r._cost ?? 0,
        "الربح": r._profit ?? 0,
        "تم التسليم؟": delivered ? "نعم" : "لا",
        "تاريخ التسليم": delivered?.delivered_at ? new Date(delivered.delivered_at).toLocaleString("en-GB", { hour12: true }) : "",
        "الحساب المُسلَّم": delivered?.account_email ?? delivered?.account_username ?? "",
        "تم عمل استرداد؟": refundAmount > 0 ? "نعم" : "لا",
        "قيمة الاسترداد": refundAmount,
        "نوع الاسترداد": refundTypes,
        "تاريخ الاسترداد": refundDates,
        "ملاحظات الاسترداد": refundNotes,
        "صافي الربح بعد الاسترداد": netProfit,
        "التاريخ": d.toLocaleDateString("en-GB"),
        "الوقت": d.toLocaleTimeString("en-GB", { hour12: true }),

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
    { label: "عدد الطلبات", value: stats.data?.ordersCount ?? 0, tone: "default" },
    { label: "الطلبات الناجحة", value: stats.data?.deliveredCount ?? 0, tone: "success" },
    { label: "طلبات قيد التجهيز", value: stats.data?.processingCount ?? 0, tone: "warning" },
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
          {month !== "all" && (
            <label className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-card border border-border rounded-lg text-xs sm:text-sm font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                className="accent-brand size-3.5"
              />
              <span className="whitespace-nowrap">قارن مع السابق</span>
            </label>
          )}
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
              // Source of truth: SQL RPC (admin_revenue_stats). It filters by
              // status IN (paid, delivered, refunded) and subtracts refunds
              // from profit, so KPIs stay consistent with the daily/monthly chart.
              const totRev = Math.round(stats.data?.revenue ?? 0);
              const totProf = Math.round(stats.data?.profit ?? 0);
              const totRef = Math.round(stats.data?.refunds ?? 0);
              const margin = totRev ? Math.round((totProf / totRev) * 100) : 0;


              const p = prevStats.data;
              const showCompare = compare && !!prevMonthKey && !!p;
              const prevMargin = p && p.revenue ? Math.round((p.profit / p.revenue) * 100) : 0;

              const delta = (cur: number, prev: number, isPct = false) => {
                if (!showCompare) return null;
                const diff = cur - prev;
                const pct = prev !== 0 ? Math.round((diff / Math.abs(prev)) * 100) : (cur !== 0 ? 100 : 0);
                const up = diff >= 0;
                const arrow = up ? "▲" : "▼";
                const color = up ? "text-success" : "text-destructive";
                const suffix = isPct ? "pp" : "%";
                const val = isPct ? `${diff >= 0 ? "+" : ""}${diff}${suffix}` : `${diff >= 0 ? "+" : ""}${pct}%`;
                return (
                  <div className={`mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold ${color}`}>
                    <span>{arrow}</span>
                    <span>{val}</span>
                    <span className="opacity-60 font-normal">مقابل {prevMonthKey}</span>
                  </div>
                );
              };

              const chip = (label: string, val: string, tone: string, deltaEl: React.ReactNode) => (
                <div key={label} className={`rounded-2xl p-3 border ${tone}`}>
                  <div className="text-[10px] uppercase tracking-widest opacity-70">{label}</div>
                  <div className="text-base sm:text-xl font-extrabold mt-1">{val}</div>
                  {deltaEl}
                </div>
              );
              return [
                chip("الإيرادات", `${totRev} ${t.common.currency}`, "border-brand/40 bg-brand/10 text-brand", delta(totRev, p?.revenue ?? 0)),
                chip("الأرباح", `${totProf} ${t.common.currency}`, "border-success/40 bg-success/10 text-success", delta(totProf, p?.profit ?? 0)),
                chip("التعويضات", `${totRef} ${t.common.currency}`, "border-destructive/40 bg-destructive/10 text-destructive", delta(totRef, p?.refunds ?? 0)),
                chip("هامش الربح", `${margin}%`, "border-warning/40 bg-warning/10 text-warning", delta(margin, prevMargin, true)),
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
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
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
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-start text-xs uppercase text-muted-foreground border-b border-border">
                <th className="p-2 text-start w-8"></th>
                <th className="p-2 text-start">الطلب</th>
                <th className="p-2 text-start">العميل</th>
                <th className="p-2 text-start">الخدمة / الخطة</th>
                <th className="p-2 text-start">الكمية</th>
                <th className="p-2 text-start">الإجمالي</th>
                <th className="p-2 text-start">الربح</th>
                <th className="p-2 text-start">الحالة</th>
                <th className="p-2 text-start">التسليم</th>
                <th className="p-2 text-start">الاسترداد</th>
                <th className="p-2 text-start">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {sales.data?.map((r: any) => {
                const d = new Date(r.orders?.created_at ?? r.created_at);
                const profit = Number(r._profit ?? 0);
                const refundAmount = Number(r._refundAmount ?? 0);
                const netProfit = profit - refundAmount;
                const delivered = (r.delivered_accounts ?? [])[0];
                const p = r._profile ?? {};
                const itemDelivered = r.status === "delivered" || (r.delivered_accounts?.length ?? 0) > 0;
                const itemRefunded = r.status === "refunded";
                const status = itemRefunded
                  ? "refunded"
                  : itemDelivered
                  ? "delivered"
                  : r.orders?.status;
                const isExpanded = expandedRow === r.id;
                const statusColors: Record<string, string> = {
                  delivered: "bg-success/15 text-success",
                  paid: "bg-brand/15 text-brand",
                  refunded: "bg-destructive/15 text-destructive",
                  pending: "bg-warning/15 text-warning",
                };
                return (
                  <React.Fragment key={r.id}>
                    <tr
                      key={r.id}
                      className="border-b border-border/60 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                    >
                      <td className="p-2 text-muted-foreground">{isExpanded ? "▾" : "▸"}</td>
                      <td className="p-2 font-mono text-xs">#{r.orders?.order_number}</td>
                      <td className="p-2 text-xs">
                        <div className="font-bold truncate max-w-[140px]">{r.orders?.customer_name ?? p.display_name ?? "—"}</div>
                        <div className="text-muted-foreground truncate max-w-[140px]">{r.orders?.customer_email}</div>
                      </td>
                      <td className="p-2">
                        <div className="font-bold truncate max-w-[180px]">{r.product_name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.plan_label}</div>
                      </td>
                      <td className="p-2">{r.quantity}</td>
                      <td className="p-2 font-bold text-brand">{Math.round(Number(r.unit_price) * Number(r.quantity))} {t.common.currency}</td>
                      <td className={`p-2 font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                        {Math.round(netProfit)} {t.common.currency}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[status] ?? "bg-muted text-muted-foreground"}`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-2 text-xs">
                        {delivered ? (
                          <span className="text-success font-bold">✓ تم</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2 text-xs">
                        {refundAmount > 0 ? (
                          <span className="text-destructive font-bold">-{Math.round(refundAmount)} {t.common.currency}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-[11px] whitespace-nowrap">
                        {d.toLocaleDateString("en-GB")}<br />
                        <span className="text-muted-foreground">{d.toLocaleTimeString("en-GB", { hour12: true })}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/20 border-b border-border/60">
                        <td colSpan={11} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                            <div>
                              <div className="font-bold text-muted-foreground mb-1">بيانات العميل</div>
                              <div>الاسم: {r.orders?.customer_name ?? p.display_name ?? "—"}</div>
                              <div>البريد: {r.orders?.customer_email ?? "—"}</div>
                              <div>الواتساب: {r.orders?.customer_phone ?? p.phone ?? "—"}</div>
                              <div>الدولة: {p.country ?? "—"}</div>
                            </div>
                            <div>
                              <div className="font-bold text-muted-foreground mb-1">التفاصيل المالية</div>
                              <div>سعر الوحدة: {Math.round(Number(r.unit_price))} {t.common.currency}</div>
                              <div>الإجمالي: {Math.round(Number(r.unit_price) * Number(r.quantity))} {t.common.currency}</div>
                              <div>سعر الشراء: {Math.round(Number(r._cost ?? 0))} {t.common.currency}</div>
                              <div className="text-success">الربح: {Math.round(profit)} {t.common.currency}</div>
                              {refundAmount > 0 && (
                                <div className="text-destructive font-bold">الصافي بعد الاسترداد: {Math.round(netProfit)} {t.common.currency}</div>
                              )}
                              {r.orders?.payment_gateway && <div>طريقة الدفع: {r.orders.payment_gateway}</div>}
                              {r.orders?.payment_sender_phone && <div>رقم المُحوَّل منه: {r.orders.payment_sender_phone}</div>}
                              {r.orders?.payment_reference && <div>مرجع الدفع: {r.orders.payment_reference}</div>}
                              {r.orders?.total != null && <div>إجمالي الطلب كامل: {Math.round(Number(r.orders.total))} {t.common.currency}</div>}
                            </div>
                            <div>
                              <div className="font-bold text-muted-foreground mb-1">التسليم</div>
                              {delivered ? (
                                <>
                                  <div className="text-success">✓ تم التسليم</div>
                                  <div>الحساب: {delivered.account_email ?? delivered.account_username ?? "—"}</div>
                                  {delivered.delivered_at && (
                                    <div>التاريخ: {new Date(delivered.delivered_at).toLocaleString("en-GB", { hour12: true })}</div>
                                  )}
                                </>
                              ) : (
                                <div className="text-muted-foreground">لم يتم التسليم بعد</div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-muted-foreground mb-1">الاسترداد</div>
                              {(r._refunds ?? []).length > 0 ? (
                                <div className="space-y-1">
                                  {r._refunds.map((rf: any, i: number) => (
                                    <div key={i} className="border-s-2 border-destructive ps-2">
                                      <div className="text-destructive font-bold">-{Math.round(Number(rf.amount))} {t.common.currency} • {rf.type ?? "—"}</div>
                                      <div className="text-muted-foreground">{new Date(rf.created_at).toLocaleString("en-GB", { hour12: true })}</div>
                                      {rf.notes && <div className="italic">{rf.notes}</div>}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-muted-foreground">لا يوجد</div>
                              )}
                            </div>
                            {r.orders?.notes && (
                              <div className="md:col-span-2 lg:col-span-4">
                                <div className="font-bold text-muted-foreground mb-1">ملاحظات الطلب</div>
                                <div className="whitespace-pre-wrap">{r.orders.notes}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!sales.data?.length && (
                <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">مفيش مبيعات في الفترة دي</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
