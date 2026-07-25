import { Link } from "@tanstack/react-router";
import { useApp } from "@/contexts/AppContext";
import { Phone, Mail, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { BrandName } from "@/components/BrandName";

export function Footer() {
  const { lang, t, theme } = useApp();
  const socials = [
    { key: "facebook", icon: <Facebook className="size-4" />, label: "Facebook" },
    { key: "instagram", icon: <Instagram className="size-4" />, label: "Instagram" },
    { key: "youtube", icon: <Youtube className="size-4" />, label: "YouTube" },
    { key: "linkedin", icon: <Linkedin className="size-4" />, label: "LinkedIn" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Brand */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={theme === "dark" ? "/white logo rapid.png" : "/black logo rapid.png"}
                alt="RapidKeyz"
                className="h-8 w-8 object-contain"
              />
              <BrandName className="text-xl font-bold" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.footer.tagline}
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-sm">{t.footer.contact}</h3>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <a href="tel:+201284234815" className="flex items-center gap-2 hover:text-brand transition-colors">
                <Phone className="size-4" />
                <span>+20 128 4234 815</span>
              </a>
              <a href="mailto:support@rapidkeyz.com" className="flex items-center gap-2 hover:text-brand transition-colors">
                <Mail className="size-4" />
                <span>support@rapidkeyz.com</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-sm">{t.footer.quickLinks}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-brand transition-colors">
                {t.nav.home}
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-brand transition-colors">
                {t.nav.about}
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-brand transition-colors">
                {t.nav.terms}
              </Link>
              <Link to="/privacy" className="text-muted-foreground hover:text-brand transition-colors">
                {t.nav.privacy}
              </Link>
              <Link to="/auth" className="text-muted-foreground hover:text-brand transition-colors">
                {t.nav.login}
              </Link>
            </div>
          </div>

          {/* Social */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-sm">{t.footer.support}</h3>
            <div className="flex flex-col gap-3">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={`https://${s.label.toLowerCase()}.com/rapidkeyz`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors"
                >
                  {s.icon}
                  <span>{s.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} RapidKeyz. {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}