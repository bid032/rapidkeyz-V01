import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const STAFF_TAB = "Staff";

export type StaffRecord = {
  name: string;
  username: string;
  password: string;
  active: boolean;
};

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

function toBool(v: unknown, defaultTrue = true) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return defaultTrue;
  return s === "true" || s === "1" || s === "yes" || s === "نعم" || s === "y";
}

/**
 * Read staff from sheet columns A:E. Skips header row.
 * Legacy sheets may have a WhatsApp column in D (now ignored); Active can be in D or E.
 */
export async function fetchStaffFromSheet(): Promise<StaffRecord[]> {
  const spreadsheetId = await getSpreadsheetId();
  const rows = await sheetsGet(spreadsheetId, `${STAFF_TAB}!A1:E1000`);
  const out: StaffRecord[] = [];
  let activeCol = 3; // default: column D
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[0] ?? "").trim();
    if (i === 0) {
      // header detection + locate Active column (supports legacy WhatsApp in D)
      const headerLike = /^(name|الاسم|staff|موظف)$/i.test(name);
      const idxByE = String(row[4] ?? "").trim().toLowerCase();
      const idxByD = String(row[3] ?? "").trim().toLowerCase();
      if (idxByE === "active" || idxByE === "مفعّل" || idxByE === "مفعل") activeCol = 4;
      else if (idxByD === "active" || idxByD === "مفعّل" || idxByD === "مفعل") activeCol = 3;
      if (headerLike) continue;
    }
    if (!name) continue;
    out.push({
      name,
      username: (row[1] ?? "").trim(),
      password: (row[2] ?? "").trim(),
      active: toBool(row[activeCol], true),
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
    const target = match?.password ?? "___never_matches___";
    const ok = eqHash(password, target) && !!match;
    if (!ok) {
      await new Promise((r) => setTimeout(r, 400));
      return { ok: false as const, error: "بيانات الدخول غير صحيحة" };
    }
    const { useSession } = await import("@tanstack/react-start/server");
    const session = await useSession<{ staffName?: string; loggedAt?: number }>(getSessionConfig());
    await session.update({ staffName: match!.name, loggedAt: Date.now() });
    return { ok: true as const, staffName: match!.name };
  });

/** PUBLIC: log out from stock session. */
export const stockLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<{ staffName?: string }>(getSessionConfig());
  await session.clear();
  return { ok: true as const };
});

/** PUBLIC: read current stock session (safe fields only). */
export const getStockSession = createServerFn({ method: "GET" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<{ staffName?: string }>(getSessionConfig());
  const data = session.data ?? {};
  if (!data.staffName) return { loggedIn: false as const };
  return { loggedIn: true as const, staffName: data.staffName };
});

function getSessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET is not configured");
  return {
    password,
    name: "rk-stock-session",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}
