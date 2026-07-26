// Server-only delivery logic. Runs with the service-role client so delivery
// never fails because of table-level GRANTs / RLS on the browser client
// (delivered_accounts had no INSERT grant and order_items had no UPDATE grant
// for `authenticated`, which silently broke both delivery paths).

export interface DeliverCreds {
  account_email?: string | null;
  account_username?: string | null;
  account_password?: string | null;
  extra_notes?: string | null;
}

export async function assertStaff(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return;
  const { data: isMod } = await supabase.rpc("has_role", { _user_id: userId, _role: "moderator" });
  if (!isMod) throw new Error("Forbidden");
}

async function assertNotDelivered(supabaseAdmin: any, orderItemId: string) {
  const { data: item, error } = await supabaseAdmin
    .from("order_items")
    .select("status")
    .eq("id", orderItemId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (item?.status === "delivered") throw new Error("ALREADY_DELIVERED");
}

async function markItemDelivered(supabaseAdmin: any, orderItemId: string) {
  const { error } = await supabaseAdmin
    .from("order_items")
    .update({ status: "delivered" })
    .eq("id", orderItemId);
  if (error) throw new Error(error.message);
}

/** Emails the customer the credentials for one item. Never throws. */
async function emailCustomer(orderItemId: string): Promise<{ emailSent: boolean; emailError?: string }> {
  try {
    const { sendItemDeliveredEmail } = await import("./notify-order.server");
    const res = await sendItemDeliveredEmail(orderItemId);
    return { emailSent: res.ok === true, emailError: res.ok ? undefined : res.reason };
  } catch (e: any) {
    console.error("[deliver-order] delivery email failed", e);
    return { emailSent: false, emailError: e?.message || "email_failed" };
  }
}

export async function deliverManual(userId: string, supabase: any, orderItemId: string, creds: DeliverCreds) {
  await assertStaff(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await assertNotDelivered(supabaseAdmin, orderItemId);

  const { error } = await supabaseAdmin.from("delivered_accounts").insert({
    order_item_id: orderItemId,
    account_email: creds.account_email || null,
    account_username: creds.account_username || null,
    account_password: creds.account_password || null,
    extra_notes: creds.extra_notes || null,
    delivered_by: userId,
  });
  if (error) throw new Error(error.message);

  await markItemDelivered(supabaseAdmin, orderItemId);
  return { ok: true as const, ...(await emailCustomer(orderItemId)) };
}

export async function deliverFromStock(userId: string, supabase: any, orderItemId: string, planId: string) {
  await assertStaff(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await assertNotDelivered(supabaseAdmin, orderItemId);

  const { data: claimedId, error } = await supabaseAdmin.rpc("claim_inventory_for_item", {
    _order_item_id: orderItemId,
    _plan_id: planId,
  });
  if (error) throw new Error(error.message);
  if (!claimedId) throw new Error("NO_INVENTORY");

  await markItemDelivered(supabaseAdmin, orderItemId);

  return { ok: true as const, inventoryId: claimedId as string, ...(await emailCustomer(orderItemId)) };
}
