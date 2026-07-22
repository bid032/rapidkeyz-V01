import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { showError } from "@/lib/error-handler";
import { notifyItemDelivered } from "@/lib/notify-order.functions";
import { markInventorySoldOnSheet } from "@/lib/sheet-sync.functions";
import { dialForCountry } from "@/lib/arab-countries";

// Build a wa.me-safe number: prepend country dial code when the phone was
// entered in local form (e.g. "010..." or "10..."). Handles cases where the
// dial is already there so we never double-prefix.
function buildWaNumber(phone: string, country?: string | null): string {
  const dial = dialForCountry(country ?? "");
  let digits = String(phone ?? "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (dial && digits.startsWith(dial)) return digits;
  digits = digits.replace(/^0+/, "");
  return `${dial}${digits}`;
}


export const Route = createFileRoute("/_authenticated/admin/orders")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "moderator"]);
    if (!roles || roles.length === 0) throw redirect({ to: "/admin/products" });
  },
  component: AdminOrders,
});


const STATUSES = ["pending", "paid", "processing", "delivered", "cancelled", "refunded"] as const;
// "refunded" must not be set manually — it's driven by the refunds flow to keep totals consistent.
const MANUAL_STATUSES = STATUSES.filter((s) => s !== "refunded");

type Tab = "all" | "expiring";

