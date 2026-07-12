import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { showError } from "@/lib/error-handler";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function AdminCategories() {
  const { t, confirm, notify } = useApp();
  const qc = useQueryClient();
  const [form, setForm] = useState({ slug: "", name_ar: "", name_en: "", sort_order: 0 });

  const cats = useQuery({
    queryKey: ["admin-cats-list"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      const slug = form.slug || slugify(form.name_en || form.name_ar);
      const { error } = await supabase.from("categories").insert({ ...form, slug, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cats-list"] });
      setForm({ slug: "", name_ar: "", name_en: "", sort_order: 0 });
      notify("تم إضافة التصنيف", "success");
    },
    onError: (e: any) => notify(e.message || "خطأ", "error"),
  });

  const toggle = useMutation({
    mutationFn: async (c: any) => {
      await supabase.from("categories").update({ is_active: !c.is_active }).eq("id", c.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cats-list"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("categories").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-cats-list"] }); notify("تم الحذف", "success"); },
  });

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-6">{t.admin.categories}</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-6 p-4 bg-card border border-border rounded-2xl"
      >
        <input required placeholder="الاسم بالعربي" value={form.name_ar}
          onChange={(e) => {
            const name_ar = e.target.value;
            setForm((prev) => ({ ...prev, name_ar, slug: prev.slug || slugify(prev.name_en || name_ar) }));
          }}
          className="w-full min-w-0 px-3 py-2 bg-background border border-border rounded" />
        <input required placeholder="Name (English)" value={form.name_en}
          onChange={(e) => {
            const name_en = e.target.value;
            setForm((prev) => ({ ...prev, name_en, slug: slugify(name_en || prev.name_ar) }));
          }}
          className="w-full min-w-0 px-3 py-2 bg-background border border-border rounded" />
        <input placeholder="slug (تلقائي)" value={form.slug}
          onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
          className="w-full min-w-0 px-3 py-2 bg-background border border-border rounded font-mono text-sm" />
        <button type="submit" className="w-full px-3 py-2 bg-brand text-brand-foreground rounded font-bold">
          + {t.admin.addCategory}
        </button>
      </form>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-muted">
            <tr><th className="p-3 text-start">Slug</th><th className="p-3 text-start">AR</th><th className="p-3 text-start">EN</th><th className="p-3 text-start">Active</th><th></th></tr>
          </thead>
          <tbody>
            {cats.data?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{c.slug}</td>
                <td className="p-3">{c.name_ar}</td>
                <td className="p-3">{c.name_en}</td>
                <td className="p-3">
                  <button onClick={() => toggle.mutate(c)}
                    className={`text-xs px-2 py-1 rounded ${c.is_active ? "bg-success/10 text-success" : "bg-muted"}`}>
                    {c.is_active ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="p-3 text-end">
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "حذف التصنيف",
                        message: `متأكد إنك عاوز تمسح "${c.name_ar}"؟`,
                        tone: "danger",
                        confirmLabel: "احذف",
                      });
                      if (ok) del.mutate(c.id);
                    }}
                    className="text-destructive text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {cats.data?.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{c.name_ar}</div>
                <div className="text-xs text-muted-foreground truncate">{c.name_en}</div>
                <div className="text-[11px] font-mono text-muted-foreground truncate mt-1">{c.slug}</div>
              </div>
              <button onClick={() => toggle.mutate(c)}
                className={`shrink-0 text-xs px-2 py-1 rounded font-bold ${c.is_active ? "bg-success/10 text-success" : "bg-muted"}`}>
                {c.is_active ? "ON" : "OFF"}
              </button>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "حذف التصنيف",
                    message: `متأكد إنك عاوز تمسح "${c.name_ar}"؟`,
                    tone: "danger",
                    confirmLabel: "احذف",
                  });
                  if (ok) del.mutate(c.id);
                }}
                className="text-destructive text-xs font-bold">حذف</button>
            </div>
          </div>
        ))}
        {cats.data?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">مفيش تصنيفات</p>
        )}
      </div>
    </div>
  );
}
