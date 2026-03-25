import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dog, Mail, Lock, User, ArrowLeft, Shield, GraduationCap, Home, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "signup" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        toast({ title: "Inscription réussie", description: "Vérifiez votre email pour confirmer votre compte." });
        setMode("login");
      } else {
        const { error } = await resetPassword(email);
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

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4" aria-label="Authentification">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center" aria-hidden="true">
            <Dog className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">PawPlan</h1>
          <p className="text-sm text-muted-foreground">Journal de bord canin intelligent</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === "login" && "Connexion"}
              {mode === "signup" && "Inscription"}
              {mode === "forgot" && "Mot de passe oublié"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "Connectez-vous à votre compte"}
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
                    <Input
                      id="name"
                      placeholder="Votre nom"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? "Chargement..." : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
              </Button>
            </form>

            {mode !== "forgot" && (
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
                    const { error } = await lovable.auth.signInWithOAuth("apple", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) {
                      toast({ title: "Erreur", description: error.message, variant: "destructive" });
                    }
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
                  <button onClick={() => setMode("forgot")} className="text-primary hover:underline block w-full">
                    Mot de passe oublié ?
                  </button>
                  <p className="text-muted-foreground">
                    Pas de compte ?{" "}
                    <button onClick={() => setMode("signup")} className="text-primary hover:underline">
                      S'inscrire
                    </button>
                  </p>
                </>
              )}
              {(mode === "signup" || mode === "forgot") && (
                <button onClick={() => setMode("login")} className="text-primary hover:underline flex items-center justify-center gap-1 w-full">
                  <ArrowLeft className="h-3 w-3" /> Retour à la connexion
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
