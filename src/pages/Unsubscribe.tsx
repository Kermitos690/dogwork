import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, MailMinus } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, {
          method: "GET",
          headers: { apikey: SUPABASE_ANON },
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (data?.valid === false && data?.reason === "already_unsubscribed") {
          setState({ kind: "already" });
          return;
        }
        if (data?.valid === true) {
          setState({ kind: "valid" });
          return;
        }
        setState({ kind: "invalid" });
      } catch {
        setState({ kind: "error", message: "Connexion impossible. Réessayez." });
      }
    })();
    return () => ctrl.abort();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data?.success || data?.reason === "already_unsubscribed")) {
        setState({ kind: "success" });
      } else {
        setState({ kind: "error", message: data?.error || "Échec du désabonnement." });
      }
    } catch {
      setState({ kind: "error", message: "Connexion impossible. Réessayez." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-border/60">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MailMinus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Se désabonner des emails DogWork</CardTitle>
          <CardDescription>
            Vous continuerez à recevoir les emails essentiels (sécurité, facturation).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "loading" && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification du lien…
            </div>
          )}

          {state.kind === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Confirmez ci-dessous pour ne plus recevoir d'emails non essentiels.
              </p>
              <Button onClick={confirm} className="w-full">
                Confirmer le désabonnement
              </Button>
            </>
          )}

          {state.kind === "submitting" && (
            <Button disabled className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement…
            </Button>
          )}

          {state.kind === "success" && (
            <div className="text-center space-y-2">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm">Vous êtes désabonné. Cela peut prendre quelques minutes à se propager.</p>
            </div>
          )}

          {state.kind === "already" && (
            <div className="text-center space-y-2">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm">Vous êtes déjà désabonné. Aucune action supplémentaire n'est requise.</p>
            </div>
          )}

          {state.kind === "invalid" && (
            <div className="text-center space-y-2">
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="text-sm">Ce lien de désabonnement est invalide ou expiré.</p>
            </div>
          )}

          {state.kind === "error" && (
            <div className="text-center space-y-2">
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="text-sm">{state.message}</p>
              <Button variant="outline" onClick={() => location.reload()}>Réessayer</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
