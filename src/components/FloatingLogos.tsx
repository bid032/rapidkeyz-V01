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

type Pos = { top: string; left: string; size: number; delay: number; duration: number; factor: number };

// Positions restricted to outer edges only — never overlap hero content/logo card
const POSITIONS: Pos[] = [
  { top: "10%", left: "3%", size: 44, delay: 0, duration: 7, factor: 1.6 },
  { top: "6%", left: "94%", size: 40, delay: 1.2, duration: 8, factor: -1.2 },
  { top: "78%", left: "2%", size: 42, delay: 0.6, duration: 9, factor: 1.9 },
  { top: "82%", left: "95%", size: 46, delay: 2, duration: 7.5, factor: -1.7 },
  { top: "40%", left: "96%", size: 38, delay: 1.8, duration: 8.5, factor: 2.2 },
  { top: "48%", left: "1%", size: 40, delay: 0.9, duration: 9.5, factor: -2 },
];


export function FloatingLogos() {
  const { data } = useQuery({ queryKey: ["floating-logos"], queryFn: fetchLogos });
  const wrapRef = useRef<HTMLDivElement>(null);

  // parallax with pointer, each icon reacts with its own random factor & axis flip
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty("--px", `${x * 40}px`);
      el.style.setProperty("--py", `${y * 40}px`);
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
          className="absolute rounded-full overflow-hidden bg-card/40 backdrop-blur-md border border-border/40 grid place-items-center shadow-lg"
          style={{
            top: l.top,
            left: l.left,
            width: l.size,
            height: l.size,
            ["--f" as any]: l.factor,
            animation: `floatY ${l.duration}s ease-in-out ${l.delay}s infinite`,
            transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <img
            src={l.url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translate(calc(var(--px, 0px) * var(--f, 1)), calc(var(--py, 0px) * var(--f, 1) * -1)) rotate(0deg); }
          50% { transform: translate(calc(var(--px, 0px) * var(--f, 1) + 6px), calc(var(--py, 0px) * var(--f, 1) * -1 - 18px)) rotate(6deg); }
        }
      `}</style>
    </div>
  );
}
