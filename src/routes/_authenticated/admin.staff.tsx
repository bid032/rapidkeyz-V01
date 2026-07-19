import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Plus, Trash2, Save, RefreshCw, Eye, EyeOff, Copy } from "lucide-react";
import { listStockStaff, saveStockStaff } from "@/lib/stock-staff.functions";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { StaffRecord } from "@/lib/stock-auth.functions";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  component: AdminStaff,
});

function emptyRow(): StaffRecord {
  return { name: "", username: "", password: "", whatsapp: "", active: true };
}

function AdminStaff() {
  const { notify, confirm } = useApp();
  const listFn = useServerFn(listStockStaff);
  const saveFn = useServerFn(saveStockStaff);

  const q = useQuery({ queryKey: ["admin-stock-staff"], queryFn: () => listFn() });
  const [rows, setRows] = useState<StaffRecord[]>([]);
  const [reveal, setReveal] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data) setRows(q.data.length ? q.data : [emptyRow()]);
  }, [q.data]);

  const update = (i: number, patch: Partial<StaffRecord>) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = async (i: number) => {
    const ok = await confirm({ title: "حذف موظف", message: `تريد حذف "${rows[i].name || "الصف"}"؟`, tone: "danger", confirmLabel: "احذف" });
    if (!ok) return;
    setRows((r) => r.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    // basic client validation
    const cleaned = rows.filter((r) => r.name.trim());
    for (const r of cleaned) {
      if (r.username && !r.password) {
        return notify(`الموظف "${r.name}" له اسم مستخدم بدون كلمة سر`, "error");
      }
    }
    setSaving(true);
    try {
      const res = await saveFn({ data: { staff: cleaned } });
      notify(`تم حفظ ${res.count} موظف`, "success");
      q.refetch();
    } catch (e: any) {
      notify(e?.message ?? "حصل خطأ", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyText = (t: string) => {
    if (!t) return;
    navigator.clipboard.writeText(t).then(() => notify("تم النسخ", "success"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-black">موظفو الاستوك</h2>
          <p className="text-sm text-muted-foreground mt-1">
            الحسابات هنا تتحكم بالدخول إلى صفحة <code className="px-1 py-0.5 rounded bg-muted text-xs">/stock</code>. أي تغيير هنا يُكتب مباشرة على شيت Staff، ويمكنك أيضًا تعديل الشيت مباشرة.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => q.refetch()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-sm font-bold">
            <RefreshCw className={`w-4 h-4 ${q.isFetching ? "animate-spin" : ""}`} /> تحديث
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-brand-foreground font-extrabold hover:brand-glow disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </div>

      {q.isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
      ) : q.error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(q.error as any)?.message ?? "تعذر تحميل الموظفين"}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">Username</th>
                  <th className="p-3 text-right">Password</th>
                  <th className="p-3 text-right">WhatsApp</th>
                  <th className="p-3 text-right">مفعّل</th>
                  <th className="p-3 text-right w-16">حذف</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => update(i, { name: e.target.value })}
                        placeholder="اسم الموظف"
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        dir="ltr"
                        value={row.username}
                        onChange={(e) => update(i, { username: e.target.value })}
                        placeholder="username"
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <input
                          type={reveal[i] ? "text" : "password"}
                          dir="ltr"
                          value={row.password}
                          onChange={(e) => update(i, { password: e.target.value })}
                          placeholder="password"
                          className="flex-1 min-w-0 px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
                        />
                        <button type="button" onClick={() => setReveal((r) => ({ ...r, [i]: !r[i] }))} className="p-1.5 rounded-md hover:bg-muted shrink-0" title={reveal[i] ? "إخفاء" : "عرض"}>
                          {reveal[i] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button type="button" onClick={() => copyText(row.password)} className="p-1.5 rounded-md hover:bg-muted shrink-0" title="نسخ">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        type="tel"
                        dir="ltr"
                        value={row.whatsapp}
                        onChange={(e) => update(i, { whatsapp: e.target.value })}
                        placeholder="+20…"
                        className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={(e) => update(i, { active: e.target.checked })}
                          className="size-4 accent-brand"
                        />
                        <span className="text-xs">{row.active ? "نعم" : "لا"}</span>
                      </label>
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeRow(i)} className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border">
            <button onClick={addRow} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border bg-background hover:bg-muted text-sm font-bold">
              <Plus className="w-4 h-4" /> إضافة موظف
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
