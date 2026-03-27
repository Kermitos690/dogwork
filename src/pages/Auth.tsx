import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dog, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "employee" | "signup" | "forgot";

const DEV_ROLES = [
  { role: "owner", emoji: "🐕", label: "Propriétaire", desc: "Gérer mes chiens et suivre leur plan d'entraînement", gradient: "from-sky-500 to-blue-600" },
  { role: "educator", emoji: "🎓", label: "Éducateur", desc: "Suivre mes clients et évaluer les animaux en refuge", gradient: "from-emerald-500 to-teal-600" },
  { role: "shelter", emoji: "🏠", label: "Refuge", desc: "Gérer les animaux, employés et espaces du refuge", gradient: "from-amber-500 to-orange-600" },
  { role: "admin", emoji: "🛡️", label: "Administrateur", desc: "Superviser la plateforme et gérer les contenus", gradient: "from-rose-500 to-red-600" },
];

const toEmployeePassword = (pin: string) => `DogWork!${pin}#Secure`;

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState<string | null>(null);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
          throw new Error("Le code PIN employé doit contenir exactement 6 chiffres.");
        }

        const { error } = await signIn(normalizedEmail, toEmployeePassword(pin));
        if (error) {
          throw new Error("Identifiants employé invalides. Vérifiez email + PIN ou demandez une réinitialisation au refuge.");
        }
        navigate("/");
      } else if (mode === "signup") {
        const { error } = await signUp(normalizedEmail, password, displayName);
        if (error) throw error;
        toast({ title: "Inscription réussie", description: "Vérifiez votre email pour confirmer votre compte." });
        setMode("login");
      } else {
        const { error } = await resetPassword(normalizedEmail);
        if (error) throw error;
        toast({ title: "Email envoyé", description: "Consultez votre boîte mail pour réinitialiser votre mot de passe." });
        setMode("login");
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
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
      toast({ title: "Connexion réussie", description: `Connecté en tant que ${role}` });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDevLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4" aria-label="Authentification">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <img src="/favicon.png" alt="DogWork" className="mx-auto w-16 h-16 rounded-2xl" />
          <h1 className="text-2xl font-bold text-foreground">DogWork</h1>
          <p className="text-sm text-muted-foreground">Éducation canine intelligente</p>
        </div>

        <div className="space-y-3">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              🧪 Mode test — Choisissez un profil
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">ou connectez-vous</span>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === "login" && "Connexion"}
              {mode === "employee" && "Connexion employé refuge"}
              {mode === "signup" && "Inscription"}
              {mode === "forgot" && "Mot de passe oublié"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "Connectez-vous à votre compte"}
              {mode === "employee" && "Employés refuge : utilisez votre email + code PIN à 6 chiffres"}
              {mode === "signup" && "Créez votre compte en quelques secondes"}
              {mode === "forgot" && "Entrez votre email pour recevoir un lien de réinitialisation"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder="Votre nom" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-9" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" />
                </div>
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">{mode === "employee" ? "Code PIN" : "Mot de passe"}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={mode === "employee" ? "123456" : "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={mode === "employee" ? 6 : 6}
                      maxLength={mode === "employee" ? 6 : undefined}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? "Chargement..." : mode === "login" ? "Se connecter" : mode === "employee" ? "Se connecter (Employé)" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
              </Button>
            </form>

            {mode === "login" && (
              <div className="mt-4">
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base gap-2"
                  onClick={async () => {
                    const redirectUri = window.location.hostname.endsWith(".lovable.app") || window.location.hostname.endsWith(".lovableproject.com") ? window.location.origin : "https://dogwork.lovable.app";
                    const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: redirectUri });
                    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
                  }}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continuer avec Apple
                </Button>
              </div>
            )}

            <div className="mt-4 space-y-2 text-center text-sm">
              {mode === "login" && (
                <>
                  <button onClick={() => setMode("employee")} className="text-primary hover:underline block w-full">Connexion employé refuge (PIN)</button>
                  <button onClick={() => setMode("forgot")} className="text-primary hover:underline block w-full">Mot de passe oublié ?</button>
                  <p className="text-muted-foreground">
                    Pas de compte ?{" "}
                    <button onClick={() => setMode("signup")} className="text-primary hover:underline">S'inscrire</button>
                  </p>
                </>
              )}
              {(mode === "signup" || mode === "forgot" || mode === "employee") && (
                <button onClick={() => setMode("login")} className="text-primary hover:underline flex items-center justify-center gap-1 w-full">
                  <ArrowLeft className="h-3 w-3" /> Retour à la connexion
                </button>
              )}
              {mode === "employee" && (
                <p className="text-xs text-muted-foreground">Le PIN est envoyé/réinitialisé par l'administrateur du refuge.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
