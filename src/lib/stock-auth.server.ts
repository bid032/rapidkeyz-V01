export type StockSessionData = {
  staffName?: string;
  loggedAt?: number;
  exp?: number;
};

const COOKIE_NAME = "rk-stock-session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

async function hmac(value: string) {
  const { createHmac } = await import("node:crypto");
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET is not configured");
  return createHmac("sha256", password).update(value, "utf8").digest("base64url");
}

function parseCookies(cookieHeader: string | null | undefined) {
  const cookies = new Map<string, string>();
  for (const part of (cookieHeader ?? "").split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) cookies.set(key, decodeURIComponent(value));
  }
  return cookies;
}

export async function createStockSessionValue(staffName: string) {
  const now = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ staffName, loggedAt: now, exp: now + MAX_AGE_SECONDS * 1000 }),
    "utf8",
  ).toString("base64url");
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function readStockSessionFromCookieHeader(cookieHeader: string | null | undefined): Promise<StockSessionData> {
  const value = parseCookies(cookieHeader).get(COOKIE_NAME);
  if (!value) return {};
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return {};
  const expected = await hmac(payload);
  if (sig !== expected) return {};
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as StockSessionData;
    if (!data.staffName || !data.exp || data.exp < Date.now()) return {};
    return { staffName: data.staffName, loggedAt: data.loggedAt, exp: data.exp };
  } catch {
    return {};
  }
}

export function stockSessionSetCookie(value: string, requestUrl?: string) {
  const secure = requestUrl ? new URL(requestUrl).protocol === "https:" : process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function stockSessionClearCookie(requestUrl?: string) {
  const secure = requestUrl ? new URL(requestUrl).protocol === "https:" : process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function getSessionConfig() {
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

export async function readStockSession(): Promise<StockSessionData> {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  return readStockSessionFromCookieHeader(getRequestHeader("cookie"));
}

export async function requireStockStaff(): Promise<Required<Pick<StockSessionData, "staffName">> & StockSessionData> {
  const data = await readStockSession();
  if (!data.staffName) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return data as Required<Pick<StockSessionData, "staffName">> & StockSessionData;
}
