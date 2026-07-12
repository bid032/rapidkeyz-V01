import { cn } from "@/lib/utils";

/**
 * Unified brand wordmark. Use everywhere "RapidKeyz" appears in UI so the
 * gradient/typography stays consistent across the entire site.
 */
export function BrandName({
  className,
  as: Tag = "span",
}: {
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  return (
    <Tag
      className={cn(
        "font-display font-extrabold tracking-tight bg-gradient-to-r from-[hsl(0_0%_10%)] via-[--brand-deep] to-[--brand] bg-clip-text text-transparent inline-block align-baseline",
        "dark:from-white dark:via-[--brand] dark:to-[--brand-glow]",
        className,
      )}
      style={{ paddingBlock: "0.05em" }}
    >
      Rapid<span className="text-[--brand]">Keyz</span>
    </Tag>
  );
}
