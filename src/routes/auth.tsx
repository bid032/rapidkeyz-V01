import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Header } from "@/components/Header";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useApp();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name },
          },
        });
        if (err) throw err;
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
      setError(err.message ?? "Error");
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
      setError(result.error.message ?? "OAuth error");
      return;
    }
    if (result.redirected) return;
    navigate({ to: redirect ?? "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-md mx-auto px-6 py-16">
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
              <input
                required
                placeholder={t.auth.displayName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg"
              />
            )}
            <input
              required
              type="email"
              placeholder={t.auth.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg"
            />
            <input
              required
              type="password"
              minLength={6}
              placeholder={t.auth.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg"
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-brand text-brand-foreground rounded-lg font-bold hover:brand-glow disabled:opacity-50"
            >
              {loading ? t.common.loading : mode === "signin" ? t.auth.signIn : t.auth.signUp}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
