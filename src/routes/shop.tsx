import { createFileRoute, Link } from "@tanstack/react-router";
import { withTimeout, CRITICAL_LOADER_TIMEOUT_MS } from "@/lib/loader-timeout";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Search, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { CategoriesShowcase } from "@/components/CategoriesShowcase";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { queryOptions } from "@tanstack/react-query";

type ShopSearch = { q?: string; category?: string };

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search.q === "string" && search.q.trim() ? String(search.q) : undefined,
    category:
      typeof search.category === "string" && search.category.trim() ? String(search.category) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "المتجر ,  كل الاشتراكات والخدمات | RapidKeyz" },
      {
        name: "description",
        content:
          "تصفح كل اشتراكات وخدمات RapidKeyz حسب القسم أو ابحث عن الخدمة اللي محتاجها ، تسليم فوري وأسعار مناسبة.",
      },
      { property: "og:title", content: "المتجر ,  كل الاشتراكات والخدمات | RapidKeyz" },
      {
        property: "og:description",
        content: "تصفح كل اشتراكات وخدمات RapidKeyz حسب القسم أو ابحث عن الخدمة اللي محتاجها.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Server-render the catalog so products are visible in the first paint.
  loader: async ({ context }) => {
    const qc = context.queryClient;
    // Deadline-bounded: a slow database must never hold the blank HTML
    // response hostage. The client refetches whatever didn't make it.
    const [categories, products] = await Promise.all([
      withTimeout(qc.ensureQueryData(shopCategoriesQuery()), CRITICAL_LOADER_TIMEOUT_MS, [] as CategoryRow[]),
      withTimeout(qc.ensureQueryData(shopProductsQuery()), CRITICAL_LOADER_TIMEOUT_MS, [] as any[]),
    ]);
    return { categories, products };
  },
  component: ShopPage,
});

type CategoryRow = { id: string; slug: string; name_ar: string | null; name_en: string | null };

function mapProduct(p: any): ProductCardData {
  const active = (p.product_plans ?? []).filter((pl: any) => pl.is_active);
  const cheapest = [...active].sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
  const totalStock = active.reduce((s: number, pl: any) => s + Math.max(0, Number(pl.stock ?? 0)), 0);
  const compare = cheapest ? Number(cheapest.compare_price ?? 0) : 0;
  return {
    id: p.id,
    slug: p.slug,
    name_ar: p.name_ar,
    name_en: p.name_en,
    short_description_ar: p.short_description_ar ?? null,
    short_description_en: p.short_description_en ?? null,
    description_ar: p.description_ar,
    description_en: p.description_en,
    icon_url: p.icon_url,
    delivery_type: p.delivery_type,
    account_type: p.account_type,
    discount_percent: p.discount_percent,
    minPrice: cheapest ? Number(cheapest.price) : null,
    cheapestPlanId: cheapest?.id ?? null,
    planLabel_ar: cheapest?.label_ar ?? null,
    planLabel_en: cheapest?.label_en ?? null,
    totalStock,
    cheapestPlanComparePrice: compare > 0 ? compare : null,
  };
}

const PRODUCT_SELECT =
  "id, slug, name_ar, name_en, short_description_ar, short_description_en, description_ar, description_en, icon_url, delivery_type, account_type, discount_percent, category_id, category_ids, sort_order, product_plans(id, price, compare_price, label_ar, label_en, is_active, sort_order, stock)";

const shopCategoriesQuery = () =>
  queryOptions({
    queryKey: ["shop-categories"] as const,
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name_ar, name_en, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
    staleTime: 60_000,
  });

const shopProductsQuery = () =>
  queryOptions({
    queryKey: ["shop-products"] as const,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

function ShopPage() {
  const { lang } = useApp();
  const isAr = lang === "ar";
  const { q, category } = Route.useSearch();
  const initial = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const [term, setTerm] = useState(q ?? "");

  useEffect(() => {
    setTerm(q ?? "");
  }, [q]);

  const categories = useQuery({
    ...shopCategoriesQuery(),
    initialData: initial.categories,
  });

  const products = useQuery({
    ...shopProductsQuery(),
    initialData: initial.products,
  });



  const activeCategory = useMemo(
    () => (categories.data ?? []).find((c) => c.slug === category) ?? null,
    [categories.data, category],
  );

  const visible = useMemo(() => {
    const rows = products.data ?? [];
    const search = (q ?? "").trim().toLowerCase();
    return rows
      .filter((p: any) => {
        if (activeCategory) {
          const ids: string[] = Array.isArray(p.category_ids) ? p.category_ids : [];
          if (p.category_id !== activeCategory.id && !ids.includes(activeCategory.id)) return false;
        } else if (category && !activeCategory) {
          // Unknown category slug ,  show nothing rather than everything.
          return false;
        }
        if (search) {
          const hay = [p.name_ar, p.name_en, p.description_ar, p.description_en]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      })
      .map(mapProduct);
  }, [products.data, activeCategory, category, q]);

  const setCategory = (slug?: string) => {
    navigate({ search: (prev: ShopSearch) => ({ ...prev, category: slug }), replace: true });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev: ShopSearch) => ({ ...prev, q: term.trim() || undefined }),
      replace: true,
    });
  };

  const loading = products.isLoading || categories.isLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <PageHero
          eyebrow={isAr ? "المتجر" : "Shop"}
          title={
            activeCategory
              ? (isAr ? activeCategory.name_ar : activeCategory.name_en) || activeCategory.slug
              : isAr
                ? "كل الاشتراكات"
                : "All subscriptions"
          }
          subtitle={
            isAr
              ? "اختار القسم اللي يناسبك أو دوّر على الخدمة بالاسم."
              : "Pick a category or search for the service you need."
          }
        />

        <section className="max-w-7xl mx-auto px-3 sm:px-6 pb-16">

          <form onSubmit={submitSearch} className="mb-6 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={isAr ? "ابحث عن خدمة..." : "Search for a service..."}
                className="w-full ps-9 pe-9 py-3 rounded-full bg-muted/40 border border-border text-sm outline-none focus:border-brand transition-colors"
              />
              {term && (
                <button
                  type="button"
                  aria-label={isAr ? "مسح البحث" : "Clear search"}
                  onClick={() => {
                    setTerm("");
                    navigate({ search: (prev: ShopSearch) => ({ ...prev, q: undefined }), replace: true });
                  }}
                  className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-full bg-brand text-brand-foreground text-sm font-bold shadow-lg hover:brand-glow transition-all"
            >
              {isAr ? "بحث" : "Search"}
            </button>
          </form>

          <div className="mb-8">
            <CategoriesShowcase compact mini activeSlug={category} />
            {category && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setCategory(undefined)}
                  className="px-4 py-2 rounded-full text-xs font-bold border border-border bg-card hover:border-brand hover:text-brand transition-colors"
                >
                  {isAr ? "عرض كل الأقسام" : "Show all categories"}
                </button>
              </div>
            )}
          </div>


          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-muted-foreground text-sm">
                {isAr ? "لا توجد خدمات مطابقة لبحثك." : "No services match your search."}
              </p>
              <Link to="/shop" search={{}} className="text-brand font-bold hover:underline text-sm">
                {isAr ? "عرض كل الخدمات" : "Show all services"}
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                {isAr ? `${visible.length} خدمة` : `${visible.length} services`}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {visible.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
