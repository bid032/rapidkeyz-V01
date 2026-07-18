import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin/refunds")({
  component: AdminRefunds,
});

type Refund = {
  id: string;
  user_id: string | null;
  order_id: string | null;
  amount: number;
  type: string;
  notes: string | null;
  created_at: string;
};

function AdminRefunds() {
  const { notify, confirm } = useApp();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refunds")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Refund[];
    },
  });

  const users = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_list_users");
      return (data ?? []) as { id: string; display_name: string; email: string }[];
    },
  });

  const totals = (list.data ?? []).reduce(
    (acc, r) => {
      acc.total += Number(r.amount);
      acc[r.type === "full_refund" ? "full" : r.type === "partial_refund" ? "partial" : "replacement"] += Number(r.amount);
      return acc;
    },
    { total: 0, full: 0, partial: 0, replacement: 0 },
  );

  const [draft, setDraft] = useState({
    user_id: "",
    order_id: "",
    amount: 0,
    type: "partial_refund",
    notes: "",
  });

  const create = async () => {
    if (!draft.user_id || !draft.amount) {
      notify("اختر العميل وأدخل المبلغ", "error");
      return;
    }
    const { error } = await supabase.from("refunds").insert({
      user_id: draft.user_id,
      order_id: draft.order_id || null,
      amount: Number(draft.amount),
      type: draft.type,
      notes: draft.notes || null,
    });
    if (error) return notify(error.message, "error");
    notify("تم تسجيل التعويض", "success");
    setDraft({ user_id: "", order_id: "", amount: 0, type: "partial_refund", notes: "" });
    qc.invalidateQueries({ queryKey: ["admin-refunds"] });
    qc.invalidateQueries({ queryKey: ["admin-revenue"] });
  };

  const remove = async (id: string) => {
    const ok = await confirm({ message: "حذف هذا التعويض؟", tone: "danger" });
    if (!ok) return;
    const { error } = await supabase.from("refunds").delete().eq("id", id);
    if (error) return notify(error.message, "error");
    notify("تم الحذف", "success");
    qc.invalidateQueries({ queryKey: ["admin-refunds"] });
  };

  const userName = (id: string | null) => {
    if (!id) return "—";
    const u = users.data?.find((x) => x.id === id);
    return u ? `${u.display_name || u.email}` : id.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="إجمالي التعويضات" value={totals.total} />
        <Stat label="ريفاند كامل" value={totals.full} />
        <Stat label="ريفاند جزئي" value={totals.partial} />
        <Stat label="حساب بديل" value={totals.replacement} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <h2 className="font-extrabold text-lg mb-4 flex items-center gap-2">
          <Plus className="size-5 text-brand" /> إضافة تعويض
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <select
            value={draft.user_id}
            onChange={(e) => setDraft({ ...draft, user_id: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded-lg"
          >
            <option value="">-- اختر العميل --</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.email}
              </option>
            ))}
          </select>
          <input
            placeholder="رقم الطلب (اختياري)"
            value={draft.order_id}
            onChange={(e) => setDraft({ ...draft, order_id: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded-lg"
          />
          <input
            type="number"
            placeholder="المبلغ (EGP)"
            value={draft.amount || ""}
            onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
            className="px-3 py-2 bg-background border border-border rounded-lg"
          />
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded-lg"
          >
            <option value="full_refund">ريفاند كامل</option>
            <option value="partial_refund">ريفاند جزئي</option>
            <option value="replacement_account">حساب بديل (تكلفة)</option>
          </select>
          <textarea
            placeholder="ملاحظات (سبب التعويض...)"
            rows={2}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            className="sm:col-span-2 px-3 py-2 bg-background border border-border rounded-lg"
          />
        </div>
        <button
          onClick={create}
          className="mt-4 px-5 py-2.5 bg-brand text-brand-foreground rounded-lg font-bold hover:brand-glow"
        >
          تسجيل
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-start">التاريخ</th>
                <th className="p-3 text-start">العميل</th>
                <th className="p-3 text-start">النوع</th>
                <th className="p-3 text-start">المبلغ</th>
                <th className="p-3 text-start">ملاحظات</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.data?.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("ar-EG")}</td>
                  <td className="p-3">{userName(r.user_id)}</td>
                  <td className="p-3">
                    {r.type === "full_refund"
                      ? "ريفاند كامل"
                      : r.type === "partial_refund"
                      ? "ريفاند جزئي"
                      : "حساب بديل"}
                  </td>
                  <td className="p-3 font-bold text-destructive">-{r.amount} EGP</td>
                  <td className="p-3 text-muted-foreground max-w-xs truncate">{r.notes}</td>
                  <td className="p-3">
                    <button
                      onClick={() => remove(r.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded"
                    >
                      <Trash2 className="size-4" />
                    </button>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-card border border-border rounded-2xl">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-extrabold text-destructive">-{value} EGP</div>
    </div>
  );
}
