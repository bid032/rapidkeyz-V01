import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useApp } from "@/contexts/AppContext";

type OrderRow = {
  id: string;
  order_number: string;
  total: number | null;
  currency: string | null;
  customer_email: string | null;
  created_at: string;
  status: string | null;
};

const STORAGE_KEY = "admin_notifications_seen_ids";
const MAX_SEEN = 200;

function playBeep() {
  try {
    const AC =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx: AudioContext = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* ignore */
  }
}

export function AdminNotifications() {
  const { canModerate, isLoading } = useAdminRole();
  const { lang } = useApp();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const persistSeen = (next: Set<string>) => {
    setSeenIds(new Set(next));
    if (typeof window !== "undefined") {
      const arr = Array.from(next).slice(-MAX_SEEN);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }
  };

  const markSeen = (ids: string[]) => {
    const next = new Set(seenIds);
    let changed = false;
    for (const id of ids) {
      if (!next.has(id)) {
        next.add(id);
        changed = true;
      }
    }
    if (changed) persistSeen(next);
  };

  // Load recent orders
  useEffect(() => {
    if (!canModerate) return;
    supabase
      .from("orders")
      .select("id, order_number, total, currency, customer_email, created_at, status")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => {
        const rows = (data as OrderRow[] | null) ?? [];
        setOrders(rows);
        // On first load, mark everything already-existing as seen so the badge
        // only starts counting truly new orders from now on.
        if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
          persistSeen(new Set(rows.map((r) => r.id)));
        }
      });
  }, [canModerate]);

  // Realtime subscribe
  useEffect(() => {
    if (!canModerate) return;
    const channel = supabase
      .channel("admin-orders-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as OrderRow;
          setOrders((prev) => [row, ...prev].slice(0, 15));
          playBeep();
          toast.success(
            lang === "ar"
              ? `طلب جديد #${row.order_number}`
              : `New order #${row.order_number}`,
            {
              description:
                (row.customer_email ?? "") +
                (row.total
                  ? ` • ${row.total} ${row.currency ?? "EGP"}`
                  : ""),
              action: {
                label: lang === "ar" ? "فتح" : "Open",
                onClick: () => (window.location.href = "/admin/orders"),
              },
            }
          );
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(
                lang === "ar"
                  ? `طلب جديد #${row.order_number}`
                  : `New order #${row.order_number}`,
                { body: row.customer_email ?? "" }
              );
            } catch {
              /* ignore */
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [canModerate, lang]);

  // Ask for browser notifications once
  useEffect(() => {
    if (!canModerate) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      // Delay to avoid intrusive prompt on first paint
      const id = setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 3000);
      return () => clearTimeout(id);
    }
  }, [canModerate]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (isLoading || !canModerate) return null;

  const unseen = orders.filter((o) => !seenIds.has(o.id)).length;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative size-8 sm:size-9 grid place-items-center rounded-lg border border-border hover:bg-muted hover:text-brand transition-colors"
      >
        <Bell className="size-4" />
        {unseen > 0 && (
          <span className="absolute -top-1 -end-1 min-w-4 h-4 sm:min-w-5 sm:h-5 px-1 rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-bold grid place-items-center animate-pulse">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-[320px] max-h-[70vh] overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl z-[10001]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h4 className="text-sm font-bold">
              {lang === "ar" ? "الطلبات الأخيرة" : "Recent orders"}
            </h4>
            <div className="flex items-center gap-3">
              {unseen > 0 && (
                <button
                  type="button"
                  onClick={() => markSeen(orders.map((o) => o.id))}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-brand transition-colors"
                >
                  {lang === "ar" ? "تعليم كمقروء" : "Mark all read"}
                </button>
              )}
              <Link
                to="/admin/orders"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                {lang === "ar" ? "عرض الكل" : "View all"}
              </Link>
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {lang === "ar" ? "لا توجد طلبات بعد" : "No orders yet"}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => {
                const isNew = !seenIds.has(o.id);
                return (
                  <li key={o.id}>
                    <Link
                      to="/admin/orders"
                      onClick={() => {
                        markSeen([o.id]);
                        setOpen(false);
                      }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors ${
                        isNew ? "bg-red-500/5" : ""
                      }`}
                    >
                      <span
                        className={`mt-1 size-2 rounded-full shrink-0 ${
                          isNew ? "bg-red-500 animate-pulse" : "bg-muted-foreground/30"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold truncate">
                            #{o.order_number}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {new Date(o.created_at).toLocaleTimeString(
                              lang === "ar" ? "ar-EG" : "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {o.customer_email ?? "—"}
                        </div>
                        <div className="text-xs font-semibold text-brand">
                          {o.total ?? 0} {o.currency ?? "EGP"}
                          {o.status ? ` • ${o.status}` : ""}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
