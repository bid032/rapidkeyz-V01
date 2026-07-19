import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Boxes, PackageCheck, AlertTriangle, Send, StickyNote, Copy, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { getStockAppData, issueStock, revertIssue, type IssueResult } from "@/lib/stock-sheet.functions";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const UNLOCK_KEY = "rk_stock_unlocked";
const STAFF_KEY = "rk_stock_staff";

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-10">
        {!unlocked ? (
          <UnlockGate onUnlock={() => setUnlocked(true)} />
        ) : (
          <StockDispenser onLock={() => { sessionStorage.removeItem(UNLOCK_KEY); setUnlocked(false); notify("تم القفل", "success"); }} />
        )}
      </main>
      <Footer />
    </div>
  );
}

function UnlockGate({ onUnlock }: { onUnlock: () => void }) {
  const { notify } = useApp();
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length !== 4) return;
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
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={pwd}
            onChange={(e) => setPwd(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-center tracking-[0.6em] text-lg focus:outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={loading || pwd.length !== 4}
            className="w-full px-4 py-3 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow disabled:opacity-60"
          >
            {loading ? "جارٍ التحقق..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StockDispenser({ onLock }: { onLock: () => void }) {
  const { notify } = useApp();
  const fetcher = useServerFn(getStockAppData);
  const issueFn = useServerFn(issueStock);
  const revertFn = useServerFn(revertIssue);

  const [staffName, setStaffName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IssueResult | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STAFF_KEY);
    if (saved) setStaffName(saved);
  }, []);

  const q = useQuery({
    queryKey: ["stock-app-data"],
    queryFn: () => fetcher(),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const products = q.data?.products ?? [];
  const staffNames = q.data?.staffNames ?? [];
  const selected = products.find((p) => p.productName === productName);

  const stockHealth = useMemo(() => {
    if (!selected) return { label: "لا يوجد اختيار", tone: "bg-muted text-muted-foreground border-border" };
    if (selected.availableCount === 0) return { label: "فارغ", tone: "bg-destructive/15 text-destructive border-destructive/30" };
    if (selected.availableCount <= 3) return { label: "منخفض", tone: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
    return { label: "جيد", tone: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };
  }, [selected]);

  const availableNow = selected?.availableCount ?? 0;
  const canDeliver = !busy && staffName && customerName.trim() && productName && qty > 0 && qty <= availableNow;

  const doIssue = async () => {
    if (!canDeliver) return notify("اكمل بيانات التسليم أولاً", "error");
    setBusy(true);
    setResult(null);
    try {
      const res = await issueFn({ data: { staffName, customerName: customerName.trim(), productName, qty } });
      setResult(res);
      notify("تم تسليم الأكواد", "success");
      setCustomerName("");
      q.refetch();
    } catch (e: any) {
      notify(e?.message ?? "حصل خطأ", "error");
    } finally {
      setBusy(false);
    }
  };

  const doRevert = async () => {
    if (!result?.orderId) return;
    if (!confirm("هل أنت متأكد أن الكود لم يتم استلامه وتريد إرجاع آخر صرف للمخزون؟")) return;
    setBusy(true);
    try {
      await revertFn({ data: { orderId: result.orderId } });
      notify("تم إرجاع الأكواد للمخزون", "success");
      setResult(null);
      q.refetch();
    } catch (e: any) {
      notify(e?.message ?? "حصل خطأ", "error");
    } finally {
      setBusy(false);
    }
  };

  const copyAll = () => {
    if (!result?.displayText) return;
    navigator.clipboard.writeText(result.displayText).then(() => notify("تم نسخ الأكواد", "success"));
  };

  const copyOne = (text: string) => {
    navigator.clipboard.writeText(text).then(() => notify("تم النسخ", "success"));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
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

      {q.error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm">
          {(q.error as Error).message}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main dispenser panel */}
        <div className="order-2 lg:order-1 lg:col-span-2 bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-xl font-extrabold">الاستوك</h2>
            <p className="text-xs text-muted-foreground mt-1">
              الموظف يختار الاسم واسم العميل والمنتج والكمية، والنظام بيسحب أول أكواد متاحة تلقائيًا.
            </p>
          </div>

          {/* Info strip */}
          <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 grid grid-cols-3 gap-2 sm:gap-3 text-sm text-center sm:text-start">
            <div>
              <div className="text-muted-foreground text-[11px] sm:text-xs">المتاح الآن</div>
              <div className="font-extrabold text-brand text-base sm:text-lg">{availableNow}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-[11px] sm:text-xs">إجمالي الستوك</div>
              <div className="font-extrabold text-base sm:text-lg">{selected?.totalStock ?? 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-[11px] sm:text-xs">نوع التسليم</div>
              <div className="font-extrabold text-base sm:text-lg">{selected?.unitLabel || "-"}</div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <Field label="اسم الموظف">
              <select
                value={staffName}
                onChange={(e) => { setStaffName(e.target.value); localStorage.setItem(STAFF_KEY, e.target.value); }}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-brand"
              >
                <option value="">اختر اسم الموظف</option>
                {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>

            <Field label="اسم العميل">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اكتب اسم العميل"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-brand"
              />
            </Field>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="المنتج">
                <select
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-brand"
                >
                  <option value="">اختر المنتج</option>
                  {products.map((p) => (
                    <option key={p.productName} value={p.productName}>
                      {p.productName} — المتاح {p.availableCount}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="الكمية">
                <select
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-center focus:outline-none focus:border-brand"
                >
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={doIssue}
                disabled={!canDeliver}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {busy ? "جارٍ التنفيذ..." : "تسليم الأكواد"}
              </button>
              <button
                onClick={() => q.refetch()}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-muted text-sm font-bold hover:bg-brand/10 hover:text-brand"
              >
                <RefreshCw className={`w-4 h-4 ${q.isFetching ? "animate-spin" : ""}`} /> تحديث البيانات
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-extrabold text-emerald-500">تم تسليم الأكواد · {result.orderId}</div>
                <div className="flex items-center gap-2">
                  <button onClick={copyAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-bold hover:bg-brand/10 hover:text-brand">
                    <Copy className="w-3.5 h-3.5" /> نسخ الكل
                  </button>
                  <button onClick={doRevert} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive hover:text-white">
                    <Undo2 className="w-3.5 h-3.5" /> لم يتم الاستلام
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                {result.codes.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 bg-background border border-border rounded-xl p-3">
                    <pre className="text-xs whitespace-pre-wrap break-all font-mono flex-1 m-0">{c.displayText}</pre>
                    <button onClick={() => copyOne(c.displayText)} className="p-1.5 rounded-md hover:bg-muted shrink-0">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick panel */}
        <aside className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-4 h-fit">
          <div>
            <h2 className="text-xl font-extrabold">لوحة سريعة</h2>
            <p className="text-xs text-muted-foreground mt-1">هنا هتشوف المتاح والملاحظات العامة بسرعة</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-4 text-center">
              <div className="text-2xl font-extrabold text-brand">{q.data?.lowStockCount ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">منتجات منخفضة</div>
            </div>
            <div className="rounded-2xl border border-border p-4 text-center">
              <div className="text-2xl font-extrabold">{q.data?.totalAvailable ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1">إجمالي المتاح</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5" /> حالة المخزون
            </div>
            <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold border ${stockHealth.tone}`}>
              {stockHealth.label}
            </span>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" /> ملاحظات ترسل مع المنتج
            </div>
            <div className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm min-h-[80px] whitespace-pre-wrap">
              {selected?.notes || "اختر منتجًا لعرض الملاحظات."}
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <span>لو الكود لم يُسلَّم فعلًا، استخدم زر «لم يتم الاستلام» لإرجاع آخر صرف للمخزون.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-bold text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
