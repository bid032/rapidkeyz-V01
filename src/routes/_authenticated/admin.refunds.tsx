import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trash2, Search, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin/refunds")({
  component: AdminRefunds,
});

type Refund = {
  id: string;
  user_id: string | null;
  order_id: string | null;
  order_item_id: string | null;
  amount: number;
  type: string;
  notes: string | null;
  created_at: string;
};

const typeLabel = (t: string) =>
  t === "full" ? "ريفاند كامل" : t === "partial" ? "ريفاند جزئي" : "حساب بديل";

function AdminRefunds() {
  const { notify, confirm } = useApp();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const refunds = useQuery({
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

  const orders = useQuery({
    queryKey: ["admin-orders-for-refunds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_email, customer_phone, subtotal, total, discount_amount, coupon_id, status, user_id, created_at, order_items(id, product_name, plan_label, quantity, unit_price)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = orders.data ?? [];
    if (!q) return list.slice(0, 5);
    return list.filter((o: any) =>
      String(o.order_number ?? "").toLowerCase().includes(q) ||
      String(o.customer_email ?? "").toLowerCase().includes(q) ||
      String(o.customer_phone ?? "").toLowerCase().includes(q)
    );
  }, [orders.data, search]);


  const totals = (refunds.data ?? []).reduce(
    (acc, r) => {
      acc.total += Number(r.amount);
      if (r.type === "full") acc.full += Number(r.amount);
      else if (r.type === "partial") acc.partial += Number(r.amount);
      else acc.replacement += Number(r.amount);
      return acc;
    },
    { total: 0, full: 0, partial: 0, replacement: 0 },
  );

  const refundsByOrder = useMemo(() => {
    const m = new Map<string, Refund[]>();
    for (const r of refunds.data ?? []) {
      if (!r.order_id) continue;
      if (!m.has(r.order_id)) m.set(r.order_id, []);
      m.get(r.order_id)!.push(r);
    }
    return m;
  }, [refunds.data]);

  const remove = async (id: string) => {
    const ok = await confirm({ message: "حذف هذا التعويض؟", tone: "danger" });
    if (!ok) return;
    const { error } = await supabase.from("refunds").delete().eq("id", id);
    if (error) return notify(error.message, "error");
    notify("تم الحذف", "success");
    qc.invalidateQueries({ queryKey: ["admin-refunds"] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="إجمالي التعويضات" value={totals.total} />
        <Stat label="ريفاند كامل" value={totals.full} />
        <Stat label="ريفاند جزئي" value={totals.partial} />
        <Stat label="حساب بديل" value={totals.replacement} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="font-extrabold text-lg mb-2 flex items-center gap-2">
            <Search className="size-5 text-brand" /> بحث عن طلب لإضافة تعويض
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الطلب أو الإيميل أو رقم الواتساب…"
            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {search ? `${visibleOrders.length} نتيجة` : "أحدث 5 طلبات — ابحث لتحديد أوسع"}
          </p>

        </div>

        <div className="space-y-2">
          {visibleOrders.map((o: any) => {
            const orderRefunds = refundsByOrder.get(o.id) ?? [];
            const isOpen = expandedOrder === o.id;
            return (
              <div key={o.id} className="border border-border rounded-xl overflow-hidden bg-background">
                <button
                  onClick={() => setExpandedOrder(isOpen ? null : o.id)}
                  className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/40 text-start"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                      #{o.order_number}
                      {orderRefunds.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/15 text-destructive font-bold">
                          {orderRefunds.length} تعويض
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {o.customer_email} · {new Date(o.created_at).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-brand shrink-0">{o.total} EGP</div>
                </button>

                {isOpen && (
                  <div className="p-3 border-t border-border bg-muted/20 space-y-3">
                    {o.order_items?.map((it: any) => {
                      const itemRefunds = orderRefunds.filter((r) => r.order_item_id === it.id);
                      return (
                        <ItemRefundBlock
                          key={it.id}
                          orderId={o.id}
                          userId={o.user_id}
                          item={it}
                          orderSubtotal={Number(o.subtotal ?? o.total ?? 0)}
                          orderTotal={Number(o.total ?? 0)}
                          orderDiscount={Number(o.discount_amount ?? 0)}
                          refunds={itemRefunds}
                          onCreated={() => {
                            qc.invalidateQueries({ queryKey: ["admin-refunds"] });
                            qc.invalidateQueries({ queryKey: ["admin-orders"] });
                          }}
                          onRemove={remove}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {visibleOrders.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">لا توجد نتائج</p>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border font-bold">كل التعويضات</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-start">التاريخ</th>
                <th className="p-3 text-start">الطلب</th>
                <th className="p-3 text-start">النوع</th>
                <th className="p-3 text-start">المبلغ</th>
                <th className="p-3 text-start">ملاحظات</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {refunds.data?.map((r) => {
                const order = orders.data?.find((o: any) => o.id === r.order_id) as any;
                const item = order?.order_items?.find((i: any) => i.id === r.order_item_id);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("ar-EG")}</td>
                    <td className="p-3">
                      {order ? (
                        <div>
                          <div className="font-bold">#{order.order_number}</div>
                          {item && <div className="text-xs text-muted-foreground">{item.product_name} · {item.plan_label}</div>}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-3">{typeLabel(r.type)}</td>
                    <td className="p-3 font-bold text-destructive">-{r.amount} EGP</td>
                    <td className="p-3 text-muted-foreground max-w-xs truncate">{r.notes}</td>
                    <td className="p-3">
                      <button onClick={() => remove(r.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(refunds.data ?? []).length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا يوجد تعويضات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ItemRefundBlock({
  orderId,
  userId,
  item,
  refunds,
  onCreated,
  onRemove,
}: {
  orderId: string;
  userId: string | null;
  item: any;
  refunds: Refund[];
  onCreated: () => void;
  onRemove: (id: string) => void;
}) {
  const { notify } = useApp();
  const maxAmount = Number(item.unit_price) * Number(item.quantity);
  const [type, setType] = useState<"full" | "partial" | "replacement">("partial");
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const submit = async () => {
    if (!userId) {
      notify("لا يمكن إضافة تعويض لطلب زائر بدون حساب", "error");
      return;
    }
    const finalAmount = type === "full" ? maxAmount : Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      notify("أدخل مبلغ صحيح", "error");
      return;
    }
    const { error } = await supabase.from("refunds").insert({
      user_id: userId,
      order_id: orderId,
      order_item_id: item.id,
      amount: finalAmount,
      type,
      notes: notes || null,
    });
    if (error) return notify(error.message, "error");
    notify("تم تسجيل التعويض", "success");
    setAmount(0);
    setNotes("");
    setType("partial");
    onCreated();
  };

  return (
    <div className="p-3 bg-card border border-border rounded-lg">
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-bold text-sm">{item.product_name}</div>
          <div className="text-xs text-muted-foreground">{item.plan_label} × {item.quantity} · {item.unit_price} EGP</div>
        </div>
        <div className="text-xs font-bold text-brand">إجمالي: {maxAmount} EGP</div>
      </div>

      {refunds.length > 0 && (
        <div className="mb-3 space-y-1">
          {refunds.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs p-2 bg-destructive/5 border border-destructive/20 rounded">
              <div>
                <span className="font-bold text-destructive">-{r.amount} EGP</span>
                <span className="text-muted-foreground mx-2">·</span>
                <span>{typeLabel(r.type)}</span>
                {r.notes && <span className="text-muted-foreground mx-2">· {r.notes}</span>}
              </div>
              <button onClick={() => onRemove(r.id)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-4 gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="px-2 py-2 bg-background border border-border rounded text-xs"
        >
          <option value="partial">ريفاند جزئي</option>
          <option value="full">ريفاند كامل</option>
          <option value="replacement">حساب بديل</option>
        </select>
        <input
          type="number"
          placeholder={type === "full" ? `${maxAmount} (كامل)` : "المبلغ"}
          value={type === "full" ? maxAmount : amount || ""}
          disabled={type === "full"}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="px-2 py-2 bg-background border border-border rounded text-xs disabled:opacity-60"
        />
        <input
          placeholder="ملاحظات (اختياري)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="px-2 py-2 bg-background border border-border rounded text-xs sm:col-span-1"
        />
        <button
          onClick={submit}
          className="px-3 py-2 bg-destructive text-white rounded font-bold text-xs flex items-center justify-center gap-1 hover:brand-glow"
        >
          <Undo2 className="size-3" /> إضافة تعويض
        </button>
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
