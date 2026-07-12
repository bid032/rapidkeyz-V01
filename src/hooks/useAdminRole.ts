import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminRole = "admin" | "moderator";

export function useAdminRole() {
  const q = useQuery({
    queryKey: ["current-user-admin-roles"],
    queryFn: async (): Promise<AdminRole[]> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .in("role", ["admin", "moderator"]);
      return (data ?? []).map((r: any) => r.role as AdminRole);
    },
    staleTime: 60_000,
  });

  const roles = q.data ?? [];
  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  return {
    isAdmin,
    isModerator,
    // admins can do everything a moderator can
    canModerate: isAdmin || isModerator,
    isLoading: q.isLoading,
  };
}
