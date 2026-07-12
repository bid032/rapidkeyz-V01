import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { getSheetInfo } from "@/lib/sheet-sync.functions";

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

/** Map CSV rows → inventory records. Recognizes any of:
 * email, username/user, password/pass, key/code/license/product, notes/note (case-insensitive).
 * "status" column is ignored (managed by the system).
 * If a column doesn't match any known header, it's kept as a fallback. */
function mapRows(rows: string[][]): { records: any[]; statusColIdx: number } {
  if (rows.length === 0) return { records: [], statusColIdx: -1 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const findIdx = (matchers: string[]) =>
    header.findIndex((h) => matchers.some((m) => h === m || h.includes(m)));

  const iE = findIdx(["email", "mail", "ايميل"]);
  const iU = findIdx(["username", "user", "login", "يوزر"]);
  const iP = findIdx(["password", "pass", "pwd", "باسورد", "كلمة"]);
  const iK = findIdx(["key", "code", "license", "licence", "serial", "product", "مفتاح", "كود"]);
  const iN = findIdx(["notes", "note", "comment", "remark", "ملاحظ"]);
  const iStatus = findIdx(["status", "state", "حالة"]);

  const used = new Set([iE, iU, iP, iK, iN, iStatus].filter((i) => i >= 0));
  const iFallback = iE < 0 && iU < 0 && iP < 0 && iK < 0
    ? header.findIndex((_, i) => !used.has(i))
    : -1;

  const clean = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() || null : null);

  const records = rows
    .slice(1)
    .map((r, idx) => {
      const email = clean(r, iE);
      const pass = clean(r, iP);
      const notes = clean(r, iN);
      const usernameOrKey = clean(r, iU) ?? clean(r, iK) ?? clean(r, iFallback);
      return {
        account_email: email,
        account_username: usernameOrKey,
        account_password: pass,
        extra_notes: notes,
        _srcRowIndex: idx + 2, // header is row 1
      };
    })
    .filter((rec) =>
      rec.account_email || rec.account_username || rec.account_password || rec.extra_notes
    );
  return { records, statusColIdx: iStatus };
}

