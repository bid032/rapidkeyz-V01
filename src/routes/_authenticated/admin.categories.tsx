import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const { t } = useApp();
  const qc = useQueryClient();
  const [form, setForm] = useState({ slug: "", name_ar: "", name_en: "", icon: "", sort_order: 0 });

  const cats = useQuery({
    queryKey: ["admin-cats-list"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").insert({ ...form, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cats-list"] });
      setForm({ slug: "", name_ar: "", name_en: "", icon: "", sort_order: 0 });
    },
  });

  const toggle = useMutation({
    mutationFn: async (c: any) => {
      await supabase.from("categories").update({ is_active: !c.is_active }).eq("id", c.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cats-list"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("categories").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-cats-list"] }),
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">{t.admin.categories}</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
        className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6 p-4 bg-card border border-border rounded-2xl"
      >
        <input required placeholder="slug" value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          className="px-3 py-2 bg-background border border-border rounded" />
        <input required placeholder="Name AR" value={form.name_ar}
          onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
          className="px-3 py-2 bg-background border border-border rounded" />
        <input required placeholder="Name EN" value={form.name_en}
          onChange={(e) => setForm({ ...form, name_en: e.target.value })}
          className="px-3 py-2 bg-background border border-border rounded" />
        <input placeholder="icon" value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          className="px-3 py-2 bg-background border border-border rounded" />
        <button type="submit" className="px-3 py-2 bg-brand text-brand-foreground rounded font-bold">
          + {t.admin.addCategory}
        </button>
      </form>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr><th className="p-3 text-start">Slug</th><th className="p-3 text-start">AR</th><th className="p-3 text-start">EN</th><th className="p-3 text-start">Active</th><th></th></tr>
          </thead>
          <tbody>
            {cats.data?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3">{c.slug}</td>
                <td className="p-3">{c.name_ar}</td>
                <td className="p-3">{c.name_en}</td>
                <td className="p-3">
                  <button onClick={() => toggle.mutate(c)}
                    className={`text-xs px-2 py-1 rounded ${c.is_active ? "bg-success/10 text-success" : "bg-muted"}`}>
                    {c.is_active ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="p-3 text-end">
                  <button onClick={() => confirm("Delete?") && del.mutate(c.id)} className="text-destructive text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
