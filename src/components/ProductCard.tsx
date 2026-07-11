import { Link } from "@tanstack/react-router";
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
  account_type: "private" | "shared" | "both";
  minPrice: number | null;
  planLabel_ar?: string | null;
  planLabel_en?: string | null;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const { lang, t } = useApp();
  const name = lang === "ar" ? p.name_ar : p.name_en;
  const desc = lang === "ar" ? p.description_ar : p.description_en;
  const planLabel = lang === "ar" ? p.planLabel_ar : p.planLabel_en;

  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group bg-card border border-border rounded-2xl p-6 hover:border-brand/40 transition-all flex flex-col"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="size-14 bg-muted rounded-xl grid place-items-center overflow-hidden border border-border">
          {p.icon_url ? (
            <img src={p.icon_url} alt={name} className="size-full object-cover" />
          ) : (
            <span className="text-lg font-black text-brand">{name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
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
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {p.account_type === "private"
              ? t.badges.private
              : p.account_type === "both"
              ? (t.badges as any).both
              : t.badges.shared}
          </span>
        </div>
      </div>
      <h3 className="text-xl font-bold mb-1 text-foreground">{name}</h3>
      <p className="text-muted-foreground text-sm mb-6 line-clamp-2 min-h-[2.5rem]">
        {desc || " "}
      </p>
      <div className="mt-auto flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
            {planLabel || t.product.priceStarting}
          </span>
          <span className="text-2xl font-extrabold text-foreground">
            {p.minPrice !== null ? `${p.minPrice} ${t.common.currency}` : "—"}
          </span>
        </div>
        <span className="px-5 py-2.5 bg-brand text-brand-foreground rounded-xl font-bold text-sm group-hover:brand-glow transition-all">
          {t.product.buyNow}
        </span>
      </div>
    </Link>
  );
}
