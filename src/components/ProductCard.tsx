import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Zap } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { QuickBuyDialog } from "@/components/QuickBuyDialog";

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
  totalStock?: number | null;
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
    background:var(--card);border:1px solid color-mix(in oklab, var(--brand) 60%, transparent);
    box-shadow:0 12px 40px -8px color-mix(in oklab, var(--brand) 60%, transparent);
    display:grid;place-items:center;overflow:hidden;color:var(--brand);
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
  const [buyOpen, setBuyOpen] = useState(false);
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
      productName: name,
      planLabel: planLabel ?? "",
      price: finalPrice,
      quantity: 1,
      iconUrl: p.icon_url ?? null,
      deliveryType: p.delivery_type,
      accountType: p.account_type,
    });
    flyToCart(e.currentTarget, p.icon_url ?? null, name);
  };

  const openBuy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setBuyOpen(true);
  };

  return (
    <>
      <Link
        to="/product/$slug"
        params={{ slug: p.slug }}
        className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/50 hover:shadow-[0_10px_40px_-12px_color-mix(in_oklab,var(--brand)_35%,transparent)] transition-all flex flex-col h-full"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {p.icon_url ? (
            <img
              src={p.icon_url}
              alt={name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="size-full grid place-items-center">
              <span className="text-4xl sm:text-5xl font-black text-brand/70">
                {name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          {hasDiscount && (
            <span
              className={`absolute top-2 sm:top-3 ${lang === "ar" ? "start-2 sm:start-3" : "end-2 sm:end-3"} bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-black px-2 py-0.5 sm:py-1 rounded-full shadow-lg`}
            >
              -{discount}%
            </span>
          )}
        </div>

        <div className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 flex-1">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-lg font-bold mb-1 text-foreground line-clamp-1">
              {name}
            </h3>
            <p className="text-muted-foreground text-[11px] sm:text-sm line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
              {desc || " "}
            </p>
          </div>

          <div className="flex flex-col min-w-0 pt-2 border-t border-border/60">
            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {planLabel || t.product.priceStarting}
            </span>
            {finalPrice !== null ? (
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-base sm:text-xl font-extrabold text-foreground">
                  {finalPrice} <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">{t.common.currency}</span>
                </span>
                {hasDiscount && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                    {p.minPrice}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-base sm:text-xl font-extrabold text-foreground">,</span>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={openBuy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-brand text-brand-foreground font-bold text-[11px] sm:text-sm shadow-md hover:brand-glow transition-all active:scale-95"
            >
              <Zap className="size-3.5 sm:size-4" />
              <span>{lang === "ar" ? "شراء الآن" : "Buy now"}</span>
            </button>
            <button
              type="button"
              onClick={handleAdd}
              aria-label={lang === "ar" ? "أضف للسلة" : "Add to cart"}
              title={lang === "ar" ? "أضف للسلة" : "Add to cart"}
              className="grid place-items-center size-9 sm:size-11 rounded-xl border border-border bg-background text-foreground hover:border-brand/60 hover:text-brand transition-all active:scale-90 shrink-0"
            >
              <ShoppingCart className="size-4 sm:size-5" />
            </button>
          </div>
        </div>
      </Link>

      <QuickBuyDialog open={buyOpen} onOpenChange={setBuyOpen} product={p} />
    </>
  );
}
