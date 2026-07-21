import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHero } from "@/components/PageHero";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { CategoriesShowcase } from "@/components/CategoriesShowcase";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  category: z.string().optional(),
  account: z.enum(["private", "shared"]).optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "المتجر ، اشتراكات الـ Ai والترفيه | RapidKeyz" },
      {
        name: "description",
        content:
          "تصفّح جميع اشتراكات RapidKeyz: ChatGPT Plus، Midjourney، Canva Pro وأكثر ، بأسعار تنافسية وتسليم فوري.",
      },
      { property: "og:title", content: "المتجر ، RapidKeyz" },
      {
        property: "og:description",
        content: "كل اشتراكات الـ Ai والترفيه في مكان واحد بتسليم فوري ودفع آمن.",
      },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ShopPage,
});


async function fetchProducts(filters: z.infer<typeof searchSchema>): Promise<ProductCardData[]> {
  let categoryId: string | null = null;
  if (filters.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle();
    categoryId = cat?.id ?? null;
  }

  let q = supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, category_id, category_ids, product_plans(id, price, stock, label_ar, label_en, is_active)",
    )
    .eq("status", "active");
  if (categoryId) q = q.or(`category_id.eq.${categoryId},category_ids.cs.{${categoryId}}`);

  if (filters.account) q = q.eq("account_type", filters.account);
  if (filters.q && filters.q.trim()) {
    const term = filters.q.trim().replace(/[%,()]/g, " ");
    q = q.or(
      `name_ar.ilike.%${term}%,name_en.ilike.%${term}%,description_ar.ilike.%${term}%,description_en.ilike.%${term}%,slug.ilike.%${term}%`,
    );
  }
  const { data, error } = await q.order("sort_order");
  if (error) throw error;
  return (data ?? []).map((p: any) => {
    const active = (p.product_plans ?? []).filter((pl: any) => pl.is_active);
    const totalStock = active.reduce((s: number, pl: any) => s + Math.max(0, Number(pl.stock ?? 0)), 0);
    const inStock = active.filter((pl: any) => Number(pl.stock ?? 0) > 0);
    const cheapest = (inStock.length ? inStock : active).sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
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
      discount_percent: p.discount_percent ?? 0,
      minPrice: cheapest ? Number(cheapest.price) : null,
      cheapestPlanId: cheapest?.id ?? null,
      planLabel_ar: cheapest?.label_ar ?? null,
      planLabel_en: cheapest?.label_en ?? null,
      totalStock,
    };
  });
}


function ShopPage() {
  const search = Route.useSearch();
  const { t, lang } = useApp();
  const products = useQuery({
    queryKey: ["products", search],
    queryFn: () => fetchProducts(search),
  });

  const shopIntro = useQuery({
    queryKey: ["site-setting", "shop_intro"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "shop_intro")
        .maybeSingle();
      return (data?.value ?? null) as { ar?: string; en?: string } | null;
    },
  });

  const category = useQuery({
    queryKey: ["category-by-slug", search.category],
    enabled: !!search.category,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("slug, name_ar, name_en")
        .eq("slug", search.category!)
        .maybeSingle();
      return data as { slug: string; name_ar: string; name_en: string } | null;
    },
  });

  const inCategory = !!search.category;
  const catName = category.data ? (lang === "ar" ? category.data.name_ar : category.data.name_en) : search.category;
  const introText =
    (lang === "ar" ? shopIntro.data?.ar : shopIntro.data?.en)?.trim() ||
    (lang === "ar"
      ? "تصفّح متجر RapidKeyz لشراء اشتراكات ChatGPT Plus وMidjourney وCanva Pro وأدوات الـ Ai والترفيه بالجنيه المصري. كل الاشتراكات أصلية 100%، مع تسليم فوري خلال دقائق وضمان طوال مدة الاشتراك."
      : "Browse RapidKeyz to buy ChatGPT Plus, Midjourney, Canva Pro and AI-tool subscriptions in EGP. Every plan is 100% genuine, delivered within minutes and guaranteed for its full duration.");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {inCategory ? (
        <PageHero
          title={catName ?? ""}
          eyebrow={lang === "ar" ? "قسم" : "Category"}
        />
      ) : (
        <>
          <PageHero
            title={t.nav.shop}
            eyebrow={lang === "ar" ? "كل الاشتراكات في مكان واحد" : "All subscriptions in one place"}
          />

          <div className="max-w-4xl mx-auto px-3 sm:px-6 -mt-4 mb-2 text-center">
            <p className="text-sm sm:text-base text-muted-foreground leading-loose whitespace-pre-line">
              {introText}
            </p>
          </div>

          <CategoriesShowcase
            compact
            mini
            activeSlug={search.category}
            slugs={["design", "ai-tools", "software", "educational"]}
          />
        </>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-12 pt-6">
        {products.isLoading && <p className="text-muted-foreground">{t.common.loading}</p>}
        {products.data && products.data.length === 0 && (
          <p className="text-center text-muted-foreground py-16">
            {lang === "ar" ? "لا توجد منتجات تطابق البحث." : "No products match your filters."}
          </p>
        )}
        {products.data && (
          <div
            data-gsap="card-pop"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3"
          >
            {products.data.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}


        {inCategory && (
          <div className="mt-10 flex justify-center">
            <Link
              to="/shop"
              search={{}}
              className="px-5 py-2 rounded-full text-xs sm:text-sm font-bold border border-border bg-card hover:border-brand hover:text-brand transition"
            >
              {t.filters.all}
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
