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
  account_type: "private" | "shared";
  status: "active" | "draft" | "archived";
  is_featured: boolean;
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
};

function AdminProducts() {
  const { t } = useApp();
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

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr className="text-start text-xs uppercase tracking-widest text-muted-foreground">
              <th className="p-4 text-start">{t.admin.name}</th>
              <th className="p-4 text-start">{t.admin.status}</th>
              <th className="p-4 text-start">Plans</th>
              <th className="p-4 text-end">{t.admin.actions}</th>
            </tr>
          </thead>
          <tbody>
            {products.data?.map((p: any) => (
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
                    className="text-brand hover:underline text-xs"
                  >
                    {p.product_plans?.length ?? 0} plans
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
                    })}
                    className="text-brand text-sm hover:underline ml-3"
                  >
                    {t.admin.edit}
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete?")) remove.mutate(p.id); }}
                    className="text-destructive text-sm hover:underline ml-3"
                  >
                    {t.admin.delete}
                  </button>
                </td>
              </tr>
            ))}
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
            <form
              onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }}
              className="grid grid-cols-2 gap-3"
            >
              <input required placeholder="slug" value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="col-span-2 px-4 py-2 bg-background border border-border rounded-lg" />
              <input required placeholder="Name (AR)" value={editing.name_ar}
                onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })}
                className="px-4 py-2 bg-background border border-border rounded-lg" />
              <input required placeholder="Name (EN)" value={editing.name_en}
                onChange={(e) => setEditing({ ...editing, name_en: e.target.value })}
                className="px-4 py-2 bg-background border border-border rounded-lg" />
              <textarea placeholder="Description (AR)" value={editing.description_ar}
                onChange={(e) => setEditing({ ...editing, description_ar: e.target.value })}
                className="px-4 py-2 bg-background border border-border rounded-lg" />
              <textarea placeholder="Description (EN)" value={editing.description_en}
                onChange={(e) => setEditing({ ...editing, description_en: e.target.value })}
                className="px-4 py-2 bg-background border border-border rounded-lg" />
              <div className="col-span-2">
                <ImageUpload
                  bucket="product-images"
                  label="صورة المنتج / Product Image"
                  value={editing.icon_url}
                  onChange={(url) => setEditing({ ...editing, icon_url: url })}
                />
              </div>
              <select value={editing.category_id ?? ""}
                onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}
                className="px-4 py-2 bg-background border border-border rounded-lg">
                <option value="">— category —</option>
                {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
              <select value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
                className="px-4 py-2 bg-background border border-border rounded-lg">
                <option value="active">active</option>
                <option value="draft">draft</option>
                <option value="archived">archived</option>
              </select>
              <select value={editing.delivery_type}
                onChange={(e) => setEditing({ ...editing, delivery_type: e.target.value as any })}
                className="px-4 py-2 bg-background border border-border rounded-lg">
                <option value="instant">Instant</option>
                <option value="manual">Manual</option>
              </select>
              <select value={editing.account_type}
                onChange={(e) => setEditing({ ...editing, account_type: e.target.value as any })}
                className="px-4 py-2 bg-background border border-border rounded-lg">
                <option value="private">Private</option>
                <option value="shared">Shared</option>
              </select>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_featured}
                  onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} />
                Featured
              </label>
              <div className="col-span-2 flex gap-3 justify-end pt-4">
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

function PlanEditor({ productId, onClose }: { productId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const plans = useQuery({
    queryKey: ["plans", productId],
    queryFn: async () => (await supabase.from("product_plans").select("*").eq("product_id", productId).order("sort_order")).data ?? [],
  });
  const [form, setForm] = useState({ label_ar: "", label_en: "", duration_days: 30, price: 0, stock: 0 });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_plans").insert({ product_id: productId, ...form, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans", productId] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setForm({ label_ar: "", label_en: "", duration_days: 30, price: 0, stock: 0 });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("product_plans").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", productId] }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-6 overflow-auto">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-6">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold">Plans</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="space-y-2 mb-4">
          {plans.data?.map((p: any) => (
            <div key={p.id} className="flex justify-between items-center p-3 bg-background border border-border rounded-lg">
              <div className="text-sm">
                <span className="font-bold">{p.label_ar}</span>{" "}
                <span className="text-muted-foreground">— {p.price} EGP · stock {p.stock}</span>
              </div>
              <button onClick={() => del.mutate(p.id)} className="text-destructive text-xs">Delete</button>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="grid grid-cols-2 gap-2">
          <input required placeholder="Label AR" value={form.label_ar}
            onChange={(e) => setForm({ ...form, label_ar: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
          <input required placeholder="Label EN" value={form.label_en}
            onChange={(e) => setForm({ ...form, label_en: e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
          <input type="number" placeholder="Duration (days)" value={form.duration_days}
            onChange={(e) => setForm({ ...form, duration_days: +e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
          <input type="number" required placeholder="Price EGP" value={form.price}
            onChange={(e) => setForm({ ...form, price: +e.target.value })}
            className="px-3 py-2 bg-background border border-border rounded" />
          <input type="number" placeholder="Stock" value={form.stock}
            onChange={(e) => setForm({ ...form, stock: +e.target.value })}
            className="col-span-2 px-3 py-2 bg-background border border-border rounded" />
          <button type="submit" className="col-span-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg font-bold">
            + Add plan
          </button>
        </form>
      </div>
    </div>
  );
}
