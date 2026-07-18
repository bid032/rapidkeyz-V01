import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

type Props = {
  to: string;
  search?: Record<string, unknown>;
  label?: string;
  size?: "sm" | "md";
};

/**
 * Unified "View all / More" pill button used across the entire site.
 * Filled brand background, arrow that flips with locale.
 */
export function ViewAllButton({ to, search, label, size = "md" }: Props) {
  const { lang } = useApp();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const padding =
    size === "sm"
      ? "px-4 py-2 text-xs"
      : "px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm";
  return (
    <Link
      to={to as any}
      search={search as any}
      data-gsap="magnetic"
      data-strength="0.3"
      className={`group inline-flex items-center gap-2 ${padding} rounded-full bg-brand text-brand-foreground font-bold shadow-lg hover:brand-glow transition-all shrink-0`}
    >
      <span>{label ?? (lang === "ar" ? "عرض الكل" : "View all")}</span>
      <span className="grid place-items-center size-6 rounded-full bg-brand-foreground/20 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
        <Arrow className="size-3.5" />
      </span>
    </Link>
  );
}
