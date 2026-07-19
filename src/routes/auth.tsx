import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Header } from "@/components/Header";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { friendlyErrorMessage } from "@/lib/error-handler";
import { ARAB_COUNTRIES, dialForCountry } from "@/lib/arab-countries";
import { filterName, filterDigits, filterEmail } from "@/lib/input-filters";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول ، RapidKeyz" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});


function AuthPage() {
  const { t, lang } = useApp();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect ?? "/dashboard" });
    });
  }, [navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        setInfo(`تم إرسال رابط استعادة كلمة السر إلى ${email}. افتح البريد لإكمال العملية.`);
        return;
      }
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name, phone, country },
          },
        });
        if (err) throw err;
        // Persist phone + country onto profile (trigger creates the row already)
        if (data.user) {
          await supabase
            .from("profiles")
            .update({ display_name: name, phone, country })
            .eq("id", data.user.id);
        }
        if (!data.session) {
          setInfo(
            `تم إرسال رابط التأكيد إلى ${email}. يرجى فتح بريدك وتأكيد الحساب لإكمال التسجيل.`
          );
          setMode("signin");
          setPassword("");
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      navigate({ to: redirect ?? "/dashboard" });
    } catch (err: any) {
      console.error("auth failed", err);
      setError(friendlyErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };


  const handleGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      console.error("google oauth failed", result.error);
      setError(friendlyErrorMessage(result.error, lang));
      return;
    }
    if (result.redirected) return;
    navigate({ to: redirect ?? "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-md mx-auto px-3 sm:px-6 py-10 sm:py-16">
        <div className="bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-extrabold mb-2">{t.auth.welcome}</h1>
          <p className="text-muted-foreground text-sm mb-6">{t.auth.welcomeDesc}</p>

          <div className="flex bg-muted rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 text-sm font-bold rounded-md ${
                mode === "signin" ? "bg-background" : "text-muted-foreground"
              }`}
            >
              {t.auth.signIn}
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-bold rounded-md ${
                mode === "signup" ? "bg-background" : "text-muted-foreground"
              }`}
            >
              {t.auth.signUp}
            </button>
          </div>

          <button
            onClick={handleGoogle}
            className="w-full mb-4 px-4 py-3 border border-border rounded-lg font-bold hover:bg-muted transition flex items-center justify-center gap-3"
          >
            <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 35.8 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            {t.auth.google}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t.auth.or}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                <input
                  required
                  placeholder={lang === "ar" ? "الاسم بالكامل" : "Full name"}
                  value={name}
                  onChange={(e) => setName(filterName(e.target.value))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg"
                />
                <select
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg"
                >
                  <option value="">{lang === "ar" ? "اختر الدولة" : "Select country"}</option>
                  {ARAB_COUNTRIES.map((c) => (
                    <option key={c.code} value={lang === "ar" ? c.ar : c.en}>
                      {lang === "ar" ? c.ar : c.en} (+{c.dial})
                    </option>
                  ))}
                </select>
                <div dir="ltr" className="flex items-stretch rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-brand/40">
                  <span className="px-3 grid place-items-center bg-muted text-sm font-mono font-bold text-muted-foreground select-none shrink-0 border-r border-border">
                    +{dialForCountry(country)}
                  </span>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    placeholder={lang === "ar" ? "رقم الواتساب" : "WhatsApp number"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    className="flex-1 min-w-0 px-4 py-3 bg-transparent outline-none text-left placeholder:text-right"
                    dir="ltr"
                  />
                </div>
              </>
            )}
            <input
              required
              type="email"
              placeholder={t.auth.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg"
            />
            {mode !== "forgot" && (
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  placeholder={t.auth.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pe-12 bg-background border border-border rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            )}
            {mode === "signin" && (
              <div className="text-left rtl:text-right">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
                  className="text-xs font-bold text-brand hover:underline"
                >
                  نسيت كلمة السر؟ / Forgot password?
                </button>
              </div>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
            {info && (
              <p className="text-success text-sm bg-success/10 border border-success/30 rounded-lg p-3">
                {info}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-brand text-brand-foreground rounded-lg font-bold hover:brand-glow disabled:opacity-50"
            >
              {loading
                ? t.common.loading
                : mode === "signin"
                ? t.auth.signIn
                : mode === "signup"
                ? t.auth.signUp
                : "إرسال رابط الاستعادة / Send reset link"}
            </button>
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
                className="w-full text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ← الرجوع لتسجيل الدخول / Back to sign in
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
