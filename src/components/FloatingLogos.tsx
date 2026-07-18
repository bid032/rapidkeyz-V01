import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

async function fetchLogos(): Promise<string[]> {
  const { data } = await supabase
    .from("products")
    .select("icon_url")
    .eq("status", "active")
    .not("icon_url", "is", null)
    .limit(12);
  return (data ?? []).map((d: any) => d.icon_url).filter(Boolean);
}

type Pos = { top: string; left: string; size: number; delay: number; duration: number };

const POSITIONS: Pos[] = [
  { top: "8%", left: "6%", size: 48, delay: 0, duration: 7 },
  { top: "18%", left: "88%", size: 56, delay: 1.2, duration: 8 },
  { top: "62%", left: "4%", size: 44, delay: 0.6, duration: 9 },
  { top: "72%", left: "82%", size: 52, delay: 2, duration: 7.5 },
  { top: "32%", left: "92%", size: 40, delay: 1.8, duration: 8.5 },
  { top: "48%", left: "2%", size: 46, delay: 0.9, duration: 9.5 },
  { top: "12%", left: "45%", size: 38, delay: 2.4, duration: 8 },
  { top: "82%", left: "48%", size: 42, delay: 1.5, duration: 9 },
];

export function FloatingLogos() {
  const { data } = useQuery({ queryKey: ["floating-logos"], queryFn: fetchLogos });
  const wrapRef = useRef<HTMLDivElement>(null);

  // parallax with pointer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty("--px", `${x * 20}px`);
      el.style.setProperty("--py", `${y * 20}px`);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  if (!data || data.length === 0) return null;
  const logos = POSITIONS.map((pos, i) => ({ ...pos, url: data[i % data.length] }));

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[5] hidden md:block overflow-hidden"
    >
      {logos.map((l, i) => (
        <div
          key={i}
          className="absolute rounded-2xl bg-card/40 backdrop-blur-md border border-border/40 grid place-items-center shadow-lg"
          style={{
            top: l.top,
            left: l.left,
            width: l.size,
            height: l.size,
            animation: `floatY ${l.duration}s ease-in-out ${l.delay}s infinite`,
            transform: "translate(var(--px, 0), var(--py, 0))",
            transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <img
            src={l.url}
            alt=""
            className="w-[65%] h-[65%] object-contain opacity-80"
            loading="lazy"
          />
        </div>
      ))}
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translate(var(--px, 0), calc(var(--py, 0) + 0px)) rotate(0deg); }
          50% { transform: translate(var(--px, 0), calc(var(--py, 0) - 18px)) rotate(6deg); }
        }
      `}</style>
    </div>
  );
}
