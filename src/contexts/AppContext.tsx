import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { translations, type Lang, type Dict } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ---- Cart ----
export type CartItem = {
  productId: string;
  planId: string;
  productName: string;
  planLabel: string;
  price: number;
  quantity: number;
  iconUrl?: string | null;
  deliveryType: "instant" | "manual";
  accountType: "private" | "shared" | "both" | "own";
};

type Theme = "dark" | "light";
type ThemeMode = "light" | "dark" | "both";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ToastMsg = { id: number; type: "success" | "error" | "info"; message: string };

type AppState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  theme: Theme;
  toggleTheme: () => void;
  themeMode: ThemeMode;
  cart: CartItem[];
  addToCart: (item: CartItem) => void | Promise<void>;
  removeFromCart: (productId: string, planId: string) => void;
  updateQty: (productId: string, planId: string, qty: number) => void | Promise<void>;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  cartBumpKey: number;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  notify: (message: string, type?: ToastMsg["type"]) => void;
};

const AppContext = createContext<AppState | null>(null);

const isBrowser = typeof window !== "undefined";

/** Keys shared with the pre-paint script in `src/routes/__root.tsx`. */
export const THEME_KEY = "rk-theme";
export const THEME_MODE_KEY = "rk-theme-mode";

function getInitialTheme(): Theme {
  // Always return the same value on server and initial client render to
  // avoid hydration mismatches. The real theme is applied in a useEffect
  // after mount (see hydration effect below).
  return "dark";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartBumpKey, setCartBumpKey] = useState(0);

  // Admin-forced theme mode.
  // It MUST go through React Query: the dashboard invalidates the cache after
  // saving and `usePublicRealtime` invalidates on every `site_settings` change,
  // so the new mode lands on every open tab instantly , no reload needed.
  const themeModeQuery = useQuery({
    queryKey: ["site-settings", "theme_mode"],
    queryFn: async (): Promise<ThemeMode> => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "theme_mode")
        .maybeSingle();
      const v = (data?.value as any)?.mode;
      return v === "light" || v === "dark" || v === "both" ? v : "both";
    },
    staleTime: 60_000,
  });
  const themeMode: ThemeMode = themeModeQuery.data ?? "both";

  // Cache the mode so the pre-paint script in __root.tsx can honour it on the
  // very first frame of the next visit (no flash, no wrong theme).
  useEffect(() => {
    if (!isBrowser || !themeModeQuery.data) return;
    localStorage.setItem(THEME_MODE_KEY, themeMode);
  }, [themeMode, themeModeQuery.data]);

  // Enforce the forced theme. Runs AFTER hydration so the value restored from
  // localStorage can never win over the admin setting.
  useEffect(() => {
    if (!hydrated) return;
    if (themeMode === "light" || themeMode === "dark") setTheme(themeMode);
  }, [themeMode, hydrated]);

  // ---- Confirm modal ----
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);
  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    [],
  );

  // ---- Toasts ----
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(0);
  const notify = useCallback((message: string, type: ToastMsg["type"] = "info") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    if (!isBrowser) return;
    const storedLang = localStorage.getItem("rk-lang") as Lang | null;
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const storedCart = localStorage.getItem("rk-cart");
    if (storedLang === "ar" || storedLang === "en") setLangState(storedLang);
    const cachedMode = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null;
    if (cachedMode === "light" || cachedMode === "dark") {
      // Admin forces a single theme , the user's saved choice is ignored.
      setTheme(cachedMode);
    } else if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
    }
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch {}
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    const html = document.documentElement;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    html.lang = lang;
    if (hydrated) localStorage.setItem("rk-lang", lang);
  }, [lang, hydrated]);

  useEffect(() => {
    if (!isBrowser || !hydrated) return;
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(theme);
    // Only persist a genuine user choice. Persisting a forced theme would
    // "stick" it after the admin switches back to "User Choice".
    if (themeMode === "both") localStorage.setItem(THEME_KEY, theme);
  }, [theme, themeMode, hydrated]);

  useEffect(() => {
    if (!isBrowser || !hydrated) return;
    localStorage.setItem("rk-cart", JSON.stringify(cart));
  }, [cart, hydrated]);

  const setLang = (l: Lang) => setLangState(l);
  const toggleTheme = () => {
    // No-op while the admin forces a single theme.
    if (themeMode !== "both") return;
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  const playAddSound = () => {
    if (!isBrowser) return;
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.22);
    } catch {}
  };

  const fetchPlanStock = async (planId: string): Promise<number | null> => {
    try {
      const { data } = await supabase
        .from("product_plans")
        .select("stock")
        .eq("id", planId)
        .maybeSingle();
      if (data == null) return null;
      const n = Number((data as any).stock ?? 0);
      return Number.isFinite(n) ? Math.max(0, n) : 0;
    } catch {
      return null;
    }
  };

  const addToCart = async (item: CartItem) => {
    const stock = await fetchPlanStock(item.planId);
    let notice: { msg: string; type: ToastMsg["type"] } | null = null as { msg: string; type: ToastMsg["type"] } | null;
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.productId === item.productId && c.planId === item.planId,
      );
      const currentQty = idx >= 0 ? prev[idx].quantity : 0;
      let requested = currentQty + item.quantity;
      if (stock != null) {
        if (stock <= 0) {
          notice = {
            msg: lang === "ar" ? "مفيش مخزون تاني فاضل" : "No more stock available",
            type: "error",
          };
          return prev;
        }
        if (requested > stock) {
          requested = stock;
          notice = {
            msg:
              lang === "ar"
                ? `الحد الأقصى المتاح ${stock}`
                : `Only ${stock} available in stock`,
            type: "info",
          };
        }
      }
      const finalQty = Math.max(1, requested);
      if (idx >= 0) {
        if (finalQty === currentQty) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: finalQty };
        return copy;
      }
      return [...prev, { ...item, quantity: finalQty }];
    });
    if (notice) notify(notice.msg, notice.type);
    playAddSound();
    setCartBumpKey((k) => k + 1);
  };
  const removeFromCart = (productId: string, planId: string) =>
    setCart((prev) =>
      prev.filter((c) => !(c.productId === productId && c.planId === planId)),
    );
  const updateQty = async (productId: string, planId: string, qty: number) => {
    const stock = await fetchPlanStock(planId);
    let capped = Math.max(1, qty);
    let notice: string | null = null;
    if (stock != null) {
      if (stock <= 0) {
        setCart((prev) => prev.filter((c) => !(c.productId === productId && c.planId === planId)));
        notify(lang === "ar" ? "مفيش مخزون من المنتج ده" : "No more stock available", "error");
        return;
      }
      if (capped > stock) {
        capped = stock;
        notice = lang === "ar" ? `الحد الأقصى المتاح ${stock}` : `Only ${stock} available in stock`;
      }
    }
    setCart((prev) =>
      prev.map((c) =>
        c.productId === productId && c.planId === planId ? { ...c, quantity: capped } : c,
      ),
    );
    if (notice) notify(notice, "info");
  };
  const clearCart = () => {
    setCart([]);
    if (isBrowser && hydrated) {
      localStorage.setItem("rk-cart", JSON.stringify([]));
    }
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const value: AppState = {
    lang,
    setLang,
    t: translations[lang] as Dict,
    theme,
    toggleTheme,
    themeMode,
    cart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    cartTotal,
    cartCount,
    cartBumpKey,
    confirm,
    notify,
  };

  const isAr = lang === "ar";

  return (
    <AppContext.Provider value={value}>
      {children}

      {/* Custom branded confirm modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm grid place-items-center p-6 animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div
                className={`size-12 rounded-xl grid place-items-center shrink-0 ${
                  confirmState.tone === "danger"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-brand/10 text-brand"
                }`}
              >
                <span className="text-2xl">
                  {confirmState.tone === "danger" ? "" : ""}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-extrabold mb-1">
                  {confirmState.title ?? (isAr ? "تأكيد" : "Confirm")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { confirmState.resolve(false); setConfirmState(null); }}
                className="px-4 py-2 border border-border rounded-lg font-bold hover:bg-muted transition"
              >
                {confirmState.cancelLabel ?? (isAr ? "إلغاء" : "Cancel")}
              </button>
              <button
                onClick={() => { confirmState.resolve(true); setConfirmState(null); }}
                className={`px-5 py-2 rounded-lg font-bold transition ${
                  confirmState.tone === "danger"
                    ? "bg-destructive text-destructive-foreground hover:opacity-90"
                    : "bg-brand text-brand-foreground hover:brand-glow"
                }`}
              >
                {confirmState.confirmLabel ?? (isAr ? "تأكيد" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All toasts: center-top below the header */}
      {toasts.length > 0 && (
        <div className="fixed top-[72px] sm:top-[88px] left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center w-full pointer-events-none">
          <div className="w-[min(92vw,420px)] flex flex-col gap-2">
            {toasts.map((tt) => (
              <div
                key={tt.id}
                className={`px-4 py-3 rounded-xl border shadow-2xl text-center text-sm font-bold pointer-events-auto backdrop-blur animate-in fade-in slide-in-from-top-4 ${
                  tt.type === "success"
                    ? "bg-success/15 border-success/30 text-success"
                    : tt.type === "error"
                      ? "bg-destructive/15 border-destructive/30 text-destructive"
                      : "bg-card border-border text-foreground"
                }`}
              >
                {tt.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}