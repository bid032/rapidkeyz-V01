import { useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";

/**
 * A CSS 3D tilted logo that follows the pointer for a lightweight
 * "3D hero mark" feel without spinning up a WebGL context.
 */
export function Logo3D({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { theme } = useApp();

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const handleMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const tiltX = (y / rect.height) * 12;
      const tiltY = -(x / rect.width) * 12;
      wrap.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    };

    const handleLeave = () => {
      wrap.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    };

    wrap.addEventListener("mousemove", handleMove);
    wrap.addEventListener("mouseleave", handleLeave);
    return () => {
      wrap.removeEventListener("mousemove", handleMove);
      wrap.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`relative transition-transform duration-300 ${className}`}>
      <img
        src={theme === "dark" ? "/white logo rapid.png" : "/black logo rapid.png"}
        alt="RapidKeyz"
        className="w-full h-full object-contain drop-shadow-[0_0_20px_hsl(var(--brand)/0.5)]"
      />
    </div>
  );
}