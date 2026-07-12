import { useEffect, useState } from "react";
import logoLight from "@/assets/black_logo_rapid.png.asset.json";
import logoDark from "@/assets/white_logo_rapid.png.asset.json";

export function SplashLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const hide = () => {
      setFading(true);
      setTimeout(() => setVisible(false), 500);
    };

    const minDelay = 600;
    const start = Date.now();

    const onReady = () => {
      const remaining = Math.max(0, minDelay - (Date.now() - start));
      setTimeout(hide, remaining);
    };

    if (document.readyState === "complete") {
      onReady();
    } else {
      window.addEventListener("load", onReady, { once: true });
    }

    // Safety fallback
    const fallback = setTimeout(hide, 4000);
    return () => {
      clearTimeout(fallback);
      window.removeEventListener("load", onReady);
    };
  }, []);

  if (!visible) return null;

  const isDark =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const logo = isDark ? logoDark.url : logoLight.url;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[260px] bg-brand/20 blur-[120px] rounded-full opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,hsl(var(--background))_70%)]" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        <div className="relative">
          {/* Rotating ring */}
          <div className="absolute inset-0 -m-6 rounded-full border-2 border-transparent border-t-brand border-r-brand/40 animate-spin" style={{ animationDuration: "1.2s" }} />
          {/* Reverse ring */}
          <div className="absolute inset-0 -m-3 rounded-full border-2 border-transparent border-b-brand/60 animate-spin" style={{ animationDuration: "1.8s", animationDirection: "reverse" }} />
          {/* Logo */}
          <div className="relative size-24 sm:size-28 flex items-center justify-center animate-pulse">
            <img src={logo} alt="RapidKeyz" className="max-w-full max-h-full object-contain drop-shadow-[0_0_20px_hsl(var(--brand)/0.5)]" />
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="size-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="size-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
