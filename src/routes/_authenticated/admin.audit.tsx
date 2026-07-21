import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AdminAudit,
});

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action_type: string;
  target_type: string;
  target_id: string | null;
  meta: any;
  created_at: string;
};

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

function AdminAudit() {
  const [filter, setFilter] = useState("");
  const [target, setTarget] = useState("");

  const rows = useQuery({
    queryKey: ["audit-log", filter, target],
    queryFn: async () => {
      let q = supabase
        .from("audit_log")
        .select("id, actor_id, actor_name, action_type, target_type, target_id, meta, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filter) q = q.ilike("action_type", `%${filter}%`);
      if (target) q = q.eq("target_type", target);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold">سجل الأعمال</h1>
        <div className="flex flex-wrap gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded text-sm"
          >
            <option value="">كل الأنواع</option>
            <option value="order">طلبات</option>
            <option value="order_item">خدمات في طلبات</option>
            <option value="refund">تعويضات</option>
            <option value="product">منتجات</option>
            <option value="plan">خطط</option>
            <option value="user_role">صلاحيات</option>
            <option value="setting">إعدادات</option>
          </select>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="بحث في نوع الحركة…"
            className="px-3 py-2 bg-card border border-border rounded text-sm"
            dir="rtl"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        كل حركة إدارية على الموقع بتتسجل هنا: الأدمن/المودريتور اللي عملها، نوع الحركة، والوقت.
      </p>

      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-start p-3 font-bold">التاريخ</th>
                <th className="text-start p-3 font-bold">المستخدم</th>
                <th className="text-start p-3 font-bold">الحركة</th>
                <th className="text-start p-3 font-bold">الهدف</th>
                <th className="text-start p-3 font-bold">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {rows.isLoading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    جاري التحميل…
                  </td>
                </tr>
              )}
              {rows.data && rows.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    مافيش حركات مطابقة.
                  </td>
                </tr>
              )}
              {(rows.data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border align-top hover:bg-muted/20">
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground" dir="ltr">
                    {new Date(r.created_at).toLocaleString("ar-EG", { hour12: false })}
                  </td>
                  <td className="p-3">
                    <div className="font-bold">{r.actor_name || "—"}</div>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[11px] font-bold">
                      {ACTION_LABELS[r.action_type] || r.action_type}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    <span className="text-muted-foreground">{r.target_type}</span>
                    {r.target_id && (
                      <span className="block font-mono text-[10px] truncate max-w-[160px]" title={r.target_id}>
                        {r.target_id}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <pre className="text-[10px] font-mono text-muted-foreground max-w-[380px] whitespace-pre-wrap break-words">
                      {r.meta ? JSON.stringify(r.meta, null, 0) : "—"}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
