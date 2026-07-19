import { useSession } from "@tanstack/react-start/server";

export type StockSessionData = {
  staffName?: string;
  loggedAt?: number;
};

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
  const session = await useSession<StockSessionData>(getSessionConfig());
  return session.data ?? {};
}

export async function updateStockSession(patch: StockSessionData) {
  const session = await useSession<StockSessionData>(getSessionConfig());
  await session.update(patch);
}

export async function clearStockSession() {
  const session = await useSession<StockSessionData>(getSessionConfig());
  await session.clear();
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
