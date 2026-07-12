import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw redirect({ to: "/admin/products" });
  },
  component: AdminUsers,
});


function AdminUsers() {
  const { t } = useApp();
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      } else {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-6">{t.admin.users}</h1>
      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-muted">
            <tr><th className="p-3 text-start">Name</th><th className="p-3 text-start">Phone</th><th className="p-3 text-start">Roles</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {users.data?.map((u: any) => {
              const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.display_name ?? "—"}</td>
                  <td className="p-3">{u.phone ?? "—"}</td>
                  <td className="p-3">
                    {u.user_roles?.map((r: any) => (
                      <span key={r.role} className="text-xs px-2 py-0.5 bg-muted rounded mr-1">{r.role}</span>
                    ))}
                  </td>
                  <td className="p-3 text-end">
                    <button onClick={() => toggleAdmin.mutate({ userId: u.id, makeAdmin: !isAdmin })}
                      className={`text-xs px-3 py-1 rounded font-bold ${isAdmin ? "bg-destructive/10 text-destructive" : "bg-brand/10 text-brand"}`}>
                      {isAdmin ? "Remove admin" : "Make admin"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
