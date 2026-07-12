import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

function authHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gsKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !gsKey) throw new Error("Google Sheets connector not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gsKey,
  } as Record<string, string>;
}

/** Admin-only: fetch sheet titles for a spreadsheet so we can resolve gid → title. */
export const getSheetInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { spreadsheetId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const url = `${GATEWAY}/spreadsheets/${data.spreadsheetId}?fields=sheets.properties`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Sheets API ${res.status}: ${t}`);
    }
    const j = (await res.json()) as { sheets?: Array<{ properties: { sheetId: number; title: string } }> };
    return {
      sheets: (j.sheets ?? []).map((s) => ({ gid: s.properties.sheetId, title: s.properties.title })),
    };
  });

/** Public (called from guest checkout after auto-delivery). Guarded: only writes when
 *  the inventory row is already status='delivered', so it cannot be abused to write to
 *  arbitrary rows. */
export const markInventorySoldOnSheet = createServerFn({ method: "POST" })
  .inputValidator((d: { inventoryId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("account_inventory")
      .select("status, spreadsheet_id, sheet_title, sheet_row_index, status_column_letter")
      .eq("id", data.inventoryId)
      .maybeSingle();
    if (!row) return { skipped: true, reason: "not_found" };
    if (row.status !== "delivered") return { skipped: true, reason: "not_delivered" };
    if (!row.spreadsheet_id || !row.sheet_title || !row.sheet_row_index || !row.status_column_letter) {
      return { skipped: true, reason: "no_sheet_meta" };
    }
    const range = `${row.sheet_title}!${row.status_column_letter}${row.sheet_row_index}`;
    const url = `${GATEWAY}/spreadsheets/${row.spreadsheet_id}/values/${encodeURIComponent(range).replace(/%3A/g, ":").replace(/%21/g, "!")}?valueInputOption=USER_ENTERED`;
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ range, majorDimension: "ROWS", values: [["sold"]] }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("[sheet-sync] update failed", res.status, t);
        return { ok: false, status: res.status, error: t };
      }
      return { ok: true };
    } catch (e: any) {
      console.error("[sheet-sync] error", e);
      return { ok: false, error: e?.message ?? String(e) };
    }
  });
