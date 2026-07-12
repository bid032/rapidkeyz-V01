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
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, planId: string) => void;
  updateQty: (productId: string, planId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  notify: (message: string, type?: ToastMsg["type"]) => void;
};

const AppContext = createContext<AppState | null>(null);

const isBrowser = typeof window !== "undefined";

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [theme, setTheme] = useState<Theme>("light");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("both");

  // Load admin-forced theme mode
  useEffect(() => {
    if (!isBrowser) return;
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "theme_mode")
      .maybeSingle()
      .then(({ data }) => {
        const v = (data?.value as any)?.mode;
        if (v === "light" || v === "dark" || v === "both") setThemeMode(v);
      });
  }, []);

  // Enforce forced theme when mode is not "both"
  useEffect(() => {
    if (themeMode === "light" || themeMode === "dark") {
      setTheme(themeMode);
    }
  }, [themeMode]);

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
    const storedTheme = localStorage.getItem("rk-theme") as Theme | null;
    const storedCart = localStorage.getItem("rk-cart");
    if (storedLang === "ar" || storedLang === "en") setLangState(storedLang);
    if (storedTheme === "dark" || storedTheme === "light") setTheme(storedTheme);
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
    if (!isBrowser) return;
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(theme);
    if (hydrated) localStorage.setItem("rk-theme", theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!isBrowser || !hydrated) return;
    localStorage.setItem("rk-cart", JSON.stringify(cart));
  }, [cart, hydrated]);

  const setLang = (l: Lang) => setLangState(l);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.productId === item.productId && c.planId === item.planId,
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + item.quantity };
        return copy;
      }
      return [...prev, item];
    });
  };
  const removeFromCart = (productId: string, planId: string) =>
    setCart((prev) =>
      prev.filter((c) => !(c.productId === productId && c.planId === planId)),
    );
  const updateQty = (productId: string, planId: string, qty: number) =>
    setCart((prev) =>
      prev.map((c) =>
        c.productId === productId && c.planId === planId
          ? { ...c, quantity: Math.max(1, qty) }
          : c,
      ),
    );
  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const value: AppState = {
    lang,
    setLang,
    t: translations[lang] as Dict,
    theme,
    toggleTheme,
    cart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    cartTotal,
    cartCount,
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

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex flex-col gap-2 pointer-events-none">
          {toasts.map((tt) => (
            <div
              key={tt.id}
              className={`px-4 py-3 rounded-xl border shadow-lg text-sm font-bold pointer-events-auto backdrop-blur ${
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
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
