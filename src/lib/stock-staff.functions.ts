import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchStaffFromSheet, type StaffRecord } from "@/lib/stock-auth.functions";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const STAFF_TAB = "Staff";
const HEADER = ["Name", "Username", "Password", "Active"];
const MAX_ROWS = 1000;

function authHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gsKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !gsKey) throw new Error("Google Sheets connector not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gsKey,
    "Content-Type": "application/json",
  } as Record<string, string>;
}

async function requireAdminOrModerator(context: any) {
  const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" }),
  ]);
  if (!isAdmin && !isMod) throw new Error("Forbidden");
}

async function getSpreadsheetId(supabase: any): Promise<string> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "stock_sheet").maybeSingle();
  const cfg = (data?.value ?? {}) as { spreadsheet_id?: string };
  if (!cfg.spreadsheet_id) throw new Error("لم يتم ربط شيت الاستوك بعد");
  return cfg.spreadsheet_id;
}

export const listStockStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffRecord[]> => {
    await requireAdminOrModerator(context);
    return fetchStaffFromSheet();
  });

export const saveStockStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staff: StaffRecord[] }) => d)
  .handler(async ({ data, context }) => {
    await requireAdminOrModerator(context);
    const spreadsheetId = await getSpreadsheetId(context.supabase);

    // Validate + dedupe usernames
    const seen = new Set<string>();
    const cleaned: StaffRecord[] = [];
    for (const s of data.staff) {
      const name = (s.name ?? "").trim();
      const username = (s.username ?? "").trim();
      if (!name) continue;
      const key = username.toLowerCase();
      if (username) {
        if (seen.has(key)) throw new Error(`اسم المستخدم مكرر: ${username}`);
        seen.add(key);
      }
      cleaned.push({
        name,
        username,
        password: String(s.password ?? ""),
        active: !!s.active,
      });
    }

    if (cleaned.length + 1 > MAX_ROWS) throw new Error("عدد الموظفين تجاوز الحد المسموح");

    // Build A1:D{MAX_ROWS} padded with blanks
    const rows: (string | number)[][] = [HEADER];
    for (const s of cleaned) {
      rows.push([s.name, s.username, s.password, s.active ? "TRUE" : "FALSE"]);
    }
    while (rows.length < MAX_ROWS) rows.push(["", "", "", ""]);

    const range = `${STAFF_TAB}!A1:D${MAX_ROWS}`;
    const url = `${GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ range, majorDimension: "ROWS", values: rows }),
    });
    if (!res.ok) throw new Error(`Sheets update ${res.status}: ${await res.text()}`);
    return { ok: true as const, count: cleaned.length };
  });
