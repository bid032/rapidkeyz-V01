import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { showError } from "@/lib/error-handler";
import { Search, Download, Users, Shield, ShieldCheck, User, Mail, Phone, MapPin, Calendar, X, Boxes, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { deleteUserAccount } from "@/lib/admin-users.functions";


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

type RoleFilter = "all" | "admin" | "moderator" | "user" | "stock";

function AdminUsers() {
  const { t, lang, notify, confirm } = useApp();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [stockUser, setStockUser] = useState<any | null>(null);
  const deleteUserFn = useServerFn(deleteUserAccount);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: list, error }, profilesRes, rolesRes] = await Promise.all([
        supabase.rpc("admin_list_users"),
        supabase.from("profiles").select("id, display_name, phone, country, preferred_language, created_at, stock_access"),
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
          stock_access: !!p.stock_access,
          has_stock_password: !!u.has_stock_password,
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

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await deleteUserFn({ data: { userId } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      notify(lang === "ar" ? "تم حذف المستخدم" : "User deleted", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const askDelete = async (u: any) => {
    const ok = await confirm({
      message:
        lang === "ar"
          ? `سيتم حذف حساب ${u.display_name || u.email} نهائياً مع كل بياناته. متأكد؟`
          : `Permanently delete ${u.display_name || u.email} and all their data. Continue?`,
      tone: "danger",
    });
    if (!ok) return;
    deleteUser.mutate(u.id);
  };

  const stats = useMemo(() => {
    const data = users.data ?? [];
    const admins = data.filter((u: any) => u.user_roles?.some((r: any) => r.role === "admin")).length;
    const mods = data.filter((u: any) => u.user_roles?.some((r: any) => r.role === "moderator")).length;
    const customers = data.filter((u: any) => {
      const roles = (u.user_roles ?? []).map((r: any) => r.role);
      return roles.includes("user") && !roles.includes("admin") && !roles.includes("moderator");
    }).length;
    const stock = data.filter((u: any) => u.stock_access).length;
    return { total: data.length, admins, mods, customers, stock };
  }, [users.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = users.data ?? [];
    if (roleFilter !== "all") {
      data = data.filter((u: any) => {
        if (roleFilter === "stock") return !!u.stock_access;
        const roles = (u.user_roles ?? []).map((r: any) => r.role);
        if (roleFilter === "user")
          return roles.includes("user") && !roles.includes("admin") && !roles.includes("moderator");
        return roles.includes(roleFilter);
      });
    }
    if (!q) return data;
    return data.filter((u: any) => {
      const roles = (u.user_roles ?? []).map((r: any) => r.role).join(" ");
      return [u.display_name, u.email, u.phone, u.country, u.preferred_language, roles, u.id]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q));
    });
  }, [users.data, search, roleFilter]);

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

  const initials = (name: string, email: string) => {
    const src = (name || email || "?").trim();
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  };

  const roleTabs: { key: RoleFilter; label: string; count: number }[] = [
    { key: "all", label: lang === "ar" ? "الكل" : "All", count: stats.total },
    { key: "admin", label: lang === "ar" ? "الأدمن" : "Admins", count: stats.admins },
    { key: "moderator", label: lang === "ar" ? "المشرفين" : "Mods", count: stats.mods },
    { key: "user", label: lang === "ar" ? "عملاء" : "Users", count: stats.customers },
    { key: "stock", label: lang === "ar" ? "الاستوك" : "Stock", count: stats.stock },
  ];

  const askToggleRole = async (u: any, role: "admin" | "moderator", add: boolean) => {
    const name = u.display_name || u.email;
    const messages = {
      ar: {
        admin: add ? `تفعيل صلاحية الأدمن للمستخدم ${name}؟` : `إلغاء صلاحية الأدمن عن ${name}؟`,
        moderator: add ? `تفعيل صلاحية المشرف للمستخدم ${name}؟` : `إلغاء صلاحية المشرف عن ${name}؟`,
      },
      en: {
        admin: add ? `Grant admin role to ${name}?` : `Remove admin role from ${name}?`,
        moderator: add ? `Grant moderator role to ${name}?` : `Remove moderator role from ${name}?`,
      },
    };
    const ok = await confirm({
      message: messages[lang === "ar" ? "ar" : "en"][role],
      tone: add ? "default" : "danger",
    });
    if (!ok) return;
    toggleRole.mutate({ userId: u.id, role, add });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">{t.admin.users}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {lang === "ar" ? "إدارة كل المستخدمين المسجّلين وصلاحياتهم" : "Manage every registered user and their roles"}
          </p>
        </div>
        <button
          onClick={exportXlsx}
          className="shrink-0 inline-flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-br from-brand to-brand/70 text-brand-foreground font-bold shadow-lg shadow-brand/20 hover:shadow-brand/40 hover:-translate-y-0.5 transition-all"
        >
          <Download className="w-4 h-4" />
          <span className="hidden xs:inline">{lang === "ar" ? "Excel" : "Excel"}</span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard icon={Users} label={lang === "ar" ? "إجمالي" : "Total"} value={stats.total} tone="brand" />
        <StatCard icon={ShieldCheck} label={lang === "ar" ? "أدمن" : "Admins"} value={stats.admins} tone="warning" />
        <StatCard icon={Shield} label={lang === "ar" ? "مشرفين" : "Mods"} value={stats.mods} tone="muted" />
      </div>

      {/* Search + Role tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full ps-10 pe-10 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 -translate-y-1/2 end-3 w-6 h-6 grid place-items-center rounded-full bg-muted hover:bg-muted/70"
              aria-label="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
          {roleTabs.map((tab) => {
            const active = roleFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={`shrink-0 inline-flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full font-bold transition-all ${
                  active
                    ? "bg-foreground text-background shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-background/20" : "bg-muted"}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground">
          {lang === "ar" ? `عرض ${filtered.length} من ${stats.total}` : `Showing ${filtered.length} of ${stats.total}`}
        </div>
      </div>

      {/* Loading */}
      {users.isLoading && (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!users.isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <div className="font-bold">{lang === "ar" ? "لا يوجد مستخدمين" : "No users match"}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {lang === "ar" ? "جرّب تغيير البحث أو الفلتر" : "Try adjusting search or filter"}
          </div>
        </div>
      )}

      {/* Desktop table */}
      {!users.isLoading && filtered.length > 0 && (
        <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-3.5 text-start font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === "ar" ? "المستخدم" : "User"}
                  </th>
                  <th className="p-3.5 text-start font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === "ar" ? "التواصل" : "Contact"}
                  </th>
                  <th className="p-3.5 text-start font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === "ar" ? "الدولة" : "Country"}
                  </th>
                  <th className="p-3.5 text-start font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === "ar" ? "الصلاحيات" : "Roles"}
                  </th>
                  <th className="p-3.5 text-start font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === "ar" ? "التسجيل" : "Joined"}
                  </th>
                  <th className="p-3.5 text-end font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    {lang === "ar" ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => {
                  const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
                  const isModerator = u.user_roles?.some((r: any) => r.role === "moderator");
                  return (
                    <tr key={u.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 w-10 h-10 rounded-full grid place-items-center bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20 text-brand font-bold text-sm">
                            {initials(u.display_name, u.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate">{u.display_name || "—"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate">
                              {u.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs" dir="ltr">
                            <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{u.email || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" dir="ltr">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span className="truncate">{u.phone || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1.5 text-xs">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {u.country || "—"}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {u.user_roles?.length > 0 ? (
                            u.user_roles.map((r: any) => (
                              <RoleBadge key={r.role} role={r.role} />
                            ))
                          ) : (
                            <RoleBadge role="user" />
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3.5">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => askToggleRole(u, "admin", !isAdmin)}
                            className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition ${
                              isAdmin
                                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                : "bg-warning/10 text-warning hover:bg-warning/20"
                            }`}
                          >
                            {isAdmin ? (lang === "ar" ? "إلغاء أدمن" : "Remove admin") : (lang === "ar" ? "أدمن" : "Make admin")}
                          </button>
                          <button
                            onClick={() => askToggleRole(u, "moderator", !isModerator)}
                            className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition ${
                              isModerator
                                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                : "bg-brand/10 text-brand hover:bg-brand/20"
                            }`}
                          >
                            {isModerator ? (lang === "ar" ? "إلغاء مشرف" : "Remove mod") : (lang === "ar" ? "مشرف" : "Make mod")}
                          </button>
                          <button
                            onClick={() => setStockUser(u)}
                            className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition inline-flex items-center gap-1 ${
                              u.stock_access
                                ? "bg-success/10 text-success hover:bg-success/20"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}
                            title={lang === "ar" ? "الاستوك" : "Stock"}
                          >
                            <Boxes className="w-3 h-3" />
                            {lang === "ar" ? "استوك" : "Stock"}
                          </button>
                          <button
                            onClick={() => askDelete(u)}
                            disabled={deleteUser.isPending}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition inline-flex items-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                            title={lang === "ar" ? "حذف المستخدم" : "Delete user"}
                          >
                            <Trash2 className="w-3 h-3" />
                            {lang === "ar" ? "حذف" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      {!users.isLoading && filtered.length > 0 && (
        <div className="md:hidden space-y-2.5">
          {filtered.map((u: any) => {
            const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
            const isModerator = u.user_roles?.some((r: any) => r.role === "moderator");
            return (
              <div key={u.id} className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20 text-brand font-bold text-sm">
                    {initials(u.display_name, u.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate leading-tight">{u.display_name || "—"}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {u.user_roles?.length > 0 ? (
                        u.user_roles.map((r: any) => <RoleBadge key={r.role} role={r.role} />)
                      ) : (
                        <RoleBadge role="user" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 gap-2 text-xs bg-muted/40 rounded-xl p-3">
                  <InfoRow icon={Mail} value={u.email} dir="ltr" />
                  <InfoRow icon={Phone} value={u.phone} dir="ltr" />
                  <div className="grid grid-cols-2 gap-2">
                    <InfoRow icon={MapPin} value={u.country} />
                    <InfoRow
                      icon={Calendar}
                      value={u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleRole.mutate({ userId: u.id, role: "admin", add: !isAdmin })}
                    className={`flex-1 text-xs px-3 py-2.5 rounded-xl font-bold transition ${
                      isAdmin
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {isAdmin ? (lang === "ar" ? "إلغاء أدمن" : "Remove admin") : (lang === "ar" ? "جعله أدمن" : "Make admin")}
                  </button>
                  <button
                    onClick={() => toggleRole.mutate({ userId: u.id, role: "moderator", add: !isModerator })}
                    className={`flex-1 text-xs px-3 py-2.5 rounded-xl font-bold transition ${
                      isModerator
                        ? "bg-destructive/10 text-destructive"
                        : "bg-brand/10 text-brand"
                    }`}
                  >
                    {isModerator ? (lang === "ar" ? "إلغاء مشرف" : "Remove mod") : (lang === "ar" ? "جعله مشرف" : "Make mod")}
                  </button>
                </div>
                <button
                  onClick={() => setStockUser(u)}
                  className={`w-full text-xs px-3 py-2.5 rounded-xl font-bold transition inline-flex items-center justify-center gap-1.5 ${
                    u.stock_access ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  {u.stock_access
                    ? (lang === "ar" ? "إدارة صلاحية الاستوك" : "Manage Stock Access")
                    : (lang === "ar" ? "منح صلاحية الاستوك" : "Grant Stock Access")}
                </button>
                <button
                  onClick={() => askDelete(u)}
                  disabled={deleteUser.isPending}
                  className="w-full text-xs px-3 py-2.5 rounded-xl font-bold transition inline-flex items-center justify-center gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {lang === "ar" ? "حذف المستخدم" : "Delete user"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {stockUser && (
        <StockAccessDialog
          user={stockUser}
          onClose={() => setStockUser(null)}
          onSaved={() => {
            setStockUser(null);
            qc.invalidateQueries({ queryKey: ["admin-users"] });
          }}
        />
      )}
    </div>
  );
}

function StockAccessDialog({
  user,
  onClose,
  onSaved,
}: {
  user: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang, notify } = useApp();
  const [access, setAccess] = useState<boolean>(!!user.stock_access);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("admin_set_stock_access", {
        _user_id: user.id,
        _access: access,
        _password: "",
      });
      if (error) throw error;
      notify(lang === "ar" ? "تم الحفظ" : "Saved", "success");
      onSaved();
    } catch (e: any) {
      notify(e?.message ?? "خطأ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 end-3 w-8 h-8 grid place-items-center rounded-full hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl grid place-items-center bg-brand/10 text-brand">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold">{lang === "ar" ? "صلاحية الاستوك" : "Stock Access"}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{user.display_name || user.email}</div>
          </div>
        </div>

        <label className="flex items-start gap-3 p-4 bg-background border border-border rounded-xl cursor-pointer mb-4">
          <input type="checkbox" checked={access} onChange={(e) => setAccess(e.target.checked)} className="mt-1" />
          <div>
            <div className="font-bold text-sm">{lang === "ar" ? "السماح بالدخول لصفحة الاستوك" : "Allow access to stock page"}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {lang === "ar"
                ? "المستخدم هيدخل على /stock بحسابه على الويب سايت مباشرة، بدون اسم مستخدم أو كلمة سر إضافية."
                : "The user signs into /stock with their website account — no extra username or password needed."}
            </div>
          </div>
        </label>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow disabled:opacity-60"
          >
            {loading ? "..." : (lang === "ar" ? "حفظ" : "Save")}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-muted rounded-xl font-bold text-sm">
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}



function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "brand" | "warning" | "muted";
}) {
  const tones = {
    brand: "from-brand/20 to-brand/5 border-brand/20 text-brand",
    warning: "from-warning/20 to-warning/5 border-warning/20 text-warning",
    muted: "from-muted to-muted/40 border-border text-foreground",
  } as const;
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3 sm:p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-1">
        <Icon className="w-4 h-4 opacity-80" />
      </div>
      <div className="text-xl sm:text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] sm:text-xs opacity-80 font-medium">{label}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-warning/15 text-warning border-warning/30",
    moderator: "bg-brand/15 text-brand border-brand/30",
    user: "bg-muted text-muted-foreground border-border",
  };
  const icon: Record<string, any> = { admin: ShieldCheck, moderator: Shield, user: User };
  const Icon = icon[role] ?? User;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border font-bold uppercase tracking-wide ${styles[role] ?? styles.user}`}>
      <Icon className="w-2.5 h-2.5" />
      {role}
    </span>
  );
}

function InfoRow({ icon: Icon, value, dir }: { icon: any; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-center gap-2 min-w-0" dir={dir}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{value || "—"}</span>
    </div>
  );
}
