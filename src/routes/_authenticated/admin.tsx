import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useApp } from "@/contexts/AppContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    // Reuse the user already fetched by the _authenticated layout gate.
    const user = (context as { user?: { id: string } } | undefined)?.user;
    if (!user) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw redirect({ to: "/auth" });
    }
    const uid = user?.id ?? (await supabase.auth.getUser()).data.user!.id;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .in("role", ["admin", "moderator"]);
    if (!roles || roles.length === 0) throw redirect({ to: "/dashboard" });
  },
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-xl font-bold text-destructive">حدث خطأ في لوحة التحكم</h2>
        <p className="text-sm text-muted-foreground break-words">{(error as Error)?.message ?? "Unknown error"}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-brand text-brand-foreground hover:opacity-90 transition"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  ),
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useApp();
  const { isAdmin, canModerate } = useAdminRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const pending = useQuery({
    queryKey: ["admin-pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "paid"]);
      return count ?? 0;
    },
    refetchInterval: 30_000,
    enabled: canModerate,
  });

  const allLinks: { to: string; label: string; exact?: boolean; badge?: number; adminOnly?: boolean }[] = [
    { to: "/admin", label: t.admin.overview, exact: true, adminOnly: true },
    { to: "/admin/products", label: t.admin.products },
    { to: "/admin/categories", label: t.admin.categories },
    { to: "/admin/orders", label: t.admin.orders, badge: pending.data ?? 0 },
    { to: "/admin/inventory", label: "مخزون التسليم" },
    { to: "/admin/users", label: t.admin.users, adminOnly: true },
    { to: "/admin/testimonials", label: t.admin.testimonials },
    { to: "/admin/reviews", label: "تقييمات الخدمات" },
    { to: "/admin/faqs", label: "الأسئلة الشائعة", adminOnly: true },
    { to: "/admin/refunds", label: "التعويضات" },
    { to: "/admin/staff", label: "الاستوك", adminOnly: true },
    { to: "/admin/settings", label: t.admin.settings, adminOnly: true },
  ];

  const links = allLinks.filter((l) => (l.adminOnly ? isAdmin : canModerate));

  const title = "لوحة تحكم الأدمن";
  const words = title.split(" ");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Creative animated title */}
      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 pt-6 sm:pt-12 pb-3 sm:pb-6 text-center overflow-hidden">
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="pointer-events-none absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[520px] h-[140px] sm:h-[220px] bg-brand/25 blur-[110px] rounded-full"
        />
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-[11px] font-bold tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-3 sm:mb-4"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
          </span>
          {isAdmin ? "Control Center" : "Moderator Panel"}
        </motion.div>

        <h1
          dir="rtl"
          className="relative text-xl sm:text-4xl md:text-6xl font-black tracking-tight leading-[1.15] flex flex-wrap justify-center gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2"
        >
          {words.map((word, wi) => (
            <motion.span
              key={wi}
              initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: 0.15 + wi * 0.18,
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block bg-gradient-to-b from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent"
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.7, ease: "easeOut" }}
          className="mx-auto mt-3 sm:mt-5 h-[3px] w-16 sm:w-28 origin-center rounded-full bg-gradient-to-r from-transparent via-brand to-transparent"
        />
      </div>

      {/* Mobile nav trigger */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 md:hidden mb-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl text-sm font-bold">
              <span className="flex items-center gap-2">
                <Menu className="size-4" />
                القائمة
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                {links.find((l) => (l.exact ? currentPath === l.to : currentPath.startsWith(l.to)))?.label ?? ""}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg">لوحة التحكم</h3>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to as string}
                  activeOptions={{ exact: !!l.exact }}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition flex items-center justify-between gap-2"
                  activeProps={{ className: "bg-brand/10 text-brand" }}
                >
                  <span>{l.label}</span>
                  {l.badge && l.badge > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-warning/15 text-warning text-[11px] font-extrabold border border-warning/30">
                      {l.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 grid md:grid-cols-[220px_1fr] gap-4 md:gap-8">
        <aside className="hidden md:block h-fit md:sticky md:top-24 bg-card border border-border rounded-2xl p-3">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to as string}
                activeOptions={{ exact: !!l.exact }}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted whitespace-nowrap transition flex items-center justify-between gap-2"
                activeProps={{ className: "bg-brand/10 text-brand" }}
              >
                <span>{l.label}</span>
                {l.badge && l.badge > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-warning/15 text-warning text-[11px] font-extrabold border border-warning/30 animate-pulse">
                    {l.badge}
                  </span>
                ) : null}
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
