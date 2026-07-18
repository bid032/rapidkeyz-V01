import { useEffect, useRef, useState } from "react";
import logoDark from "@/assets/white_logo_rapid.png.asset.json";
import logoLight from "@/assets/black_logo_rapid.png.asset.json";

/**
 * A CSS 3D tilted logo that follows the pointer for a lightweight
 * "3D hero mark" feel without spinning up a WebGL context.
 */
export function Logo3D({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setTheme(html.classList.contains("dark") ? "dark" : "light");
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      tx = Math.max(-12, Math.min(12, (e.clientY - cy) / -42));
      ty = Math.max(-12, Math.min(12, (e.clientX - cx) / 42));
    };
    const loop = () => {
      rx += (tx - rx) * 0.08;
      ry += (ty - ry) * 0.08;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className={`relative ${className}`} style={{ perspective: "900px" }}>
      <div
        aria-hidden
        className="absolute inset-0 rounded-full bg-brand/30 blur-3xl animate-pulse"
      />
      <div
        ref={wrapRef}
        className="relative will-change-transform transition-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <img
          src={theme === "dark" ? logoDark.url : logoLight.url}
          alt="RapidKeyz"
          className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(34,195,230,0.35)]"
          draggable={false}
        />
      </div>
    </div>
  );
}
