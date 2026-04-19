import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dog, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Mode = "login" | "employee" | "signup" | "forgot";

// Dev login buttons are only shown when ENVIRONMENT is explicitly set to "development"
// Safe by default: if VITE_ENVIRONMENT is not set or is anything other than "development", dev tools are hidden
const IS_DEV = import.meta.env.VITE_ENVIRONMENT === "development";
const IS_PRODUCTION = !IS_DEV;



export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);
  const { user, loading: authLoading, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const DEV_ROLES = [
    { role: "owner", emoji: "🐕", label: t("auth.owner"), desc: t("auth.ownerDesc"), gradient: "from-sky-500 to-blue-600" },
    { role: "educator", emoji: "🎓", label: t("auth.educator"), desc: t("auth.educatorDesc"), gradient: "from-emerald-500 to-teal-600" },
    { role: "shelter", emoji: "🏠", label: t("auth.shelter"), desc: t("auth.shelterDesc"), gradient: "from-amber-500 to-orange-600" },
    { role: "admin", emoji: "🛡️", label: t("auth.admin"), desc: t("auth.adminDesc"), gradient: "from-rose-500 to-red-600" },
  ];

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === "login") {
        const { error } = await signIn(normalizedEmail, password);
        if (error) throw error;
        navigate("/");
      } else if (mode === "employee") {
        const pin = password.trim();
        if (!/^\d{6}$/.test(pin)) {
          throw new Error(t("auth.pinError"));
        }
        const { error } = await signIn(normalizedEmail, toEmployeePassword(pin));
        if (error) {
          throw new Error(t("auth.employeeError"));
        }
        navigate("/");
      } else if (mode === "signup") {
        const { error } = await signUp(normalizedEmail, password, displayName);
        if (error) throw error;
        toast({ title: t("auth.signupSuccess"), description: t("auth.signupSuccessDesc") });
        setMode("login");
      } else {
        const { error } = await resetPassword(normalizedEmail);
        if (error) throw error;
        toast({ title: t("auth.emailSent"), description: t("auth.emailSentDesc") });
        setMode("login");
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (role: string) => {
    setDevLoading(role);
    try {
      const { data, error } = await supabase.functions.invoke("dev-login", { body: { role } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionErr) throw sessionErr;
      toast({ title: t("auth.connectionSuccess"), description: t("auth.connectedAs", { role }) });
      navigate("/");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setDevLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4" aria-label="Authentification">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-end mb-2">
            <LanguageSwitcher />
          </div>
          <img src="/favicon.png" alt="DogWork" className="mx-auto w-16 h-16 rounded-2xl" />
          <h1 className="text-2xl font-bold text-foreground">{t("auth.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
        </div>

        {!IS_PRODUCTION && (
          <div className="space-y-3">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                {t("auth.testMode")}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {DEV_ROLES.map(({ role, emoji, label, desc, gradient }) => (
                <button
                  key={role}
                  onClick={() => handleDevLogin(role)}
                  disabled={devLoading !== null}
                  className={`relative overflow-hidden rounded-xl p-4 text-left transition-all active:scale-[0.98] disabled:opacity-60
                    bg-gradient-to-r ${gradient} text-white shadow-lg hover:shadow-xl hover:scale-[1.01]`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-3xl">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[15px] leading-tight">{label}</div>
                      <div className="text-xs text-white/80 mt-0.5 leading-snug">{desc}</div>
                    </div>
                    {devLoading === role ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white shrink-0" />
                    ) : (
                      <svg className="h-5 w-5 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!IS_PRODUCTION && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">{t("auth.orConnect")}</span>
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === "login" && t("auth.login")}
              {mode === "employee" && t("auth.employee")}
              {mode === "signup" && t("auth.signup")}
              {mode === "forgot" && t("auth.forgot")}
            </CardTitle>
            <CardDescription>
              {mode === "login" && t("auth.loginDesc")}
              {mode === "employee" && t("auth.employeeDesc")}
              {mode === "signup" && t("auth.signupDesc")}
              {mode === "forgot" && t("auth.forgotDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t("auth.name")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder={t("auth.namePlaceholder")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-9" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" />
                </div>
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">{mode === "employee" ? t("auth.pin") : t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <PasswordInput
                      id="password"
                      placeholder={mode === "employee" ? "123456" : "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      maxLength={mode === "employee" ? 6 : undefined}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? t("common.loading") : mode === "login" ? t("auth.loginButton") : mode === "employee" ? t("auth.loginEmployee") : mode === "signup" ? t("auth.signupButton") : t("auth.sendLink")}
              </Button>
            </form>

            {mode === "login" && (
              <div className="mt-4">
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t("common.or")}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base gap-2"
                  onClick={async () => {
                    const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
                    if (error) toast({ title: t("common.error"), description: error.message, variant: "destructive" });
                  }}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  {t("auth.continueApple")}
                </Button>
              </div>
            )}

            <div className="mt-4 space-y-2 text-center text-sm">
              {mode === "login" && (
                <>
                  <button onClick={() => setMode("employee")} className="text-primary hover:underline block w-full">{t("auth.employeeLink")}</button>
                  <button onClick={() => setMode("forgot")} className="text-primary hover:underline block w-full">{t("auth.forgotLink")}</button>
                  <p className="text-muted-foreground">
                    {t("auth.noAccount")}{" "}
                    <button onClick={() => setMode("signup")} className="text-primary hover:underline">{t("auth.signupLink")}</button>
                  </p>
                </>
              )}
              {(mode === "signup" || mode === "forgot" || mode === "employee") && (
                <button onClick={() => setMode("login")} className="text-primary hover:underline flex items-center justify-center gap-1 w-full">
                  <ArrowLeft className="h-3 w-3" /> {t("auth.backToLogin")}
                </button>
              )}
              {mode === "employee" && (
                <p className="text-xs text-muted-foreground">{t("auth.pinHelp")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
