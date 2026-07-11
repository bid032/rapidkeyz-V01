import { useApp } from "@/contexts/AppContext";

export function Footer() {
  const { t } = useApp();
  return (
    <footer className="border-t border-border py-12 px-6 bg-card/30 mt-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col gap-2 text-center md:text-start">
          <span className="text-lg font-extrabold tracking-tighter text-brand">RAPIDKEYZ</span>
          <p className="text-xs text-muted-foreground max-w-xs">{t.footer.tagline}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            © {new Date().getFullYear()} RapidKeyz. {t.footer.rights}.
          </p>
        </div>
        <div className="flex flex-col gap-3 items-center md:items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t.footer.payments}
          </span>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md border border-border">
              <span className="text-xs font-bold">Paymob</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md border border-border">
              <span className="text-xs font-bold">Kashier</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md border border-border">
              <span className="text-xs font-bold">InstaPay</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md border border-border">
              <span className="text-xs font-bold">Vodafone Cash</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
