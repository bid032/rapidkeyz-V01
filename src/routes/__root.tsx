import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppProvider } from "@/contexts/AppContext";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";

import { GsapEffects } from "@/components/GsapEffects";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[620px] h-[420px] rounded-full bg-brand/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,hsl(var(--background))_70%)]" />
      </div>
      <div className="relative max-w-lg text-center">
        <div className="relative mx-auto mb-6 grid h-32 w-32 place-items-center">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand border-r-brand/40 animate-spin" style={{ animationDuration: "3s" }} />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-brand/60 animate-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }} />
          <span className="relative text-5xl font-black text-brand drop-shadow-[0_0_20px_hsl(var(--brand)/0.5)]">4·4</span>
        </div>
        <h1 className="bg-gradient-to-r from-brand via-foreground to-brand bg-clip-text text-6xl font-black tracking-tight text-transparent">
          404
        </h1>
        <h2 className="mt-3 text-2xl font-bold text-foreground">
          الصفحة غير موجودة
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          الرابط اللي بتحاول تفتحه مش موجود أو اتنقل. ارجع للرئيسية وابدأ من هناك.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-bold text-brand-foreground shadow-lg hover:brand-glow transition-all active:scale-95"
          >
            الرئيسية
          </a>
          <a
            href="/shop"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-bold text-foreground hover:border-brand/60 hover:text-brand transition-all active:scale-95"
          >
            تصفح المتجر
          </a>
        </div>
      </div>
    </div>
  );
}


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border border-border bg-background px-4 py-2 text-sm">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RapidKeyz ، اشتراكات أدوات الـ Ai والترفيه" },
      {
        name: "description",
        content:
          "RapidKeyz: متجرك العربي لاشتراكات ChatGPT Plus وMidjourney وأدوات الـ Ai بأسعار منافسة وتسليم فوري.",
      },
      { property: "og:site_name", content: "RapidKeyz" },
      { property: "og:title", content: "RapidKeyz , Premium AI & Streaming Subscriptions" },
      {
        property: "og:description",
        content:
          "Premium access to ChatGPT Plus, Midjourney and more. Instant delivery, secure payments via Paymob & Kashier.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "ar_EG" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#000000" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "RapidKeyz",
              url: "/",
              logo: "/favicon.png",
              sameAs: ["https://wa.me/201284234815"],
            },
            {
              "@type": "WebSite",
              name: "RapidKeyz",
              url: "/",
              potentialAction: {
                "@type": "SearchAction",
                target: "/shop?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rk-theme');var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t==='light'?'light':'dark');}catch(e){}})();`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        <div
          id="rk-pre-splash"
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            display: "grid",
            placeItems: "center",
            background: "hsl(var(--background))",
            transition: "opacity 400ms ease",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "9999px",
              border: "3px solid transparent",
              borderTopColor: "hsl(var(--brand))",
              borderRightColor: "color-mix(in oklab, hsl(var(--brand)) 40%, transparent)",
              animation: "rk-pre-spin 1.1s linear infinite",
            }}
          />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=document.createElement('style');s.textContent='@keyframes rk-pre-spin{to{transform:rotate(360deg)}}';document.head.appendChild(s);var hide=function(){var el=document.getElementById('rk-pre-splash');if(!el)return;el.style.opacity='0';setTimeout(function(){el&&el.parentNode&&el.parentNode.removeChild(el);},450);};if(document.readyState==='complete'){setTimeout(hide,400);}else{window.addEventListener('load',function(){setTimeout(hide,300);},{once:true});}setTimeout(hide,4500);})();`,
          }}
        />

        {children}
        <Scripts />
      </body>
    </html>
  );
}


function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = router.state.location.pathname;

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        
        <div key={pathname} className="route-transition">
          <Outlet />
        </div>
        <GsapEffects />
        <WhatsAppFloat />
      </AppProvider>
    </QueryClientProvider>
  );
}

