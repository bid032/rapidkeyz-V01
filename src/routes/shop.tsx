import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  category: z.string().optional(),
  delivery: z.enum(["instant", "manual"]).optional(),
  account: z.enum(["private", "shared"]).optional(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "المتجر — RapidKeyz" },
      { name: "description", content: "تصفّح جميع اشتراكات الذكاء الاصطناعي والترفيه على RapidKeyz." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ShopPage,
});

async function fetchProducts(filters: z.infer<typeof searchSchema>): Promise<ProductCardData[]> {
  let q = supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, categories!inner(slug), product_plans(price, label_ar, label_en, is_active)",
    )
    .eq("status", "active");
  if (filters.category) q = q.eq("categories.slug", filters.category);
  if (filters.delivery) q = q.eq("delivery_type", filters.delivery);
  if (filters.account) q = q.eq("account_type", filters.account);
  const { data, error } = await q.order("sort_order");
  if (error) throw error;
  return (data ?? []).map((p: any) => {
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
      minPrice: cheapest ? Number(cheapest.price) : null,
      planLabel_ar: cheapest?.label_ar ?? null,
      planLabel_en: cheapest?.label_en ?? null,
    };
  });
}

function ShopPage() {
  const search = Route.useSearch();
  const { t, lang } = useApp();
  const cats = useQuery({
    queryKey: ["cats-all"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });
  const products = useQuery({
    queryKey: ["products", search],
    queryFn: () => fetchProducts(search),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold mb-8">{t.nav.shop}</h1>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-8">
          <Link
            to="/shop"
            search={{}}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold border transition ${
              !search.category ? "bg-brand text-brand-foreground border-brand" : "bg-card border-border"
            }`}
          >
            {t.filters.all}
          </Link>
          {cats.data?.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ ...search, category: c.slug }}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold border transition ${
                search.category === c.slug ? "bg-brand text-brand-foreground border-brand" : "bg-card border-border"
              }`}
            >
              {lang === "ar" ? c.name_ar : c.name_en}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {(["instant", "manual"] as const).map((d) => (
            <Link
              key={d}
              to="/shop"
              search={{ ...search, delivery: search.delivery === d ? undefined : d }}
              className={`px-3 py-1.5 rounded text-xs font-bold border ${
                search.delivery === d ? "bg-success/20 text-success border-success/40" : "border-border text-muted-foreground"
              }`}
            >
              {d === "instant" ? t.badges.instant : t.badges.manual}
            </Link>
          ))}
          {(["private", "shared"] as const).map((a) => (
            <Link
              key={a}
              to="/shop"
              search={{ ...search, account: search.account === a ? undefined : a }}
              className={`px-3 py-1.5 rounded text-xs font-bold border ${
                search.account === a ? "bg-brand/20 text-brand border-brand/40" : "border-border text-muted-foreground"
              }`}
            >
              {a === "private" ? t.badges.private : t.badges.shared}
            </Link>
          ))}
        </div>

        {products.isLoading && <p className="text-muted-foreground">{t.common.loading}</p>}
        {products.data && products.data.length === 0 && (
          <p className="text-center text-muted-foreground py-16">
            {lang === "ar" ? "لا توجد منتجات تطابق البحث." : "No products match your filters."}
          </p>
        )}
        {products.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.data.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
