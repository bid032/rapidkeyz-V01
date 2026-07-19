import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const TABS = { PRODUCTS: "Products", STOCK: "Stock", ORDERS: "Orders", STAFF: "Staff" } as const;
const DEFAULT_STAFF_NAMES = ["Ammar", "mahmoud", "Omar", "Medhat", "Nour", "Weka", "Osama", "Hussein", "Ahmed Elsharkawy"];

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

async function getSpreadsheetId(supabase: any): Promise<string> {
  const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "stock_sheet").maybeSingle();
  const cfg = (setting?.value ?? {}) as { spreadsheet_id?: string };
  if (!cfg.spreadsheet_id) throw new Error("لم يقم الأدمن بربط شيت الاستوك بعد");
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

async function sheetsBatchUpdate(spreadsheetId: string, data: Array<{ range: string; values: (string | number)[][] }>) {
  const res = await fetch(`${GATEWAY}/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
  });
  if (!res.ok) throw new Error(`Sheets batchUpdate ${res.status}: ${await res.text()}`);
}

async function sheetsAppend(spreadsheetId: string, range: string, values: (string | number)[][]) {
  const res = await fetch(
    `${GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify({ values }) },
  );
  if (!res.ok) throw new Error(`Sheets append ${res.status}: ${await res.text()}`);
}

function norm(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}
function toBool(v: unknown) {
  if (v === true) return true;
  const t = String(v ?? "").trim().toLowerCase();
  return t === "true" || t === "1" || t === "yes" || t === "نعم";
}

async function ensureAccess(supabase: any) {
  const { data: hasAccess } = await supabase.rpc("current_user_stock_access");
  if (!hasAccess) throw new Error("Forbidden");
}

export type StockProduct = {
  productId: string;
  productName: string;
  notes: string;
  unitLabel: string;
  isActive: boolean;
  availableCount: number;
  totalStock: number;
};

export type StockAppData = {
  products: StockProduct[];
  staffNames: string[];
  totalAvailable: number;
  lowStockCount: number;
  fetchedAt: string;
};

export const getStockAppData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StockAppData> => {
    await ensureAccess(context.supabase);
    const spreadsheetId = await getSpreadsheetId(context.supabase);

    const [productsRaw, stockRaw] = await Promise.all([
      sheetsGet(spreadsheetId, `${TABS.PRODUCTS}!A1:H2000`),
      sheetsGet(spreadsheetId, `${TABS.STOCK}!A1:M20000`),
    ]);

    // Aggregate stock by product name
    const summary = new Map<string, { available: number; total: number }>();
    for (let i = 1; i < stockRaw.length; i++) {
      const row = stockRaw[i];
      const productName = (row[1] ?? "").trim();
      const code = (row[2] ?? "").trim();
      const status = norm(row[5]);
      if (!productName || !code) continue;
      const s = summary.get(productName) ?? { available: 0, total: 0 };
      s.total += 1;
      if (status === "AVAILABLE") s.available += 1;
      summary.set(productName, s);
    }

    const products: StockProduct[] = [];
    for (let i = 1; i < productsRaw.length; i++) {
      const row = productsRaw[i];
      const productName = (row[1] ?? "").trim();
      const isActive = toBool(row[4]);
      if (!productName || !isActive) continue;
      const counts = summary.get(productName) ?? { available: 0, total: 0 };
      products.push({
        productId: (row[0] ?? "").trim(),
        productName,
        notes: (row[2] ?? "").trim(),
        unitLabel: (row[3] ?? "").trim(),
        isActive,
        availableCount: counts.available,
        totalStock: counts.total,
      });
    }
    products.sort((a, b) => a.productName.localeCompare(b.productName, "ar"));

    const totalAvailable = products.reduce((s, p) => s + p.availableCount, 0);
    const lowStockCount = products.filter((p) => p.availableCount <= 3).length;

    return {
      products,
      staffNames: STAFF_NAMES,
      totalAvailable,
      lowStockCount,
      fetchedAt: new Date().toISOString(),
    };
  });

