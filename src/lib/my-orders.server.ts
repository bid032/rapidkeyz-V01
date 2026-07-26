// Server-only: loads the signed-in customer's orders, including orders placed
// as a guest with the same email address (those rows have user_id = NULL and
// are therefore invisible to the browser client under RLS).

export async function loadMyOrders(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = (userRes?.user?.email ?? "").trim().toLowerCase();

  const select =
    "*, coupons(code, discount_type, discount_value), order_items(*, delivered_accounts(*))";

  const [own, byEmail] = await Promise.all([
    supabaseAdmin.from("orders").select(select).eq("user_id", userId),
    email
      ? supabaseAdmin.from("orders").select(select).is("user_id", null).ilike("customer_email", email)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (own.error) throw new Error(own.error.message);
  if (byEmail.error) throw new Error(byEmail.error.message);

  const merged = new Map<string, any>();
  for (const o of [...(own.data ?? []), ...(byEmail.data ?? [])]) merged.set(o.id, o);

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
