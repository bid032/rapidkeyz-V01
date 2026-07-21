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

import { lazyClient } from "@/components/ClientOnly";
const GsapEffects = lazyClient(() => import("@/components/GsapEffects").then((m) => ({ default: m.GsapEffects })));
import { supabase } from "@/integrations/supabase/client";
import logoLight from "@/assets/black_logo_rapid.png.asset.json";
import logoDark from "@/assets/white_logo_rapid.png.asset.json";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 start-1/2 -translate-x-1/2 w-[620px] h-[420px] rounded-full bg-brand/20 blur-[140px]" />
        <div className="absolute bottom-0 end-0 w-[400px] h-[400px] rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,hsl(var(--background))_70%)]" />
      </div>
      <div className="relative max-w-lg text-center">
        <div className="relative mx-auto mb-6 grid h-32 w-32 place-items-center">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand border-e-brand/40 animate-spin" style={{ animationDuration: "3s" }} />
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
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if('scrollRestoration' in history){history.scrollRestoration='manual';}window.addEventListener('beforeunload',function(){try{window.scrollTo(0,0);}catch(e){}});window.addEventListener('load',function(){try{window.scrollTo(0,0);}catch(e){}});var t=localStorage.getItem('rk-theme');var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t==='light'?'light':'dark');}catch(e){}})();`,
          }}
        />

        <HeadContent />
      </head>
      <body>
        <div id="rk-pre-splash" aria-hidden="true" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var el=document.getElementById('rk-pre-splash');if(!el)return;var t=localStorage.getItem('rk-theme');var isLight=t==='light';var bg=isLight?'#f5f7fb':'#0b1220';var logoSrc=isLight?${JSON.stringify(logoLight.url)}:${JSON.stringify(logoDark.url)};var s=document.createElement('style');s.textContent='@keyframes rk-pre-spin{to{transform:rotate(360deg)}}@keyframes rk-pre-pulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.04);opacity:1}}';document.head.appendChild(s);el.style.cssText='position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;overflow:hidden;background:'+bg+';transition:opacity 260ms ease';el.innerHTML='<div style="position:absolute;top:50%;left:50%;width:520px;height:260px;transform:translate(-50%,-50%);border-radius:9999px;background:rgba(34,195,230,0.2);filter:blur(120px);opacity:.7"></div><div style="position:absolute;inset:0;background:radial-gradient(circle at center, transparent 0%, '+bg+' 72%)"></div><div style="position:relative;width:208px;height:208px;display:flex;align-items:center;justify-content:center"><div style="position:absolute;inset:-24px;border-radius:9999px;border:2px solid transparent;border-top-color:#22c3e6;border-right-color:rgba(34,195,230,0.4);animation:rk-pre-spin 1.2s linear infinite"></div><div style="position:absolute;inset:-12px;border-radius:9999px;border:2px solid transparent;border-bottom-color:rgba(34,195,230,0.6);animation:rk-pre-spin 1.8s linear infinite reverse"></div><img src="'+logoSrc+'" alt="RapidKeyz" style="position:relative;width:70%;height:70%;object-fit:contain;filter:drop-shadow(0 0 20px rgba(34,195,230,0.55));animation:rk-pre-pulse 1.8s ease-in-out infinite"/></div>';var hidden=false;var hide=function(){if(hidden)return;hidden=true;var e=document.getElementById('rk-pre-splash');if(!e)return;e.style.display='none';e.innerHTML='';};window.__rkHideSplash=function(){var start=window.__rkSplashStart||Date.now();var elapsed=Date.now()-start;var wait=Math.max(0,300-elapsed);setTimeout(function(){requestAnimationFrame(function(){requestAnimationFrame(hide);});},wait);};window.__rkSplashStart=Date.now();setTimeout(hide,6000);}catch(e){}})();`,
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
    // Hide splash only when: fonts ready + router idle + content painted.
    let cancelled = false;
    let hidden = false;

    const doHide = () => {
      if (cancelled || hidden) return;
      hidden = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          try { (window as any).__rkHideSplash?.(); } catch {}
        })
      );
    };

    const waitForIdle = () =>
      new Promise<void>((resolve) => {
        if (router.state.status === "idle") return resolve();
        const unsub = router.subscribe("onResolved", () => {
          if (router.state.status === "idle") {
            unsub();
            resolve();
          }
        });
        // Don't let a slow loader hold the splash — cap the wait.
        setTimeout(() => { try { unsub(); } catch {} resolve(); }, 1200);
      });

    const fontsReady =
      (document as any).fonts?.ready as Promise<unknown> | undefined;

    Promise.all([
      fontsReady ?? Promise.resolve(),
      waitForIdle(),
    ]).then(doHide, doHide);

    // Safety fallback
    const fallback = setTimeout(doHide, 2500);


    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
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

