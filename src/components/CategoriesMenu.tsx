import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

type Cat = { id: string; slug: string; name_ar: string; name_en: string; icon: string | null };

export function CategoriesMenu() {
  const { lang, t } = useApp();
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, slug, name_ar, name_en, icon")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCats((data as Cat[] | null) ?? []));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <span>{(t.nav as any).categories ?? (lang === "ar" ? "الأقسام" : "Categories")}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 start-0 min-w-[280px] bg-card border border-border rounded-xl shadow-xl p-2 animate-[fade-in_0.15s_ease-out] z-50">
          <div className="grid grid-cols-1 gap-0.5 max-h-[60vh] overflow-auto">
            {cats.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground">…</div>
            )}
            {cats.map((c) => (
              <Link
                key={c.id}
                to="/shop"
                search={{ category: c.slug } as any}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
              >
                {c.icon ? (
                  <img src={c.icon} alt="" className="size-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="size-8 rounded-lg bg-brand/10 text-brand grid place-items-center text-xs font-bold shrink-0">
                    {(lang === "ar" ? c.name_ar : c.name_en).slice(0, 2)}
                  </div>
                )}
                <span className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
                  {lang === "ar" ? c.name_ar : c.name_en}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
