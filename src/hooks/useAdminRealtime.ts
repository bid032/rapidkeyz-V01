import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global realtime subscription for admin dashboard.
 * Listens to every table used across admin pages and invalidates React Query
 * caches so any change (from any admin, staff, or customer action) reflects
 * instantly without a manual refresh.
 */
const TABLES = [
  "orders",
  "order_items",
  "products",
  "product_plans",
  "plan_costs",
  "categories",
  "coupons",
  "coupon_redemptions",
  "refunds",
  "faqs",
  "testimonial_images",
  "product_reviews",
  "user_roles",
  "profiles",
  "site_settings",
  "account_inventory",
  "delivered_accounts",
  "audit_log",
] as const;

export function useAdminRealtime(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    // Debounce invalidations so a burst of changes triggers only one refetch
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pending = new Set<string>();

    const flush = () => {
      timer = null;
      const changed = Array.from(pending);
      pending.clear();

      // Broad invalidation: cheaper than tracking every queryKey shape.
      // Any query whose key mentions the table name gets refetched.
      qc.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          if (!Array.isArray(key)) return false;
          const flat = key
            .map((k) => (typeof k === "string" ? k : JSON.stringify(k)))
            .join("|")
            .toLowerCase();
          return changed.some((t) => flat.includes(t));
        },
      });
    };

    const schedule = (table: string) => {
      pending.add(table);
      // also invalidate common admin aggregate keys keyed by prefix
      pending.add("admin");
      if (timer) return;
      timer = setTimeout(flush, 250);
    };

    const channel = supabase.channel("admin-realtime-global");

    for (const table of TABLES) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        () => schedule(table),
      );
    }

    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
