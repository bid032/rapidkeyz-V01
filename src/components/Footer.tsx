import { Link } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import logoAsset from "@/assets/logo_rapid.png.asset.json";
import { Phone, Mail } from "lucide-react";

export function Footer() {
  const { t } = useApp();
  return (
    <footer className="relative border-t border-border pt-16 pb-8 px-6 bg-card/30 mt-24 overflow-hidden">
      {/* Blue glow rising from the top of the footer, fading up */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-brand/30 via-cyan-300/15 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 -top-32 -translate-x-1/2 w-[1200px] h-[400px] bg-brand/25 rounded-full blur-3xl" />
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 relative">

        {/* Brand */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <img src={logoAsset.url} alt="RapidKeyz" className="h-10 w-10 object-contain" />
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">
              RapidKeyz
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            {t.footer.tagline}
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand mb-4">
            • {t.footer.quickLinks}
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground transition-colors">{t.footer.about}</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t.footer.privacy}</Link></li>
            <li><Link to="/terms" className="hover:text-foreground transition-colors">{t.footer.terms}</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand mb-4">
            • {t.footer.contact}
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3">
              <span className="size-9 grid place-items-center rounded-full bg-brand/10 text-brand">
                <Phone className="size-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide">{t.footer.phone}</span>
                <a href="tel:+201284234815" className="hover:text-foreground font-medium" dir="ltr">
                  +20 128 423 4815
                </a>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <span className="size-9 grid place-items-center rounded-full bg-brand/10 text-brand">
                <Mail className="size-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide">{t.footer.emailLabel}</span>
                <a href="mailto:support@rapidkeyz.com" className="hover:text-foreground font-medium" dir="ltr">
                  support@rapidkeyz.com
                </a>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-border/50 text-center">
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} RapidKeyz. {t.footer.rights}.
        </p>
      </div>
    </footer>
  );
}
