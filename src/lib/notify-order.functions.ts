import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  orderId: z.string().uuid(),
});

// Anti-abuse: only allow notify calls for orders created in the last 30 minutes.
// This keeps the guest-checkout flow working while preventing an attacker who
// guesses old order UUIDs from spamming emails.
const NOTIFY_MAX_AGE_MS = 30 * 60 * 1000;

// Returns the email of every user who has the 'admin' role in user_roles.
// Falls back to ADMIN_NOTIFY_EMAIL / site_settings / a hardcoded address
// only if no admin rows can be resolved (e.g. lookup failure), so order
// notifications never silently go nowhere.
async function getAdminEmails(supabaseAdmin: any): Promise<string[]> {
  try {
    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (rolesErr) throw rolesErr;

    const adminIds = new Set((roles ?? []).map((r: any) => r.user_id));
    if (adminIds.size === 0) throw new Error("no admin role rows found");

    // listUsers() returns all auth users in one call; filter to admins locally
    // (avoids N separate getUserById round-trips).
    const { data: usersPage, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (usersErr) throw usersErr;

    const emails = (usersPage?.users ?? [])
      .filter((u: any) => adminIds.has(u.id) && typeof u.email === "string" && u.email.includes("@"))
      .map((u: any) => u.email as string);

    const unique = Array.from(new Set(emails));
    if (unique.length > 0) return unique;
    throw new Error("no admin emails resolved from auth users");
  } catch (err) {
    console.error("[notify-order] falling back to single admin email:", err);
    return [await getFallbackAdminEmail(supabaseAdmin)];
  }
}

async function getFallbackAdminEmail(supabaseAdmin: any): Promise<string> {
  const envEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (envEmail && envEmail.includes("@")) return envEmail;
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "admin_notify_email")
    .maybeSingle();
  const v = data?.value;
  if (typeof v === "string" && v.includes("@")) return v;
  return "bidotito1@gmail.com";
}

// Atomically claims the right to send a given (order, kind) notification exactly once.
// Backed by notification_locks' primary key: the first caller's insert succeeds and
// gets `true`; any later caller for the same order+kind hits a unique-violation and
// gets `false`, so duplicate/parallel send attempts (e.g. the guest-checkout "Direct"
// fallback firing after the primary call already succeeded) become no-ops instead of
// duplicate emails. Intentionally NOT used for the admin "resend" action, which must
// always be allowed to re-send on purpose.
async function claimNotification(supabaseAdmin: any, orderId: string, kind: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("notification_locks").insert({ order_id: orderId, kind });
  if (!error) return true;
  if ((error as any).code === "23505") {
    console.log(`[notify-order] skipping duplicate '${kind}' notification for order ${orderId}`);
    return false;
  }
  // Unexpected DB error: fail open (still send) so a lock-table hiccup never
  // silently swallows a real notification, but log it loudly.
  console.error("[notify-order] claimNotification error, sending anyway:", error);
  return true;
}

