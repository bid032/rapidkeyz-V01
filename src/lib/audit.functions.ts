import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditRowEnriched = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_display: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  meta: any;
  created_at: string;
  // enrichments
  order_number: string | null;
  order_status: string | null;
  order_total: number | null;
  order_customer_name: string | null;
  order_customer_email: string | null;
  order_customer_phone: string | null;
  items: Array<{
    id: string;
    product_name: string | null;
    plan_label: string | null;
    account_type: string | null;
    unit_price: number | null;
    status: string | null;
    quantity: number | null;
    delivered_accounts: Array<{
      account_email: string | null;
      account_username: string | null;
      account_password: string | null;
      extra_notes: string | null;
    }>;
  }>;
};


async function requireAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<AuditRowEnriched[]> => {
    await requireAdmin(context);
    const limit = Math.min(Math.max(data.limit ?? 1000, 1), 2000);

    const { data: rows, error } = await context.supabase
      .from("audit_log")
      .select("id, actor_id, actor_name, action_type, target_type, target_id, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const auditRows = rows ?? [];
    if (auditRows.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Actor emails via Admin API (unique actors only)
    const actorIds = Array.from(
      new Set(auditRows.map((r: any) => r.actor_id).filter(Boolean)),
    ) as string[];
    const actorMap = new Map<string, { email: string | null; name: string | null }>();
    await Promise.all(
      actorIds.map(async (uid) => {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
          const u = data?.user;
          if (u) {
            const meta = (u.user_metadata ?? {}) as any;
            actorMap.set(uid, {
              email: u.email ?? null,
              name: meta.display_name ?? meta.full_name ?? meta.name ?? null,
            });
          }
        } catch {
          /* ignore */
        }
      }),
    );

    // Also try profiles.display_name to enrich when metadata is empty
    if (actorIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds);
      (profs ?? []).forEach((p: any) => {
        const prev = actorMap.get(p.id) ?? { email: null, name: null };
        if (!prev.name && p.display_name) prev.name = p.display_name;
        actorMap.set(p.id, prev);
      });
    }

    // 2) Collect order + order_item ids from meta / target
    const orderIds = new Set<string>();
    const orderItemIds = new Set<string>();
    for (const r of auditRows) {
      const meta = (r.meta ?? {}) as any;
      if (r.target_type === "order" && r.target_id) orderIds.add(r.target_id);
      if (r.target_type === "order_item" && r.target_id) orderItemIds.add(r.target_id);
      if (meta.order_id) orderIds.add(String(meta.order_id));
      if (meta.order_item_id) orderItemIds.add(String(meta.order_item_id));
    }

    // Load order_items first so we can attach any missing order_ids
    const itemsByOrder = new Map<string, any[]>();
    const itemById = new Map<string, any>();
    if (orderItemIds.size) {
      const { data: itemsFromIds } = await supabaseAdmin
        .from("order_items")
        .select("id, order_id, product_name, plan_label, account_type, unit_price, status, quantity, delivered_accounts(account_email, account_username, account_password, extra_notes)")
        .in("id", Array.from(orderItemIds));
      (itemsFromIds ?? []).forEach((it: any) => {
        itemById.set(it.id, it);
        if (it.order_id) orderIds.add(it.order_id);
      });
    }

    let ordersMap = new Map<string, any>();
    if (orderIds.size) {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, status, total, customer_name, customer_email, customer_phone")
        .in("id", Array.from(orderIds));
      (orders ?? []).forEach((o: any) => ordersMap.set(o.id, o));

      const { data: allItems } = await supabaseAdmin
        .from("order_items")
        .select("id, order_id, product_name, plan_label, account_type, unit_price, status, quantity, delivered_accounts(account_email, account_username, account_password, extra_notes)")
        .in("order_id", Array.from(orderIds));
      (allItems ?? []).forEach((it: any) => {
        itemById.set(it.id, it);
        const arr = itemsByOrder.get(it.order_id) ?? [];
        arr.push(it);
        itemsByOrder.set(it.order_id, arr);
      });
    }


    return auditRows.map((r: any): AuditRowEnriched => {
      const meta = (r.meta ?? {}) as any;
      const actorInfo = r.actor_id ? actorMap.get(r.actor_id) : null;
      const actor_email = actorInfo?.email ?? null;
      const actor_name = r.actor_name || actorInfo?.name || null;
      const actor_display = actor_name || actor_email || "—";

      // Resolve related order
      let orderId: string | null = null;
      if (r.target_type === "order" && r.target_id) orderId = r.target_id;
      else if (meta.order_id) orderId = String(meta.order_id);
      else if (r.target_type === "order_item" && r.target_id) {
        orderId = itemById.get(r.target_id)?.order_id ?? null;
      }

      const order = orderId ? ordersMap.get(orderId) : null;

      // Items to show:
      let items: any[] = [];
      if (r.target_type === "order_item" && r.target_id && itemById.has(r.target_id)) {
        items = [itemById.get(r.target_id)];
      } else if (orderId && itemsByOrder.has(orderId)) {
        items = itemsByOrder.get(orderId) ?? [];
      }

      return {
        id: r.id,
        actor_id: r.actor_id,
        actor_name,
        actor_email,
        actor_display,
        action_type: r.action_type,
        target_type: r.target_type,
        target_id: r.target_id,
        meta,
        created_at: r.created_at,
        order_number: order?.order_number ?? meta.order_number ?? null,
        order_status: order?.status ?? null,
        order_total: order?.total ?? null,
        order_customer_name: order?.customer_name ?? null,
        order_customer_email: order?.customer_email ?? null,
        order_customer_phone: order?.customer_phone ?? null,
        items: items.map((it) => ({
          id: it.id,
          product_name: it.product_name ?? null,
          plan_label: it.plan_label ?? null,
          account_type: it.account_type ?? null,
          unit_price: it.unit_price ?? null,
          status: it.status ?? null,
          quantity: it.quantity ?? null,
          delivered_accounts: (it.delivered_accounts ?? []).map((a: any) => ({
            account_email: a.account_email ?? null,
            account_username: a.account_username ?? null,
            account_password: a.account_password ?? null,
            extra_notes: a.extra_notes ?? null,
          })),
        })),

      };
    });
  });
