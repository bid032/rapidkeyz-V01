import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Search, Filter, Download, RefreshCw, ChevronDown, ChevronRight,
  User as UserIcon, Package, ShoppingCart, ShieldCheck, Clock, Hash, Mail, Phone,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { getAuditLog, type AuditRowEnriched } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } } | undefined)?.user;
    const uid = user?.id ?? (await supabase.auth.getUser()).data.user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin");
    if (!roles || roles.length === 0) throw redirect({ to: "/admin" });
  },
  component: AdminAudit,
});

const ACTION_LABELS: Record<string, string> = {
  "order.status_change": "تغيير حالة طلب",
  "order_item.delivered": "تسليم خدمة",
  "order_item.refunded": "استرداد خدمة",
  "order_item.status_change": "تغيير حالة خدمة",
  "delivery.manual": "تسليم يدوي",
  "refund.created": "إنشاء تعويض",
  "refund.deleted": "حذف تعويض",
  "product.created": "إضافة منتج",
  "product.updated": "تعديل منتج",
  "product.deleted": "حذف منتج",
  "plan.created": "إضافة خطة",
  "plan.updated": "تعديل خطة",
  "plan.deleted": "حذف خطة",
  "role.granted": "منح صلاحية",
  "role.revoked": "سحب صلاحية",
  "setting.updated": "تعديل إعداد",
  "setting.deleted": "حذف إعداد",
};

const TARGET_LABELS: Record<string, string> = {
  order: "طلب",
  order_item: "خدمة داخل طلب",
  refund: "تعويض",
  product: "منتج",
  plan: "خطة",
  user_role: "صلاحية",
  setting: "إعداد",
};

const STATUS_TONES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  paid: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  refunded: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function actionTone(action: string) {
  if (action.includes("deleted") || action.includes("revoked") || action.includes("refunded"))
    return "bg-destructive/10 text-destructive border-destructive/20";
  if (action.includes("delivered") || action.includes("created") || action.includes("granted"))
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (action.includes("updated") || action.includes("status_change") || action.includes("manual"))
    return "bg-brand/10 text-brand border-brand/20";
  return "bg-muted text-muted-foreground border-border";
}

