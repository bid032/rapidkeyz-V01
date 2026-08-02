import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { ImageUpload } from "@/components/ImageUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import { showError } from "@/lib/error-handler";

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(<>{children}</>, document.body);
}

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

type AccountType = "private" | "shared" | "both" | "own";

type ProductForm = {
  id?: string;
  slug: string;
  name_ar: string;
  name_en: string;
  short_description_ar: string;
  short_description_en: string;
  description_ar: string;
  description_en: string;
  icon_url: string;
  loading_icon_url: string;
  category_id: string | null;
  category_ids: string[];
  delivery_type: "instant" | "manual";
  account_type: AccountType;
  account_types: AccountType[];
  status: "active" | "draft" | "archived";
  // is_featured: boolean;
  is_bestseller: boolean;
  discount_percent: number;
  plan_variants: string[];
};

const emptyForm: ProductForm = {
  slug: "",
  name_ar: "",
  name_en: "",
  short_description_ar: "",
  short_description_en: "",
  description_ar: "",
  description_en: "",
  icon_url: "",
  loading_icon_url: "",
  category_id: null,
  category_ids: [],
  delivery_type: "instant",
  account_type: "shared",
  account_types: ["shared"],
  status: "active",
  // is_featured: false,
  is_bestseller: false,
  discount_percent: 0,
  plan_variants: [],
};


/** Reduce a multi-select array into the legacy single account_type enum for backward compat. */
function deriveLegacyAccountType(types: AccountType[]): AccountType {
  const s = new Set(types);
  if (s.has("shared") && s.has("private")) return "both";
  if (s.has("both")) return "both";
  if (s.has("own")) return s.size === 1 ? "own" : "both";
  if (s.has("private")) return "private";
  if (s.has("shared")) return "shared";
  return "shared";
}

