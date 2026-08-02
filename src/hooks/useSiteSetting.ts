import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads one row from `site_settings` by key.
 *
 * The query key intentionally starts with "site-settings" so the site-wide
 * realtime listener (`usePublicRealtime`) invalidates it the moment an admin
 * saves anything in the dashboard — every public surface stays in sync with
 * the dashboard without a page refresh.
 */
export function useSiteSetting<T = Record<string, any>>(key: string) {
  return useQuery({
    queryKey: ["site-settings", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return (data?.value ?? null) as T | null;
    },
    staleTime: 10_000,
  });
}

/** Convenience: the `brand` setting (name + tagline per language). */
export type BrandSetting = {
  name_ar?: string;
  name_en?: string;
  tagline_ar?: string;
  tagline_en?: string;
};

export function useBrandSetting() {
  return useSiteSetting<BrandSetting>("brand");
}
