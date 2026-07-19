import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const STAFF_TAB = "Staff";

export type StockSessionData = {
  staffName?: string;
  whatsapp?: string;
  loggedAt?: number;
};

export function getSessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET is not configured");
  return {
    password,
    name: "rk-stock-session",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export async function readStockSession(): Promise<StockSessionData> {
  const session = await useSession<StockSessionData>(getSessionConfig());
  return session.data ?? {};
}

/** Server-side helper: throws if no logged-in staff. Returns session data. */
export async function requireStockStaff(): Promise<Required<Pick<StockSessionData, "staffName">> & StockSessionData> {
  const data = await readStockSession();
  if (!data.staffName) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return data as Required<Pick<StockSessionData, "staffName">> & StockSessionData;
}

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

async function getSpreadsheetId(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", "stock_sheet").maybeSingle();
  const cfg = (data?.value ?? {}) as { spreadsheet_id?: string };
  if (!cfg.spreadsheet_id) throw new Error("لم يتم ربط شيت الاستوك بعد");
  return cfg.spreadsheet_id;
}

async function sheetsGet(spreadsheetId: string, range: string): Promise<string[][]> {
  const res = await fetch(
    `${GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Sheets read ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { values?: unknown[][] };
  return (j.values ?? []).map((r) => r.map((c) => (c ?? "").toString()));
}

export type StaffRecord = {
  name: string;
  username: string;
  password: string;
  whatsapp: string;
  active: boolean;
};

function toBool(v: unknown, defaultTrue = true) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return defaultTrue; // legacy rows without Active column → active
  return s === "true" || s === "1" || s === "yes" || s === "نعم" || s === "y";
}

/** Read staff from sheet A:E. Skips header row. */
export async function fetchStaffFromSheet(): Promise<StaffRecord[]> {
  const spreadsheetId = await getSpreadsheetId();
  const rows = await sheetsGet(spreadsheetId, `${STAFF_TAB}!A1:E1000`);
  const out: StaffRecord[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[0] ?? "").trim();
    if (!name) continue;
    // header detection on first non-empty row
    if (i === 0 && /^(name|الاسم|staff|موظف)$/i.test(name)) continue;
    out.push({
      name,
      username: (row[1] ?? "").trim(),
      password: (row[2] ?? "").trim(),
      whatsapp: (row[3] ?? "").trim(),
      active: toBool(row[4], true),
    });
  }
  return out;
}

function eqHash(a: string, b: string) {
  const ah = createHash("sha256").update(a, "utf8").digest();
  const bh = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ah, bh);
}

/** PUBLIC: login with username + password against Staff sheet. */
export const stockLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const username = (data.username ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    if (!username || !password) {
      // small delay to slow brute force
      await new Promise((r) => setTimeout(r, 400));
      return { ok: false as const, error: "أدخل اسم المستخدم وكلمة السر" };
    }
    let staff: StaffRecord[];
    try {
      staff = await fetchStaffFromSheet();
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "تعذر الاتصال بالشيت" };
    }
    const match = staff.find((s) => s.username && s.username.toLowerCase() === username && s.active);
    // timing-safe compare even if user not found
    const target = match?.password ?? "___never_matches___";
    const ok = eqHash(password, target) && !!match;
    if (!ok) {
      await new Promise((r) => setTimeout(r, 400));
      return { ok: false as const, error: "بيانات الدخول غير صحيحة" };
    }
    const session = await useSession<StockSessionData>(getSessionConfig());
    await session.update({
      staffName: match!.name,
      whatsapp: match!.whatsapp,
      loggedAt: Date.now(),
    });
    return { ok: true as const, staffName: match!.name, whatsapp: match!.whatsapp };
  });

/** PUBLIC: log out from stock session. */
export const stockLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<StockSessionData>(getSessionConfig());
  await session.clear();
  return { ok: true as const };
});

/** PUBLIC: read current stock session (safe fields only). */
export const getStockSession = createServerFn({ method: "GET" }).handler(async () => {
  const data = await readStockSession();
  if (!data.staffName) return { loggedIn: false as const };
  return { loggedIn: true as const, staffName: data.staffName, whatsapp: data.whatsapp ?? "" };
});
