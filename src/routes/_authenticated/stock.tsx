import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Search, Boxes, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { getStockData } from "@/lib/stock-sheet.functions";

const UNLOCK_KEY = "rk_stock_unlocked";

export const Route = createFileRoute("/_authenticated/stock")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.rpc("current_user_stock_access");
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: StockPage,
});

function StockPage() {
  const { notify } = useApp();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUnlocked(sessionStorage.getItem(UNLOCK_KEY) === "1");
  }, []);

  if (!unlocked) return <UnlockGate onUnlock={() => setUnlocked(true)} />;

  return <StockTable onLock={() => { sessionStorage.removeItem(UNLOCK_KEY); setUnlocked(false); notify("تم القفل", "success"); }} />;
}

function UnlockGate({ onUnlock }: { onUnlock: () => void }) {
  const { notify } = useApp();
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("verify_stock_password", { _password: pwd });
    setLoading(false);
    if (error) return notify(error.message, "error");
    if (!data) return notify("كلمة السر غير صحيحة", "error");
    sessionStorage.setItem(UNLOCK_KEY, "1");
    notify("تم الفتح", "success");
    onUnlock();
  };

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="w-14 h-14 rounded-2xl grid place-items-center bg-brand/10 text-brand">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold">الاستوك</h1>
          <p className="text-sm text-muted-foreground">أدخل كلمة السر الخاصة بيك للوصول للاستوك</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="كلمة السر"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={loading || !pwd}
            className="w-full px-4 py-3 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow disabled:opacity-60"
          >
            {loading ? "جارٍ التحقق..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StockTable({ onLock }: { onLock: () => void }) {
  const fetcher = useServerFn(getStockData);
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["stock-sheet"],
    queryFn: () => fetcher(),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const filtered = useMemo(() => {
    const rows = q.data?.rows ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.some((c) => c.toLowerCase().includes(s)));
  }, [q.data, search]);

  const stats = useMemo(() => {
    const rows = q.data?.rows ?? [];
    return { total: rows.length };
  }, [q.data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
            <Boxes className="text-brand" /> الاستوك
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {q.data?.fetchedAt ? `آخر تحديث: ${new Date(q.data.fetchedAt).toLocaleTimeString("ar-EG")}` : "..."}
            {" · "}تحديث تلقائي كل 20 ثانية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => q.refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm font-bold hover:border-brand"
          >
            <RefreshCw className={`w-4 h-4 ${q.isFetching ? "animate-spin" : ""}`} /> تحديث
          </button>
          <button
            onClick={onLock}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-sm font-bold hover:bg-destructive/10 hover:text-destructive"
          >
            <Lock className="w-4 h-4" /> قفل
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="text-xs text-muted-foreground">إجمالي الصفوف</div>
          <div className="text-2xl font-extrabold text-brand">{stats.total}</div>
        </div>
        <div className="p-4 bg-card border border-border rounded-2xl">
          <div className="text-xs text-muted-foreground">الشيت</div>
          <div className="font-bold truncate">{q.data?.sheetTitle ?? "—"}</div>
        </div>
        <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-2">
          <ShieldCheck className="text-brand" />
          <div>
            <div className="text-xs text-muted-foreground">الصلاحية</div>
            <div className="font-bold">مفعّلة</div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في الاستوك…"
          className="w-full ps-10 pe-4 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:border-brand"
        />
      </div>

      {q.isLoading && <div className="text-center py-10 text-muted-foreground">جارٍ التحميل…</div>}
      {q.error && (
        <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive">
          {(q.error as Error).message}
        </div>
      )}

      {q.data && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {q.data.headers.map((h, i) => (
                    <th key={i} className="p-3 text-start text-xs uppercase tracking-wider text-muted-foreground font-bold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, ri) => (
                  <tr key={ri} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                    {r.map((c, ci) => (
                      <td key={ci} className="p-3 whitespace-nowrap">{c || "—"}</td>
                    ))}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={q.data.headers.length || 1} className="p-8 text-center text-muted-foreground">
                      لا توجد نتائج
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
