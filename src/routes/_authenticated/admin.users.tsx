import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { showError } from "@/lib/error-handler";

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
  const { t, lang, notify } = useApp();
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: list, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesErr) throw rolesErr;
      return (list ?? []).map((p: any) => ({
        ...p,
        user_roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => ({ role: r.role })),
      }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, add }: { userId: string; role: "admin" | "moderator"; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      notify(lang === "ar" ? "تم تحديث الصلاحيات" : "Roles updated", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-6">{t.admin.users}</h1>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-start">Name</th>
              <th className="p-3 text-start">Email</th>
              <th className="p-3 text-start">Roles</th>
              <th className="p-3 text-end">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.data?.map((u: any) => {
              const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
              const isModerator = u.user_roles?.some((r: any) => r.role === "moderator");
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.display_name ?? "—"}</td>
                  <td className="p-3" dir="ltr">{u.email ?? "—"}</td>
                  <td className="p-3">
                    {u.user_roles?.map((r: any) => (
                      <span key={r.role} className="text-xs px-2 py-0.5 bg-muted rounded mr-1">{r.role}</span>
                    ))}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end flex-wrap">
                      <button
                        onClick={() => toggleRole.mutate({ userId: u.id, role: "admin", add: !isAdmin })}
                        className={`text-xs px-3 py-1 rounded font-bold ${isAdmin ? "bg-destructive/10 text-destructive" : "bg-brand/10 text-brand"}`}
                      >
                        {isAdmin ? "Remove admin" : "Make admin"}
                      </button>
                      <button
                        onClick={() => toggleRole.mutate({ userId: u.id, role: "moderator", add: !isModerator })}
                        className={`text-xs px-3 py-1 rounded font-bold ${isModerator ? "bg-warning/10 text-warning" : "bg-muted text-foreground"}`}
                      >
                        {isModerator ? "Remove mod" : "Make mod"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {users.data?.map((u: any) => {
          const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
          const isModerator = u.user_roles?.some((r: any) => r.role === "moderator");
          return (
            <div key={u.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="min-w-0 mb-2">
                <div className="font-bold truncate">{u.display_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate" dir="ltr">{u.email ?? "—"}</div>
              </div>
              {u.user_roles?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {u.user_roles?.map((r: any) => (
                    <span key={r.role} className="text-[11px] px-2 py-0.5 bg-muted rounded">{r.role}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => toggleRole.mutate({ userId: u.id, role: "admin", add: !isAdmin })}
                  className={`flex-1 min-w-[120px] text-xs px-3 py-2 rounded font-bold ${isAdmin ? "bg-destructive/10 text-destructive" : "bg-brand/10 text-brand"}`}
                >
                  {isAdmin ? "Remove admin" : "Make admin"}
                </button>
                <button
                  onClick={() => toggleRole.mutate({ userId: u.id, role: "moderator", add: !isModerator })}
                  className={`flex-1 min-w-[120px] text-xs px-3 py-2 rounded font-bold ${isModerator ? "bg-warning/10 text-warning" : "bg-muted text-foreground"}`}
                >
                  {isModerator ? "Remove mod" : "Make mod"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

