import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { translations, type Lang, type Dict } from "@/lib/i18n";

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
  accountType: "private" | "shared" | "both";
};

type Theme = "dark" | "light";

type AppState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  theme: Theme;
  toggleTheme: () => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, planId: string) => void;
  updateQty: (productId: string, planId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
};

const AppContext = createContext<AppState | null>(null);

const isBrowser = typeof window !== "undefined";

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [theme, setTheme] = useState<Theme>("dark");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

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

  // Apply direction + theme class
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
  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
