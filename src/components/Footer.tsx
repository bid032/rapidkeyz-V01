import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import logoDark from "@/assets/white_logo_rapid.png.asset.json";
import logoLight from "@/assets/black_logo_rapid.png.asset.json";
import { Phone, Mail, MessageCircle, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";

// Brand icons not in lucide — inline SVGs
function TikTokIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.6 6.9a5.7 5.7 0 0 1-3.3-1.1 5.7 5.7 0 0 1-2.3-4.1h-3.4v13.8a2.9 2.9 0 1 1-2.1-2.8v-3.5a6.4 6.4 0 1 0 5.5 6.3V9.7a9 9 0 0 0 5.6 1.9V8.1c0-.4 0-.8-.1-1.2Z" />
    </svg>
  );
}
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2H21.5l-7.5 8.573L22.5 22h-6.844l-5.36-6.98L4.2 22H.938l8.02-9.166L.75 2h7.02l4.844 6.406L18.244 2Zm-1.2 18h1.86L7.05 4H5.09l11.955 16Z" />
    </svg>
  );
}
function DiscordIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.317 4.369A19.7 19.7 0 0 0 16.558 3a13.5 13.5 0 0 0-.62 1.27 18.3 18.3 0 0 0-5.48 0A13.5 13.5 0 0 0 9.83 3a19.7 19.7 0 0 0-3.76 1.37C2.36 9.845 1.36 15.18 1.86 20.44a19.8 19.8 0 0 0 5.99 3.02c.48-.65.9-1.34 1.27-2.06-.7-.26-1.36-.58-1.99-.95.17-.12.33-.25.49-.38 3.83 1.78 7.98 1.78 11.77 0 .16.13.32.26.49.38-.63.37-1.29.7-1.99.95.37.72.79 1.41 1.27 2.06 2.15-.7 4.16-1.72 5.99-3.02.6-6.1-.98-11.39-3.83-16.07ZM8.68 16.96c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.2 0 2.17 1.08 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Zm6.64 0c-1.18 0-2.15-1.08-2.15-2.4s.95-2.4 2.15-2.4c1.2 0 2.17 1.08 2.15 2.4 0 1.32-.95 2.4-2.15 2.4Z" />
    </svg>
  );
}

const SOCIAL_DEFS = [
  { key: "facebook",  label: "Facebook",  Icon: Facebook },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "tiktok",    label: "TikTok",    Icon: TikTokIcon },
  { key: "youtube",   label: "YouTube",   Icon: Youtube },
  { key: "x",         label: "X",         Icon: XIcon },
  { key: "linkedin",  label: "LinkedIn",  Icon: Linkedin },
  { key: "discord",   label: "Discord",   Icon: DiscordIcon },
] as const;

export function Footer() {
  const { t, theme, lang } = useApp();

  const socials = useQuery({
    queryKey: ["site-settings", "socials"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "socials").maybeSingle();
      return (data?.value as Record<string, string>) ?? {};
    },
  });
  const contact = useQuery({
    queryKey: ["site-settings", "contact"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "contact").maybeSingle();
      return (data?.value as Record<string, string>) ?? {};
    },
  });
  const categories = useQuery({
    queryKey: ["footer-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name_ar, name_en")
        .eq("is_active", true)
        .order("sort_order")
        .limit(8);
      return data ?? [];
    },
  });

  const phoneRaw = (contact.data?.whatsapp ?? "+201284234815").trim();
  const phoneDigits = phoneRaw.replace(/[^\d+]/g, "");
  const phoneWa = phoneDigits.replace(/[^\d]/g, "");
  const phoneDisplay = "+20 128 423 4815";
  const email = (contact.data?.email ?? "support@rapidkeyz.com").trim();

  const activeSocials = SOCIAL_DEFS.filter(({ key }) => {
    const v = socials.data?.[key];
    return typeof v === "string" && v.trim().length > 0;
  });

  return (
    <footer className="relative pt-10 sm:pt-16 pb-8 px-4 sm:px-6 bg-card/30 mt-16 sm:mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 relative">
        {/* Brand */}
        <div className="flex flex-col gap-3 sm:col-span-2 md:col-span-1 text-center sm:text-start items-center sm:items-start">
          <div className="flex items-center gap-2">
            <img src={theme === "dark" ? logoDark.url : logoLight.url} alt="RapidKeyz" className="h-10 w-10 object-contain" />
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">
              RapidKeyz
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            {t.footer.tagline}
          </p>

          {activeSocials.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
              {activeSocials.map(({ key, label, Icon }) => (
                <a
                  key={key}
                  href={socials.data![key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="size-9 grid place-items-center rounded-full bg-brand/10 text-brand border border-brand/20 hover:bg-brand hover:text-brand-foreground hover:brand-glow transition-all"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand mb-4">
            • {t.footer.quickLinks}
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground transition-colors">{t.footer.about}</Link></li>
            <li><Link to="/shop" className="hover:text-foreground transition-colors">{t.nav.shop}</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t.footer.privacy}</Link></li>
            <li><Link to="/terms" className="hover:text-foreground transition-colors">{t.footer.terms}</Link></li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand mb-4">
            • {t.footer.categories}
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {(categories.data ?? []).length === 0 && (
              <li className="text-xs opacity-60">—</li>
            )}
            {(categories.data ?? []).map((c) => (
              <li key={c.id}>
                <Link
                  to="/shop"
                  search={{ category: c.slug }}
                  className="hover:text-foreground transition-colors"
                >
                  {lang === "ar" ? c.name_ar : c.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand mb-4">
            • {t.footer.contact}
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3">
              <span className="size-9 grid place-items-center rounded-full bg-brand/10 text-brand shrink-0">
                <MessageCircle className="size-4" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wide">WhatsApp</span>
                <a
                  href={`https://wa.me/${phoneWa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground font-medium truncate"
                  dir="ltr"
                >
                  {phoneDisplay}
                </a>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <span className="size-9 grid place-items-center rounded-full bg-brand/10 text-brand shrink-0">
                <Phone className="size-4" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wide">{lang === "ar" ? "اتصال مباشر" : "Call"}</span>
                <a href={`tel:${phoneDigits}`} className="hover:text-foreground font-medium truncate" dir="ltr">
                  {phoneDisplay}
                </a>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <span className="size-9 grid place-items-center rounded-full bg-brand/10 text-brand shrink-0">
                <Mail className="size-4" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wide">{t.footer.emailLabel}</span>
                <a href={`mailto:${email}`} className="hover:text-foreground font-medium truncate" dir="ltr">
                  {email}
                </a>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-border/50 relative">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[11px] text-muted-foreground text-center">
          <p>
            © {new Date().getFullYear()} RapidKeyz. {t.footer.rights}.
          </p>
          <span className="hidden sm:inline opacity-50">•</span>
          <p>
            {lang === "ar" ? "تصميم وبرمجة" : "Designed & Developed by"}{" "}
            <a
              href="https://www.facebook.com/bid032"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brand hover:underline"
            >
              Bido
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