// Sends the 'new-order' template to every current admin. Uses Promise.allSettled
// so one bad/unreachable admin mailbox doesn't stop the others from being notified.
async function sendNewOrderEmailToAdmins(
  supabaseAdmin: any,
  sendTemplateEmail: (typeof import("./email-templates/send-email"))["sendTemplateEmail"],
  order: any,
  origin: string,
  proofUrl: string | null,
) {
  const claimed = await claimNotification(supabaseAdmin, order.id, "new-order");
  if (!claimed) return;

  const adminEmails = await getAdminEmails(supabaseAdmin);

  const templateData = {
    orderNumber: order.order_number,
    subtotal: (order as any).subtotal,
    discountAmount: Number((order as any).discount_amount ?? 0),
    couponCode: (order as any).coupons?.code ?? null,
    couponDiscountType: (order as any).coupons?.discount_type ?? null,
    couponDiscountValue: (order as any).coupons?.discount_value ?? null,
    total: order.total,
    currency: order.currency || "EGP",
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    paymentGateway: order.payment_gateway,
    paymentSenderPhone: (order as any).payment_sender_phone,
    paymentProofUrl: proofUrl,
    items: (order.order_items ?? []).map((it: any) => ({
      product_name: it.product_name,
      plan_label: it.plan_label,
      quantity: it.quantity,
      unit_price: Number(it.frozen_unit_price ?? it.unit_price),
      delivery_type: it.delivery_type,
      subscription_email: it.subscription_email,
    })),
    adminUrl: `${origin}/admin/orders`,
  };

  const results = await Promise.allSettled(
    adminEmails.map((adminEmail) =>
      sendTemplateEmail("new-order", adminEmail, {
        idempotencyKey: `new-order-${order.id}-${adminEmail}`,
        templateData,
      }),
    ),
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[notify-order] failed to notify admin ${adminEmails[i]}:`, r.reason);
    }
  });
}

export const notifyNewOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, coupons(code, discount_type, discount_value), order_items(*)")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error(error?.message || "Order not found");

    // Recency guard — reject old order IDs.
    const createdAt = order.created_at ? new Date(order.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > NOTIFY_MAX_AGE_MS) {
      return { ok: false, reason: "stale_order" };
    }

    const origin = process.env.SITE_URL || "https://rapidkeyz.com";
    let proofUrl: string | null = null;
    if ((order as any).payment_proof_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("payment-proofs")
        .createSignedUrl((order as any).payment_proof_url, 60 * 60 * 24 * 7);
      proofUrl = signed?.signedUrl ?? null;
    }

    await sendNewOrderEmailToAdmins(supabaseAdmin, sendTemplateEmail, order, origin, proofUrl);

    return { ok: true };
  });

export const notifyCustomerDelivery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, total, subtotal, discount_amount, currency, customer_email, created_at, coupons(code), order_items(product_name, plan_label, delivered_accounts(account_email, account_username, account_password, extra_notes))",
      )
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error(error?.message || "Order not found");
    if (!order.customer_email) return { ok: false, reason: "no_email" };

    // Recency guard — delivery notify should only fire right after checkout.
    const createdAt = order.created_at ? new Date(order.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > NOTIFY_MAX_AGE_MS) {
      return { ok: false, reason: "stale_order" };
    }

    const accounts: any[] = [];
    for (const it of (order.order_items ?? []) as any[]) {
      for (const acc of it.delivered_accounts ?? []) {
        accounts.push({
          product_name: it.product_name,
          plan_label: it.plan_label,
          account_email: acc.account_email,
          account_username: acc.account_username,
          account_password: acc.account_password,
          extra_notes: acc.extra_notes,
        });
      }
    }
    if (accounts.length === 0) return { ok: false, reason: "no_delivered_accounts" };

    const claimed = await claimNotification(supabaseAdmin, order.id, "delivery");
    if (!claimed) return { ok: true, count: accounts.length, skipped: true };

    const lang = await resolveCustomerLang(supabaseAdmin, order.customer_email);

    await sendTemplateEmail("order-delivered", order.customer_email, {
      idempotencyKey: `order-delivered-${order.id}`,
      templateData: {
        orderNumber: order.order_number,
        total: order.total,
        subtotal: (order as any).subtotal,
        discountAmount: Number((order as any).discount_amount ?? 0),
        couponCode: (order as any).coupons?.code ?? null,
        currency: order.currency || "EGP",
        accounts,
        lang,
      },
    });
    return { ok: true, count: accounts.length };
  });

const itemInput = z.object({ orderItemId: z.string().uuid() });

// Admin-triggered: email the customer credentials for ONE specific order item.
// No recency guard — admin can deliver at any time after purchase.
export const notifyItemDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => itemInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) {
      const { data: isMod } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "moderator",
      });
      if (!isMod) throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");

    const { data: item, error } = await supabaseAdmin
      .from("order_items")
      .select(
        "id, product_name, plan_label, delivered_accounts(account_email, account_username, account_password, extra_notes), orders(id, order_number, total, subtotal, discount_amount, currency, customer_email, coupons(code))",
      )
      .eq("id", data.orderItemId)
      .single();
    if (error || !item) throw new Error(error?.message || "Order item not found");

    const order: any = (item as any).orders;
    if (!order?.customer_email) return { ok: false, reason: "no_email" };
    const accs = (item as any).delivered_accounts ?? [];
    if (accs.length === 0) return { ok: false, reason: "no_delivered_accounts" };

    const accounts = accs.map((acc: any) => ({
      product_name: (item as any).product_name,
      plan_label: (item as any).plan_label,
      account_email: acc.account_email,
      account_username: acc.account_username,
      account_password: acc.account_password,
      extra_notes: acc.extra_notes,
    }));

    const lang = await resolveCustomerLang(supabaseAdmin, order.customer_email);

    await sendTemplateEmail("order-delivered", order.customer_email, {
      idempotencyKey: `item-delivered-${data.orderItemId}`,
      templateData: {
        orderNumber: order.order_number,
        total: order.total,
        subtotal: order.subtotal,
        discountAmount: Number(order.discount_amount ?? 0),
        couponCode: order.coupons?.code ?? null,
        currency: order.currency || "EGP",
        accounts,
        lang,
      },
    });
    return { ok: true };
  });

// Look up customer's preferred language from their profile (by email).
// Defaults to Arabic when no matching profile or preference is stored.
async function resolveCustomerLang(supabaseAdmin: any, email: string): Promise<"ar" | "en"> {
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.listUsers();
    const match = authUser?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!match) return "ar";
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("preferred_language")
      .eq("id", match.id)
      .maybeSingle();
    const raw = profile?.preferred_language;
    if (typeof raw === "string" && raw.toLowerCase().startsWith("en")) return "en";
    return "ar";
  } catch {
    return "ar";
  }
}

// Direct notification functions without recency guard for guest users
// These functions are used when the standard notification functions fail
// due to recency checks for guest users

export const notifyNewOrderDirect = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, coupons(code, discount_type, discount_value), order_items(*)")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error(error?.message || "Order not found");

    const origin = process.env.SITE_URL || "https://rapidkeyz.com";
    let proofUrl: string | null = null;
    if ((order as any).payment_proof_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("payment-proofs")
        .createSignedUrl((order as any).payment_proof_url, 60 * 60 * 24 * 7);
      proofUrl = signed?.signedUrl ?? null;
    }

    await sendNewOrderEmailToAdmins(supabaseAdmin, sendTemplateEmail, order, origin, proofUrl);

    return { ok: true };
  });

export const notifyCustomerDeliveryDirect = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, total, subtotal, discount_amount, currency, customer_email, coupons(code), order_items(product_name, plan_label, delivered_accounts(account_email, account_username, account_password, extra_notes))",
      )
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error(error?.message || "Order not found");
    if (!order.customer_email) return { ok: false, reason: "no_email" };

    const accounts: any[] = [];
    for (const it of (order.order_items ?? []) as any[]) {
      for (const acc of it.delivered_accounts ?? []) {
        accounts.push({
          product_name: it.product_name,
          plan_label: it.plan_label,
          account_email: acc.account_email,
          account_username: acc.account_username,
          account_password: acc.account_password,
          extra_notes: acc.extra_notes,
        });
      }
    }
    if (accounts.length === 0) return { ok: false, reason: "no_delivered_accounts" };

    const claimed = await claimNotification(supabaseAdmin, order.id, "delivery");
    if (!claimed) return { ok: true, count: accounts.length, skipped: true };

    const lang = await resolveCustomerLang(supabaseAdmin, order.customer_email);

    await sendTemplateEmail("order-delivered", order.customer_email, {
      idempotencyKey: `order-delivered-${order.id}`,
      templateData: {
        orderNumber: order.order_number,
        total: order.total,
        subtotal: (order as any).subtotal,
        discountAmount: Number((order as any).discount_amount ?? 0),
        couponCode: (order as any).coupons?.code ?? null,
        currency: order.currency || "EGP",
        accounts,
        lang,
      },
    });
    return { ok: true, count: accounts.length };
  });
