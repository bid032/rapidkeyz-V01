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
  const { useSession } = await import("@tanstack/react-start/server");
  const session = await useSession<StockSessionData>(getSessionConfig());
  return session.data ?? {};
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
