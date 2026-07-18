import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { showError } from "@/lib/error-handler";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "moderator"]);
    if (!roles || roles.length === 0) throw redirect({ to: "/admin/products" });
  },
  component: AdminOrders,
});


const STATUSES = ["pending", "paid", "processing", "delivered", "cancelled", "refunded"] as const;

type Tab = "all" | "expiring";

function AdminOrders() {
  const { t, lang, confirm, notify } = useApp();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const revenue = useQuery({
    queryKey: ["admin-revenue-monthly"],
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_revenue_by_month");
      return (data ?? []) as Array<{ month: string; revenue: number; profit: number; orders_count: number }>;
    },
  });

  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, product_plans(duration_days), delivered_accounts(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const proofUrl = async (path: string) => {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  // Compute per-order min days-remaining (over delivered items with duration)
  const expiring = useMemo(() => {
    const now = Date.now();
    return (orders.data ?? []).map((o: any) => {
      let minDays = Infinity;
      for (const it of o.order_items ?? []) {
        const dur = Number(it.product_plans?.duration_days ?? 0);
        const dAcc = it.delivered_accounts?.[0];
        const startAt = dAcc ? new Date(dAcc.delivered_at).getTime() : new Date(o.created_at).getTime();
        if (dur > 0) {
          const endAt = startAt + dur * 86400_000;
          const days = Math.ceil((endAt - now) / 86400_000);
          if (days < minDays) minDays = days;
        }
      }
      return { order: o, minDays: minDays === Infinity ? null : minDays };
    });
  }, [orders.data]);

  const visible = useMemo(() => {
    let list = expiring;
    if (tab === "expiring") {
      list = list
        .filter((e) => e.minDays !== null && e.minDays <= 30 && e.minDays > -365)
        .sort((a, b) => (a.minDays ?? 0) - (b.minDays ?? 0));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(({ order: o }: any) =>
        String(o.order_number ?? "").toLowerCase().includes(q) ||
        String(o.customer_email ?? "").toLowerCase().includes(q) ||
        String(o.customer_phone ?? "").toLowerCase().includes(q) ||
        String(o.customer_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [expiring, tab, search]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      notify(lang === "ar" ? "تم تحديث الحالة" : "Status updated", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const deliver = useMutation({
    mutationFn: async ({ orderItemId, creds }: { orderItemId: string; creds: any }) => {
      const { error } = await supabase.from("delivered_accounts").insert({
        order_item_id: orderItemId,
        ...creds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      notify(lang === "ar" ? "تم التسليم" : "Delivered", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      notify(lang === "ar" ? "تم حذف الطلب" : "Order deleted", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl sm:text-3xl font-extrabold">{t.admin.orders}</h1>
        <div className="flex bg-muted rounded-lg p-1 w-full sm:w-auto overflow-x-auto">
          {([
            { k: "all", label: "كل الطلبات" },
            { k: "expiring", label: "خدمات شارفت على الانتهاء" },
          ] as const).map((x) => (
            <button
              key={x.k}
              onClick={() => setTab(x.k)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-md transition whitespace-nowrap ${
                tab === x.k ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "expiring" && (
        <p className="text-xs text-muted-foreground mb-4">
          كل خدمة فاضل عليها شهر أو أقل قبل الانتهاء. الحساب بيبدأ من تاريخ التسليم الفعلي، أو من تاريخ الطلب لو لسه ما اتسلمش.
        </p>
      )}
      <div className="space-y-3">
        {visible.map(({ order: o, minDays }) => (
          <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3">
              <div className="min-w-0">
                <div className="font-bold">#{o.order_number}</div>
                <div className="text-xs text-muted-foreground break-all">
                  {new Date(o.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} · {o.customer_email}
                </div>
                {minDays !== null && (
                  <div className={`text-xs font-bold mt-1 ${
                    minDays < 0 ? "text-destructive" : minDays <= 7 ? "text-destructive" : minDays <= 30 ? "text-warning" : "text-muted-foreground"
                  }`}>
                    {minDays < 0 ? ` انتهت من ${Math.abs(minDays)} يوم` : ` باقي ${minDays} يوم`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <select value={o.status}
                  onChange={(e) => updateStatus.mutate({ id: o.id, status: e.target.value })}
                  className="px-3 py-1.5 bg-background border border-border rounded text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="font-extrabold text-brand">{o.total} EGP</span>
                <button onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="text-brand text-sm hover:underline">
                  {expanded === o.id ? "Hide" : "Manage"}
                </button>
              </div>
            </div>
            {expanded === o.id && (
              <div className="p-4 border-t border-border space-y-4 bg-muted/30">
                {/* Order details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">البريد:</span> <span className="font-mono">{o.customer_email}</span></div>
                  <div>
                    <span className="text-muted-foreground">الهاتف:</span>{" "}
                    <span className="font-mono">{o.customer_phone || ","}</span>
                    {o.customer_phone && (
                      <a
                        href={`https://wa.me/${String(o.customer_phone).replace(/[^0-9]/g, "").replace(/^0/, "20")}`}
                        target="_blank" rel="noreferrer"
                        className="ml-2 text-xs px-2 py-0.5 bg-success/15 text-success rounded font-bold"
                      >واتساب</a>
                    )}
                  </div>
                  <div><span className="text-muted-foreground">طريقة الدفع:</span> <span className="font-bold">{o.payment_gateway}</span></div>
                  <div><span className="text-muted-foreground">رقم المُحوَّل منه:</span> <span className="font-mono">{o.payment_sender_phone || ","}</span></div>
                  {o.payment_reference && (
                    <div className="md:col-span-2"><span className="text-muted-foreground">مرجع الدفع:</span> <span className="font-mono">{o.payment_reference}</span></div>
                  )}
                  {o.notes && (
                    <div className="md:col-span-2"><span className="text-muted-foreground">ملاحظات:</span> {o.notes}</div>
                  )}
                  {o.payment_proof_url && (
                    <div className="md:col-span-2">
                      <button onClick={() => proofUrl(o.payment_proof_url)} className="text-sm px-3 py-1.5 bg-brand text-brand-foreground rounded font-bold">
                        عرض إثبات الدفع
                      </button>
                    </div>
                  )}
                </div>

                {/* Approve / Cancel */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => updateStatus.mutate({ id: o.id, status: "paid" })}
                    disabled={o.status === "paid" || o.status === "delivered"}
                    className="px-4 py-2 bg-success text-white rounded font-bold text-sm disabled:opacity-50"
                  >✓ تأكيد الدفع (Paid)</button>
                  <button
                    onClick={() => updateStatus.mutate({ id: o.id, status: "delivered" })}
                    disabled={o.status === "delivered"}
                    className="px-4 py-2 bg-brand text-brand-foreground rounded font-bold text-sm disabled:opacity-50"
                  >تم التسليم</button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({ title: "إلغاء الطلب", message: "متأكد إنك عاوز تلغي الطلب ده؟", tone: "danger", confirmLabel: "ألغِ الطلب" });
                      if (ok) updateStatus.mutate({ id: o.id, status: "cancelled" });
                    }}
                    disabled={o.status === "cancelled"}
                    className="px-4 py-2 bg-destructive text-white rounded font-bold text-sm disabled:opacity-50"
                  >✗ إلغاء</button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({ title: "حذف الطلب نهائيًا", message: "حذف الطلب نهائيًا؟ لا يمكن التراجع.", tone: "danger", confirmLabel: "احذف نهائيًا" });
                      if (ok) deleteOrder.mutate(o.id);
                    }}
                    className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded font-bold text-sm hover:bg-destructive hover:text-white transition"
                  >حذف نهائي</button>
                </div>

                {/* Items */}
                <div className="space-y-3 pt-2 border-t border-border">
                  {o.order_items?.map((it: any) => (
                    <ItemRow key={it.id} item={it} onDeliver={(creds) => deliver.mutate({ orderItemId: it.id, creds })} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-muted-foreground text-center py-16">
            {tab === "expiring" ? "مفيش خدمات قربت تنتهي" : "No orders yet"}
          </p>
        )}
      </div>
    </div>
  );
}


function ItemRow({ item, onDeliver }: { item: any; onDeliver: (creds: any) => void }) {
  const [creds, setCreds] = useState({ account_email: "", account_username: "", account_password: "", extra_notes: "" });
  const delivered = item.delivered_accounts?.length > 0;

  return (
    <div className="p-4 bg-background border border-border rounded-xl">
      <div className="flex justify-between mb-2 gap-2 flex-wrap">
        <div className="text-sm min-w-0">
          <span className="font-bold">{item.product_name}</span>{" "}
          <span className="text-muted-foreground">, {item.plan_label} × {item.quantity}</span>
          <span className={`ml-3 text-[10px] px-2 py-0.5 rounded ${item.delivery_type === "instant" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
            {item.delivery_type}
          </span>
        </div>
        <div className="text-sm font-bold shrink-0">{item.unit_price} EGP</div>
      </div>
      {item.subscription_email && (
        <div className="text-xs mb-2">
          <span className="text-muted-foreground">Activate on:</span>{" "}
          <span className="font-mono font-bold">{item.subscription_email}</span>
        </div>
      )}

      {delivered ? (
        <div className="mt-2 p-3 bg-success/5 border border-success/20 rounded font-mono text-xs">
          <div>✓ Delivered</div>
          {item.delivered_accounts.map((a: any) => (
            <div key={a.id} className="mt-1">
              {a.account_email && <div>Email: {a.account_email}</div>}
              {a.account_username && <div>User: {a.account_username}</div>}
              {a.account_password && <div>Pass: {a.account_password}</div>}
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); onDeliver(creds); }} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <input placeholder="Account email" value={creds.account_email}
            onChange={(e) => setCreds({ ...creds, account_email: e.target.value })}
            className="px-3 py-2 bg-card border border-border rounded text-sm" />
          <input placeholder="Username" value={creds.account_username}
            onChange={(e) => setCreds({ ...creds, account_username: e.target.value })}
            className="px-3 py-2 bg-card border border-border rounded text-sm" />
          <input placeholder="Password" value={creds.account_password}
            onChange={(e) => setCreds({ ...creds, account_password: e.target.value })}
            className="px-3 py-2 bg-card border border-border rounded text-sm" />
          <input placeholder="Notes" value={creds.extra_notes}
            onChange={(e) => setCreds({ ...creds, extra_notes: e.target.value })}
            className="px-3 py-2 bg-card border border-border rounded text-sm" />
          <button type="submit" className="sm:col-span-2 px-3 py-2 bg-brand text-brand-foreground rounded font-bold text-sm">
            Deliver credentials
          </button>
        </form>
      )}
    </div>
  );
}
