import { useEffect, useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";

export function SplashLoader() {
  const { theme } = useApp();
  const [isDark, setIsDark] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onAnimationEnd = () => wrap.remove();
    wrap.addEventListener("animationend", onAnimationEnd);
    return () => wrap.removeEventListener("animationend", onAnimationEnd);
  }, []);

  const logo = isDark ? "/white logo rapid.png" : "/black logo rapid.png";

  return (
    <div
      ref={wrapRef}
      id="rk-pre-splash"
      className="rk-pre-splash"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: isDark ? "#0b1220" : "#f5f7fb",
        transition: "opacity 260ms ease",
      }}
    >
      <div style={{ position: "absolute", top: "50%", left: "50%", width: "520px", height: "260px", transform: "translate(-50%, -50%)", borderRadius: "9999px", background: "rgba(34,195,230,0.2)", filter: "blur(120px)", opacity: 0.7 }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at center, transparent 0%, ${isDark ? "#0b1220" : "#f5f7fb"} 72%)` }} />
      <div style={{ position: "relative", width: "208px", height: "208px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: "-24px", borderRadius: "9999px", border: "2px solid transparent", borderTopColor: "#22c3e6", borderRightColor: "rgba(34,195,230,0.4)", animation: "rk-pre-spin 1.2s linear infinite" }} />
        <div style={{ position: "absolute", inset: "-12px", borderRadius: "9999px", border: "2px solid transparent", borderBottomColor: "rgba(34,195,230,0.6)", animation: "rk-pre-spin 1.8s linear infinite reverse" }} />
        {/* Logo */}
        <div className="relative flex items-center justify-center animate-pulse w-[70%] h-[70%]">
          <img src={logo} alt="RapidKeyz" className="max-w-full max-h-full object-contain drop-shadow-[0_0_20px_hsl(var(--brand)/0.5)]" />
        </div>
      </div>
    </div>
  );
}