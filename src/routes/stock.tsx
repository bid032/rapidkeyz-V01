import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Lock, RefreshCw, Boxes, PackageCheck, AlertTriangle, Send, StickyNote,
  Copy, Undo2, Minus, Plus, UserCircle2, Package, Sparkles, CheckCircle2,
  LogOut, KeyRound, Phone,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import {
  getStockAppData, issueStock, revertIssue, type IssueResult,
} from "@/lib/stock-sheet.functions";
import { stockLogin, stockLogout, getStockSession } from "@/lib/stock-auth.functions";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/stock")({
  component: StockPage,
});

function StockPage() {
  const sessionFn = useServerFn(getStockSession);
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["stock-session"],
    queryFn: () => sessionFn(),
    staleTime: 0,
  });

  const handleLoggedIn = (staffName: string) => {
    queryClient.setQueryData(["stock-session"], { loggedIn: true as const, staffName });
    queryClient.invalidateQueries({ queryKey: ["stock-session"] });
    queryClient.invalidateQueries({ queryKey: ["stock-app-data"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-10">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">جارٍ التحميل...</div>
        ) : q.data?.loggedIn ? (
          <StockDispenser staffName={q.data.staffName} onLogout={() => q.refetch()} />
        ) : (
          <LoginGate onLoggedIn={handleLoggedIn} />
        )}
      </main>
      <Footer />
    </div>
  );
}