function AdminAudit() {
  const fetchAudit = useServerFn(getAuditLog);
  const [q, setQ] = useState("");
  const [target, setTarget] = useState("");
  const [action, setAction] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = useQuery({
    queryKey: ["audit-log-enriched"],
    queryFn: () => fetchAudit({ data: { limit: 1000 } }),
    staleTime: 30_000,
  });

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    (rows.data ?? []).forEach((r) => set.add(r.action_type));
    return Array.from(set).sort();
  }, [rows.data]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows.data ?? []).filter((r) => {
      if (target && r.target_type !== target) return false;
      if (action && r.action_type !== action) return false;
      if (!s) return true;
      const hay = [
        r.actor_display,
        r.actor_email,
        r.actor_name,
        r.action_type,
        ACTION_LABELS[r.action_type],
        r.target_type,
        r.target_id,
        r.order_number,
        r.order_customer_name,
        r.order_customer_email,
        r.order_customer_phone,
        r.order_status,
        ...r.items.flatMap((it) => [it.product_name, it.plan_label, it.account_type, it.status]),
        JSON.stringify(r.meta ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows.data, q, target, action]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportXlsx = () => {
    const list: any[] = [];
    filtered.forEach((r) => {
      const base = {
        "التاريخ": new Date(r.created_at).toLocaleString("ar-EG", { hour12: false }),
        "المستخدم": r.actor_display,
        "البريد": r.actor_email ?? "",
        "الحركة": ACTION_LABELS[r.action_type] || r.action_type,
        "action_type": r.action_type,
        "نوع الهدف": TARGET_LABELS[r.target_type] || r.target_type,
        "target_id": r.target_id ?? "",
        "رقم الطلب": r.order_number ?? "",
        "حالة الطلب": r.order_status ?? "",
        "إجمالي الطلب": r.order_total ?? "",
        "اسم العميل": r.order_customer_name ?? "",
        "إيميل العميل": r.order_customer_email ?? "",
        "هاتف العميل": r.order_customer_phone ?? "",
      };
      if (r.items.length === 0) {
        list.push({ ...base, "meta": JSON.stringify(r.meta ?? {}) });
      } else {
        r.items.forEach((it) => {
          list.push({
            ...base,
            "المنتج": it.product_name ?? "",
            "الخطة": it.plan_label ?? "",
            "نوع الحساب": it.account_type ?? "",
            "الكمية": it.quantity ?? "",
            "السعر": it.unit_price ?? "",
            "حالة الخدمة": it.status ?? "",
            "meta": JSON.stringify(r.meta ?? {}),
          });
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(list);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `audit-log-${stamp}.xlsx`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">سجل الأعمال</h1>
          <p className="text-xs text-muted-foreground mt-1">
            كل حركة إدارية على الموقع مع تفاصيل الطلب والخدمات المرتبطة بها.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => rows.refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${rows.isFetching ? "animate-spin" : ""}`} /> تحديث
          </button>
          <button
            onClick={exportXlsx}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold hover:brand-glow disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> تحميل Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Kpi label="إجمالي" value={rows.data?.length ?? 0} />
        <Kpi label="بعد الفلترة" value={filtered.length} tone="text-brand" />
        <Kpi
          label="تسليم خدمات"
          value={(rows.data ?? []).filter((r) => r.action_type === "order_item.delivered").length}
          tone="text-emerald-500"
        />
        <Kpi
          label="تغيير حالة"
          value={(rows.data ?? []).filter((r) => r.action_type.includes("status_change")).length}
          tone="text-amber-500"
        />
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-[1fr_200px_200px] gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث برقم الطلب، الإيميل، الهاتف، المنتج، المستخدم، أو أي كلمة…"
            className="w-full ps-3 pe-9 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-muted-foreground" />
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full ps-3 pe-9 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-brand appearance-none"
          >
            <option value="">كل الأنواع</option>
            {Object.entries(TARGET_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-muted-foreground" />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full ps-3 pe-9 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-brand appearance-none"
          >
            <option value="">كل الحركات</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {rows.isLoading && (
          <div className="p-8 text-center text-sm text-muted-foreground bg-card border border-border rounded-2xl">
            جاري التحميل…
          </div>
        )}
        {!rows.isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground bg-card border border-border rounded-2xl">
            لا توجد نتائج مطابقة.
          </div>
        )}
        {filtered.map((r) => (
          <AuditCard
            key={r.id}
            row={r}
            expanded={expanded.has(r.id)}
            onToggle={() => toggle(r.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl sm:text-2xl font-extrabold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function AuditCard({
  row,
  expanded,
  onToggle,
}: {
  row: AuditRowEnriched;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails =
    !!row.order_number ||
    row.items.length > 0 ||
    Object.keys(row.meta ?? {}).length > 0;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-start p-3 sm:p-4 flex flex-wrap items-center gap-3 hover:bg-muted/40 transition"
      >
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 rtl:rotate-180" />}
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${actionTone(
            row.action_type,
          )}`}
        >
          {ACTION_LABELS[row.action_type] || row.action_type}
        </span>

        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Package className="w-3 h-3" /> {TARGET_LABELS[row.target_type] || row.target_type}
        </span>

        {row.order_number && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand">
            <ShoppingCart className="w-3 h-3" /> {row.order_number}
          </span>
        )}

        {row.order_status && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
              STATUS_TONES[row.order_status] ?? "bg-muted text-muted-foreground border-border"
            }`}
          >
            {row.order_status}
          </span>
        )}

        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <UserIcon className="w-3 h-3" />
          <bdi>{row.actor_display}</bdi>
        </span>

        <span className="ms-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums" dir="ltr">
          <Clock className="w-3 h-3" />
          {new Date(row.created_at).toLocaleString("ar-EG", { hour12: false })}
        </span>
      </button>

      {expanded && hasDetails && (
        <div className="border-t border-border p-3 sm:p-4 space-y-3 bg-background/40">
          {/* Actor block */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <InfoChip icon={<UserIcon className="w-3 h-3" />} label="المستخدم" value={row.actor_display} />
            {row.actor_email && (
              <InfoChip icon={<Mail className="w-3 h-3" />} label="بريد المستخدم" value={row.actor_email} />
            )}
            {row.target_id && (
              <InfoChip icon={<Hash className="w-3 h-3" />} label="Target ID" value={row.target_id} mono />
            )}
          </div>

          {/* Order block */}
          {(row.order_number || row.order_customer_email) && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <ShoppingCart className="w-3.5 h-3.5 text-brand" />
                تفاصيل الطلب
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {row.order_number && <InfoChip label="رقم الطلب" value={row.order_number} />}
                {row.order_status && <InfoChip label="الحالة" value={row.order_status} />}
                {row.order_total != null && (
                  <InfoChip label="الإجمالي" value={`${row.order_total} EGP`} />
                )}
                {row.order_customer_name && (
                  <InfoChip icon={<UserIcon className="w-3 h-3" />} label="العميل" value={row.order_customer_name} />
                )}
                {row.order_customer_email && (
                  <InfoChip icon={<Mail className="w-3 h-3" />} label="الإيميل" value={row.order_customer_email} />
                )}
                {row.order_customer_phone && (
                  <InfoChip icon={<Phone className="w-3 h-3" />} label="الهاتف" value={row.order_customer_phone} />
                )}
              </div>
            </div>
          )}

          {/* Items */}
          {row.items.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Package className="w-3.5 h-3.5 text-brand" />
                الخدمات ({row.items.length})
              </div>
              <div className="space-y-1.5">
                {row.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs bg-muted/30 rounded-lg p-2"
                  >
                    <span className="font-bold">{it.product_name || "—"}</span>
                    {it.plan_label && (
                      <span className="text-muted-foreground">{it.plan_label}</span>
                    )}
                    {it.account_type && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[10px] font-bold">
                        {it.account_type}
                      </span>
                    )}
                    {it.quantity != null && it.quantity > 1 && (
                      <span className="text-muted-foreground">× {it.quantity}</span>
                    )}
                    {it.unit_price != null && (
                      <span className="text-muted-foreground tabular-nums">{it.unit_price} EGP</span>
                    )}
                    {it.status && (
                      <span
                        className={`ms-auto inline-flex px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                          STATUS_TONES[it.status] ?? "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {it.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw meta */}
          {row.meta && Object.keys(row.meta).length > 0 && (
            <details className="rounded-xl border border-border bg-card p-3">
              <summary className="cursor-pointer text-xs font-bold flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                بيانات الحركة الخام (meta)
              </summary>
              <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap break-words text-muted-foreground">
                {JSON.stringify(row.meta, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function InfoChip({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <bdi className={`font-bold ${mono ? "font-mono text-[10px]" : ""}`}>{value}</bdi>
    </span>
  );
}