function AdminOrders() {
  const { t, lang, confirm, notify } = useApp();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");




  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, coupons(code, discount_type, discount_value), order_items(*, product_plans(duration_days, plan_variant, price, compare_price, label_ar, label_en), products(slug, name_ar, name_en, cover_url, icon_url), delivered_accounts(*)), refunds(id, amount, type, order_item_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  const openProof = async (path: string) => {
    setProofLoading(true);
    setProofPreview("__loading__");
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 3600);
    setProofLoading(false);
    if (error || !data?.signedUrl) {
      setProofPreview(null);
      notify(error?.message ?? (lang === "ar" ? "تعذّر فتح إثبات الدفع" : "Failed to open proof"), "error");
      return;
    }
    setProofPreview(data.signedUrl);
  };

  // Compute per-order min days-remaining (over items actually delivered to the customer)
  const expiring = useMemo(() => {
    const now = Date.now();
    return (orders.data ?? []).map((o: any) => {
      let minDays = Infinity;
      for (const it of o.order_items ?? []) {
        const dur = Number(it.product_plans?.duration_days ?? 0);
        const dAcc = it.delivered_accounts?.[0];
        // Only count items that were actually delivered to the customer
        if (!dAcc) continue;
        const startAt = new Date(dAcc.delivered_at).getTime();
        if (dur > 0) {
          const endAt = startAt + dur * 86400_000;
          const days = Math.ceil((endAt - now) / 86400_000);
          if (days < minDays) minDays = days;
        }
      }
      return { order: o, minDays: minDays === Infinity ? null : minDays };
    });
  }, [orders.data]);

  const visible = useMemo(() => {
    let list = expiring;
    if (tab === "expiring") {
      list = list
        .filter(({ order: o, minDays }) =>
          minDays !== null &&
          minDays <= 30 &&
          minDays > -365 &&
          o.status === "delivered"
        )
        .sort((a, b) => (a.minDays ?? 0) - (b.minDays ?? 0));
    }

    if (statusFilter !== "all") {
      list = list.filter(({ order: o }: any) => o.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(({ order: o }: any) =>
        String(o.order_number ?? "").toLowerCase().includes(q) ||
        String(o.customer_email ?? "").toLowerCase().includes(q) ||
        String(o.customer_phone ?? "").toLowerCase().includes(q) ||
        String(o.customer_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [expiring, tab, search, statusFilter]);

  const profilesMap = useQuery({
    queryKey: ["admin-orders-profiles", (orders.data ?? []).map((o: any) => o.user_id).filter(Boolean).join(",")],
    enabled: !!orders.data?.length,
    queryFn: async () => {
      const ids = Array.from(new Set((orders.data ?? []).map((o: any) => o.user_id).filter(Boolean)));
      const map = new Map<string, any>();
      if (!ids.length) return map;
      const { data } = await supabase.from("profiles").select("id, display_name, phone, country").in("id", ids);
      (data ?? []).forEach((p: any) => map.set(p.id, p));
      return map;
    },
  });

  const exportOrdersXlsx = () => {
    const rows: any[] = [];
    visible.forEach(({ order: o }: any) => {
      const prof = profilesMap.data?.get(o.user_id) ?? {};
      const items = o.order_items ?? [];
      if (!items.length) {
        rows.push({
          "رقم الطلب": o.order_number,
          "اسم العميل": o.customer_name ?? prof.display_name ?? "",
          "البريد": o.customer_email ?? "",
          "رقم الواتساب": o.customer_phone ?? prof.phone ?? "",
          "الدولة": prof.country ?? "",
          "الحالة": o.status,
          "الإجمالي": Number(o.total ?? 0),
          "طريقة الدفع": o.payment_gateway ?? "",
          "رقم المرسل": o.payment_sender_phone ?? "",
          "الخدمة": "",
          "الخطة": "",
          "الكمية": "",
          "سعر الوحدة": "",
          "التاريخ": new Date(o.created_at).toLocaleDateString("en-GB"),
          "الوقت": new Date(o.created_at).toLocaleTimeString("en-GB", { hour12: true }),
          "ملاحظات": o.notes ?? "",
        });
        return;
      }
      items.forEach((it: any) => {
        rows.push({
          "رقم الطلب": o.order_number,
          "اسم العميل": o.customer_name ?? prof.display_name ?? "",
          "البريد": o.customer_email ?? "",
          "رقم الواتساب": o.customer_phone ?? prof.phone ?? "",
          "الدولة": prof.country ?? "",
          "الحالة": o.status,
          "الإجمالي": Number(o.total ?? 0),
          "طريقة الدفع": o.payment_gateway ?? "",
          "رقم المرسل": o.payment_sender_phone ?? "",
          "الخدمة": it.product_name,
          "الخطة": it.plan_label,
          "الكمية": it.quantity,
          "سعر الوحدة": Number(it.unit_price ?? 0),
          "التاريخ": new Date(o.created_at).toLocaleDateString("en-GB"),
          "الوقت": new Date(o.created_at).toLocaleTimeString("en-GB", { hour12: true }),
          "ملاحظات": o.notes ?? "",
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const rawTitle = (document.title || "orders").split(/[,–|:-]/)[0];
    const siteName = rawTitle.replace(/[\\/:*?"<>|]+/g, "").trim() || "orders";
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const suffix = statusFilter === "all" ? `all-${today}` : `${statusFilter}-${today}`;
    XLSX.writeFile(wb, `${siteName} - orders - ${suffix}.xlsx`);
  };


  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      notify(lang === "ar" ? "تم تحديث الحالة" : "Status updated", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const deliver = useMutation({
    mutationFn: async ({ orderItemId, creds }: { orderItemId: string; creds: any }) => {
      const { error } = await supabase.from("delivered_accounts").insert({
        order_item_id: orderItemId,
        ...creds,
      });
      if (error) throw error;
      // Flip the per-item status. Order-level status auto-flips via DB trigger.
      const { error: sErr } = await supabase
        .from("order_items")
        .update({ status: "delivered" as any })
        .eq("id", orderItemId);
      if (sErr) throw sErr;
      // Fire-and-await customer email with the delivered credentials.
      try {
        await notifyItemDelivered({ data: { orderItemId } });
      } catch (e) {
        console.error("notifyItemDelivered failed", e);
        notify(lang === "ar" ? "تم التسليم لكن الإيميل فشل" : "Delivered but email failed", "error");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      notify(lang === "ar" ? "تم التسليم وإرسال الإيميل" : "Delivered & emailed", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const deliverInstant = useMutation({
    mutationFn: async ({ orderItemId, planId }: { orderItemId: string; planId: string }) => {
      const { data: claimedId, error } = await supabase.rpc("claim_inventory_for_item", {
        _order_item_id: orderItemId,
        _plan_id: planId,
      });
      if (error) throw error;
      if (!claimedId) {
        throw new Error(lang === "ar" ? "لا يوجد مخزون متاح — سلّم يدويًا" : "No inventory available — deliver manually");
      }
      const { error: sErr } = await supabase
        .from("order_items")
        .update({ status: "delivered" as any })
        .eq("id", orderItemId);
      if (sErr) throw sErr;
      try {
        await markInventorySoldOnSheet({ data: { inventoryId: claimedId as string } });
      } catch (e) {
        console.error("markInventorySoldOnSheet failed", e);
      }
      try {
        await notifyItemDelivered({ data: { orderItemId } });
      } catch (e) {
        console.error("notifyItemDelivered failed", e);
        notify(lang === "ar" ? "تم التسليم لكن الإيميل فشل" : "Delivered but email failed", "error");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      notify(lang === "ar" ? "تم التسليم الفوري من المخزون" : "Delivered from inventory", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });



  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      notify(lang === "ar" ? "تم حذف الطلب" : "Order deleted", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const clearAllOrders = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").delete().not("id", "is", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      notify(lang === "ar" ? "تم مسح كل الطلبات" : "All orders cleared", "success");
    },
    onError: (e) => showError(e, notify, lang),
  });

  const askClearAll = async () => {
    const ok = await confirm({
      message:
        lang === "ar"
          ? "سيتم حذف كل الطلبات نهائياً مع كل تفاصيلها. متأكد؟"
          : "All orders and their details will be permanently deleted. Continue?",
      tone: "danger",
    });
    if (!ok) return;
    clearAllOrders.mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl sm:text-3xl font-extrabold">{t.admin.orders}</h1>
        <div className="flex bg-muted rounded-lg p-1 w-full sm:w-auto overflow-x-auto">
          {([
            { k: "all", label: "كل الطلبات" },
            { k: "expiring", label: "خدمات شارفت على الانتهاء" },
          ] as const).map((x) => (
            <button
              key={x.k}
              onClick={() => setTab(x.k)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-md transition whitespace-nowrap ${
                tab === x.k ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>




      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "ar" ? "بحث برقم الطلب أو الاسم أو الإيميل أو الواتساب…" : "Search by order #, name, email or phone…"}
          className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-bold"
        >
          <option value="all">كل الحالات</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={exportOrdersXlsx}
          disabled={!visible.length}
          className="px-4 py-2.5 bg-brand text-brand-foreground rounded-lg font-bold text-sm disabled:opacity-50 whitespace-nowrap"
        >
          تحميل Excel
        </button>
        <button
          onClick={askClearAll}
          disabled={clearAllOrders.isPending || !(orders.data?.length)}
          className="px-4 py-2.5 rounded-lg font-bold text-sm border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 whitespace-nowrap"
        >
          {clearAllOrders.isPending
            ? (lang === "ar" ? "جارٍ المسح…" : "Clearing…")
            : (lang === "ar" ? "مسح كل الطلبات" : "Clear all orders")}
        </button>
      </div>


      {tab === "expiring" && (
        <p className="text-xs text-muted-foreground mb-4">
          كل خدمة فاضل عليها شهر أو أقل قبل الانتهاء. الحساب بيبدأ من تاريخ التسليم الفعلي، أو من تاريخ الطلب لو لسه ما اتسلمش.
        </p>
      )}
      <div className="space-y-3">
        {visible.map(({ order: o, minDays }) => (
          <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-3">
              <div className="min-w-0">
                <div className="font-bold flex items-center gap-2 flex-wrap">
                  #{o.order_number}
                  {(o.refunds?.length ?? 0) > 0 && (() => {
                    const total = o.refunds.reduce((s: number, r: any) => s + Number(r.amount), 0);
                    return (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/15 text-destructive font-bold">
                        تعويض -{total} EGP
                      </span>
                    );
                  })()}
                  {Number(o.discount_amount ?? 0) > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-success/15 text-success font-bold">
                      كوبون {o.coupons?.code ? `· ${o.coupons.code}` : ""} −{o.discount_amount} EGP
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground break-all">
                  {new Date(o.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { hour12: true })} · {o.customer_email}
                </div>
                {minDays !== null && (
                  <div className={`text-xs font-bold mt-1 ${
                    minDays < 0 ? "text-destructive" : minDays <= 7 ? "text-destructive" : minDays <= 30 ? "text-warning" : "text-muted-foreground"
                  }`}>
                    {minDays < 0 ? ` انتهت من ${Math.abs(minDays)} يوم` : ` باقي ${minDays} يوم`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <select value={o.status}
                  onChange={(e) => updateStatus.mutate({ id: o.id, status: e.target.value })}
                  className="px-3 py-1.5 bg-background border border-border rounded text-sm">
                  {MANUAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  {o.status === "refunded" && <option value="refunded">refunded</option>}
                </select>
                <span className="font-extrabold text-brand">{o.total} EGP</span>
                <button onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="text-brand text-sm hover:underline">
                  {expanded === o.id ? "Hide" : "Manage"}
                </button>
              </div>
            </div>
            {expanded === o.id && (() => {
              const prof = profilesMap.data?.get(o.user_id) ?? {};
              const itemsCount = (o.order_items ?? []).reduce((s: number, it: any) => s + Number(it.quantity ?? 0), 0);
              return (
              <div className="p-4 border-t border-border space-y-4 bg-muted/30">
                {/* Order details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">اسم العميل:</span> <span className="font-bold">{o.customer_name || prof.display_name || "—"}</span></div>
                  <div><span className="text-muted-foreground">الحساب:</span> {o.user_id ? <span className="text-xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold">مسجّل</span> : <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">زائر</span>}</div>
                  <div><span className="text-muted-foreground">البريد:</span> <span className="font-mono">{o.customer_email}</span></div>
                  <div>
                    <span className="text-muted-foreground">الهاتف:</span>{" "}
                    <span className="font-mono">{o.customer_phone || "—"}</span>
                    {o.customer_phone && (() => {
                      const wa = buildWaNumber(o.customer_phone, prof.country);
                      return (
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank" rel="noreferrer"
                          title={`wa.me/${wa}`}
                          className="ms-2 text-xs px-2 py-0.5 bg-success/15 text-success rounded font-bold"
                        >واتساب (+{wa})</a>
                      );
                    })()}
                  </div>
                  {prof.country && (
                    <div><span className="text-muted-foreground">الدولة:</span> <span className="font-bold">{prof.country}</span></div>
                  )}
                  <div><span className="text-muted-foreground">عدد الوحدات:</span> <span className="font-bold">{itemsCount}</span></div>
                  <div><span className="text-muted-foreground">الإجمالي:</span> <span className="font-extrabold text-brand">{o.total} EGP</span></div>
                  {Number(o.discount_amount ?? 0) > 0 && (
                    <div className="md:col-span-2 p-3 rounded-lg bg-success/5 border border-success/20 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-success">🎟️ كوبون خصم مُطبَّق</span>
                        {o.coupons?.code && (
                          <code className="text-xs font-mono bg-success/15 text-success px-2 py-0.5 rounded font-bold">{o.coupons.code}</code>
                        )}
                        {o.coupons?.discount_type === "percent" && (
                          <span className="text-[11px] text-muted-foreground">({o.coupons.discount_value}%)</span>
                        )}
                      </div>
                      <div className="text-xs grid grid-cols-3 gap-2 pt-1">
                        <div><span className="text-muted-foreground">قبل الخصم:</span> <span className="font-bold line-through text-muted-foreground">{o.subtotal} EGP</span></div>
                        <div><span className="text-muted-foreground">الخصم:</span> <span className="font-bold text-success">−{o.discount_amount} EGP</span></div>
                        <div><span className="text-muted-foreground">بعد الخصم:</span> <span className="font-extrabold text-brand">{o.total} EGP</span></div>
                      </div>
                    </div>
                  )}
                  <div><span className="text-muted-foreground">الحالة:</span> <span className="font-bold">{o.status}</span></div>
                  <div><span className="text-muted-foreground">طريقة الدفع:</span> <span className="font-bold">{o.payment_gateway}</span></div>
                  {o.payment_sender_phone && (
                    <div><span className="text-muted-foreground">رقم المُحوَّل منه:</span> <span className="font-mono">{o.payment_sender_phone}</span></div>
                  )}
                  {o.payment_reference && (
                    <div className="md:col-span-2"><span className="text-muted-foreground">مرجع الدفع:</span> <span className="font-mono">{o.payment_reference}</span></div>
                  )}
                  {o.notes && (
                    <div className="md:col-span-2"><span className="text-muted-foreground">ملاحظات:</span> {o.notes}</div>
                  )}
                  {o.payment_proof_url && (
                    <div className="md:col-span-2">
                      <button onClick={() => openProof(o.payment_proof_url)} className="text-sm px-3 py-1.5 bg-brand text-brand-foreground rounded font-bold">
                        عرض إثبات الدفع
                      </button>
                    </div>
                  )}
                </div>


                {/* Approve / Cancel */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => updateStatus.mutate({ id: o.id, status: "paid" })}
                    disabled={o.status === "paid" || o.status === "delivered"}
                    className="px-4 py-2 bg-success text-white rounded font-bold text-sm disabled:opacity-50"
                  >✓ تأكيد الدفع (Paid)</button>
                  <button
                    onClick={() => updateStatus.mutate({ id: o.id, status: "delivered" })}
                    disabled={o.status === "delivered"}
                    className="px-4 py-2 bg-brand text-brand-foreground rounded font-bold text-sm disabled:opacity-50"
                  >تم التسليم</button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({ title: "إلغاء الطلب", message: "متأكد إنك عاوز تلغي الطلب ده؟", tone: "danger", confirmLabel: "ألغِ الطلب" });
                      if (ok) updateStatus.mutate({ id: o.id, status: "cancelled" });
                    }}
                    disabled={o.status === "cancelled"}
                    className="px-4 py-2 bg-destructive text-white rounded font-bold text-sm disabled:opacity-50"
                  >✗ إلغاء</button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({ title: "حذف الطلب نهائيًا", message: "حذف الطلب نهائيًا؟ لا يمكن التراجع.", tone: "danger", confirmLabel: "احذف نهائيًا" });
                      if (ok) deleteOrder.mutate(o.id);
                    }}
                    className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded font-bold text-sm hover:bg-destructive hover:text-white transition"
                  >حذف نهائي</button>
                </div>

                {/* Items */}
                <div className="space-y-3 pt-2 border-t border-border">
                  {o.order_items?.map((it: any) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      onDeliver={(creds) => deliver.mutate({ orderItemId: it.id, creds })}
                      onDeliverInstant={
                        it.delivery_type === "instant" && it.plan_id
                          ? () => deliverInstant.mutate({ orderItemId: it.id, planId: it.plan_id })
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
              );
            })()}

          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-muted-foreground text-center py-16">
            {tab === "expiring" ? "مفيش خدمات قربت تنتهي" : "No orders yet"}
          </p>
        )}
      </div>

      {proofPreview && typeof document !== "undefined" && createPortal(
        <ProofLightbox
          src={proofPreview}
          loading={proofLoading || proofPreview === "__loading__"}
          onClose={() => setProofPreview(null)}
        />,
        document.body,
      )}
    </div>
  );
}


function ItemRow({ item, onDeliver, onDeliverInstant }: { item: any; onDeliver: (creds: any) => void; onDeliverInstant?: () => void }) {
  const { lang, notify } = useApp();
  const [creds, setCreds] = useState({ account_email: "", account_username: "", account_password: "", extra_notes: "" });
  const [resending, setResending] = useState(false);
  const itemStatus: "pending" | "delivered" | "refunded" = item.status ?? (item.delivered_accounts?.length > 0 ? "delivered" : "pending");
  const delivered = itemStatus === "delivered";
  const refunded = itemStatus === "refunded";

  const resend = async () => {
    setResending(true);
    try {
      await notifyItemDelivered({ data: { orderItemId: item.id } });
      notify(lang === "ar" ? "تم إعادة إرسال الإيميل" : "Email resent", "success");
    } catch (e: any) {
      notify(e?.message || (lang === "ar" ? "فشل الإرسال" : "Send failed"), "error");
    } finally {
      setResending(false);
    }
  };


  const plan = item.product_plans;
  const prod = item.products;
  const lineTotal = Number(item.unit_price) * Number(item.quantity);
  const originalUnit = plan?.price ? Number(plan.price) : null;
  const discounted = originalUnit !== null && Math.abs(originalUnit - Number(item.unit_price)) > 0.5;

  return (
    <div className="p-4 bg-background border border-border rounded-xl">
      <div className="flex justify-between mb-2 gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {(prod?.cover_url || prod?.icon_url) && (
            <img src={prod.cover_url || prod.icon_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap" dir={lang === "ar" ? "rtl" : "ltr"}>
              {prod?.slug ? (
                <a href={`/product/${prod.slug}`} target="_blank" rel="noreferrer" className="font-bold hover:text-brand underline-offset-2 hover:underline">
                  <bdi>{item.product_name}</bdi>
                </a>
              ) : (
                <span className="font-bold"><bdi>{item.product_name}</bdi></span>
              )}
              <span className="text-sm font-bold text-muted-foreground">
                {lang === "ar" ? "الكمية:" : "Qty:"} {item.quantity}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5" dir={lang === "ar" ? "rtl" : "ltr"}>
              <span className="text-[10px] px-2 py-0.5 rounded bg-brand/10 text-brand font-bold">
                {lang === "ar" ? "الخطة:" : "Plan:"} <bdi>{item.plan_label}</bdi>
              </span>
              {item.account_type && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-brand/10 text-brand font-bold">
                  {lang === "ar" ? "نوع الحساب:" : "Account:"} {item.account_type === "private" ? (lang === "ar" ? "خاص" : "Private") : item.account_type === "shared" ? (lang === "ar" ? "مشترك" : "Shared") : item.account_type}
                </span>
              )}
              {plan?.plan_variant && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 font-bold">
                  {lang === "ar" ? "نوع الخطة:" : "Variant:"} <bdi>{plan.plan_variant}</bdi>
                </span>
              )}
              {plan?.duration_days > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                  {lang === "ar" ? "المدة:" : "Duration:"} {lang === "ar" ? `${plan.duration_days} يوم` : `${plan.duration_days} days`}
                </span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.delivery_type === "instant" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                {lang === "ar" ? "التسليم:" : "Delivery:"} {item.delivery_type === "instant" ? (lang === "ar" ? "فوري" : "Instant") : (lang === "ar" ? "يدوي" : "Manual")}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${delivered ? "bg-success/15 text-success" : refunded ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                {delivered
                  ? (lang === "ar" ? "✓ تم التسليم" : "✓ Delivered")
                  : refunded
                  ? (lang === "ar" ? "↺ تم الاسترداد" : "↺ Refunded")
                  : (lang === "ar" ? "⏳ قيد المراجعة" : "⏳ Pending review")}
              </span>
            </div>
          </div>
        </div>
        <div className="text-sm shrink-0 text-end" dir="ltr">
          <div className="text-xs text-muted-foreground">
            {item.unit_price} EGP
            {discounted && originalUnit !== null && (
              <span className="ms-1 line-through opacity-60">{originalUnit} EGP</span>
            )}
          </div>
          <div className="font-extrabold text-brand text-base">{lineTotal} EGP</div>
        </div>
      </div>

      {item.subscription_email && (
        <div className="text-xs mb-2 p-2 bg-muted/40 rounded border border-border">
          <span className="text-muted-foreground">{lang === "ar" ? "الحساب المطلوب تفعيله:" : "Activate on:"}</span>{" "}
          <span className="font-mono font-bold">{item.subscription_email}</span>
        </div>
      )}


      {delivered ? (
        <div className="mt-2 p-3 bg-success/5 border border-success/20 rounded font-mono text-xs">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span>✓ Delivered</span>
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="px-2 py-1 rounded bg-brand/10 border border-brand/30 text-brand text-[11px] font-bold hover:bg-brand hover:text-brand-foreground disabled:opacity-50"
            >
              {resending ? (lang === "ar" ? "جاري…" : "Sending…") : (lang === "ar" ? "إعادة إرسال الإيميل" : "Resend email")}
            </button>
          </div>
          {item.delivered_accounts.map((a: any) => {
            const dur = Number(item.product_plans?.duration_days ?? 0);
            const startAt = a.delivered_at ? new Date(a.delivered_at) : null;
            const endAt = startAt && dur > 0 ? new Date(startAt.getTime() + dur * 86400_000) : null;
            const fmt = (d: Date) => d.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { hour12: true });
            const daysLeft = endAt ? Math.ceil((endAt.getTime() - Date.now()) / 86400_000) : null;
            return (
              <div key={a.id} className="mt-1">
                {a.account_email && <div>Email: {a.account_email}</div>}
                {a.account_username && <div>User: {a.account_username}</div>}
                {a.account_password && <div>Pass: {a.account_password}</div>}
                {startAt && (
                  <div className="mt-2 pt-2 border-t border-success/20 grid grid-cols-1 sm:grid-cols-2 gap-1 font-sans">
                    <div>
                      <span className="text-muted-foreground">{lang === "ar" ? "تاريخ الاشتراك:" : "Subscribed:"}</span>{" "}
                      <span className="font-bold">{fmt(startAt)}</span>
                    </div>
                    {endAt ? (
                      <div>
                        <span className="text-muted-foreground">{lang === "ar" ? "تاريخ الانتهاء:" : "Expires:"}</span>{" "}
                        <span className={`font-bold ${daysLeft !== null && daysLeft < 0 ? "text-destructive" : daysLeft !== null && daysLeft <= 7 ? "text-destructive" : daysLeft !== null && daysLeft <= 30 ? "text-warning" : ""}`}>
                          {fmt(endAt)}
                          {daysLeft !== null && (
                            <span className="ms-1 text-[10px]">
                              ({daysLeft < 0 ? (lang === "ar" ? `انتهت من ${Math.abs(daysLeft)} يوم` : `expired ${Math.abs(daysLeft)}d ago`) : (lang === "ar" ? `باقي ${daysLeft} يوم` : `${daysLeft}d left`)})
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">{lang === "ar" ? "المدة: غير محددة" : "Duration: N/A"}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      ) : (
        <div className="mt-2 space-y-2">
          {onDeliverInstant && (
            <button
              type="button"
              onClick={onDeliverInstant}
              className="w-full px-3 py-2 rounded bg-success/15 text-success border border-success/30 font-bold text-sm hover:bg-success hover:text-success-foreground transition"
            >
              {lang === "ar" ? "⚡ تسليم فوري من المخزون" : "⚡ Deliver from inventory"}
            </button>
          )}
          <form onSubmit={(e) => { e.preventDefault(); onDeliver(creds); }} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input placeholder="Account email" value={creds.account_email}
              onChange={(e) => setCreds({ ...creds, account_email: e.target.value })}
              className="px-3 py-2 bg-card border border-border rounded text-sm" />
            <input placeholder="Username" value={creds.account_username}
              onChange={(e) => setCreds({ ...creds, account_username: e.target.value })}
              className="px-3 py-2 bg-card border border-border rounded text-sm" />
            <input placeholder="Password" value={creds.account_password}
              onChange={(e) => setCreds({ ...creds, account_password: e.target.value })}
              className="px-3 py-2 bg-card border border-border rounded text-sm" />
            <input placeholder="Notes" value={creds.extra_notes}
              onChange={(e) => setCreds({ ...creds, extra_notes: e.target.value })}
              className="px-3 py-2 bg-card border border-border rounded text-sm" />
            <button type="submit" className="sm:col-span-2 px-3 py-2 bg-brand text-brand-foreground rounded font-bold text-sm">
              {lang === "ar" ? "تسليم يدوي وإرسال إيميل" : "Deliver manually & email"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}



function ProofLightbox({ src, loading, onClose }: { src: string; loading: boolean; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  const clampZoom = (z: number) => Math.max(1, Math.min(5, z));
  const setZ = (z: number) => {
    const nz = clampZoom(z);
    setZoom(nz);
    if (nz === 1) setPos({ x: 0, y: 0 });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZ(zoom + (e.deltaY < 0 ? 0.2 : -0.2));
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPos({ x: dragRef.current.ox + (e.clientX - dragRef.current.x), y: dragRef.current.oy + (e.clientY - dragRef.current.y) });
  };
  const onPointerUp = () => { dragRef.current = null; };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), zoom };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const nd = Math.hypot(dx, dy);
      setZ(pinchRef.current.zoom * (nd / pinchRef.current.dist));
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => { if (e.touches.length < 2) pinchRef.current = null; };

  return (
    <div className="fixed inset-0 z-[10080] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} aria-label="إغلاق" className="absolute top-4 end-4 grid place-items-center size-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl leading-none z-20">×</button>
      <div className="absolute top-4 start-4 flex gap-2 z-20" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setZ(zoom - 0.3)} className="size-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold">−</button>
        <button onClick={() => setZ(1)} className="h-10 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold">{Math.round(zoom * 100)}%</button>
        <button onClick={() => setZ(zoom + 0.3)} className="size-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold">+</button>
      </div>
      <div
        className="relative flex items-center justify-center overflow-hidden select-none"
        style={{ width: "min(90vw, 520px)", height: "min(80vh, 640px)", cursor: zoom > 1 ? "grab" : "zoom-in", touchAction: "none" }}
        onClick={(e) => { e.stopPropagation(); if (zoom === 1) setZ(2); }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {loading ? (
          <div className="text-white text-center py-20">جارٍ التحميل...</div>
        ) : (
          <img
            src={src}
            alt="إثبات الدفع"
            draggable={false}
            className="max-w-full max-h-full object-contain rounded-xl transition-transform"
            style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})` }}
          />
        )}
      </div>
    </div>
  );
}
