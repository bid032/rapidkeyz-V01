import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import logoDark from "@/assets/white_logo_rapid.png.asset.json";
import logoLight from "@/assets/black_logo_rapid.png.asset.json";
import { ShoppingCart, Sun, Moon, Menu, X, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BrandName } from "@/components/BrandName";
import { CategoriesMenu } from "@/components/CategoriesMenu";
import { CartDrawer } from "@/components/CartDrawer";
import { AdminNotifications } from "@/components/AdminNotifications";
import { SearchOverlay } from "@/components/SearchOverlay";

type MobileCat = { id: string; slug: string; name_ar: string; name_en: string };

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
  const [hasStock, setHasStock] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shrunk, setShrunk] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileCats, setMobileCats] = useState<MobileCat[]>([]);
  const navigate = useNavigate();
  void navigate;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, slug, name_ar, name_en")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setMobileCats((data as MobileCat[] | null) ?? []));
  }, []);

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => {
      const h = shrunk ? (mq.matches ? 56 : 48) : (mq.matches ? 80 : 56);
      document.documentElement.style.setProperty("--app-header-h", `${h}px`);
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [shrunk]);

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
      setHasStock(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"])
      .then(({ data }) => setIsAdmin(!!(data && data.length > 0)));
    supabase.rpc("current_user_stock_access").then(({ data }) => setHasStock(!!data));
  }, [user]);

  const closeMobile = () => setMobileOpen(false);

  const nav = (
    <nav className={`fixed top-0 start-0 end-0 z-[10000] border-b border-border bg-background/90 backdrop-blur-md transition-all duration-300 ${shrunk ? "shadow-[0_6px_24px_-12px_hsl(var(--brand)/0.35)]" : ""}`}>
      <div className={`max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300 ${shrunk ? "h-12 sm:h-14" : "h-14 sm:h-20"}`}>
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={theme === "dark" ? logoDark.url : logoLight.url} alt="RapidKeyz" className={`object-contain shrink-0 transition-all duration-300 ${shrunk ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8 sm:h-10 sm:w-10"}`} />
            <BrandName className={`truncate transition-all duration-300 ${shrunk ? "text-sm sm:text-lg" : "text-base sm:text-xl"}`} />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t.nav.home}
            </Link>
            <CategoriesMenu />
            <Link to="/about" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t.nav.about}
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t.nav.terms}
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t.nav.privacy}
            </Link>
            {hasStock && (
              <Link to="/stock" className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 transition-colors">
                {lang === "ar" ? "الاستوك" : "Stock"}
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
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={lang === "ar" ? "بحث" : "Search"}
            className="size-8 sm:size-9 grid place-items-center rounded-lg border border-border hover:bg-muted hover:text-brand transition-colors"
          >
            <Search className="size-4" />
          </button>
          <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
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

          <AdminNotifications />

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label="Cart"
            data-cart-anchor
            className={`relative size-8 sm:size-9 grid place-items-center rounded-lg border border-border hover:bg-muted hover:text-brand transition-transform ${bumping ? "animate-[cartBump_0.5s_ease-out]" : ""}`}
          >
            <ShoppingCart className={`size-4 ${bumping ? "text-brand" : ""}`} />
            {cartCount > 0 && (
              <span
                className={`absolute -top-1 -end-1 size-4 sm:size-5 rounded-full bg-brand text-brand-foreground text-[9px] sm:text-[10px] font-bold grid place-items-center ${bumping ? "animate-[cartBump_0.5s_ease-out]" : ""}`}
              >
                {cartCount}
              </span>
            )}
          </button>
          <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

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
                <span className="w-6" />
              </div>
              <div className="px-4 pt-3">
                <button
                  type="button"
                  onClick={() => { closeMobile(); setTimeout(() => setSearchOpen(true), 120); }}
                  className="w-full flex items-center gap-2 bg-muted/60 border border-border rounded-full px-3 py-2 hover:border-brand transition-colors text-start"
                >
                  <Search className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">
                    {lang === "ar" ? "ابحث عن خدمة…" : "Search services…"}
                  </span>
                </button>
              </div>
              <nav className="flex flex-col px-2 py-3">
                {/* الأقسام */}
                <div className="px-3 pt-2 pb-1">
                  <h3 className="text-brand text-sm font-extrabold flex items-center gap-2">
                    <span className="w-1 h-4 bg-brand rounded-full" />
                    {lang === "ar" ? "الأقسام" : "Categories"}
                  </h3>
                </div>
                <div className="flex flex-col mb-3 border-t border-border/50">
                  {mobileCats.length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">…</div>
                  )}
                  {mobileCats.map((c) => (
                    <Link
                      key={c.id}
                      to="/shop"
                      search={{ category: c.slug } as any}
                      onClick={closeMobile}
                      className="px-4 py-3 text-sm font-semibold text-foreground/90 hover:bg-muted hover:text-brand border-b border-border/40 transition-colors"
                    >
                      {lang === "ar" ? c.name_ar : c.name_en}
                    </Link>
                  ))}
                </div>

                {/* الصفحات */}
                <div className="px-3 pt-2 pb-1">
                  <h3 className="text-brand text-sm font-extrabold flex items-center gap-2">
                    <span className="w-1 h-4 bg-brand rounded-full" />
                    {lang === "ar" ? "الصفحات" : "Pages"}
                  </h3>
                </div>
                <div className="flex flex-col border-t border-border/50">
                  <Link to="/" onClick={closeMobile} className="px-4 py-3 text-sm font-semibold text-foreground/90 hover:bg-muted hover:text-brand border-b border-border/40 transition-colors" activeProps={{ className: "text-brand" }} activeOptions={{ exact: true }}>
                    {t.nav.home}
                  </Link>
                  <Link to="/about" onClick={closeMobile} className="px-4 py-3 text-sm font-semibold text-foreground/90 hover:bg-muted hover:text-brand border-b border-border/40 transition-colors" activeProps={{ className: "text-brand" }}>
                    {t.nav.about}
                  </Link>
                  <Link to="/privacy" onClick={closeMobile} className="px-4 py-3 text-sm font-semibold text-foreground/90 hover:bg-muted hover:text-brand border-b border-border/40 transition-colors" activeProps={{ className: "text-brand" }}>
                    {t.nav.privacy}
                  </Link>
                  <Link to="/terms" onClick={closeMobile} className="px-4 py-3 text-sm font-semibold text-foreground/90 hover:bg-muted hover:text-brand border-b border-border/40 transition-colors" activeProps={{ className: "text-brand" }}>
                    {t.nav.terms}
                  </Link>
                  {user && (
                    <Link to="/dashboard" onClick={closeMobile} className="px-4 py-3 text-sm font-semibold text-foreground/90 hover:bg-muted hover:text-brand border-b border-border/40 transition-colors" activeProps={{ className: "text-brand" }}>
                      {t.nav.dashboard}
                    </Link>
                  )}
                  {hasStock && (
                    <Link to="/stock" onClick={closeMobile} className="px-4 py-3 text-sm font-extrabold border-b border-border/40 transition-colors text-blue-600 dark:text-blue-400 hover:bg-blue-500/10">
                      {lang === "ar" ? "الاستوك" : "Stock"}
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin" onClick={closeMobile} className="px-4 py-3 text-sm font-extrabold text-brand hover:bg-muted border-b border-border/40 transition-colors">
                      {t.nav.admin}
                    </Link>
                  )}
                </div>
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

  return (
    <>
      <div aria-hidden className={`transition-all duration-300 ${shrunk ? "h-12 sm:h-14" : "h-14 sm:h-20"}`} />
      {mounted ? createPortal(nav, document.body) : nav}
    </>
  );
}
