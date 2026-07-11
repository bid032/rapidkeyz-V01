import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

type ProductForm = {
  id?: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon_url: string;
  category_id: string | null;
  delivery_type: "instant" | "manual";
  account_type: "private" | "shared" | "both" | "own";
  status: "active" | "draft" | "archived";
  is_featured: boolean;
  discount_percent: number;
};

const emptyForm: ProductForm = {
  slug: "",
  name_ar: "",
  name_en: "",
  description_ar: "",
  description_en: "",
  icon_url: "",
  category_id: null,
  delivery_type: "instant",
  account_type: "private",
  status: "active",
  is_featured: false,
  discount_percent: 0,
};

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
  const { t, confirm, notify } = useApp();
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
        .select("*, categories(name_ar, name_en), product_plans(id, label_ar, price, stock, is_active)")
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
      const payload: any = { ...f };
      if (f.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold">{t.admin.products}</h1>
        <button
          onClick={() => setEditing({ ...emptyForm })}
          className="px-4 py-2 bg-brand text-brand-foreground rounded-lg font-bold hover:brand-glow"
        >
          + {t.admin.addProduct}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔎 بحث بالاسم أو الـ slug / Search…"
          className="flex-1 min-w-[220px] px-4 py-2 bg-card border border-border rounded-lg text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm"
        >
          <option value="all">كل الحالات / All statuses</option>
          <option value="active">active</option>
          <option value="draft">draft</option>
          <option value="archived">archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm"
        >
          <option value="all">كل الأقسام / All categories</option>
          {cats.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.name_ar}</option>
          ))}
        </select>
        {(search || statusFilter !== "all" || categoryFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); }}
            className="px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            ✕ مسح
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr className="text-start text-xs uppercase tracking-widest text-muted-foreground">
              <th className="p-4 text-start">{t.admin.name}</th>
              <th className="p-4 text-start">{t.admin.status}</th>
              <th className="p-4 text-start">العروض والمخزون</th>
              <th className="p-4 text-end">{t.admin.actions}</th>
            </tr>
          </thead>
          <tbody>
            {products.data
              ?.filter((p: any) => {
                if (statusFilter !== "all" && p.status !== statusFilter) return false;
                if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
                if (search.trim()) {
                  const q = search.trim().toLowerCase();
                  const hay = `${p.name_ar} ${p.name_en} ${p.slug}`.toLowerCase();
                  if (!hay.includes(q)) return false;
                }
                return true;
              })
              .map((p: any) => {
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
                      📦 {totalStock}
                    </span>
                  </button>
                </td>

                <td className="p-4 text-end">
                  <button
                    onClick={() => setEditing({
                      id: p.id, slug: p.slug, name_ar: p.name_ar, name_en: p.name_en,
                      description_ar: p.description_ar ?? "", description_en: p.description_en ?? "",
                      icon_url: p.icon_url ?? "", category_id: p.category_id,
                      delivery_type: p.delivery_type, account_type: p.account_type,
                      status: p.status, is_featured: p.is_featured,
                      discount_percent: p.discount_percent ?? 0,
                    })}
                    className="text-brand text-sm hover:underline ml-3"
                  >
                    {t.admin.edit}
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "حذف الخدمة",
                        message: `متأكد إنك عاوز تمسح "${p.name_ar}"؟ الإجراء ده مش هيرجع.`,
                        tone: "danger",
                        confirmLabel: "احذف",
                      });
                      if (ok) remove.mutate(p.id);
                    }}
                    className="text-destructive text-sm hover:underline ml-3"
                  >
                    {t.admin.delete}
                  </button>
                </td>
              </tr>
            );})}
            {products.data?.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No products yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {planEditor && <PlanEditor productId={planEditor} onClose={() => setPlanEditor(null)} />}

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-6 overflow-auto">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 my-8">
            <h2 className="text-xl font-bold mb-4">
              {editing.id ? t.admin.edit : t.admin.addProduct}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              املأ بيانات المنتج بالعربي والإنجليزي. الحقول اللي عليها ⭐ إجباري.
              <br />
              <span className="text-warning font-bold">ملاحظة:</span> عدد العروض المتاحة (المخزون) و الأسعار بتتظبط من زرار <span className="text-brand font-bold">"Plans"</span> في جدول المنتجات بعد الحفظ.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }}
              className="grid grid-cols-2 gap-4"
            >
              <Field label="⭐ الاسم بالعربي">
                <input required placeholder="نتفليكس بريميوم" value={editing.name_ar}
                  onChange={(e) => {
                    const name_ar = e.target.value;
                    setEditing((prev) => prev && {
                      ...prev,
                      name_ar,
                      slug: !prev.id && !prev.name_en ? slugify(name_ar) : prev.slug,
                    });
                  }}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg" />
              </Field>
              <Field label="⭐ Name (English)">
                <input required placeholder="Netflix Premium" value={editing.name_en}
                  onChange={(e) => {
                    const name_en = e.target.value;
                    setEditing((prev) => prev && {
                      ...prev,
                      name_en,
                      slug: !prev.id ? slugify(name_en) : prev.slug,
                    });
                  }}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg" />
              </Field>
              <Field label="🔗 الرابط (slug)" hint="بيتولّد تلقائيًا من الاسم الإنجليزي. تقدر تعدّله لو حبيت (بالإنجليزي وبدون مسافات)." className="col-span-2">
                <div className="flex gap-2">
                  <input required placeholder="netflix-premium" value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg font-mono text-sm" />
                  <button type="button"
                    onClick={() => setEditing({ ...editing, slug: slugify(editing.name_en || editing.name_ar) })}
                    className="px-3 py-2 text-xs font-bold border border-border rounded-lg hover:bg-muted">
                    🔄 تحديث
                  </button>
                </div>
              </Field>

              <Field label="الوصف بالعربي" hint="وصف مختصر يظهر في كارت المنتج وصفحته">
                <textarea placeholder="اشترك في نتفليكس..." value={editing.description_ar}
                  onChange={(e) => setEditing({ ...editing, description_ar: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg min-h-[80px]" />
              </Field>
              <Field label="Description (English)" hint="Short description shown on the card and product page">
                <textarea placeholder="Subscribe to Netflix..." value={editing.description_en}
                  onChange={(e) => setEditing({ ...editing, description_en: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg min-h-[80px]" />
              </Field>
              <div className="col-span-2">
                <ImageUpload
                  bucket="product-images"
                  label="🖼️ صورة/أيقونة المنتج (اختياري — لو مفيش هيظهر أول حرفين من الاسم)"
                  value={editing.icon_url}
                  onChange={(url) => setEditing({ ...editing, icon_url: url })}
                />
              </div>
              <Field label="📂 القسم" hint="القسم اللي هيتصنّف تحته المنتج في المتجر">
                <select value={editing.category_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg">
                  <option value="">— اختر قسم —</option>
                  {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </Field>
              <Field label="🚦 الحالة" hint="active: ظاهر للعملاء · draft: مخفي (شغل جاري) · archived: مؤرشف">
                <select value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg">
                  <option value="active">active — ظاهر</option>
                  <option value="draft">draft — مسودة</option>
                  <option value="archived">archived — مؤرشف</option>
                </select>
              </Field>
              <Field label="⚡ نوع التسليم" hint="instant: تلقائي فوري من المخزون · manual: الأدمن هيسلمه يدوي">
                <select value={editing.delivery_type}
                  onChange={(e) => setEditing({ ...editing, delivery_type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg">
                  <option value="instant">Instant — تسليم فوري</option>
                  <option value="manual">Manual — تسليم يدوي</option>
                </select>
              </Field>
              <Field label="👤 نوع الحساب" hint="private: خاص للعميل لوحده · shared: مشترك مع ناس تانية · both: العميل يختار بين الاتنين">
                <select value={editing.account_type}
                  onChange={(e) => setEditing({ ...editing, account_type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg">
                  <option value="private">Private — خاص</option>
                  <option value="shared">Shared — مشترك</option>
                  <option value="both">Both — العميل يختار</option>
                </select>
              </Field>
              <Field label="🏷️ نسبة الخصم (%)" hint="لو حددت رقم أكبر من 0 هيبان شارة خصم على صورة المنتج وهيتخصم تلقائيًا من كل الأسعار." className="col-span-2">
                <input
                  type="number"
                  min={0}
                  max={95}
                  value={editing.discount_percent}
                  onChange={(e) => setEditing({ ...editing, discount_percent: Math.max(0, Math.min(95, +e.target.value || 0)) })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg font-bold"
                />
              </Field>
              <label className="col-span-2 flex items-center gap-2 text-sm p-3 bg-background border border-border rounded-lg cursor-pointer">
                <input type="checkbox" checked={editing.is_featured}
                  onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} />
                <span>⭐ <b>Featured</b> — ثبّت المنتج في القسم المميز على الرئيسية</span>
              </label>
              <div className="col-span-2 flex gap-3 justify-end pt-4 border-t border-border">
                <button type="button" onClick={() => setEditing(null)}
                  className="px-4 py-2 border border-border rounded-lg">{t.admin.cancel}</button>
                <button type="submit" disabled={save.isPending}
                  className="px-4 py-2 bg-brand text-brand-foreground rounded-lg font-bold">
                  {save.isPending ? t.common.loading : t.admin.save}
                </button>
              </div>
              {save.error && <p className="col-span-2 text-destructive text-sm">{(save.error as Error).message}</p>}
            </form>

          </div>
        </div>
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
  const { confirm, notify } = useApp();
  const plans = useQuery({
    queryKey: ["plans", productId],
    queryFn: async () => (await supabase.from("product_plans").select("*").eq("product_id", productId).order("duration_days")).data ?? [],
  });
  const [form, setForm] = useState({
    label_ar: "",
    label_en: "",
    duration_months: 1,
    price: 0,
    compare_price: 0,
    stock: 0,
  });

  // Local edits map keyed by plan id — apply on save
  const [edits, setEdits] = useState<Record<string, { price?: number; compare_price?: number | null; stock?: number }>>({});
  const patch = (id: string, k: string, v: any) =>
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [k]: v } }));

  const add = useMutation({
    mutationFn: async () => {
      const payload = {
        product_id: productId,
        label_ar: form.label_ar,
        label_en: form.label_en,
        duration_days: Math.max(1, form.duration_months) * 30,
        price: form.price,
        compare_price: form.compare_price > 0 ? form.compare_price : null,
        stock: form.stock,
        is_active: true,
      };
      const { error } = await supabase.from("product_plans").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans", productId] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setForm({ label_ar: "", label_en: "", duration_months: 1, price: 0, compare_price: 0, stock: 0 });
      notify("تم إضافة العرض", "success");
    },
    onError: (e: any) => notify(e.message || "خطأ", "error"),
  });

  const savePlan = useMutation({
    mutationFn: async (id: string) => {
      const patchData = edits[id];
      if (!patchData) return;
      const clean: any = {};
      if (patchData.price !== undefined) clean.price = patchData.price;
      if (patchData.compare_price !== undefined) clean.compare_price = patchData.compare_price;
      if (patchData.stock !== undefined) clean.stock = patchData.stock;
      const { error } = await supabase.from("product_plans").update(clean).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["plans", productId] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setEdits((prev) => { const c = { ...prev }; delete c[id]; return c; });
      notify("تم حفظ التعديلات", "success");
    },
    onError: (e: any) => notify(e.message || "خطأ", "error"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("product_plans").delete().eq("id", id); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans", productId] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      notify("تم مسح العرض", "success");
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-6 overflow-auto">
      <div className="w-full max-w-3xl bg-card border border-border rounded-2xl p-6 my-8">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">💼 العروض والأسعار والمخزون</h3>
            <p className="text-xs text-muted-foreground mt-1">
              كل عرض = مدة اشتراك بسعر ومخزون. عدّل الأسعار والمخزون ثم اضغط <b className="text-brand">حفظ</b>. لما المخزون يوصل صفر، الشراء بيتقفل تلقائيًا عند العميل.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>

        <div className="space-y-3 my-4">
          {plans.data?.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground bg-background border border-dashed border-border rounded-lg">
              مفيش عروض لسه. ضيف عرض جديد من الفورم تحت 👇
            </div>
          )}
          {plans.data?.map((p: any) => {
            const e = edits[p.id] ?? {};
            const price = e.price ?? p.price;
            const compare = e.compare_price !== undefined ? e.compare_price : p.compare_price;
            const stock = e.stock ?? p.stock;
            const dirty = !!edits[p.id];
            const months = Math.max(1, Math.round((p.duration_days ?? 30) / 30));
            return (
              <div key={p.id} className="p-4 bg-background border border-border rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <div className="text-sm">
                    <div className="font-bold">{p.label_ar} <span className="text-muted-foreground font-normal">/ {p.label_en}</span></div>
                    <div className="text-xs text-muted-foreground mt-0.5">مدة: {months} شهر</div>
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "حذف العرض",
                        message: `مسح عرض "${p.label_ar}"؟`,
                        tone: "danger",
                        confirmLabel: "احذف",
                      });
                      if (ok) del.mutate(p.id);
                    }}
                    className="text-destructive text-xs hover:underline"
                  >مسح</button>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">السعر (EGP)</label>
                    <input
                      type="number"
                      min={0}
                      value={price ?? 0}
                      onChange={(ev) => patch(p.id, "price", +ev.target.value)}
                      className="w-full px-2 py-1.5 bg-card border border-border rounded text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">قبل الخصم</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="اختياري"
                      value={compare ?? ""}
                      onChange={(ev) => patch(p.id, "compare_price", ev.target.value === "" ? null : +ev.target.value)}
                      className="w-full px-2 py-1.5 bg-card border border-border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">المخزون</label>
                    <input
                      type="number"
                      min={0}
                      value={stock ?? 0}
                      onChange={(ev) => patch(p.id, "stock", +ev.target.value)}
                      className="w-full px-2 py-1.5 bg-card border border-border rounded text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs">
                    {stock === 0 ? <span className="text-destructive font-bold">⚠️ نفذ</span> :
                     stock <= 10 ? <span className="text-warning">قارب على الانتهاء</span> :
                     <span className="text-success">متاح</span>}
                  </span>
                  <button
                    onClick={() => savePlan.mutate(p.id)}
                    disabled={!dirty || savePlan.isPending}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      dirty
                        ? "bg-brand text-brand-foreground hover:brand-glow"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {dirty ? "💾 حفظ" : "محفوظ"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="border-t border-border pt-4">
          <h4 className="font-bold text-sm mb-3">➕ إضافة عرض جديد</h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الاسم بالعربي">
              <input required value={form.label_ar}
                onChange={(e) => setForm({ ...form, label_ar: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded" />
            </Field>
            <Field label="Label (English)">
              <input required value={form.label_en}
                onChange={(e) => setForm({ ...form, label_en: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded" />
            </Field>
            <Field label="المدة (بالشهور)">
              <input type="number" min={1} value={form.duration_months}
                onChange={(e) => setForm({ ...form, duration_months: +e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded" />
            </Field>
            <Field label="المخزون">
              <input type="number" min={0} value={form.stock}
                onChange={(e) => setForm({ ...form, stock: +e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded" />
            </Field>
            <Field label="السعر (EGP)">
              <input type="number" required min={0} value={form.price}
                onChange={(e) => setForm({ ...form, price: +e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded" />
            </Field>
            <Field label="السعر قبل الخصم (اختياري)">
              <input type="number" min={0} value={form.compare_price}
                onChange={(e) => setForm({ ...form, compare_price: +e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded" />
            </Field>
          </div>
          <button type="submit" className="w-full mt-4 px-4 py-2 bg-brand text-brand-foreground rounded-lg font-bold">
            + إضافة العرض
          </button>
        </form>
      </div>
    </div>
  );
}

