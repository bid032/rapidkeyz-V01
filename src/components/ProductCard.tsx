import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export type ProductCardData = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon_url: string | null;
  delivery_type: "instant" | "manual";
  account_type: "private" | "shared" | "both" | "own";
  minPrice: number | null;
  cheapestPlanId?: string | null;
  discount_percent?: number | null;
  planLabel_ar?: string | null;
  planLabel_en?: string | null;
};

function flyToCart(fromEl: HTMLElement, iconUrl: string | null, name: string) {
  const target = document.querySelector<HTMLElement>("[data-cart-anchor]");
  if (!target) return;
  const from = fromEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const ghost = document.createElement("div");
  const size = 56;
  ghost.style.cssText = `
    position:fixed;left:${from.left + from.width / 2 - size / 2}px;top:${from.top + from.height / 2 - size / 2}px;
    width:${size}px;height:${size}px;border-radius:16px;pointer-events:none;z-index:9999;
    background:hsl(var(--card));border:1px solid hsl(var(--brand)/0.5);
    box-shadow:0 12px 40px -8px hsl(var(--brand)/0.6);
    display:grid;place-items:center;overflow:hidden;
    transition:transform 0.75s cubic-bezier(.55,-0.2,.4,1.4),opacity 0.75s ease,border-radius 0.75s ease;
  `;
  if (iconUrl) {
    const img = document.createElement("img");
    img.src = iconUrl;
    img.alt = name;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    ghost.appendChild(img);
  } else {
    ghost.textContent = name.slice(0, 2).toUpperCase();
    ghost.style.fontWeight = "900";
    ghost.style.color = "hsl(var(--brand))";
  }
  document.body.appendChild(ghost);
  requestAnimationFrame(() => {
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.15) rotate(360deg)`;
    ghost.style.opacity = "0";
    ghost.style.borderRadius = "50%";
  });
  setTimeout(() => ghost.remove(), 800);
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const { lang, t, addToCart, notify } = useApp() as any;
  const name = lang === "ar" ? p.name_ar : p.name_en;
  const desc = lang === "ar" ? p.description_ar : p.description_en;
  const planLabel = lang === "ar" ? p.planLabel_ar : p.planLabel_en;
  const discount = Number(p.discount_percent ?? 0);
  const hasDiscount = discount > 0 && p.minPrice !== null;
  const finalPrice =
    hasDiscount && p.minPrice !== null
      ? Math.round(p.minPrice * (100 - discount)) / 100
      : p.minPrice;

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!p.cheapestPlanId || finalPrice === null) {
      notify?.(lang === "ar" ? "لا توجد خطة متاحة" : "No plan available", "error");
      return;
    }
    addToCart({
      productId: p.id,
      planId: p.cheapestPlanId,
      name,
      planLabel: planLabel ?? "",
      price: finalPrice,
      quantity: 1,
      icon_url: p.icon_url ?? null,
      slug: p.slug,
    });
    flyToCart(e.currentTarget, p.icon_url ?? null, name);
  };

  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group bg-card border border-border rounded-2xl p-6 hover:border-brand/40 transition-all flex flex-col"
    >
      <div className="flex items-stretch gap-4 mb-6">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                p.delivery_type === "instant"
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              {p.delivery_type === "instant" ? t.badges.instant : t.badges.manual}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                p.account_type === "private"
                  ? "bg-brand/10 text-brand border-brand/20"
                  : p.account_type === "both"
                  ? "bg-accent/10 text-accent-foreground border-accent/30"
                  : p.account_type === "own"
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {p.account_type === "private"
                ? t.badges.private
                : p.account_type === "both"
                ? (t.badges as any).both
                : p.account_type === "own"
                ? (t.badges as any).own
                : t.badges.shared}
            </span>
          </div>
          <h3 className="text-xl font-bold mb-1 text-foreground line-clamp-1">{name}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2 min-h-[2.5rem]">
            {desc || " "}
          </p>
        </div>
        <div className="relative size-24 shrink-0 self-end bg-muted rounded-2xl grid place-items-center overflow-hidden border border-border">
          {p.icon_url ? (
            <img src={p.icon_url} alt={name} className="size-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-brand">{name.slice(0, 2).toUpperCase()}</span>
          )}
          {hasDiscount && (
            <span
              className={`absolute top-0 ${lang === "ar" ? "right-0 rounded-bl-lg rounded-tr-2xl" : "left-0 rounded-br-lg rounded-tl-2xl"} bg-destructive text-destructive-foreground text-[10px] font-black px-1.5 py-0.5 shadow-md`}
            >
              -{discount}%
            </span>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
            {planLabel || t.product.priceStarting}
          </span>
          {finalPrice !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">
                {finalPrice} {t.common.currency}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through">
                  {p.minPrice} {t.common.currency}
                </span>
              )}
            </div>
          ) : (
            <span className="text-2xl font-extrabold text-foreground">,</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAdd}
            aria-label={lang === "ar" ? "أضف للسلة" : "Add to cart"}
            title={lang === "ar" ? "أضف للسلة" : "Add to cart"}
            className="grid place-items-center size-10 rounded-xl border border-brand/40 text-brand hover:bg-brand hover:text-brand-foreground transition-all active:scale-90"
          >
            <ShoppingCart className="size-4" />
          </button>
          <span className="px-4 py-2.5 bg-brand text-brand-foreground rounded-xl font-bold text-sm group-hover:brand-glow transition-all">
            {t.product.buyNow}
          </span>
        </div>
      </div>
    </Link>
  );
}
