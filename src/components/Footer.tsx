import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import logoDark from "@/assets/white_logo_rapid.png.asset.json";
import logoLight from "@/assets/black_logo_rapid.png.asset.json";
import { Phone, Mail, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";

// WhatsApp brand icon
function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.1-.471-.15-.67.149-.197.297-.767.966-.94 1.164-.174.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.019-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.03-1.378l-.361-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.892 6.994c-.003 5.45-4.437 9.884-9.886 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// Brand icons not in lucide , inline SVGs
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
        .limit(6);
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
    <footer className="relative bg-card/40 border-t border-border/50 mt-16 sm:mt-24">
      <div className="max-w-7xl mx-auto">
        {/* Brand Section */}
        <div className="px-5 sm:px-8 pt-10 pb-8">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr] md:items-start">
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={theme === "dark" ? logoDark.url : logoLight.url}
                  alt="RapidKeyz"
                  className="h-9 w-9 object-contain"
                />
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-brand bg-clip-text text-transparent">
                  RapidKeyz
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                {t.footer.tagline}
              </p>

              {activeSocials.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeSocials.map(({ key, label, Icon }) => (
                    <a
                      key={key}
                      href={socials.data![key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="size-8 grid place-items-center rounded-full bg-muted/60 text-muted-foreground border border-border/50 hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all"
                    >
                      <Icon className="size-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links (desktop shows here) */}
            <div className="hidden md:block">
              <SectionHeader>{t.footer.quickLinks}</SectionHeader>
              <QuickLinks t={t} />
            </div>

            {/* Categories (desktop shows here) */}
            <div className="hidden md:block">
              <SectionHeader>{t.footer.categories}</SectionHeader>
              <CategoriesList categories={categories.data ?? []} lang={lang} />
            </div>
          </div>
        </div>

        {/* Mobile: Links Grid */}
        <div className="md:hidden px-5 sm:px-8 py-8 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-border/40">
          <div>
            <SectionHeader>{t.footer.quickLinks}</SectionHeader>
            <QuickLinks t={t} />
          </div>
          <div>
            <SectionHeader>{t.footer.categories}</SectionHeader>
            <CategoriesList categories={categories.data ?? []} lang={lang} />
          </div>
        </div>

        {/* Contact Section */}
        <div className="px-5 sm:px-8 py-8 bg-muted/30 border-t border-border/40">
          <SectionHeader>{t.footer.contact}</SectionHeader>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <ContactRow
              href={`https://wa.me/${phoneWa}`}
              external
              label="WhatsApp"
              value={phoneDisplay}
              tone="whatsapp"
              icon={<WhatsAppIcon className="size-5" />}
            />
            <ContactRow
              href={`tel:${phoneDigits}`}
              label={lang === "ar" ? "اتصال مباشر" : "Call"}
              value={phoneDisplay}
              tone="brand"
              icon={<Phone className="size-5" />}
            />
            <ContactRow
              href={`mailto:${email}`}
              label={t.footer.emailLabel}
              value={email}
              tone="brand"
              icon={<Mail className="size-5" />}
            />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="px-5 sm:px-8 py-5 border-t border-border/40 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-center">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} <span className="text-foreground/80 font-medium">RapidKeyz</span>. {t.footer.rights}.
          </p>
          <span className="hidden sm:inline text-muted-foreground/40">•</span>
          <p className="text-[11px] text-muted-foreground">
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-brand text-sm font-bold mb-5 flex items-center gap-2">
      <span className="w-1 h-4 bg-brand rounded-full" />
      {children}
    </h3>
  );
}

function QuickLinks({ t }: { t: ReturnType<typeof useApp>["t"] }) {
  return (
    <ul className="space-y-3">
      <li><Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.footer.about}</Link></li>
      <li><Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.nav.shop}</Link></li>
      <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.footer.privacy}</Link></li>
      <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.footer.terms}</Link></li>
    </ul>
  );
}

function CategoriesList({
  categories,
  lang,
}: {
  categories: { id: string; slug: string; name_ar: string; name_en: string }[];
  lang: "ar" | "en";
}) {
  if (categories.length === 0) {
    return <p className="text-xs text-muted-foreground/60">,</p>;
  }
  return (
    <ul className="space-y-3">
      {categories.map((c) => (
        <li key={c.id}>
          <Link
            to="/shop"
            search={{ category: c.slug }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {lang === "ar" ? c.name_ar : c.name_en}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ContactRow({
  href,
  external,
  label,
  value,
  icon,
  tone,
}: {
  href: string;
  external?: boolean;
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "brand" | "whatsapp";
}) {
  const toneClasses =
    tone === "whatsapp"
      ? "bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white"
      : "bg-brand/10 text-brand group-hover:bg-brand group-hover:text-brand-foreground";
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-3 group min-w-0"
    >
      <span className={`size-10 shrink-0 grid place-items-center rounded-xl transition-all ${toneClasses}`}>
        {icon}
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </span>
        <span className="text-sm font-semibold text-foreground truncate" dir="ltr">
          {value}
        </span>
      </span>
    </a>
  );
}
