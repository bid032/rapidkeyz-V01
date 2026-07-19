import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Boxes, PackageCheck, AlertTriangle, Send, StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { getStockData } from "@/lib/stock-sheet.functions";

const UNLOCK_KEY = "rk_stock_unlocked";
const LOW_STOCK_THRESHOLD = 5;

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

  return <StockDispenser onLock={() => { sessionStorage.removeItem(UNLOCK_KEY); setUnlocked(false); notify("تم القفل", "success"); }} />;
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

/** Try to find a column index by matching header candidates (case-insensitive, substring). */
function findCol(headers: string[], candidates: string[]) {
  const norm = headers.map((h) => (h ?? "").toString().trim().toLowerCase());
  for (const c of candidates) {
    const idx = norm.findIndex((h) => h.includes(c.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function StockDispenser({ onLock }: { onLock: () => void }) {
  const { notify } = useApp();
  const fetcher = useServerFn(getStockData);
  const [employee, setEmployee] = useState("");
  const [customer, setCustomer] = useState("");
  const [productKey, setProductKey] = useState("");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("بيبعته للعميل عطول من غير فيزا ولا اي حاجه");

  const q = useQuery({
    queryKey: ["stock-sheet"],
    queryFn: () => fetcher(),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const { productIdx, deliveryIdx, statusIdx, products, totalAvailable, lowCount } = useMemo(() => {
    const headers = q.data?.headers ?? [];
    const rows = q.data?.rows ?? [];
    const pIdx = findCol(headers, ["product_name", "product", "المنتج", "اسم المنتج", "name"]);
    const dIdx = findCol(headers, ["delivery", "نوع التسليم", "type"]);
    const sIdx = findCol(headers, ["status", "الحالة", "state"]);

    const groups = new Map<string, number>();
    for (const r of rows) {
      // consider only rows not marked delivered/used
      if (sIdx !== -1) {
        const s = (r[sIdx] ?? "").toLowerCase();
        if (s.includes("delivered") || s.includes("used") || s.includes("تم")) continue;
      }
      const key = pIdx !== -1 ? (r[pIdx] ?? "").trim() : "غير محدد";
      if (!key) continue;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    const arr = Array.from(groups.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
    const total = arr.reduce((s, p) => s + p.count, 0);
    const low = arr.filter((p) => p.count > 0 && p.count <= LOW_STOCK_THRESHOLD).length;
    return { productIdx: pIdx, deliveryIdx: dIdx, statusIdx: sIdx, products: arr, totalAvailable: total, lowCount: low };
  }, [q.data]);

  const selectedProduct = products.find((p) => p.name === productKey);
  const availableNow = selectedProduct?.count ?? 0;

  const deliveryType = useMemo(() => {
    if (!productKey || deliveryIdx === -1) return "-";
    const rows = q.data?.rows ?? [];
    const row = rows.find((r) => (productIdx !== -1 ? r[productIdx] : "") === productKey);
    return (row?.[deliveryIdx] ?? "-") || "-";
  }, [productKey, deliveryIdx, productIdx, q.data]);

  const stockHealth = totalAvailable > 50 ? { label: "ممتاز", tone: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" }
    : totalAvailable > 10 ? { label: "جيد", tone: "bg-brand/15 text-brand border-brand/30" }
    : totalAvailable > 0 ? { label: "منخفض", tone: "bg-amber-500/15 text-amber-500 border-amber-500/30" }
    : { label: "فارغ", tone: "bg-destructive/15 text-destructive border-destructive/30" };

  const canDeliver = employee && customer.trim() && productKey && qty > 0 && qty <= availableNow;

  const deliver = () => {
    if (!canDeliver) return notify("اكمل بيانات التسليم أولاً", "error");
    notify("قريبًا — تسليم الأكواد يحتاج ربط الكتابة على الشيت", "info");
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
        <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-xl font-extrabold">الاستوك</h2>
            <p className="text-xs text-muted-foreground mt-1">
              الموظف يختار الاسم واسم العميل والمنتج والكمية، والنظام بيسحب أول أكواد متاحة تلقائيًا.
            </p>
          </div>

          {/* Info strip */}
          <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">المتاح الآن</div>
              <div className="font-extrabold text-brand text-lg">{availableNow}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">إجمالي الستوك</div>
              <div className="font-extrabold text-lg">{totalAvailable}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">نوع التسليم</div>
              <div className="font-extrabold text-lg">{deliveryType}</div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <Field label="اسم الموظف">
              <select
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-brand"
              >
                <option value="">اختر اسم الموظف</option>
                <option value="admin">Admin</option>
                <option value="support">Support</option>
                <option value="sales">Sales</option>
              </select>
            </Field>

            <Field label="اسم العميل">
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="اكتب اسم العميل"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-brand"
              />
            </Field>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="المنتج">
                <select
                  value={productKey}
                  onChange={(e) => setProductKey(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-brand"
                >
                  <option value="">اختر المنتج</option>
                  {products.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} — المتاح {p.count}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="الكمية">
                <input
                  type="number"
                  min={1}
                  max={availableNow || 1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-center focus:outline-none focus:border-brand"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={deliver}
                disabled={!canDeliver}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand text-brand-foreground rounded-xl font-bold hover:brand-glow disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> تسليم الأكواد
              </button>
              <button
                onClick={() => q.refetch()}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-muted text-sm font-bold hover:bg-brand/10 hover:text-brand"
              >
                <RefreshCw className={`w-4 h-4 ${q.isFetching ? "animate-spin" : ""}`} /> تحديث البيانات
              </button>
            </div>
          </div>
        </div>

        {/* Quick panel */}
        <aside className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-4 h-fit">
          <div>
            <h2 className="text-xl font-extrabold">لوحة سريعة</h2>
            <p className="text-xs text-muted-foreground mt-1">هنا هتشوف المتاح والملاحظات العامة بسرعة</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-4 text-center">
              <div className="text-2xl font-extrabold text-brand">{lowCount}</div>
              <div className="text-xs text-muted-foreground mt-1">منتجات منخفضة</div>
            </div>
            <div className="rounded-2xl border border-border p-4 text-center">
              <div className="text-2xl font-extrabold">{totalAvailable}</div>
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
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {lowCount > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>لو الكود لم يُسلَّم فعلًا، استخدم زر الاستلام لإرجاع آخر صرف للمخزون.</span>
            </div>
          )}
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
