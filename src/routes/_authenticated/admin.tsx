import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
    { to: "/admin/inventory", label: "مخزون التسليم" },
    { to: "/admin/users", label: t.admin.users },
    { to: "/admin/testimonials", label: t.admin.testimonials },
    { to: "/admin/settings", label: t.admin.settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Creative animated title */}
      <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-6 text-center overflow-hidden">
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[220px] bg-brand/25 blur-[110px] rounded-full"
        />
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-bold tracking-[0.25em] uppercase mb-4"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
          </span>
          Control Center
        </motion.div>

        <h1 className="relative text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
          {"لوحة تحكم الأدمن".split(" ").map((word, wi) => (
            <span key={wi} className="inline-block mx-2 align-baseline">
              {Array.from(word).map((ch, ci) => (
                <motion.span
                  key={ci}
                  initial={{ opacity: 0, y: 24, rotateX: -60 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    delay: 0.15 + wi * 0.12 + ci * 0.035,
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block bg-gradient-to-b from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent"
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          ))}
        </h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.7, ease: "easeOut" }}
          className="mx-auto mt-5 h-[3px] w-28 origin-center rounded-full bg-gradient-to-r from-transparent via-brand to-transparent"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid md:grid-cols-[220px_1fr] gap-8">
        <aside className="h-fit md:sticky md:top-24 bg-card border border-border rounded-2xl p-3">


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
