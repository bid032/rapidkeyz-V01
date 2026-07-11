import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Testimonials } from "@/components/Testimonials";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: HomePage,
});

async function fetchFeaturedProducts(): Promise<ProductCardData[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name_ar, name_en, description_ar, description_en, icon_url, delivery_type, account_type, product_plans(price, label_ar, label_en, is_active, sort_order)",
    )
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(9);
  if (error) throw error;
  return (data ?? []).map((p) => {
    const activePlans = (p.product_plans ?? []).filter((pl: any) => pl.is_active);
    const cheapest = activePlans.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
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

async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_ar, name_en, icon")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

function HomePage() {
  const { t, lang } = useApp();

  const products = useQuery({ queryKey: ["featured-products"], queryFn: fetchFeaturedProducts });
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <header className="relative py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold mb-6 tracking-wide uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
            </span>
            {t.home.badge}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] max-w-4xl">
            {t.home.title1} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-cyan-400">
              {t.home.title2}
            </span>
          </h1>
          <p className="max-w-2xl text-muted-foreground text-lg mb-10 leading-relaxed">
            {t.home.subtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/shop"
              className="px-8 py-4 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow transition-all"
            >
              {t.home.cta}
            </Link>
            <a
              href="#trending"
              className="px-8 py-4 rounded-xl font-bold border border-border hover:bg-muted transition-all"
            >
              {t.home.ctaSecondary}
            </a>
          </div>
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-3 rtl:space-x-reverse">
              {["AI", "DS", "EN"].map((i) => (
                <div
                  key={i}
                  className="size-10 rounded-full border-2 border-background bg-card grid place-items-center text-[10px] font-bold"
                >
                  {i}
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{t.home.trusted}</span>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand/20 blur-[120px] rounded-full -z-0 opacity-50"></div>
      </header>

      {/* Categories */}
      {cats.data && cats.data.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-12">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {cats.data.map((c) => (
              <Link
                key={c.id}
                to="/shop"
                search={{ category: c.slug }}
                className="whitespace-nowrap px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium hover:border-brand/50 transition-colors"
              >
                {lang === "ar" ? c.name_ar : c.name_en}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <main id="trending" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-2xl font-bold">{t.home.trending}</h2>
          <Link to="/shop" className="text-sm font-bold text-brand hover:underline">
            {t.home.viewAll} →
          </Link>
        </div>

        {products.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        )}
        {products.data && products.data.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground">
              {lang === "ar" ? "لا توجد منتجات بعد — أضفها من لوحة الأدمن." : "No products yet — add them from the admin panel."}
            </p>
          </div>
        )}
        {products.data && products.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.data.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </main>

      <Testimonials />

      <Footer />
    </div>
  );
}
