import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { showError } from "@/lib/error-handler";
import { Search, Download } from "lucide-react";

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
  const [search, setSearch] = useState("");

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: list, error }, profilesRes, rolesRes] = await Promise.all([
        supabase.rpc("admin_list_users"),
        supabase.from("profiles").select("id, display_name, phone, country, preferred_language, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      return (list ?? []).map((u: any) => {
        const p: any = profileMap.get(u.id) ?? {};
        return {
          id: u.id,
          display_name: u.display_name ?? p.display_name ?? "",
          email: u.email ?? "",
          phone: p.phone ?? "",
          country: p.country ?? "",
          preferred_language: p.preferred_language ?? "",
          created_at: u.created_at ?? p.created_at ?? null,
          user_roles: (rolesRes.data ?? [])
            .filter((r: any) => r.user_id === u.id)
            .map((r: any) => ({ role: r.role })),
        };
      });
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users.data ?? [];
    return (users.data ?? []).filter((u: any) => {
      const roles = (u.user_roles ?? []).map((r: any) => r.role).join(" ");
      return [u.display_name, u.email, u.phone, u.country, u.preferred_language, roles, u.id]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q));
    });
  }, [users.data, search]);

  const exportXlsx = () => {
    const rows = (filtered ?? []).map((u: any) => ({
      ID: u.id,
      Name: u.display_name,
      Email: u.email,
      Phone: u.phone,
      Country: u.country,
      Language: u.preferred_language,
      Roles: (u.user_roles ?? []).map((r: any) => r.role).join(", "),
      "Created At": u.created_at ? new Date(u.created_at).toISOString() : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, `users-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const placeholder = lang === "ar" ? "ابحث بالاسم، الإيميل، الرقم، الدولة..." : "Search name, email, phone, country...";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold">{t.admin.users}</h1>
        <button
          onClick={exportXlsx}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-brand text-brand-foreground font-bold hover:opacity-90"
        >
          <Download className="w-4 h-4" />
          {lang === "ar" ? "تحميل Excel" : "Export Excel"}
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full ps-9 pe-3 py-2 rounded-xl bg-card border border-border text-sm"
        />
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        {lang === "ar" ? `${filtered.length} مستخدم` : `${filtered.length} users`}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-start">{lang === "ar" ? "الاسم" : "Name"}</th>
              <th className="p-3 text-start">{lang === "ar" ? "الإيميل" : "Email"}</th>
              <th className="p-3 text-start">{lang === "ar" ? "الواتساب" : "Phone"}</th>
              <th className="p-3 text-start">{lang === "ar" ? "الدولة" : "Country"}</th>
              <th className="p-3 text-start">{lang === "ar" ? "التسجيل" : "Joined"}</th>
              <th className="p-3 text-start">{lang === "ar" ? "الصلاحيات" : "Roles"}</th>
              <th className="p-3 text-end">{lang === "ar" ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => {
              const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
              const isModerator = u.user_roles?.some((r: any) => r.role === "moderator");
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.display_name || "—"}</td>
                  <td className="p-3" dir="ltr">{u.email || "—"}</td>
                  <td className="p-3" dir="ltr">{u.phone || "—"}</td>
                  <td className="p-3">{u.country || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    {u.user_roles?.map((r: any) => (
                      <span key={r.role} className="text-xs px-2 py-0.5 bg-muted rounded me-1">{r.role}</span>
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
        {filtered.map((u: any) => {
          const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
          const isModerator = u.user_roles?.some((r: any) => r.role === "moderator");
          return (
            <div key={u.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="min-w-0 mb-2">
                <div className="font-bold truncate">{u.display_name || "—"}</div>
                <div className="text-xs text-muted-foreground truncate" dir="ltr">{u.email || "—"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <div className="text-muted-foreground">{lang === "ar" ? "واتساب" : "Phone"}</div>
                  <div dir="ltr">{u.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{lang === "ar" ? "الدولة" : "Country"}</div>
                  <div>{u.country || "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">{lang === "ar" ? "تاريخ التسجيل" : "Joined"}</div>
                  <div>{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</div>
                </div>
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
