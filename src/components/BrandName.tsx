import { cn } from "@/lib/utils";

/**
 * Unified brand wordmark. Uses `.brand-text` utility from styles.css so the
 * gradient stays consistent across every page and both light/dark themes.
 */
export function BrandName({
  className,
  as: Tag = "span",
}: {
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  return (
    <Tag className={cn("brand-text", className)}>
      RapidKeyz
    </Tag>
  );

}
