import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function PageHero({ title, eyebrow, subtitle }: { title: string; eyebrow?: string; subtitle?: string }) {
  return (
    <section className="relative overflow-hidden py-10 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[260px] bg-brand/20 blur-[120px] rounded-full opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,hsl(var(--background))_70%)]" />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {eyebrow && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex max-w-full items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.25em] mb-4 sm:mb-5"
          >
            <Sparkles className="size-3.5 shrink-0" />
            <span className="truncate">{eyebrow}</span>
          </motion.div>
        )}
        <h1 className="text-[clamp(1.75rem,8vw,2.5rem)] sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] sm:leading-[0.95] break-words hyphens-auto">
          <motion.span
            initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-brand via-cyan-400 to-brand pb-2"
          >
            {title}
          </motion.span>
        </h1>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 h-1 w-24 sm:w-32 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent origin-center"
        />
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-6 max-w-2xl mx-auto text-muted-foreground text-sm sm:text-base leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </section>
  );
}
