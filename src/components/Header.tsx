import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import logoAsset from "@/assets/logo_rapid.png.asset.json";
import { ShoppingCart, Sun, Moon } from "lucide-react";

export function Header() {
  const { lang, setLang, t, theme, toggleTheme, cartCount } = useApp();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="RapidKeyz" className="h-10 w-10 object-contain" />
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">
              RapidKeyz
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t.nav.home}
            </Link>
            <Link to="/shop" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t.nav.shop}
            </Link>
            <Link to="/about" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t.nav.about}
            </Link>
            {user && (
              <Link to="/dashboard" className="hover:text-foreground transition-colors">
                {t.nav.dashboard}
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="hover:text-brand transition-colors text-brand/80">
                {t.nav.admin}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-muted rounded-full p-1">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                lang === "en" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                lang === "ar" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
              }`}
            >
              AR
            </button>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="size-9 grid place-items-center rounded-lg border border-border hover:bg-muted hover:text-brand transition-colors"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <Link
            to="/cart"
            aria-label="Cart"
            className="relative size-9 grid place-items-center rounded-lg border border-border hover:bg-muted hover:text-brand transition-colors"
          >
            <ShoppingCart className="size-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold grid place-items-center">
                {cartCount}
              </span>
            )}
          </Link>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold grid place-items-center">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex px-4 py-2 bg-foreground text-background rounded-lg text-sm font-bold hover:bg-brand hover:text-brand-foreground transition-all"
            >
              {t.nav.dashboard}
            </Link>
          ) : (
            <Link
              to="/auth"
              className="hidden sm:inline-flex px-4 py-2 bg-foreground text-background rounded-lg text-sm font-bold hover:bg-brand hover:text-brand-foreground transition-all"
            >
              {t.nav.login}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