/** Convert 0-based column index to A1 letter (0=A, 25=Z, 26=AA...). */
function colIdxToLetter(idx: number): string {
  let n = idx;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
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
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">مخزون التسليم الفوري</h1>
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
      const batchId = (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const payload = records.map((r) => {
        const { _srcRowIndex, ...rest } = r;
        return { ...rest, plan_id: planId, source, import_batch_id: batchId };
      });
      const { error } = await supabase.from("account_inventory").insert(payload);
      if (error) throw error;
      const available = (await supabase.from("account_inventory").select("id", { count: "exact", head: true }).eq("plan_id", planId).eq("status", "available")).count ?? 0;
      await supabase.from("product_plans").update({ stock: available }).eq("id", planId);
      notify(`تمت إضافة ${records.length} حساب`, "success");
      qc.invalidateQueries({ queryKey: ["inventory-rows", planId] });
      qc.invalidateQueries({ queryKey: ["inventory-batches", planId] });
      onChange();
    } catch (e: any) {
      notify(e.message || "خطأ في الرفع", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const { records } = mapRows(parseCsv(text));
    await insertRows(records, "csv");
  };

  const normalizeSheetUrl = (raw: string): string => {
    const url = raw.trim();
    if (/output=csv/i.test(url) || /[?&]format=csv/i.test(url)) return url;
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) {
      const id = m[1];
      const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    }
    return url;
  };

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(normalizeSheetUrl(sheetUrl));
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const text = await res.text();
      if (/^\s*<(!doctype|html)/i.test(text)) {
        throw new Error("اللينك بيرجّع HTML مش CSV. خلي الشيت Shared: Anyone with link — Viewer، أو File → Share → Publish to web → CSV.");
      }
      const { records, statusColIdx } = mapRows(parseCsv(text));

      // Try to attach sheet metadata for auto-sync-on-sold.
      const idMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
      const spreadsheetId = idMatch?.[1] ?? null;
      const gid = gidMatch ? Number(gidMatch[1]) : 0;

      let sheetTitle: string | null = null;
      if (spreadsheetId) {
        try {
          const info = await getSheetInfo({ data: { spreadsheetId } });
          sheetTitle = info.sheets.find((s: any) => s.gid === gid)?.title ?? info.sheets[0]?.title ?? null;
        } catch (e) {
          console.warn("getSheetInfo failed", e);
        }
      }

      const statusColLetter = statusColIdx >= 0 ? colIdxToLetter(statusColIdx) : null;
      const canSync = !!(spreadsheetId && sheetTitle && statusColLetter);

      const enriched = records.map((r: any) => ({
        ...r,
        spreadsheet_id: canSync ? spreadsheetId : null,
        sheet_title: canSync ? sheetTitle : null,
        sheet_row_index: canSync ? r._srcRowIndex : null,
        status_column_letter: canSync ? statusColLetter : null,
      }));

      await supabase.from("product_plans").update({ sheet_csv_url: sheetUrl.trim() }).eq("id", planId);
      await insertRows(enriched, "sheet");

      if (!canSync) {
        notify("تم الاستيراد بدون مزامنة تلقائية. أضف عمود اسمه 'status' في الشيت عشان يتحدّث تلقائيًا لما يتباع.", "info");
      }
    } catch (e: any) {
      notify(`تعذر قراءة الشيت: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const syncStock = async () => {
    const available = (await supabase.from("account_inventory").select("id", { count: "exact", head: true }).eq("plan_id", planId).eq("status", "available")).count ?? 0;
    await supabase.from("product_plans").update({ stock: available }).eq("id", planId);
  };

  const delRow = async (id: string) => {
    const ok = await confirm({ title: "حذف حساب", message: "متأكد؟", tone: "danger", confirmLabel: "احذف" });
    if (!ok) return;
    await supabase.from("account_inventory").delete().eq("id", id);
    await syncStock();
    qc.invalidateQueries({ queryKey: ["inventory-rows", planId] });
    qc.invalidateQueries({ queryKey: ["inventory-batches", planId] });
    onChange();
  };

  const batches = useQuery({
    queryKey: ["inventory-batches", planId],
    queryFn: async () => {
      const { data } = await supabase
        .from("account_inventory")
        .select("import_batch_id, source, created_at, status")
        .eq("plan_id", planId)
        .not("import_batch_id", "is", null);
      const map = new Map<string, { id: string; source: string; created_at: string; total: number; available: number; delivered: number }>();
      (data ?? []).forEach((r: any) => {
        const k = r.import_batch_id as string;
        const cur = map.get(k) ?? { id: k, source: r.source, created_at: r.created_at, total: 0, available: 0, delivered: 0 };
        cur.total++;
        if (r.status === "available") cur.available++;
        else if (r.status === "delivered") cur.delivered++;
        if (new Date(r.created_at) < new Date(cur.created_at)) cur.created_at = r.created_at;
        map.set(k, cur);
      });
      return Array.from(map.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },
  });

  const delBatch = async (batchId: string, opts: { onlyAvailable: boolean }) => {
    const ok = await confirm({
      title: "حذف عملية استرداد",
      message: opts.onlyAvailable
        ? "هيتم حذف الحسابات المتاحة فقط من هذه العملية. الحسابات اللي اتسلمت للعملاء هتفضل. متأكد؟"
        : "هيتم حذف كل الحسابات اللي جت من عملية الاسترداد دي (المتاحة والمسلَّمة). متأكد؟",
      tone: "danger",
      confirmLabel: "احذف",
    });
    if (!ok) return;
    let q = supabase.from("account_inventory").delete().eq("plan_id", planId).eq("import_batch_id", batchId);
    if (opts.onlyAvailable) q = q.eq("status", "available");
    const { error } = await q;
    if (error) { notify(error.message, "error"); return; }
    await syncStock();
    notify("تم حذف عملية الاسترداد", "success");
    qc.invalidateQueries({ queryKey: ["inventory-rows", planId] });
    qc.invalidateQueries({ queryKey: ["inventory-batches", planId] });
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
          {initialSheetUrl && (
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: "إلغاء الاسترداد من الشيت",
                  message: "هيتم مسح اللينك وحذف كل الحسابات المتاحة اللي جت من الشيت ده. (الحسابات اللي اتسلمت للعملاء هتفضل محفوظة). متأكد؟",
                  tone: "danger",
                  confirmLabel: "ألغِ الاسترداد",
                });
                if (!ok) return;
                setBusy(true);
                try {
                  const { error } = await supabase
                    .from("account_inventory")
                    .delete()
                    .eq("plan_id", planId)
                    .eq("source", "sheet")
                    .eq("status", "available");
                  if (error) throw error;
                  await supabase.from("product_plans").update({ sheet_csv_url: null }).eq("id", planId);
                  await syncStock();
                  setSheetUrl("");
                  notify("تم إلغاء الاسترداد ومسح اللينك", "success");
                  qc.invalidateQueries({ queryKey: ["inventory-rows", planId] });
                  qc.invalidateQueries({ queryKey: ["inventory-batches", planId] });
                  onChange();
                } catch (e: any) {
                  notify(e.message || "خطأ في الإلغاء", "error");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="mt-2 px-2 py-1 bg-destructive/10 text-destructive rounded text-[11px] font-bold disabled:opacity-50"
            >
              إلغاء الاسترداد من هذا الشيت ومسح اللينك
            </button>
          )}
        </div>
      </div>

      {!!batches.data?.length && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-2 bg-muted text-xs font-bold">عمليات الاسترداد ({batches.data.length})</div>
          <div className="max-h-48 overflow-y-auto divide-y divide-border">
            {batches.data.map((b) => (
              <div key={b.id} className="p-2 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-mono truncate">{new Date(b.created_at).toLocaleString("ar-EG")}</div>
                  <div className="text-muted-foreground text-[11px]">
                    {b.source === "sheet" ? "Google Sheet" : "CSV"} · {b.total} حساب ·
                    <span className="text-success"> متاح {b.available}</span> ·
                    <span> مسلَّم {b.delivered}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {b.available > 0 && (
                    <button
                      onClick={() => delBatch(b.id, { onlyAvailable: true })}
                      className="px-2 py-1 bg-destructive/10 text-destructive rounded font-bold text-[11px]"
                      title="حذف المتاح فقط"
                    >
                      حذف المتاح
                    </button>
                  )}
                  <button
                    onClick={() => delBatch(b.id, { onlyAvailable: false })}
                    className="px-2 py-1 bg-destructive text-destructive-foreground rounded font-bold text-[11px]"
                    title="حذف الكل من هذه العملية"
                  >
                    حذف الكل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {(() => {
        const COLS: { key: string; label: string; mask?: boolean }[] = [
          { key: "account_email", label: "Email" },
          { key: "account_username", label: "Key / User" },
          { key: "account_password", label: "Pass", mask: true },
          { key: "extra_notes", label: "Notes" },
        ];
        const visible = COLS.filter((c) =>
          (rows.data ?? []).some((r: any) => r[c.key] != null && String(r[c.key]).trim() !== "")
        );
        const colSpan = visible.length + 2;
        return (
          <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr className="text-start">
                  {visible.map((c) => (
                    <th key={c.key} className="p-2 text-start">{c.label}</th>
                  ))}
                  <th className="p-2 text-start">Status</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.data?.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    {visible.map((c) => (
                      <td key={c.key} className="p-2 font-mono truncate max-w-[160px]">
                        {c.mask ? (r[c.key] ? "••••" : "") : r[c.key]}
                      </td>
                    ))}
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.status === "available" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {r.status === "delivered" ? "تم البيع" : r.status}
                      </span>
                    </td>
                    <td className="p-2 text-end">
                      <button onClick={() => delRow(r.id)} className="text-destructive hover:underline">مسح</button>
                    </td>
                  </tr>
                ))}
                {!rows.data?.length && (
                  <tr><td colSpan={colSpan} className="p-4 text-center text-muted-foreground">مفيش حسابات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

    </div>
  );
}
