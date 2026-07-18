import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import logoDark from "@/assets/white_logo_rapid.png.asset.json";
import logoLight from "@/assets/black_logo_rapid.png.asset.json";
import { ShoppingCart, Sun, Moon, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BrandName } from "@/components/BrandName";

export function Header() {
  const { lang, setLang, t, theme, toggleTheme, themeMode, cartCount, cartBumpKey } = useApp();
  const [bumping, setBumping] = useState(false);
  useEffect(() => {
    if (!cartBumpKey) return;
    setBumping(true);
    const id = setTimeout(() => setBumping(false), 520);
    return () => clearTimeout(id);
  }, [cartBumpKey]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      .in("role", ["admin", "moderator"])
      .then(({ data }) => setIsAdmin(!!(data && data.length > 0)));
  }, [user]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={theme === "dark" ? logoDark.url : logoLight.url} alt="RapidKeyz" className="h-8 w-8 sm:h-10 sm:w-10 object-contain shrink-0" />
            <BrandName className="text-base sm:text-xl truncate" />
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
            <Link to="/terms" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t.nav.terms}
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t.nav.privacy}
            </Link>
            {user && (
              <Link to="/dashboard" className="hover:text-foreground transition-colors">
                {t.nav.dashboard}
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-brand font-bold hover:underline">
                {t.nav.admin}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <div className="hidden sm:flex bg-muted rounded-full p-1">
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all ${
                lang === "en" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all ${
                lang === "ar" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
              }`}
            >
              AR
            </button>
          </div>

          {themeMode === "both" && (
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="size-8 sm:size-9 grid place-items-center rounded-lg border border-border hover:bg-muted hover:text-brand transition-colors"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          )}

          <Link
            to="/cart"
            aria-label="Cart"
            data-cart-anchor
            className={`relative size-8 sm:size-9 grid place-items-center rounded-lg border border-border hover:bg-muted hover:text-brand transition-transform ${bumping ? "animate-[cartBump_0.5s_ease-out]" : ""}`}
          >
            <ShoppingCart className={`size-4 ${bumping ? "text-brand" : ""}`} />
            {cartCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 size-4 sm:size-5 rounded-full bg-brand text-brand-foreground text-[9px] sm:text-[10px] font-bold grid place-items-center ${bumping ? "animate-[cartBump_0.5s_ease-out]" : ""}`}
              >
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

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="md:hidden size-8 grid place-items-center rounded-lg border border-border hover:bg-muted transition-colors"
                aria-label="Menu"
              >
                <Menu className="size-4" />
              </button>
            </SheetTrigger>
            <SheetContent side={lang === "ar" ? "right" : "left"} className="w-[280px] p-0">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <img src={theme === "dark" ? logoDark.url : logoLight.url} alt="RapidKeyz" className="h-8 w-8 object-contain" />
                  <BrandName className="text-lg" />
                </div>
                <button onClick={closeMobile} className="p-1 rounded hover:bg-muted" aria-label="Close">
                  <X className="size-4" />
                </button>
              </div>
              <nav className="flex flex-col p-3 gap-1">
                <Link to="/" onClick={closeMobile} className="px-3 py-3 rounded-lg text-sm font-bold hover:bg-muted" activeProps={{ className: "bg-brand/10 text-brand" }} activeOptions={{ exact: true }}>
                  {t.nav.home}
                </Link>
                <Link to="/shop" onClick={closeMobile} className="px-3 py-3 rounded-lg text-sm font-bold hover:bg-muted" activeProps={{ className: "bg-brand/10 text-brand" }}>
                  {t.nav.shop}
                </Link>
                <Link to="/about" onClick={closeMobile} className="px-3 py-3 rounded-lg text-sm font-bold hover:bg-muted" activeProps={{ className: "bg-brand/10 text-brand" }}>
                  {t.nav.about}
                </Link>
                <Link to="/terms" onClick={closeMobile} className="px-3 py-3 rounded-lg text-sm font-bold hover:bg-muted" activeProps={{ className: "bg-brand/10 text-brand" }}>
                  {t.nav.terms}
                </Link>
                <Link to="/privacy" onClick={closeMobile} className="px-3 py-3 rounded-lg text-sm font-bold hover:bg-muted" activeProps={{ className: "bg-brand/10 text-brand" }}>
                  {t.nav.privacy}
                </Link>
                {user && (
                  <Link to="/dashboard" onClick={closeMobile} className="px-3 py-3 rounded-lg text-sm font-bold hover:bg-muted" activeProps={{ className: "bg-brand/10 text-brand" }}>
                    {t.nav.dashboard}
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin" onClick={closeMobile} className="px-3 py-3 rounded-lg text-sm font-bold hover:bg-muted" activeProps={{ className: "bg-brand/10 text-brand" }}>
                    {t.nav.admin}
                  </Link>
                )}
              </nav>

              <div className="p-3 border-t border-border space-y-2">
                <div className="flex bg-muted rounded-full p-1">
                  <button
                    onClick={() => setLang("en")}
                    className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                      lang === "en" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLang("ar")}
                    className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                      lang === "ar" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
                    }`}
                  >
                    العربية
                  </button>
                </div>
                {user ? (
                  <button
                    onClick={async () => { await supabase.auth.signOut(); closeMobile(); }}
                    className="w-full px-4 py-2.5 bg-muted rounded-lg text-sm font-bold hover:bg-destructive/10 hover:text-destructive transition"
                  >
                    {t.nav.logout}
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    onClick={closeMobile}
                    className="block text-center px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-bold hover:bg-brand hover:text-brand-foreground transition"
                  >
                    {t.nav.login}
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
