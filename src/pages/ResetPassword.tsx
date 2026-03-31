import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Loader2, CheckCircle, AlertTriangle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const { updatePassword, clearPasswordRecovery, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleRecovery = async () => {
      // PKCE flow: code in query params
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn("Code exchange failed:", error.message);
          setLinkError(true);
          setVerifying(false);
          return;
        }
        setSessionReady(true);
        setVerifying(false);
        return;
      }

      // Implicit flow: tokens in hash
      const hash = window.location.hash;
      if (hash.includes("type=recovery")) {
        // Wait a moment for onAuthStateChange to process the tokens
        await new Promise(r => setTimeout(r, 1000));
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
          setVerifying(false);
          return;
        }
        setLinkError(true);
        setVerifying(false);
        return;
      }

      // Check if already have a recovery session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        setVerifying(false);
        return;
      }

      // No valid recovery context — show error inline (don't redirect away)
      setLinkError(true);
      setVerifying(false);
    };

    handleRecovery();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      clearPasswordRecovery();
    }
    setLoading(false);
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    const { error } = await resetPassword(resendEmail);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email envoyé !", description: "Vérifiez votre boîte de réception pour le nouveau lien." });
    }
    setResending(false);
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Vérification du lien...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h2 className="text-lg font-semibold">Mot de passe mis à jour !</h2>
            <p className="text-sm text-muted-foreground text-center">
              Votre mot de passe a été changé avec succès.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Continuer vers l'application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Link error — show resend form instead of redirecting away
  if (linkError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Lien expiré ou invalide</CardTitle>
            <CardDescription>
              Ce lien de réinitialisation n'est plus valide. Demandez un nouveau lien ci-dessous.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resend-email">Votre adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder="email@exemple.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12" disabled={resending}>
                {resending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...</>
                ) : (
                  "Renvoyer le lien"
                )}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
                Retour à la connexion
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normal reset form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>Choisissez un mot de passe sécurisé pour votre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
            </div>
            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mise à jour...</>
              ) : (
                "Mettre à jour le mot de passe"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
