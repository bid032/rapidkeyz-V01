import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash and emits a PASSWORD_RECOVERY event
    // or sets a session. Wait for either before enabling the form.
    let mounted = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    check();
    // Give the SDK a moment to process the hash even without an event
    const to = setTimeout(check, 800);
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      clearTimeout(to);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) return setError("كلمة السر لازم تكون 6 أحرف على الأقل");
    if (password !== confirm) return setError("كلمتا السر غير متطابقتين");
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setInfo("تم تحديث كلمة السر بنجاح. جاري تحويلك...");
      setTimeout(() => navigate({ to: "/dashboard" }), 1200);
    } catch (err: any) {
      setError(err.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-extrabold mb-2">إعادة تعيين كلمة السر</h1>
          <p className="text-muted-foreground text-sm mb-6">
            اكتب كلمة سر جديدة لحسابك.
          </p>

          {!ready ? (
            <p className="text-sm text-muted-foreground">
              جاري التحقق من رابط الاستعادة...
              <br />
              لو الرابط منتهي الصلاحية اطلب رابط جديد من صفحة تسجيل الدخول.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required
                type="password"
                minLength={6}
                placeholder="كلمة السر الجديدة"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg"
              />
              <input
                required
                type="password"
                minLength={6}
                placeholder="تأكيد كلمة السر"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg"
              />
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
                {loading ? "جاري الحفظ..." : "حفظ كلمة السر الجديدة"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
