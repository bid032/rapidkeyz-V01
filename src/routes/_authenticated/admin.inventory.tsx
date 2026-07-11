import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: AdminInventory,
});

// Very small CSV parser (handles quoted fields with commas & escaped quotes)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Map CSV rows → inventory records. Expects header row with any of:
 * email, username, password, notes (case-insensitive; extras ignored). */
function mapRows(rows: string[][]) {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.findIndex((h) => h === name || h.includes(name));
  const iE = idx("email");
  const iU = idx("user");
  const iP = idx("pass");
  const iN = idx("note");
  return rows.slice(1).map((r) => ({
    account_email: iE >= 0 ? (r[iE] ?? "").trim() || null : null,
    account_username: iU >= 0 ? (r[iU] ?? "").trim() || null : null,
    account_password: iP >= 0 ? (r[iP] ?? "").trim() || null : null,
    extra_notes: iN >= 0 ? (r[iN] ?? "").trim() || null : null,
  }));
}

function AdminInventory() {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const plans = useQuery({
    queryKey: ["instant-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name_ar, delivery_type, product_plans(id, label_ar, duration_days, sheet_csv_url)")
        .eq("delivery_type", "instant");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invStats = useQuery({
    queryKey: ["inventory-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("account_inventory").select("plan_id, status");
      const m: Record<string, { available: number; delivered: number }> = {};
      (data ?? []).forEach((r: any) => {
        m[r.plan_id] = m[r.plan_id] ?? { available: 0, delivered: 0 };
        (m[r.plan_id] as any)[r.status]++;
      });
      return m;
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-2">مخزون التسليم الفوري</h1>
      <p className="text-sm text-muted-foreground mb-6">
        كل خدمة "تسليم فوري" لازم يكون لها مخزون حسابات جاهزة. لما العميل يشتري، النظام هيسحب أول حساب متاح تلقائيًا ويثبّت الطلب "تم التسليم".
        <br />
        <b>طرق الرفع:</b> ملف CSV من عندك، أو لينك Google Sheets منشور على شكل CSV (File → Share → Publish to web → CSV).
      </p>

      {plans.data?.length === 0 && (
        <div className="p-8 text-center bg-card border border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground">مفيش خدمات "تسليم فوري" لسه. غيّر نوع التسليم من صفحة الخدمات.</p>
        </div>
      )}

      <div className="space-y-4">
        {plans.data?.map((p: any) => (
          <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="font-bold">{p.name_ar}</div>
              <div className="text-xs text-muted-foreground">{p.product_plans?.length ?? 0} عرض</div>
            </div>
            <div className="p-4 space-y-3">
              {(p.product_plans ?? []).map((pl: any) => {
                const c = invStats.data?.[pl.id] ?? { available: 0, delivered: 0 };
                return (
                  <div key={pl.id} className="p-3 bg-background border border-border rounded-xl">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-bold text-sm">{pl.label_ar}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="text-success font-bold">متاح: {c.available}</span>
                          <span className="mx-2">·</span>
                          <span>تم تسليمها: {c.delivered}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelected(selected === pl.id ? null : pl.id)}
                        className="px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-bold"
                      >
                        {selected === pl.id ? "إخفاء" : "إدارة المخزون"}
                      </button>
                    </div>
                    {selected === pl.id && (
                      <PlanInventoryPanel planId={pl.id} initialSheetUrl={pl.sheet_csv_url ?? ""} onChange={() => {
                        qc.invalidateQueries({ queryKey: ["inventory-counts"] });
                        qc.invalidateQueries({ queryKey: ["instant-plans"] });
                        notify("تم التحديث", "success");
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanInventoryPanel({ planId, initialSheetUrl, onChange }: { planId: string; initialSheetUrl: string; onChange: () => void }) {
  const { notify, confirm } = useApp();
  const qc = useQueryClient();
  const [sheetUrl, setSheetUrl] = useState(initialSheetUrl);
  const [busy, setBusy] = useState(false);

  const rows = useQuery({
    queryKey: ["inventory-rows", planId],
    queryFn: async () => {
      const { data } = await supabase
        .from("account_inventory")
        .select("*")
        .eq("plan_id", planId)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const insertRows = async (records: any[], source: string) => {
    if (records.length === 0) { notify("مفيش صفوف صالحة في الملف", "error"); return; }
    setBusy(true);
    try {
      const payload = records.map((r) => ({ ...r, plan_id: planId, source }));
      const { error } = await supabase.from("account_inventory").insert(payload);
      if (error) throw error;
      // sync stock on product_plans
      await supabase.rpc; // no-op placeholder; we'll update stock manually below
      const available = (await supabase.from("account_inventory").select("id", { count: "exact", head: true }).eq("plan_id", planId).eq("status", "available")).count ?? 0;
      await supabase.from("product_plans").update({ stock: available }).eq("id", planId);
      notify(`تمت إضافة ${records.length} حساب`, "success");
      qc.invalidateQueries({ queryKey: ["inventory-rows", planId] });
      onChange();
    } catch (e: any) {
      notify(e.message || "خطأ في الرفع", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = mapRows(parseCsv(text));
    await insertRows(parsed, "csv");
  };

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(sheetUrl.trim());
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const text = await res.text();
      const parsed = mapRows(parseCsv(text));
      // Save the URL to the plan for reference
      await supabase.from("product_plans").update({ sheet_csv_url: sheetUrl.trim() }).eq("id", planId);
      await insertRows(parsed, "sheet");
    } catch (e: any) {
      notify(`تعذر قراءة الشيت: ${e.message}. تأكد إنه Published to web كـ CSV.`, "error");
    } finally {
      setBusy(false);
    }
  };

  const delRow = async (id: string) => {
    const ok = await confirm({ title: "حذف حساب", message: "متأكد؟", tone: "danger", confirmLabel: "احذف" });
    if (!ok) return;
    await supabase.from("account_inventory").delete().eq("id", id);
    const available = (await supabase.from("account_inventory").select("id", { count: "exact", head: true }).eq("plan_id", planId).eq("status", "available")).count ?? 0;
    await supabase.from("product_plans").update({ stock: available }).eq("id", planId);
    qc.invalidateQueries({ queryKey: ["inventory-rows", planId] });
    onChange();
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="p-3 bg-card border border-border rounded-lg">
          <div className="text-xs font-bold mb-2">رفع ملف CSV</div>
          <p className="text-[11px] text-muted-foreground mb-2">
            الصفوف: <code>email, username, password, notes</code> — أول صف Header.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="text-xs"
          />
        </div>
        <div className="p-3 bg-card border border-border rounded-lg">
          <div className="text-xs font-bold mb-2">لينك Google Sheets (CSV)</div>
          <div className="flex gap-2">
            <input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
              className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-xs"
            />
            <button
              onClick={handleFetchSheet}
              disabled={busy || !sheetUrl.trim()}
              className="px-3 py-1.5 bg-brand text-brand-foreground rounded text-xs font-bold disabled:opacity-50"
            >
              {busy ? "..." : "استيراد"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr className="text-start">
              <th className="p-2 text-start">Email</th>
              <th className="p-2 text-start">User</th>
              <th className="p-2 text-start">Pass</th>
              <th className="p-2 text-start">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.data?.map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2 font-mono truncate max-w-[160px]">{r.account_email}</td>
                <td className="p-2 font-mono truncate max-w-[100px]">{r.account_username}</td>
                <td className="p-2 font-mono truncate max-w-[100px]">{r.account_password ? "••••" : ""}</td>
                <td className="p-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.status === "available" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-2 text-end">
                  <button onClick={() => delRow(r.id)} className="text-destructive hover:underline">مسح</button>
                </td>
              </tr>
            ))}
            {!rows.data?.length && (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">مفيش حسابات</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
