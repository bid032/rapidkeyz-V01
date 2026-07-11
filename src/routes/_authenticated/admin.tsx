import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useApp();
  const links: { to: string; label: string; exact?: boolean }[] = [
    { to: "/admin", label: t.admin.overview, exact: true },
    { to: "/admin/products", label: t.admin.products },
    { to: "/admin/categories", label: t.admin.categories },
    { to: "/admin/orders", label: t.admin.orders },
    { to: "/admin/users", label: t.admin.users },
    { to: "/admin/testimonials", label: t.admin.testimonials },
    { to: "/admin/settings", label: t.admin.settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-8 grid md:grid-cols-[220px_1fr] gap-8">
        <aside className="h-fit md:sticky md:top-24 bg-card border border-border rounded-2xl p-3">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">
            {t.admin.title}
          </div>
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to as string}
                activeOptions={{ exact: !!l.exact }}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted whitespace-nowrap transition"
                activeProps={{ className: "bg-brand/10 text-brand" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