export type IssueResult = {
  orderId: string;
  productName: string;
  qty: number;
  availableAfter: number;
  productNotes: string;
  unitLabel: string;
  codes: Array<{ code: string; extraInfo: string; displayText: string }>;
  displayText: string;
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}
function createOrderId() {
  const d = new Date();
  return `ORD-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

export const issueStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffName: string; customerName: string; productName: string; qty: number }) => d)
  .handler(async ({ data, context }): Promise<IssueResult> => {
    await ensureAccess(context.supabase);
    const staffName = data.staffName.trim();
    const customerName = data.customerName.trim();
    const productName = data.productName.trim();
    const qty = Number(data.qty || 0);

    if (!staffName) throw new Error("اختر اسم الموظف");
    if (!STAFF_NAMES.includes(staffName)) throw new Error("اسم الموظف غير مسموح");
    if (!customerName) throw new Error("اكتب اسم العميل");
    if (!productName) throw new Error("اختر المنتج");
    if (!qty || qty < 1) throw new Error("الكمية لازم تكون 1 أو أكثر");

    const spreadsheetId = await getSpreadsheetId(context.supabase);

    const [productsRaw, stockRaw] = await Promise.all([
      sheetsGet(spreadsheetId, `${TABS.PRODUCTS}!A1:H2000`),
      sheetsGet(spreadsheetId, `${TABS.STOCK}!A1:M20000`),
    ]);

    // find product info
    let productNotes = "";
    let unitLabel = "";
    let isActive = false;
    for (let i = 1; i < productsRaw.length; i++) {
      const row = productsRaw[i];
      if ((row[1] ?? "").trim() === productName) {
        productNotes = (row[2] ?? "").trim();
        unitLabel = (row[3] ?? "").trim();
        isActive = toBool(row[4]);
        break;
      }
    }
    if (!isActive) throw new Error("المنتج غير موجود أو غير مفعل");

    // pick available rows
    const picks: Array<{ sheetRow: number; code: string; extraInfo: string; addedOnRaw: string }> = [];
    const targetNorm = norm(productName);
    for (let i = 1; i < stockRaw.length; i++) {
      const row = stockRaw[i];
      const rowProduct = norm(row[1]);
      const rowCode = (row[2] ?? "").trim();
      const rowStatus = norm(row[5]);
      if (rowProduct === targetNorm && rowStatus === "AVAILABLE" && rowCode) {
        picks.push({
          sheetRow: i + 1,
          code: rowCode,
          extraInfo: (row[3] ?? "").trim(),
          addedOnRaw: (row[6] ?? "").toString(),
        });
        if (picks.length === qty) break;
      }
    }
    if (picks.length < qty) throw new Error("المتاح أقل من الكمية المطلوبة");

    const orderId = createOrderId();
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

    // Batch update Stock rows F:K (columns 6..11)
    const updates = picks.map((p) => ({
      range: `${TABS.STOCK}!F${p.sheetRow}:K${p.sheetRow}`,
      values: [["ISSUED", p.addedOnRaw, staffName, orderId, nowStr, customerName]] as (string | number)[][],
    }));
    await sheetsBatchUpdate(spreadsheetId, updates);

    // Append to Orders
    const deliveredText = picks.map((p) => p.code).filter(Boolean).join("\n\n");
    await sheetsAppend(spreadsheetId, `${TABS.ORDERS}!A1`, [[
      orderId, nowStr, staffName, customerName, productName, qty, deliveredText, productNotes, "DONE",
    ]]);

    // recount available after
    let availableAfter = 0;
    for (let i = 1; i < stockRaw.length; i++) {
      const row = stockRaw[i];
      if (norm(row[1]) === targetNorm && norm(row[5]) === "AVAILABLE" && (row[2] ?? "").trim()) {
        availableAfter++;
      }
    }
    availableAfter -= picks.length;

    const codes = picks.map((p) => ({
      code: p.code,
      extraInfo: p.extraInfo,
      displayText: p.extraInfo ? `${p.code}\nPassword: ${p.extraInfo}` : p.code,
    }));

    return {
      orderId,
      productName,
      qty,
      availableAfter: Math.max(0, availableAfter),
      productNotes,
      unitLabel,
      codes,
      displayText: codes.map((c) => c.displayText).join("\n\n"),
    };
  });

export const revertIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }): Promise<{ orderId: string; itemCount: number }> => {
    await ensureAccess(context.supabase);
    const orderId = data.orderId.trim();
    if (!orderId) throw new Error("رقم العملية غير موجود");

    const spreadsheetId = await getSpreadsheetId(context.supabase);
    const stockRaw = await sheetsGet(spreadsheetId, `${TABS.STOCK}!A1:M20000`);

    const reverts: Array<{ sheetRow: number; addedOnRaw: string }> = [];
    for (let i = 1; i < stockRaw.length; i++) {
      const row = stockRaw[i];
      const rowOrderId = (row[8] ?? "").trim();
      const rowStatus = norm(row[5]);
      const rowCode = (row[2] ?? "").trim();
      if (rowOrderId === orderId && rowStatus === "ISSUED" && rowCode) {
        reverts.push({ sheetRow: i + 1, addedOnRaw: (row[6] ?? "").toString() });
      }
    }
    if (!reverts.length) throw new Error("لا توجد أكواد مصروفة بهذا الرقم أو تم إرجاعها بالفعل");

    const updates = reverts.map((r) => ({
      range: `${TABS.STOCK}!F${r.sheetRow}:K${r.sheetRow}`,
      values: [["AVAILABLE", r.addedOnRaw, "", "", "", ""]] as (string | number)[][],
    }));
    await sheetsBatchUpdate(spreadsheetId, updates);

    // mark order as REVERTED
    const ordersRaw = await sheetsGet(spreadsheetId, `${TABS.ORDERS}!A1:I20000`);
    for (let i = 1; i < ordersRaw.length; i++) {
      if ((ordersRaw[i][0] ?? "").trim() === orderId) {
        await sheetsBatchUpdate(spreadsheetId, [
          { range: `${TABS.ORDERS}!I${i + 1}`, values: [["REVERTED"]] },
        ]);
        break;
      }
    }

    return { orderId, itemCount: reverts.length };
  });

// Back-compat export used elsewhere (kept)
export const getStockData = getStockAppData;
