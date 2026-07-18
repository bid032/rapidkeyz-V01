import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { useApp } from "@/contexts/AppContext";

type CategoryRow = {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string | null;
  products: ProductCardData[];
};

async function fetchCategoryRows(): Promise<CategoryRow[]> {
  const { data: cats, error } = await supabase
    .from("categories")
    .select("id, slug, name_ar, name_en, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(4);
  if (error) throw error;

  const rows = await Promise.all(
    (cats ?? []).map(async (c) => {
      const { data: prods } = await supabase
        .from("products")
        .select(
          "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, product_plans(id, price, label_ar, label_en, is_active, sort_order)",
        )
        .eq("status", "active")
        .eq("category_id", c.id)
        .order("sort_order", { ascending: true })
        .limit(8);
      const mapped: ProductCardData[] = (prods ?? []).map((p: any) => {
        const active = (p.product_plans ?? []).filter((pl: any) => pl.is_active);
        const cheapest = active.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
        return {
          id: p.id,
          slug: p.slug,
          name_ar: p.name_ar,
          name_en: p.name_en,
          description_ar: p.description_ar,
          description_en: p.description_en,
          icon_url: p.icon_url,
          delivery_type: p.delivery_type,
          account_type: p.account_type,
          discount_percent: p.discount_percent,
          minPrice: cheapest ? Number(cheapest.price) : null,
          starting_price: cheapest ? Number(cheapest.price) : null,
          plans: active,
        } as ProductCardData;
      });
      return { id: c.id, slug: c.slug, name_ar: c.name_ar, name_en: c.name_en, products: mapped };
    }),
  );
  return rows.filter((r) => r.products.length > 0);
}

export function CategoryRows() {
  const { lang } = useApp();
  const { data } = useQuery({ queryKey: ["category-rows"], queryFn: fetchCategoryRows });
  if (!data || data.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-10 sm:py-16 space-y-12">
      {data.map((cat) => (
        <div key={cat.id}>
          <div className="flex items-end justify-between mb-4 sm:mb-6">
            <h2 className="font-display font-bold text-2xl sm:text-4xl tracking-tight">
              {lang === "ar" ? cat.name_ar : cat.name_en}
            </h2>
            <Link
              to="/shop"
              search={{ category: cat.slug } as any}
              className="text-xs sm:text-sm font-mono uppercase tracking-widest text-brand hover:underline whitespace-nowrap"
            >
              {lang === "ar" ? "عرض الكل" : "View all"} →
            </Link>
          </div>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-3 px-3 sm:-mx-6 sm:px-6 scrollbar-none">
            {cat.products.map((p) => (
              <div key={p.id} className="snap-start shrink-0 w-[75%] sm:w-[280px]">
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
