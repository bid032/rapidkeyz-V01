import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Renders its children only once the placeholder scrolls near the viewport, and
 * (optionally) prefetches that section's data even earlier.
 *
 * Two thresholds:
 * - `prefetchMargin` (default 900px): fire the section's queries so the data is
 *   already cached by the time the section mounts — no request-on-mount latency.
 * - `rootMargin` (default 300px): actually mount the children.
 *
 * The server and the first client render both output `fallback`, so hydration
 * stays stable and no empty gap is visible while data loads.
 */
export function LazySection({
  children,
  minHeight = 240,
  rootMargin = "300px",
  prefetchMargin = "900px",
  prefetch,
  fallback,
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
  prefetchMargin?: string;
  /** Query options objects to warm before the section mounts. */
  prefetch?: Array<Record<string, any>>;
  fallback?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const queryClient = useQueryClient();
  const warmed = useRef(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }

    const warm = () => {
      if (warmed.current || !prefetch?.length) return;
      warmed.current = true;
      for (const opts of prefetch) {
        void queryClient.prefetchQuery(opts as any).catch(() => {});
      }
    };

    const pre = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          warm();
          pre.disconnect();
        }
      },
      { rootMargin: prefetchMargin },
    );
    pre.observe(el);

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          warm();
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);

    return () => {
      pre.disconnect();
      io.disconnect();
    };
  }, [show, rootMargin, prefetchMargin, prefetch, queryClient]);

  if (show) return <>{children}</>;

  return (
    <div ref={ref} aria-hidden style={{ minHeight }}>
      {fallback}
    </div>
  );
}