function LoginGate({ onLoggedIn }: { onLoggedIn: (staffName: string) => void }) {
  const { notify } = useApp();
  const loginFn = useServerFn(stockLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      const res = await loginFn({ data: { username: username.trim(), password } });
      if (res.ok) {
        notify(`أهلاً ${res.staffName}`, "success");
        onLoggedIn(res.staffName);
      } else {
        notify(res.error || "بيانات الدخول غير صحيحة", "error");
      }
    } catch (e: any) {
      notify(e?.message ?? "حصل خطأ", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 sm:mt-16 px-2">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden bg-card border border-border rounded-3xl p-7 sm:p-9 shadow-2xl"
      >
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 bg-brand/20 blur-3xl rounded-full" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/15 blur-3xl rounded-full" />

        <div className="relative flex flex-col items-center text-center gap-2 mb-6">
          <div className="w-14 h-14 rounded-2xl grid place-items-center bg-brand/10 text-brand ring-1 ring-brand/20">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold">دخول موظفي الاستوك</h1>
          <p className="text-sm text-muted-foreground">استخدم اسم المستخدم وكلمة السر الخاصة بك</p>
        </div>

        <form onSubmit={submit} className="relative space-y-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
              <UserCircle2 className="w-3.5 h-3.5" /> اسم المستخدم
            </span>
            <input
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-brand"
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1.5">
              <KeyRound className="w-3.5 h-3.5" /> كلمة السر
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-brand"
              dir="ltr"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full px-4 py-3 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow disabled:opacity-60 transition"
          >
            {loading ? "جارٍ التحقق..." : "دخول"}
          </button>
        </form>

        <p className="relative mt-5 text-[11px] text-muted-foreground text-center">
          للحصول على حساب تواصل مع الأدمن.
        </p>
      </motion.div>
    </div>
  );
}

function StockDispenser({ staffName, onLogout }: { staffName: string; onLogout: () => void }) {
  const { notify, confirm } = useApp();
  const qc = useQueryClient();
  const fetcher = useServerFn(getStockAppData);
  const issueFn = useServerFn(issueStock);
  const revertFn = useServerFn(revertIssue);
  const logoutFn = useServerFn(stockLogout);

  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IssueResult | null>(null);

  const q = useQuery({
    queryKey: ["stock-app-data"],
    queryFn: () => fetcher(),
    refetchInterval: 8_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  const products = q.data?.products ?? [];
  const selected = products.find((p) => p.productName === productName);

  const stockHealth = useMemo(() => {
    if (!selected) return { label: "لا يوجد اختيار", tone: "bg-muted text-muted-foreground border-border" };
    if (selected.availableCount === 0) return { label: "فارغ", tone: "bg-destructive/15 text-destructive border-destructive/30" };
    if (selected.availableCount <= 3) return { label: "منخفض", tone: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
    return { label: "جيد", tone: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };
  }, [selected]);

  const availableNow = selected?.availableCount ?? 0;
  const canDeliver = !busy && customerName.trim() && productName && qty > 0 && qty <= availableNow;

  const doIssue = async () => {
    if (!canDeliver) return notify("اكمل بيانات التسليم أولاً", "error");
    setBusy(true);
    setResult(null);
    try {
      const res = await issueFn({
        data: {
          customerName: customerName.trim(),
          customerWhatsapp: customerWhatsapp.trim(),
          productName,
          qty,
        },
      });
      setResult(res);
      notify("تم تسليم الأكواد", "success");
      setCustomerName("");
      setCustomerWhatsapp("");
      q.refetch();
    } catch (e: any) {
      notify(e?.message ?? "حصل خطأ", "error");
    } finally {
      setBusy(false);
    }
  };

  const doRevert = async () => {
    if (!result?.orderId) return;
    const ok = await confirm({
      title: "إرجاع للمخزون",
      message: "هل أنت متأكد أن الكود لم يتم استلامه وتريد إرجاع آخر صرف للمخزون؟",
      tone: "danger",
      confirmLabel: "أرجِع",
    });
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

  const doLogout = async () => {
    await logoutFn({});
    qc.setQueryData(["stock-session"], { loggedIn: false });
    notify("تم تسجيل الخروج", "success");
    onLogout();
  };

  const copyAll = () => {
    if (!result?.displayText) return;
    navigator.clipboard.writeText(result.displayText).then(() => notify("تم نسخ الأكواد", "success"));
  };
  const copyOne = (text: string) => {
    navigator.clipboard.writeText(text).then(() => notify("تم النسخ", "success"));
  };

  const dec = () => setQty((n: number) => Math.max(1, n - 1));
  const inc = () => setQty((n: number) => Math.min(Math.max(1, availableNow || 5), n + 1));

  return (
    <div className="space-y-6">
      {/* Hero + KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7"
      >
        <div aria-hidden className="pointer-events-none absolute -top-12 -left-12 w-56 h-56 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 text-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest mb-2">
              <Sparkles className="w-3 h-3" /> Live
              <span className="relative flex h-1.5 w-1.5 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">أهلاً {staffName}</h1>
            <p className="text-sm text-muted-foreground mt-1">تسليم فوري من مخزون الشيت المرتبط</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => q.refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-sm font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${q.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </button>
            <button
              onClick={doLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-destructive/10 hover:text-destructive text-sm font-bold"
            >
              <LogOut className="w-4 h-4" /> خروج
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <KpiTile icon={<Boxes className="w-4 h-4" />} label="إجمالي المتاح" value={q.data?.totalAvailable ?? 0} accent="brand" />
          <KpiTile icon={<PackageCheck className="w-4 h-4" />} label="المنتجات" value={products.length} />
          <KpiTile icon={<AlertTriangle className="w-4 h-4" />} label="مخزون منخفض" value={q.data?.lowStockCount ?? 0} accent="amber" />
          <KpiTile icon={<CheckCircle2 className="w-4 h-4" />} label="جاهز الآن" value={selected ? availableNow : "—"} accent="emerald" />
        </div>
      </motion.div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-5 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5 }}
          className="lg:col-span-3 rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">تسليم اشتراك</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${stockHealth.tone}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" /> {stockHealth.label}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <StepField step={1} icon={<UserCircle2 className="w-3.5 h-3.5" />} label="اسم الموظف">
              <div className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-bold flex items-center justify-between">
                <span>{staffName}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">مقفول</span>
              </div>
            </StepField>

            <StepField step={2} icon={<UserCircle2 className="w-3.5 h-3.5" />} label="اسم العميل">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اكتب اسم العميل"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-brand"
              />
            </StepField>

            <StepField step={3} icon={<Package className="w-3.5 h-3.5" />} label="المنتج">
              <select
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-brand"
              >
                <option value="">اختر المنتج</option>
                {products.map((p) => (
                  <option key={p.productName} value={p.productName}>
                    {p.productName} — متاح {p.availableCount}
                  </option>
                ))}
              </select>
            </StepField>

            <StepField step={4} icon={<Boxes className="w-3.5 h-3.5" />} label={`الكمية${selected ? ` (متاح ${availableNow})` : ""}`}>
              <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl p-1 w-fit">
                <button type="button" onClick={dec} className="p-2 rounded-lg hover:bg-muted"><Minus className="w-4 h-4" /></button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 text-center bg-transparent focus:outline-none font-bold tabular-nums"
                />
                <button type="button" onClick={inc} className="p-2 rounded-lg hover:bg-muted"><Plus className="w-4 h-4" /></button>
              </div>
            </StepField>

            <StepField step={5} icon={<Phone className="w-3.5 h-3.5" />} label="واتس العميل (اختياري)" className="sm:col-span-2">
              <input
                type="tel"
                dir="ltr"
                value={customerWhatsapp}
                onChange={(e) => setCustomerWhatsapp(e.target.value)}
                placeholder="+20…"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-brand text-left"
              />
            </StepField>
          </div>

          <button
            onClick={doIssue}
            disabled={!canDeliver}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand text-brand-foreground rounded-xl font-extrabold shadow-lg hover:brand-glow disabled:opacity-60 transition"
          >
            <Send className="w-4 h-4" />
            {busy ? "جارٍ التسليم..." : "تسليم الآن"}
          </button>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-emerald-500 font-extrabold">
                  <CheckCircle2 className="w-5 h-5" />
                  تم التسليم — {result.orderId}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={copyAll} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-background border border-border hover:bg-muted">
                    <Copy className="w-3.5 h-3.5" /> نسخ الكل
                  </button>
                  <button onClick={doRevert} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-background border border-border hover:bg-destructive/10 hover:text-destructive">
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
              <li className="flex items-start gap-2"><span className="mt-1 size-1.5 rounded-full bg-brand shrink-0" /> اكتب اسم العميل ورقم واتس (اختياري) واختر المنتج والكمية.</li>
              <li className="flex items-start gap-2"><span className="mt-1 size-1.5 rounded-full bg-brand shrink-0" /> النظام يسحب أول أكواد متاحة تلقائيًا.</li>
              <li className="flex items-start gap-2"><span className="mt-1 size-1.5 rounded-full bg-amber-500 shrink-0" /> لو الكود لم يُسلَّم، اضغط «لم يتم الاستلام» لإرجاعه.</li>
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