/** Turn any text into a URL-safe slug (English + Arabic). */
function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // Arabic diacritics
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function AdminProducts() {
  const { t, lang, confirm, notify } = useApp();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [planEditor, setPlanEditor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name_ar, name_en), product_plans(id, label_ar, price, compare_price, stock, is_active)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cats = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (f: ProductForm) => {
      const types = f.account_types.length > 0 ? f.account_types : ["shared" as const];
      const catIds = Array.from(new Set(f.category_ids.filter(Boolean)));
      const primary = f.category_id && catIds.includes(f.category_id) ? f.category_id : catIds[0] ?? null;
      const cleanVariants = Array.from(new Set(f.plan_variants.map((v) => v.trim()).filter(Boolean)));
      const payload: any = {
        ...f,
        category_id: primary,
        category_ids: catIds,
        account_types: types,
        account_type: deriveLegacyAccountType(types),
        plan_variants: cleanVariants,
      };
      if (f.id) {
        const { data, error } = await supabase.from("products").update(payload).eq("id", f.id).select("id");
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error(lang === "ar"
            ? "التعديل ما اتحفظش — حسابك مش أدمن. سجل دخول بحساب الأدمن."
            : "Update did not persist — your account is not admin. Sign in as admin.");
        }
      } else {
        delete payload.id;
        const { data, error } = await supabase.from("products").insert(payload).select("id");
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error(lang === "ar"
            ? "الإضافة ما اتحفظتش — حسابك مش أدمن."
            : "Insert did not persist — your account is not admin.");
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setEditing(null);
      notify(lang === "ar" ? "تم الحفظ" : "Saved", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      notify(lang === "ar" ? "تم حذف المنتج" : "Product deleted", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-extrabold">{t.admin.products}</h1>
        <button
          onClick={() => setEditing({ ...emptyForm })}
          className="px-4 py-2 bg-brand text-brand-foreground rounded-lg font-bold hover:brand-glow text-sm sm:text-base"
        >
          + {t.admin.addProduct}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2 sm:gap-3 mb-4 items-stretch md:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الـ slug / Search…"
          className="w-full sm:col-span-2 md:flex-1 md:min-w-[220px] min-w-0 px-4 py-2 bg-card border border-border rounded-lg text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="w-full min-w-0 px-3 py-2 bg-card border border-border rounded-lg text-sm"
        >
          <option value="all">كل الحالات / All statuses</option>
          <option value="active">active</option>
          <option value="draft">draft</option>
          <option value="archived">archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full min-w-0 px-3 py-2 bg-card border border-border rounded-lg text-sm"
        >
          <option value="all">كل الأقسام / All categories</option>
          {cats.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar}</option>
          ))}
        </select>
        {(search || statusFilter !== "all" || categoryFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); }}
            className="w-full sm:col-span-2 md:w-auto px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground border border-border rounded-lg md:border-0"
          >
            ✕ مسح
          </button>
        )}
      </div>

      {(() => {
        const filtered = products.data
          ?.filter((p: any) => {
            if (statusFilter !== "all" && p.status !== statusFilter) return false;
            if (categoryFilter !== "all") {
              const list: string[] = Array.isArray(p.category_ids) && p.category_ids.length > 0 ? p.category_ids : (p.category_id ? [p.category_id] : []);
              if (!list.includes(categoryFilter)) return false;
            }
            if (search.trim()) {
              const q = search.trim().toLowerCase();
              const hay = `${p.name_ar} ${p.name_en} ${p.slug}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          }) ?? [];

        const openEdit = (p: any) => {
          const existing = ((p as any).account_types as AccountType[] | null) ?? [];
          const initTypes: AccountType[] = existing.length > 0
            ? existing
            : p.account_type === "both"
              ? ["shared", "private"]
              : [p.account_type as AccountType];
          const existingCats: string[] = Array.isArray((p as any).category_ids) && (p as any).category_ids.length > 0
            ? ((p as any).category_ids as string[])
            : p.category_id ? [p.category_id] : [];
          setEditing({
            id: p.id, slug: p.slug, name_ar: p.name_ar, name_en: p.name_en,
            short_description_ar: p.short_description_ar ?? "", short_description_en: p.short_description_en ?? "",
            description_ar: p.description_ar ?? "", description_en: p.description_en ?? "",
            icon_url: p.icon_url ?? "", loading_icon_url: p.loading_icon_url ?? "", category_id: p.category_id,
            category_ids: existingCats,
            delivery_type: p.delivery_type, account_type: p.account_type,
            account_types: initTypes,
            status: p.status, is_bestseller: (p as any).is_bestseller ?? false,
            // status: p.status, is_featured: p.is_featured, is_bestseller: (p as any).is_bestseller ?? false,
            discount_percent: p.discount_percent ?? 0,
            plan_variants: Array.isArray((p as any).plan_variants) ? ((p as any).plan_variants as string[]) : [],
          });

        };

        const askDelete = async (p: any) => {
          const ok = await confirm({
            title: "حذف الخدمة",
            message: `متأكد إنك عاوز تمسح "${p.name_ar}"؟ الإجراء ده مش هيرجع.`,
            tone: "danger",
            confirmLabel: "احذف",
          });
          if (ok) remove.mutate(p.id);
        };

        return (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-card border border-border rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-muted">
                  <tr className="text-start text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="p-4 text-start">{t.admin.name}</th>
                    <th className="p-4 text-start">{t.admin.status}</th>
                    <th className="p-4 text-start">العروض والمخزون</th>
                    <th className="p-4 text-end">{t.admin.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p: any) => {
                    const totalStock = (p.product_plans ?? []).reduce((s: number, pl: any) => s + (pl.stock ?? 0), 0);
                    const plansCount = p.product_plans?.length ?? 0;
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-4">
                          <div className="font-bold">{p.name_ar}</div>
                          <div className="text-xs text-muted-foreground">{p.name_en} · {p.slug}</div>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded ${p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          <button
                            onClick={() => setPlanEditor(planEditor === p.id ? null : p.id)}
                            className="px-3 py-1.5 bg-brand/10 text-brand hover:bg-brand/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                            title="اضغط لتعديل الأسعار والمخزون"
                          >
                            <span>{plansCount} عرض</span>
                            <span className="text-muted-foreground">·</span>
                            <span className={totalStock === 0 ? "text-destructive" : totalStock <= 10 ? "text-warning" : "text-success"}>
                              {totalStock}
                            </span>
                          </button>
                        </td>
                        <td className="p-4 text-end">
                          <button onClick={() => openEdit(p)} className="text-brand text-sm hover:underline ms-3">
                            {t.admin.edit}
                          </button>
                          <button onClick={() => askDelete(p)} className="text-destructive text-sm hover:underline ms-3">
                            {t.admin.delete}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No products yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((p: any) => {
                const totalStock = (p.product_plans ?? []).reduce((s: number, pl: any) => s + (pl.stock ?? 0), 0);
                const plansCount = p.product_plans?.length ?? 0;
                return (
                  <div key={p.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{p.name_ar}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.name_en}</div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">{p.slug}</div>
                      </div>
                      <span className={`shrink-0 text-[11px] px-2 py-1 rounded font-bold ${p.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {p.status}
                      </span>
                    </div>
                    <button
                      onClick={() => setPlanEditor(planEditor === p.id ? null : p.id)}
                      className="w-full mb-3 px-3 py-2 bg-brand/10 text-brand hover:bg-brand/20 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <span>{plansCount} عرض</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={totalStock === 0 ? "text-destructive" : totalStock <= 10 ? "text-warning" : "text-success"}>
                        مخزون {totalStock}
                      </span>
                    </button>
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button onClick={() => openEdit(p)} className="flex-1 px-3 py-2 bg-brand/10 text-brand rounded-lg text-xs font-bold">
                        {t.admin.edit}
                      </button>
                      <button onClick={() => askDelete(p)} className="flex-1 px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-bold">
                        {t.admin.delete}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No products yet</p>
              )}
            </div>
          </>
        );
      })()}


      {planEditor && <PlanEditor productId={planEditor} onClose={() => setPlanEditor(null)} />}

      {editing && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur overflow-y-auto">
          <div className="min-h-full flex items-start lg:items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-2xl lg:max-w-[min(96vw,1280px)] min-w-0 bg-card border border-border rounded-2xl shadow-2xl my-2 lg:my-4 flex flex-col max-h-[calc(100vh-1rem)] overflow-hidden">
              {/* Header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between shrink-0">
                <h2 className="text-base sm:text-lg font-bold">
                  {editing.id ? t.admin.edit : t.admin.addProduct}
                </h2>
                <button type="button" onClick={() => setEditing(null)}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground" aria-label="close">
                  ✕
                </button>
              </div>

              <form
                id="product-edit-form"
                onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }}
                className="flex-1 min-h-0 overflow-y-auto"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-x-reverse divide-border">
                     {/* Main: names + descriptions + categories + settings */}
                     <div className="lg:col-span-8 p-4 sm:p-6 space-y-5 min-w-0 order-2 lg:order-1">
                    {/* Names + slug in one row */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">معلومات المنتج</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="الاسم بالعربي">
                          <input required placeholder="نتفليكس بريميوم" value={editing.name_ar}
                            onChange={(e) => {
                              const name_ar = e.target.value;
                              setEditing((prev) => prev && {
                                ...prev,
                                name_ar,
                                slug: !prev.id && !prev.name_en ? slugify(name_ar) : prev.slug,
                              });
                            }}
                            className="w-full h-10 px-3 bg-background border border-border rounded-lg" />
                        </Field>
                        <Field label="Name (English)">
                          <input required placeholder="Netflix Premium" value={editing.name_en}
                            onChange={(e) => {
                              const name_en = e.target.value;
                              setEditing((prev) => prev && {
                                ...prev,
                                name_en,
                                slug: slugify(name_en),
                              });
                            }}
                            className="w-full h-10 px-3 bg-background border border-border rounded-lg" dir="ltr" />
                        </Field>
                        <Field label="الرابط (slug)">
                          <input required placeholder="netflix-premium" value={editing.slug}
                            onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                            className="w-full h-10 px-3 bg-background border border-border rounded-lg font-mono text-sm" dir="ltr" />
                        </Field>

                      </div>
                    </section>

                    {/* Short Descriptions */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">الوصف القصير</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="الوصف القصير بالعربي">
                          <input
                            value={editing.short_description_ar}
                            onChange={(e) => setEditing({ ...editing, short_description_ar: e.target.value })}
                            placeholder="وصف مختصر يظهر تحت الصورة..."
                            className="w-full h-10 px-3 bg-background border border-border rounded-lg"
                          />
                        </Field>
                        <Field label="Short Description (English)">
                          <input
                            value={editing.short_description_en}
                            onChange={(e) => setEditing({ ...editing, short_description_en: e.target.value })}
                            placeholder="Short description under the image..."
                            className="w-full h-10 px-3 bg-background border border-border rounded-lg"
                            dir="ltr"
                          />
                        </Field>
                      </div>
                    </section>

                    {/* Full Descriptions */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">الوصف الكامل</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="الوصف بالعربي">
                          <RichTextEditor
                            value={editing.description_ar}
                            onChange={(v) => setEditing({ ...editing, description_ar: v })}
                            placeholder="اشترك في نتفليكس..."
                            dir="rtl"
                            lang="ar"
                          />
                        </Field>
                        <Field label="Description (English)">
                          <RichTextEditor
                            value={editing.description_en}
                            onChange={(v) => setEditing({ ...editing, description_en: v })}
                            placeholder="Subscribe to Netflix..."
                            dir="ltr"
                            lang="en"
                          />
                        </Field>
                      </div>
                    </section>

                    {/* Categories + Status + Delivery */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">الأقسام والحالة</h3>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-6">
                          <Field label="الأقسام">
                            <div className="grid grid-cols-2 gap-2">
                              {cats.data?.map((c) => {
                                const active = editing.category_ids.includes(c.id);
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      const set = new Set(editing.category_ids);
                                      if (set.has(c.id)) set.delete(c.id);
                                      else set.add(c.id);
                                      const next = Array.from(set);
                                      setEditing({
                                        ...editing,
                                        category_ids: next,
                                        category_id: editing.category_id && next.includes(editing.category_id) ? editing.category_id : next[0] ?? null,
                                      });
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition text-start ${
                                      active ? "border-brand bg-brand/10 text-brand" : "border-border bg-background hover:border-brand/40"
                                    }`}
                                  >
                                    <span className="inline-block me-1">{active ? "☑" : "☐"}</span>
                                    {c.name_ar}
                                  </button>
                                );
                              })}
                            </div>
                            {editing.category_ids.length === 0 && (
                              <p className="text-[11px] text-muted-foreground mt-1">اختر قسم واحد على الأقل.</p>
                            )}
                          </Field>
                        </div>
                        <div className="md:col-span-6 grid grid-cols-2 gap-3 content-start">
                          <Field label="الحالة">
                            <select value={editing.status}
                              onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
                              className="w-full h-10 px-2 bg-background border border-border rounded-lg text-sm">
                              <option value="active">ظاهر</option>
                              <option value="draft">مسودة</option>
                              <option value="archived">مؤرشف</option>
                            </select>
                          </Field>
                          <Field label="نوع التسليم">
                            <select value={editing.delivery_type}
                              onChange={(e) => setEditing({ ...editing, delivery_type: e.target.value as any })}
                              className="w-full h-10 px-2 bg-background border border-border rounded-lg text-sm">
                              <option value="instant">فوري</option>
                              <option value="manual">يدوي</option>
                            </select>
                          </Field>
                        </div>
                      </div>

                    </section>

                    {/* Account types + Discount */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">الحساب والخصم</h3>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-8">
                          <Field label="أنواع الحساب">
                            <div className="grid grid-cols-3 gap-2">
                              {([
                                { v: "shared", label: "شير" },
                                { v: "private", label: "برايفت" },
                                { v: "own", label: "من عندنا" },
                              ] as const).map((o) => {
                                const active = editing.account_types.includes(o.v as AccountType);
                                return (
                                  <button
                                    key={o.v}
                                    type="button"
                                    onClick={() => {
                                      const set = new Set(editing.account_types);
                                      if (set.has(o.v as AccountType)) set.delete(o.v as AccountType);
                                      else set.add(o.v as AccountType);
                                      setEditing({ ...editing, account_types: Array.from(set) as AccountType[] });
                                    }}
                                    className={`h-10 px-2 rounded-lg text-xs font-bold border transition ${
                                      active
                                        ? "border-brand bg-brand/10 text-brand"
                                        : "border-border bg-background hover:border-brand/40"
                                    }`}
                                  >
                                    {o.label}
                                  </button>
                                );
                              })}
                            </div>
                            {editing.account_types.length === 0 && (
                              <p className="text-[11px] text-destructive mt-1">اختر نوع واحد على الأقل.</p>
                            )}
                          </Field>
                        </div>
                        <div className="md:col-span-4">
                          <Field label="نسبة الخصم (%)">
                            <input
                              type="number"
                              min={0}
                              max={95}
                              value={editing.discount_percent}
                              onChange={(e) => setEditing({ ...editing, discount_percent: Math.max(0, Math.min(95, +e.target.value || 0)) })}
                              className="w-full h-10 px-3 bg-background border border-border rounded-lg font-bold"
                            />
                          </Field>
                        </div>
                      </div>
                    </section>

                    {/* Plan Variants (e.g. LinkedIn: Premium Career / Sales Navigator Core / Recruiter Lite) */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">أنواع الخطط</h3>
                      <div className="p-3 bg-background border border-border rounded-xl space-y-3">
                        <label className="flex items-start gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={editing.plan_variants.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditing({ ...editing, plan_variants: editing.plan_variants.length ? editing.plan_variants : [""] });
                              } else {
                                setEditing({ ...editing, plan_variants: [] });
                              }
                            }}
                          />
                          <span className="min-w-0 flex-1">
                            <b>الخدمة فيها أنواع خطط؟</b>
                            <span className="block text-[11px] text-muted-foreground mt-0.5 leading-relaxed break-words">
                              زي مثلاً <bdi>LinkedIn</bdi>:{" "}
                              <bdi>Premium Career</bdi>، <bdi>Premium Business</bdi>،{" "}
                              <bdi>Sales Navigator Core</bdi>، <bdi>Recruiter Lite</bdi>،{" "}
                              <bdi>LinkedIn Learning</bdi>. كل خطة سعر بتتربط بنوع واحد منهم.
                            </span>
                          </span>
                        </label>

                        {editing.plan_variants.length > 0 && (
                          <div className="space-y-2">
                            {editing.plan_variants.map((v, i) => (
                              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <input
                                  value={v}
                                  dir="ltr"
                                  placeholder={`Variant ${i + 1} — e.g. Premium Career`}
                                  onChange={(e) => {
                                    const next = [...editing.plan_variants];
                                    next[i] = e.target.value;
                                    setEditing({ ...editing, plan_variants: next });
                                  }}
                                  className="flex-1 min-w-0 h-9 px-3 bg-card border border-border rounded-lg text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditing({ ...editing, plan_variants: editing.plan_variants.filter((_, j) => j !== i) })}
                                  className="shrink-0 h-9 px-3 border border-destructive/40 text-destructive rounded-lg text-xs font-bold hover:bg-destructive/10 self-end sm:self-auto"
                                >
                                  حذف
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setEditing({ ...editing, plan_variants: [...editing.plan_variants, ""] })}
                              className="w-full h-9 border border-dashed border-brand/40 text-brand rounded-lg text-xs font-bold hover:bg-brand/5"
                            >
                              + إضافة نوع
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>


                  {/* Sidebar (left in RTL): large image + flags */}
                  <div className="lg:col-span-4 bg-muted/30 p-4 sm:p-6 space-y-5 order-1 lg:order-2">
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">صور الخدمة</h3>
                      <div className="p-3 bg-background border border-border rounded-xl space-y-3">
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold">صورة / أيقونة الخدمة</p>
                          <ImageUpload
                            bucket="product-images"
                            label=""
                            compact
                            value={editing.icon_url}
                            onChange={(url) => setEditing({ ...editing, icon_url: url })}
                            size={0}
                            requireAspectRatio={{ w: 1, h: 1 }}
                          />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">نسبة 1:1 — اختياري، لو مفيش صورة هيظهر أول حرفين من الاسم.</p>
                        </div>
                        <div className="pt-3 border-t border-border space-y-1.5">
                          <p className="text-[11px] font-bold">أيقونة التحميل</p>
                          <ImageUpload
                            bucket="product-images"
                            label=""
                            compact
                            value={editing.loading_icon_url}
                            onChange={(url) => setEditing({ ...editing, loading_icon_url: url })}
                            size={0}
                            requireAspectRatio={{ w: 1, h: 1 }}
                          />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">نسبة 1:1 — اختياري، تظهر أثناء تحميل الخدمة.</p>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2">
                      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">التمييز</h3>
                      {/* <label className="flex items-center justify-between gap-2 text-xs p-2.5 bg-background border border-border rounded-lg cursor-pointer">
                        <span><b>Featured</b> ، مثبّت في القسم المميز</span>
                        <input type="checkbox" checked={editing.is_featured}
                          onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} />
                      </label> */}
                      <label className="flex items-center justify-between gap-2 text-xs p-2.5 bg-background border border-border rounded-lg cursor-pointer">
                        <span><b>الأكثر مبيعاً</b></span>
                        <input type="checkbox" checked={editing.is_bestseller}
                          onChange={(e) => setEditing({ ...editing, is_bestseller: e.target.checked })} />
                      </label>
                    </section>
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="px-4 sm:px-6 py-3 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0 bg-card">
                <p className="text-[11px] text-muted-foreground order-2 sm:order-1">
                  <span className="text-warning font-bold">ملاحظة:</span> الأسعار والمخزون بتتظبط من زرار <span className="text-brand font-bold">"Plans"</span> بعد الحفظ.
                </p>
                <div className="flex gap-2 order-1 sm:order-2 justify-end">
                  <button type="button" onClick={() => setEditing(null)}
                    className="px-4 py-2 border border-border rounded-lg text-sm">{t.admin.cancel}</button>
                  <button type="submit" form="product-edit-form" disabled={save.isPending}
                    className="px-6 py-2 bg-brand text-brand-foreground rounded-lg font-bold text-sm">
                    {save.isPending ? t.common.loading : t.admin.save}
                  </button>
                </div>
              </div>
              {save.error && <p className="px-6 pb-3 text-destructive text-xs">{(save.error as Error).message}</p>}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-sm font-bold mb-1">{label}</label>
      {hint && <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function PlanEditor({ productId, onClose }: { productId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { lang, confirm, notify } = useApp();
  const productMeta = useQuery({
    queryKey: ["plan-editor-product", productId],
    queryFn: async () => (await supabase.from("products").select("account_types, account_type, plan_variants").eq("id", productId).maybeSingle()).data,
  });
  const acctTypes: ("private" | "shared" | "own")[] = (() => {
    const arr = (productMeta.data as any)?.account_types as string[] | null;
    const legacy = (productMeta.data as any)?.account_type as string | null;
    let types: string[] = Array.isArray(arr) && arr.length > 0
      ? arr
      : legacy === "both" ? ["private", "shared"] : legacy ? [legacy] : [];
    return types.filter((a) => a === "private" || a === "shared" || a === "own") as any;
  })();
  const showAcctPicker = acctTypes.length > 1;
  const variantOptions: string[] = Array.isArray((productMeta.data as any)?.plan_variants)
    ? ((productMeta.data as any).plan_variants as string[]).filter(Boolean)
    : [];
  const showVariantPicker = variantOptions.length > 0;
  const acctLabel = (a: string) =>
    a === "private" ? "خاص" : a === "shared" ? "مشترك" : a === "own" ? "من عندك" : "الكل";
  const plans = useQuery({
    queryKey: ["plans", productId],
    queryFn: async () => (await supabase.from("product_plans").select("id, product_id, label_ar, label_en, duration_days, price, compare_price, stock, is_active, sort_order, sheet_csv_url, account_type, plan_variant").eq("product_id", productId).order("duration_days")).data ?? [],
  });

  const costs = useQuery({
    queryKey: ["plan-costs", productId],
    enabled: !!plans.data,
    queryFn: async () => {
      const ids = (plans.data ?? []).map((p: any) => p.id);
      if (ids.length === 0) return {} as Record<string, number>;
      const { data } = await supabase.from("plan_costs").select("plan_id, cost_price").in("plan_id", ids);
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { m[r.plan_id] = Number(r.cost_price ?? 0); });
      return m;
    },
  });

  const [form, setForm] = useState({
    label_ar: "",
    label_en: "",
    duration_months: 1,
    price: 0,
    compare_price: 0,
    cost_price: 0,
    stock: 0,
    account_type: "" as "" | "private" | "shared" | "own",
    plan_variant: "" as string,
  });

  // Local edits map keyed by plan id , apply on save
  const [edits, setEdits] = useState<Record<string, { label_ar?: string; label_en?: string; duration_days?: number; price?: number; compare_price?: number | null; stock?: number; cost_price?: number; account_type?: "private" | "shared" | "own" | null; plan_variant?: string | null }>>({});

  const patch = (id: string, k: string, v: any) =>
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [k]: v } }));


  const add = useMutation({
    mutationFn: async () => {
      const payload: any = {
        product_id: productId,
        label_ar: form.label_ar,
        label_en: form.label_en,
        duration_days: Math.max(1, form.duration_months) * 30,
        price: form.price,
        compare_price: form.compare_price > 0 ? form.compare_price : null,
        stock: form.stock,
        is_active: true,
        account_type: form.account_type || null,
        plan_variant: form.plan_variant || null,
      };
      const { data: inserted, error } = await supabase.from("product_plans").insert(payload).select().single();
      if (error) throw error;
      if (form.cost_price > 0 && inserted) {
        await supabase.from("plan_costs").upsert({ plan_id: inserted.id, cost_price: form.cost_price });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans", productId] });
      qc.invalidateQueries({ queryKey: ["plan-costs", productId] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setForm({ label_ar: "", label_en: "", duration_months: 1, price: 0, compare_price: 0, cost_price: 0, stock: 0, account_type: "", plan_variant: "" });
      notify(lang === "ar" ? "تم إضافة العرض" : "Plan added", "success");
    },

    onError: (e) => showError(e, notify, lang),
  });


  const saveAll = useMutation({
    mutationFn: async () => {
      const ids = Object.keys(edits);
      for (const id of ids) {
        const patchData = edits[id];
        if (!patchData) continue;
        const clean: any = {};
        if (patchData.label_ar !== undefined) clean.label_ar = patchData.label_ar;
        if (patchData.label_en !== undefined) clean.label_en = patchData.label_en;
        if (patchData.duration_days !== undefined) clean.duration_days = patchData.duration_days;
        if (patchData.price !== undefined) clean.price = patchData.price;
        if (patchData.compare_price !== undefined) clean.compare_price = patchData.compare_price;
        if (patchData.stock !== undefined) clean.stock = patchData.stock;
        if (patchData.account_type !== undefined) clean.account_type = patchData.account_type;
        if (patchData.plan_variant !== undefined) clean.plan_variant = patchData.plan_variant;
        if (Object.keys(clean).length > 0) {
          const { error } = await supabase.from("product_plans").update(clean).eq("id", id);
          if (error) throw error;
        }
        if (patchData.cost_price !== undefined) {
          const { error } = await supabase.from("plan_costs").upsert({ plan_id: id, cost_price: patchData.cost_price });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans", productId] });
      qc.invalidateQueries({ queryKey: ["plan-costs", productId] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setEdits({});
      notify(lang === "ar" ? "تم حفظ التعديلات" : "Changes saved", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });


  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans", productId] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      notify(lang === "ar" ? "تم مسح العرض" : "Plan deleted", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const dirtyCount = Object.keys(edits).length;

  const [showAdd, setShowAdd] = useState(false);

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-[min(98vw,1500px)] h-[95vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <div className="flex justify-between items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-gradient-to-b from-muted/40 to-transparent shrink-0">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center text-lg shrink-0">💼</div>
            <div className="min-w-0">
              <h3 className="font-black text-base sm:text-lg leading-tight">العروض والأسعار والمخزون</h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                كل صف = عرض بمدة وسعر ومخزون. <b className="text-warning">سعر الشراء</b> بيظهرلك أنت بس لحساب الربح.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-brand-foreground text-sm font-black hover:brand-glow transition"
            >
              <span className="text-base leading-none">＋</span> إضافة عرض
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-lg leading-none transition">✕</button>
          </div>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto">
          {/* Collapsible Add form */}
          {showAdd && (
            <form onSubmit={(ev) => { ev.preventDefault(); add.mutate(); }} className="p-3 sm:p-4 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs">+</span>
                  إضافة عرض جديد
                </h4>
                <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-muted-foreground hover:text-foreground">إخفاء</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 min-w-0">
                <Field label="عربي">
                  <input required value={form.label_ar} onChange={(e) => setForm({ ...form, label_ar: e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm" />
                </Field>
                <Field label="English">
                  <input required value={form.label_en} onChange={(e) => setForm({ ...form, label_en: e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm" />
                </Field>
                <Field label="شهور">
                  <input type="number" min={1} value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: +e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm" />
                </Field>
                <Field label="سعر البيع">
                  <input type="number" required min={0} value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm font-bold" />
                </Field>
                <Field label="قبل الخصم">
                  <input type="number" min={0} value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: +e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm" />
                </Field>
                <Field label="سعر الشراء">
                  <input type="number" min={0} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })}
                    className="w-full px-2 py-1.5 bg-warning/5 border border-warning/30 rounded text-sm" />
                </Field>
                <Field label="المخزون">
                  <input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm" />
                </Field>
                <div className="flex flex-col justify-end">
                  <button type="submit" disabled={add.isPending}
                    className="w-full px-3 py-1.5 bg-brand text-brand-foreground rounded font-black text-sm hover:brand-glow transition disabled:opacity-60">
                    {add.isPending ? "..." : "+ إضافة"}
                  </button>
                </div>
                {(showAcctPicker || showVariantPicker) && (
                  <div className="col-span-2 md:col-span-4 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {showAcctPicker && (
                      <Field label="نوع الحساب">
                        <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value as any })}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm">
                          <option value="">— لكل الأنواع —</option>
                          {acctTypes.map((a) => (<option key={a} value={a}>{acctLabel(a)}</option>))}
                        </select>
                      </Field>
                    )}
                    {showVariantPicker && (
                      <Field label="نوع الخطة">
                        <select value={form.plan_variant} onChange={(e) => setForm({ ...form, plan_variant: e.target.value })}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm">
                          <option value="">— بدون تحديد —</option>
                          {variantOptions.map((v) => (<option key={v} value={v}>{v}</option>))}
                        </select>
                      </Field>
                    )}
                  </div>
                )}
              </div>
            </form>
          )}

          {/* Empty state */}
          {plans.data?.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              مفيش عروض لسه. دوس <b>«إضافة عرض»</b> فوق.
            </div>
          )}

          {/* Table (desktop) */}
          {(plans.data?.length ?? 0) > 0 && (
            <div className="hidden lg:block">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                  <tr className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                    <th className="text-start px-3 py-2 border-b border-border">العرض</th>
                    <th className="text-start px-2 py-2 border-b border-border">المدة</th>
                    {showAcctPicker && <th className="text-start px-2 py-2 border-b border-border">نوع الحساب</th>}
                    {showVariantPicker && <th className="text-start px-2 py-2 border-b border-border">نوع الخطة</th>}
                    <th className="text-start px-2 py-2 border-b border-border">سعر البيع</th>
                    <th className="text-start px-2 py-2 border-b border-border">قبل الخصم</th>
                    <th className="text-start px-2 py-2 border-b border-border text-warning">سعر الشراء</th>
                    <th className="text-start px-2 py-2 border-b border-border">المخزون</th>
                    <th className="text-start px-2 py-2 border-b border-border">الربح</th>
                    <th className="text-start px-2 py-2 border-b border-border">الحالة</th>
                    <th className="text-center px-2 py-2 border-b border-border w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {plans.data?.map((p: any) => {
                    const e = edits[p.id] ?? {};
                    const price = e.price ?? p.price;
                    const compare = e.compare_price !== undefined ? e.compare_price : p.compare_price;
                    const stock = e.stock ?? p.stock;
                    const cost = e.cost_price !== undefined ? e.cost_price : (costs.data?.[p.id] ?? 0);
                    const dirty = !!edits[p.id];
                    const labelAr = e.label_ar !== undefined ? e.label_ar : (p.label_ar ?? "");
                    const labelEn = e.label_en !== undefined ? e.label_en : (p.label_en ?? "");
                    const months = Math.max(1, Math.round(((e.duration_days ?? p.duration_days) ?? 30) / 30));
                    const margin = Number(price) - Number(cost);
                    const currentAcct = (e.account_type !== undefined ? e.account_type : p.account_type) ?? "";
                    const currentVariant = (e.plan_variant !== undefined ? e.plan_variant : p.plan_variant) ?? "";
                    return (
                      <tr key={p.id} className={`transition ${dirty ? "bg-brand/5" : "hover:bg-muted/30"}`}>
                        <td className="px-3 py-2 border-b border-border/60 relative">
                          {dirty && <span className="absolute inset-y-0 start-0 w-1 bg-brand rounded-e" />}
                          <input value={labelAr}
                            onChange={(ev) => patch(p.id, "label_ar", ev.target.value)}
                            className="w-full min-w-[150px] px-2 py-1 bg-card border border-border rounded text-sm font-black focus:outline-none focus:border-brand" />
                          <input value={labelEn} dir="ltr"
                            onChange={(ev) => patch(p.id, "label_en", ev.target.value)}
                            className="mt-1 w-full min-w-[150px] px-2 py-1 bg-card border border-border rounded text-[11px] text-muted-foreground focus:outline-none focus:border-brand" />
                        </td>
                        <td className="px-2 py-2 border-b border-border/60">
                          <div className="flex items-center gap-1">
                            <input type="number" min={1} value={months}
                              onChange={(ev) => patch(p.id, "duration_days", Math.max(1, +ev.target.value || 1) * 30)}
                              className="w-16 px-2 py-1 bg-card border border-border rounded text-sm font-bold focus:outline-none focus:border-brand" />
                            <span className="text-[11px] text-muted-foreground">شهر</span>
                          </div>
                        </td>
                        {showAcctPicker && (
                          <td className="px-2 py-2 border-b border-border/60">
                            <select value={currentAcct}
                              onChange={(ev) => patch(p.id, "account_type", ev.target.value === "" ? null : ev.target.value)}
                              className="w-full min-w-[110px] px-2 py-1 bg-card border border-border rounded text-xs font-bold focus:outline-none focus:border-brand">
                              <option value="">— الكل —</option>
                              {acctTypes.map((a) => (<option key={a} value={a}>{acctLabel(a)}</option>))}
                            </select>
                          </td>
                        )}
                        {showVariantPicker && (
                          <td className="px-2 py-2 border-b border-border/60">
                            <select value={currentVariant}
                              onChange={(ev) => patch(p.id, "plan_variant", ev.target.value === "" ? null : ev.target.value)}
                              className="w-full min-w-[130px] px-2 py-1 bg-card border border-border rounded text-xs font-bold focus:outline-none focus:border-warning">
                              <option value="">— بدون —</option>
                              {variantOptions.map((v) => (<option key={v} value={v}>{v}</option>))}
                            </select>
                          </td>
                        )}
                        <td className="px-2 py-2 border-b border-border/60">
                          <input type="number" min={0} value={price ?? 0}
                            onChange={(ev) => patch(p.id, "price", +ev.target.value)}
                            className="w-24 px-2 py-1 bg-card border border-border rounded text-sm font-bold focus:outline-none focus:border-brand" />
                        </td>
                        <td className="px-2 py-2 border-b border-border/60">
                          <input type="number" min={0} placeholder="—" value={compare ?? ""}
                            onChange={(ev) => patch(p.id, "compare_price", ev.target.value === "" ? null : +ev.target.value)}
                            className="w-24 px-2 py-1 bg-card border border-border rounded text-sm focus:outline-none focus:border-brand" />
                        </td>
                        <td className="px-2 py-2 border-b border-border/60">
                          <input type="number" min={0} value={cost ?? 0}
                            onChange={(ev) => patch(p.id, "cost_price", +ev.target.value)}
                            className="w-24 px-2 py-1 bg-warning/5 border border-warning/30 rounded text-sm font-bold focus:outline-none focus:border-warning" />
                        </td>
                        <td className="px-2 py-2 border-b border-border/60">
                          <input type="number" min={0} value={stock ?? 0}
                            onChange={(ev) => patch(p.id, "stock", +ev.target.value)}
                            className="w-20 px-2 py-1 bg-card border border-border rounded text-sm font-bold focus:outline-none focus:border-brand" />
                        </td>
                        <td className="px-2 py-2 border-b border-border/60">
                          <span className={`px-2 py-0.5 rounded text-xs font-black whitespace-nowrap ${margin > 0 ? "bg-success/10 text-success" : margin < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                            {margin} EGP
                          </span>
                        </td>
                        <td className="px-2 py-2 border-b border-border/60">
                          {stock === 0 ? (
                            <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-xs font-bold">نفذ</span>
                          ) : stock <= 10 ? (
                            <span className="px-2 py-0.5 rounded bg-warning/10 text-warning text-xs font-bold">قليل</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-success/10 text-success text-xs font-bold">متاح</span>
                          )}
                        </td>
                        <td className="px-2 py-2 border-b border-border/60 text-center">
                          <button
                            onClick={async () => {
                              const ok = await confirm({ title: "حذف العرض", message: `مسح عرض "${p.label_ar}"؟`, tone: "danger", confirmLabel: "احذف" });
                              if (ok) del.mutate(p.id);
                            }}
                            className="text-destructive text-xs font-bold hover:bg-destructive/10 px-2 py-1 rounded"
                            title="مسح"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Cards (mobile / tablet) */}
          {(plans.data?.length ?? 0) > 0 && (
            <div className="lg:hidden p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {plans.data?.map((p: any) => {
                const e = edits[p.id] ?? {};
                const price = e.price ?? p.price;
                const compare = e.compare_price !== undefined ? e.compare_price : p.compare_price;
                const stock = e.stock ?? p.stock;
                const cost = e.cost_price !== undefined ? e.cost_price : (costs.data?.[p.id] ?? 0);
                const dirty = !!edits[p.id];
                const labelAr = e.label_ar !== undefined ? e.label_ar : (p.label_ar ?? "");
                const labelEn = e.label_en !== undefined ? e.label_en : (p.label_en ?? "");
                const months = Math.max(1, Math.round(((e.duration_days ?? p.duration_days) ?? 30) / 30));
                const margin = Number(price) - Number(cost);
                const currentAcct = (e.account_type !== undefined ? e.account_type : p.account_type) ?? "";
                const currentVariant = (e.plan_variant !== undefined ? e.plan_variant : p.plan_variant) ?? "";
                return (
                  <div key={p.id} className={`p-3 bg-background rounded-xl border-2 transition ${dirty ? "border-brand" : "border-border"}`}>
                    <div className="flex justify-between items-start mb-2 pb-2 border-b border-border gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <input value={labelAr} onChange={(ev) => patch(p.id, "label_ar", ev.target.value)}
                          className="w-full px-2 py-1 bg-card border border-border rounded text-sm font-black" />
                        <input value={labelEn} dir="ltr" onChange={(ev) => patch(p.id, "label_en", ev.target.value)}
                          className="w-full px-2 py-1 bg-card border border-border rounded text-[11px]" />
                        <div className="flex items-center gap-1">
                          <input type="number" min={1} value={months}
                            onChange={(ev) => patch(p.id, "duration_days", Math.max(1, +ev.target.value || 1) * 30)}
                            className="w-16 px-2 py-1 bg-card border border-border rounded text-xs font-bold" />
                          <span className="text-[10px] text-muted-foreground">شهر</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.account_type && <span className="px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[10px] font-bold">{acctLabel(p.account_type)}</span>}
                          {p.plan_variant && <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning text-[10px] font-bold">{p.plan_variant}</span>}
                          {dirty && <span className="px-1.5 py-0.5 rounded bg-brand text-brand-foreground text-[10px] font-bold">معدّل</span>}
                        </div>
                      </div>
                      <button onClick={async () => {
                        const ok = await confirm({ title: "حذف العرض", message: `مسح "${p.label_ar}"؟`, tone: "danger", confirmLabel: "احذف" });
                        if (ok) del.mutate(p.id);
                      }} className="text-destructive text-xs font-bold hover:bg-destructive/10 px-2 py-1 rounded shrink-0">✕</button>
                    </div>
                    {(showAcctPicker || showVariantPicker) && (
                      <div className={`grid gap-2 mb-2 ${showAcctPicker && showVariantPicker ? "grid-cols-2" : "grid-cols-1"}`}>
                        {showAcctPicker && (
                          <select value={currentAcct} onChange={(ev) => patch(p.id, "account_type", ev.target.value === "" ? null : ev.target.value)}
                            className="w-full px-2 py-1 bg-card border border-border rounded text-xs font-bold">
                            <option value="">نوع الحساب — الكل</option>
                            {acctTypes.map((a) => (<option key={a} value={a}>{acctLabel(a)}</option>))}
                          </select>
                        )}
                        {showVariantPicker && (
                          <select value={currentVariant} onChange={(ev) => patch(p.id, "plan_variant", ev.target.value === "" ? null : ev.target.value)}
                            className="w-full px-2 py-1 bg-card border border-border rounded text-xs font-bold">
                            <option value="">نوع الخطة — بدون</option>
                            {variantOptions.map((v) => (<option key={v} value={v}>{v}</option>))}
                          </select>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] font-black text-muted-foreground uppercase">سعر البيع</span>
                        <input type="number" min={0} value={price ?? 0} onChange={(ev) => patch(p.id, "price", +ev.target.value)}
                          className="w-full px-2 py-1 bg-card border border-border rounded text-sm font-bold" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black text-muted-foreground uppercase">قبل الخصم</span>
                        <input type="number" min={0} placeholder="—" value={compare ?? ""} onChange={(ev) => patch(p.id, "compare_price", ev.target.value === "" ? null : +ev.target.value)}
                          className="w-full px-2 py-1 bg-card border border-border rounded text-sm" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black text-warning uppercase">سعر الشراء</span>
                        <input type="number" min={0} value={cost ?? 0} onChange={(ev) => patch(p.id, "cost_price", +ev.target.value)}
                          className="w-full px-2 py-1 bg-warning/5 border border-warning/30 rounded text-sm font-bold" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black text-muted-foreground uppercase">المخزون</span>
                        <input type="number" min={0} value={stock ?? 0} onChange={(ev) => patch(p.id, "stock", +ev.target.value)}
                          className="w-full px-2 py-1 bg-card border border-border rounded text-sm font-bold" />
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border text-xs flex-wrap">
                      {stock === 0 ? <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive font-bold">نفذ</span>
                        : stock <= 10 ? <span className="px-2 py-0.5 rounded bg-warning/10 text-warning font-bold">قليل</span>
                        : <span className="px-2 py-0.5 rounded bg-success/10 text-success font-bold">متاح</span>}
                      <span className={`px-2 py-0.5 rounded font-bold ${margin > 0 ? "bg-success/10 text-success" : margin < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        ربح: {margin} EGP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-border bg-card/95 backdrop-blur px-3 sm:px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs sm:text-sm min-w-0">
            <span className="text-muted-foreground whitespace-nowrap">{plans.data?.length ?? 0} عرض</span>
            {dirtyCount > 0 ? (
              <span className="font-black text-brand truncate">• {dirtyCount} تعديل غير محفوظ</span>
            ) : (
              <span className="text-muted-foreground truncate">• كل التعديلات محفوظة</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="sm:hidden px-3 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-black"
            >+</button>
            <button
              onClick={() => setEdits({})}
              disabled={dirtyCount === 0 || saveAll.isPending}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition ${dirtyCount === 0 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-muted text-foreground hover:bg-muted/70"}`}
            >
              إلغاء
            </button>
            <button
              onClick={() => saveAll.mutate()}
              disabled={dirtyCount === 0 || saveAll.isPending}
              className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-black transition ${dirtyCount === 0 ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-brand text-brand-foreground hover:brand-glow"}`}
            >
              {saveAll.isPending ? "جاري الحفظ..." : `حفظ الكل${dirtyCount ? ` (${dirtyCount})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}



