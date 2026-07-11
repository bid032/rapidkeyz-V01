import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const STATUSES = ["pending", "paid", "processing", "delivered", "cancelled", "refunded"] as const;

function AdminOrders() {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, delivered_accounts(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const deliver = useMutation({
    mutationFn: async ({ orderItemId, creds }: { orderItemId: string; creds: any }) => {
      const { error } = await supabase.from("delivered_accounts").insert({
        order_item_id: orderItemId,
        ...creds,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">{t.admin.orders}</h1>
      <div className="space-y-3">
        {orders.data?.map((o: any) => (
          <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 flex flex-wrap justify-between items-center gap-3">
              <div>
                <div className="font-bold">#{o.order_number}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} · {o.customer_email}
                </div>
              </div>
              <div className="flex items-center gap-3">
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
              <div className="p-4 border-t border-border space-y-3">
                {o.order_items?.map((it: any) => (
                  <ItemRow key={it.id} item={it} onDeliver={(creds) => deliver.mutate({ orderItemId: it.id, creds })} />
                ))}
              </div>
            )}
          </div>
        ))}
        {orders.data?.length === 0 && <p className="text-muted-foreground text-center py-16">No orders yet</p>}
      </div>
    </div>
  );
}

function ItemRow({ item, onDeliver }: { item: any; onDeliver: (creds: any) => void }) {
  const [creds, setCreds] = useState({ account_email: "", account_username: "", account_password: "", extra_notes: "" });
  const delivered = item.delivered_accounts?.length > 0;

  return (
    <div className="p-4 bg-background border border-border rounded-xl">
      <div className="flex justify-between mb-2">
        <div className="text-sm">
          <span className="font-bold">{item.product_name}</span>{" "}
          <span className="text-muted-foreground">— {item.plan_label} × {item.quantity}</span>
          <span className={`ml-3 text-[10px] px-2 py-0.5 rounded ${item.delivery_type === "instant" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
            {item.delivery_type}
          </span>
        </div>
        <div className="text-sm font-bold">{item.unit_price} EGP</div>
      </div>

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
        <form onSubmit={(e) => { e.preventDefault(); onDeliver(creds); }} className="grid grid-cols-2 gap-2 mt-2">
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
          <button type="submit" className="col-span-2 px-3 py-2 bg-brand text-brand-foreground rounded font-bold text-sm">
            Deliver credentials
          </button>
        </form>
      )}
    </div>
  );
}
