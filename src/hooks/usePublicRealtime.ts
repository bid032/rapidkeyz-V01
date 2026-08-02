import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Site-wide realtime for public surfaces (product pages, shop, home).
 * Listens for product/plan stock changes and invalidates any React Query
 * whose key mentions "product" so cards and the product page reflect
 * new stock counts instantly (and flip to "sold out" the moment a plan
 * hits zero).
 */
export function usePublicRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      // Any admin change (products, plans, settings, testimonials, categories,
      // FAQs) must show on the public site immediately, so invalidate everything.
      qc.invalidateQueries();
    };
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(flush, 200);
    };

    const channel = supabase.channel("public-realtime-stock");
    for (const table of [
      "product_plans",
      "products",
      "site_settings",
      "testimonial_images",
      "categories",
      "faqs",
      "product_reviews",
    ] as const) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        () => schedule(),
      );
    }
    channel.subscribe();


    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
