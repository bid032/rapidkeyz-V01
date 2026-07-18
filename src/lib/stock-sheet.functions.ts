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

export type StockSheetPayload = {
  headers: string[];
  rows: string[][];
  fetchedAt: string;
  sheetTitle: string | null;
};

/** Reads the stock spreadsheet configured in site_settings["stock_sheet"].
 *  Requires the caller to be authenticated AND to have stock_access = true. */
export const getStockData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StockSheetPayload> => {
    const { data: hasAccess } = await context.supabase.rpc("current_user_stock_access");
    if (!hasAccess) throw new Error("Forbidden");

    const { data: setting } = await context.supabase
      .from("site_settings")
      .select("value")
      .eq("key", "stock_sheet")
      .maybeSingle();

    const cfg = (setting?.value ?? {}) as { spreadsheet_id?: string; sheet_title?: string | null };
    const spreadsheetId = cfg.spreadsheet_id;
    if (!spreadsheetId) throw new Error("لم يقم الأدمن بربط شيت الاستوك بعد");

    // Resolve first sheet title if none configured
    let sheetTitle = cfg.sheet_title ?? null;
    if (!sheetTitle) {
      const metaRes = await fetch(
        `${GATEWAY}/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
        { headers: authHeaders() },
      );
      if (!metaRes.ok) throw new Error(`Sheets API ${metaRes.status}: ${await metaRes.text()}`);
      const meta = (await metaRes.json()) as { sheets?: Array<{ properties: { title: string } }> };
      sheetTitle = meta.sheets?.[0]?.properties?.title ?? "Sheet1";
    }

    const range = `${sheetTitle}!A1:Z2000`;
    const valuesRes = await fetch(
      `${GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`,
      { headers: authHeaders() },
    );
    if (!valuesRes.ok) throw new Error(`Sheets API ${valuesRes.status}: ${await valuesRes.text()}`);
    const j = (await valuesRes.json()) as { values?: string[][] };
    const values = j.values ?? [];
    const [headerRow = [], ...rest] = values;
    const width = headerRow.length;
    const rows = rest.map((r) => {
      const out = Array.from({ length: width }, (_, i) => (r[i] ?? "").toString());
      return out;
    });
    return {
      headers: headerRow.map((h) => (h ?? "").toString()),
      rows,
      fetchedAt: new Date().toISOString(),
      sheetTitle,
    };
  });
