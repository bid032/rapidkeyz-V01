import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/ImageUpload";
import { useApp } from "@/contexts/AppContext";
import { showError } from "@/lib/error-handler";

export const Route = createFileRoute("/_authenticated/admin/testimonials")({
  component: AdminTestimonials,
});

function AdminTestimonials() {
  const qc = useQueryClient();
  const { confirm, notify, lang } = useApp();

  const list = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonial_images")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase.from("testimonial_images").insert({ image_url: url });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      notify(lang === "ar" ? "تمت الإضافة" : "Added", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("testimonial_images").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-testimonials"] }),
    onError: (e) => showError(e, notify, lang),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonial_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      notify(lang === "ar" ? "تم الحذف" : "Deleted", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">آراء العملاء / Testimonials</h1>
      <p className="text-sm text-muted-foreground mb-6">
        ارفع صور آراء العملاء وهتظهر في السلايدر في الصفحة الرئيسية.
      </p>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <ImageUpload
          bucket="testimonial-images"
          label="+ إضافة صورة رأي عميل (نسبة 4:5 — أي مقاس)"
          requireAspectRatio={{ w: 4, h: 5 }}
          onChange={(url) => add.mutate(url)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.data?.map((t) => (
          <div key={t.id} className="relative group bg-card border border-border rounded-2xl overflow-hidden">
            <img src={t.image_url} alt="" className="w-full aspect-square object-cover" />
            <div className="p-3 flex items-center justify-between gap-2">
              <button
                onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}
                className={`text-xs px-2 py-1 rounded font-bold ${t.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
              >
                {t.is_active ? "ظاهر" : "مخفي"}
              </button>
              <button
                onClick={async () => {
                  const ok = await confirm({ message: "متأكد إنك عاوز تمسح الصورة دي؟", tone: "danger", confirmLabel: "احذف" });
                  if (ok) remove.mutate(t.id);
                }}
                className="text-xs text-destructive hover:underline"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {list.data?.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground p-12 border border-dashed border-border rounded-2xl">
            لا توجد صور بعد. ارفع أول صورة من الأعلى.
          </div>
        )}
      </div>
    </div>
  );
}
