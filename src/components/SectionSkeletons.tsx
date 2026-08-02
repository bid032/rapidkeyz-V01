/**
 * Static skeleton placeholders for every home-page section.
 *
 * They render identically on the server and on the first client render, so a
 * section never leaves an empty gap while its data is still in flight.
 */

function Box({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl bg-foreground/[0.06] ${className}`} />;
}

function Pulse({ children }: { children: React.ReactNode }) {
  // A single opacity pulse on the wrapper only — cheap, no layout work.
  return <div className="animate-pulse">{children}</div>;
}

export function BrandsStripSkeleton() {
  return (
    <Pulse>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex gap-4 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <Box key={i} className="size-14 shrink-0 rounded-full" />
        ))}
      </div>
    </Pulse>
  );
}

export function CategoriesSkeleton() {
  return (
    <Pulse>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} className="h-14" />
        ))}
      </div>
    </Pulse>
  );
}

export function ProductRowSkeleton({ title = true }: { title?: boolean }) {
  return (
    <Pulse>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-12 sm:py-16">
        {title && (
          <div className="mb-8 space-y-3">
            <Box className="h-3 w-24" />
            <Box className="h-9 w-56" />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={i} className="h-56 sm:h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </Pulse>
  );
}

export function CategoryRowsSkeleton() {
  return (
    <>
      <ProductRowSkeleton />
      <ProductRowSkeleton />
    </>
  );
}

export function TrustSkeleton() {
  return (
    <Pulse>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </Pulse>
  );
}

export function TestimonialsSkeleton() {
  return (
    <Pulse>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-6">
        <Box className="h-9 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Box key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </Pulse>
  );
}

export function FaqSkeleton() {
  return (
    <Pulse>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-3">
        <Box className="h-9 w-52 mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} className="h-14" />
        ))}
      </div>
    </Pulse>
  );
}

export function FooterSkeleton() {
  return (
    <Pulse>
      <div className="border-t border-border/60 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Box className="h-4 w-24" />
              <Box className="h-3 w-32" />
              <Box className="h-3 w-28" />
              <Box className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </Pulse>
  );
}
