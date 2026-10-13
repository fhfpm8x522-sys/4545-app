import { appRedirectUrl } from "@/lib/runtime-utils.mjs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "כניסה ל־45:45 — חיים את הקבוצה." },
      { name: "description", content: "הרשמה והתחברות ל־45:45, העולם הדיגיטלי של הקבוצה שלך." },
      { property: "og:title", content: "כניסה ל־45:45" },
      { property: "og:description", content: "הרשמה והתחברות ל־45:45, העולם הדיגיטלי של הקבוצה שלך." },
    ],
  }),
  component: AuthPage,
});

type Mode = "intro" | "register" | "login" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [mode, setMode] = useState<Mode>("intro");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "verify" | "reset">(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  async function oauth(provider: "google" | "apple") {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: appRedirectUrl(window.location.origin, import.meta.env.BASE_URL) },
    });
    if (error) {
      setBusy(false);
      toast.error("ההתחברות נכשלה. נסה שוב.");
    }
  }

  function validEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (!validEmail(email)) {
      toast.error("כתובת אימייל לא תקינה");
      return;
    }
    if (password.length < 8) {
      toast.error("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    if (password !== confirm) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: appRedirectUrl(window.location.origin, import.meta.env.BASE_URL) },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSent("verify");
      return;
    }
    navigate({ to: "/onboarding" });
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("אימייל או סיסמה שגויים");
      return;
    }
    navigate({ to: "/" });
  }

  async function forgot(e: React.FormEvent) {
    e.preventDefault();
    if (!validEmail(email)) {
      toast.error("כתובת אימייל לא תקינה");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appRedirectUrl(window.location.origin, import.meta.env.BASE_URL, "reset-password"),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent("reset");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-96 club-gradient opacity-60 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-12">
        <div className="pt-10 text-center">
          <div className="display-title text-7xl leading-none text-foreground">45:45</div>
          <p className="mt-3 text-lg font-medium text-club">חיים את הקבוצה.</p>
        </div>

        <div className="space-y-3">
          {sent && (
            <div className="panel p-5 text-center text-sm">
              {sent === "verify" ? (
                <>
                  <p className="font-semibold">שלחנו לך מייל אימות</p>
                  <p className="mt-1 text-muted-foreground">
                    אשר את הכתובת {email} ואז חזור לכאן להתחברות.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">שלחנו קישור לאיפוס סיסמה</p>
                  <p className="mt-1 text-muted-foreground">בדוק את תיבת הדואר של {email}.</p>
                </>
              )}
              <button
                className="mt-3 text-club underline"
                onClick={() => {
                  setSent(null);
                  setMode("login");
                }}
              >
                חזרה להתחברות
              </button>
            </div>
          )}

          {!sent && mode === "intro" && (
            <>
              <Button variant="club" size="xl" disabled={busy} onClick={() => oauth("apple")}>
                המשך עם Apple
              </Button>
              <Button variant="outline" size="xl" disabled={busy} onClick={() => oauth("google")}>
                המשך עם Google
              </Button>
              <Button variant="ghost" size="xl" onClick={() => setMode("register")}>
                הרשמה עם אימייל
              </Button>
              <p className="pt-2 text-center text-sm text-muted-foreground">
                כבר יש לי חשבון —{" "}
                <button className="font-semibold text-club" onClick={() => setMode("login")}>
                  התחברות
                </button>
              </p>
            </>
          )}

          {!sent && mode === "register" && (
            <form onSubmit={register} className="panel space-y-4 p-5">
              <h2 className="text-lg font-bold">הרשמה</h2>
              <Field label="אימייל" value={email} onChange={setEmail} type="email" />
              <Field label="סיסמה" value={password} onChange={setPassword} type="password" />
              <Field label="אימות סיסמה" value={confirm} onChange={setConfirm} type="password" />
              <Button type="submit" variant="club" size="xl" disabled={busy}>
                יצירת חשבון
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground"
                onClick={() => setMode("intro")}
              >
                חזרה
              </button>
            </form>
          )}

          {!sent && mode === "login" && (
            <form onSubmit={login} className="panel space-y-4 p-5">
              <h2 className="text-lg font-bold">התחברות</h2>
              <Field label="אימייל" value={email} onChange={setEmail} type="email" />
              <Field label="סיסמה" value={password} onChange={setPassword} type="password" />
              <Button type="submit" variant="club" size="xl" disabled={busy}>
                כניסה
              </Button>
              <div className="flex justify-between text-sm text-muted-foreground">
                <button type="button" onClick={() => setMode("forgot")}>
                  שכחתי סיסמה
                </button>
                <button type="button" onClick={() => setMode("intro")}>
                  חזרה
                </button>
              </div>
            </form>
          )}

          {!sent && mode === "forgot" && (
            <form onSubmit={forgot} className="panel space-y-4 p-5">
              <h2 className="text-lg font-bold">איפוס סיסמה</h2>
              <Field label="אימייל" value={email} onChange={setEmail} type="email" />
              <Button type="submit" variant="club" size="xl" disabled={busy}>
                שליחת קישור
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground"
                onClick={() => setMode("login")}
              >
                חזרה
              </button>
            </form>
          )}
        </div>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          חדשות. משחקים. הקבוצה. הקהל.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={type === "email" ? "ltr" : undefined}
        required
      />
    </div>
  );
}
