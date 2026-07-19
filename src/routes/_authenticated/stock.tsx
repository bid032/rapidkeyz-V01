import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, RefreshCw, Boxes, PackageCheck, AlertTriangle, Send, StickyNote, Copy, Undo2, Minus, Plus, User, UserCircle2, Package, Sparkles, CheckCircle2 } from "lucide-react";
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
  const { notify, confirm } = useApp();
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
    const ok = await confirm({ title: "إرجاع للمخزون", message: "هل أنت متأكد أن الكود لم يتم استلامه وتريد إرجاع آخر صرف للمخزون؟", tone: "danger", confirmLabel: "أرجِع" });
    if (!ok) return;
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

  const dec = () => setQty((n) => Math.max(1, n - 1));
  const inc = () => setQty((n) => Math.min(Math.max(1, availableNow || 5), n + 1));

  return (
    <div className="space-y-6">
      {/* Compact hero + KPI row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7"
      >
        {/* aurora glow */}
        <div className="pointer-events-none absolute -top-24 -end-24 h-64 w-64 rounded-full bg-brand/25 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 -start-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-[100px]" />

        <div className="relative grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
              <Sparkles className="size-3.5" /> Stock Console
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-cyan-400 to-brand">لوحة الاستوك</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
              {q.data?.fetchedAt ? `آخر تحديث: ${new Date(q.data.fetchedAt).toLocaleTimeString("ar-EG")}` : "جارٍ التحميل..."} · تحديث تلقائي كل 20 ثانية
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            <button
              onClick={() => q.refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 backdrop-blur px-3 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
            >
              <RefreshCw className={`w-4 h-4 ${q.isFetching ? "animate-spin" : ""}`} /> تحديث
            </button>
            <button
              onClick={onLock}
              className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-bold transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Lock className="w-4 h-4" /> قفل
            </button>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <KpiTile icon={<Boxes className="size-4" />} label="المتاح الآن" value={availableNow} accent="brand" />
          <KpiTile icon={<Package className="size-4" />} label="إجمالي الستوك" value={selected?.totalStock ?? 0} />
          <KpiTile icon={<AlertTriangle className="size-4" />} label="منتجات منخفضة" value={q.data?.lowStockCount ?? 0} accent="amber" />
          <KpiTile icon={<PackageCheck className="size-4" />} label="إجمالي المتاح" value={q.data?.totalAvailable ?? 0} accent="emerald" />
        </div>
      </motion.div>

      {q.error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm">
          {(q.error as Error).message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Main dispenser */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5 }}
          className="lg:col-span-3 relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-5"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-cyan-400 to-brand" />

          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Send className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-extrabold truncate">تسليم أكواد</h2>
              <p className="text-xs text-muted-foreground">اختَر البيانات والنظام هيسحب أول أكواد متاحة</p>
            </div>
            <span className={`ms-auto shrink-0 inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${stockHealth.tone}`}>
              {stockHealth.label}
            </span>
          </div>

          {/* Steps grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <StepField step={1} icon={<UserCircle2 className="size-4" />} label="اسم الموظف">
              <select
                value={staffName}
                onChange={(e) => { setStaffName(e.target.value); localStorage.setItem(STAFF_KEY, e.target.value); }}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">اختر اسم الموظف</option>
                {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </StepField>

            <StepField step={2} icon={<User className="size-4" />} label="اسم العميل">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اكتب اسم العميل"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none"
              />
            </StepField>

            <StepField step={3} icon={<Package className="size-4" />} label="المنتج" className="sm:col-span-2">
              <select
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">اختر المنتج</option>
                {products.map((p) => (
                  <option key={p.productName} value={p.productName}>
                    {p.productName} — المتاح {p.availableCount}
                  </option>
                ))}
              </select>
            </StepField>

            <StepField step={4} icon={<Boxes className="size-4" />} label="الكمية" className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={dec}
                  disabled={qty <= 1}
                  className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-background transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <div className="flex-1 h-11 grid place-items-center rounded-xl border border-border bg-background text-lg font-extrabold tabular-nums">
                  {qty}
                </div>
                <button
                  type="button"
                  onClick={inc}
                  disabled={qty >= availableNow}
                  className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-background transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
                <div className="hidden sm:block text-xs text-muted-foreground ms-2">
                  الحد الأقصى: <span className="font-bold text-foreground">{availableNow}</span>
                </div>
              </div>
            </StepField>
          </div>

          <button
            onClick={doIssue}
            disabled={!canDeliver}
            className="group relative w-full overflow-hidden rounded-2xl bg-brand px-4 py-4 font-extrabold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:shadow-brand/40 disabled:opacity-50 disabled:shadow-none"
          >
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> {busy ? "جارٍ التنفيذ..." : "تسليم الأكواد"}
            </span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 font-extrabold text-emerald-500">
                  <CheckCircle2 className="size-4" /> تم تسليم الأكواد · {result.orderId}
                </div>
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
            </motion.div>
          )}
        </motion.div>

        {/* Side info panel */}
        <motion.aside
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="lg:col-span-2 space-y-5 h-fit"
        >
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-500">
                <StickyNote className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold truncate">ملاحظات المنتج</h3>
                <p className="text-xs text-muted-foreground truncate">تظهر مع كل تسليم</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm whitespace-pre-wrap min-h-[100px]">
              {selected?.notes || <span className="text-muted-foreground">اختر منتجًا لعرض الملاحظات المرتبطة به.</span>}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-3">
            <h3 className="text-lg font-extrabold">تعليمات سريعة</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1.5 rounded-full bg-brand shrink-0" />
                اختر الموظف والعميل ثم المنتج والكمية.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1.5 rounded-full bg-brand shrink-0" />
                النظام يسحب أول أكواد متاحة تلقائيًا.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-1.5 rounded-full bg-amber-500 shrink-0" />
                لو الكود لم يُسلَّم، اضغط «لم يتم الاستلام» لإرجاعه.
              </li>
            </ul>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

function KpiTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: "brand" | "amber" | "emerald" }) {
  const tone =
    accent === "brand" ? "text-brand" :
    accent === "amber" ? "text-amber-500" :
    accent === "emerald" ? "text-emerald-500" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-background/60 backdrop-blur p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
        <span className={tone}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 text-xl sm:text-2xl font-extrabold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function StepField({ step, icon, label, children, className = "" }: { step: number; icon: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex size-5 items-center justify-center rounded-md bg-brand/10 text-[10px] font-extrabold text-brand">{step}</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          {icon} {label}
        </span>
      </div>
      {children}
    </label>
  );
}

