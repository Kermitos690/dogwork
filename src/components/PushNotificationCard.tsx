import { Bell, BellOff, BellRing, Smartphone, Apple, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "card" | "compact";
  className?: string;
}

export function PushNotificationCard({ variant = "card", className }: Props) {
  const { status, busy, enable, disable } = usePushNotifications();
  const { toast } = useToast();

  if (status === "unsupported") return null;

  async function handleEnable() {
    const r = await enable();
    if (r.ok) {
      toast({
        title: "Notifications activées",
        description: "Vous recevrez les rappels et messages importants, même app fermée.",
      });
    } else if (r.reason === "permission-denied") {
      toast({
        title: "Notifications refusées",
        description: "Vous pouvez les réactiver dans les paramètres de votre navigateur.",
        variant: "destructive",
      });
    } else if (r.reason && r.reason !== "preview" && r.reason !== "needs-ios-install") {
      toast({ title: "Erreur", description: r.reason, variant: "destructive" });
    }
  }

  async function handleDisable() {
    await disable();
    toast({ title: "Notifications désactivées" });
  }

  // ---- Cas spéciaux ----
  if (status === "blocked-preview") {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Les notifications push ne fonctionnent pas dans l'aperçu Lovable.
            Testez sur votre site publié <strong>www.dogwork-at-home.com</strong>.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "needs-ios-install") {
    return (
      <Card className={cn("border-primary/30 bg-primary/5", className)}>
        <CardContent className="py-5 space-y-3">
          <div className="flex items-start gap-3">
            <Apple className="h-6 w-6 text-foreground shrink-0" />
            <div>
              <h3 className="font-semibold">Activer les notifications sur iPhone</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Pour recevoir les notifications sur iOS, vous devez d'abord installer DogWork sur votre écran d'accueil.
                C'est rapide (30 secondes) et c'est une exigence Apple.
              </p>
            </div>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/install">
              <Smartphone className="h-4 w-4 mr-2" />
              Installer l'app
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "denied") {
    return (
      <Card className={cn("border-destructive/30", className)}>
        <CardContent className="flex items-start gap-3 py-4">
          <BellOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Notifications bloquées</p>
            <p className="text-muted-foreground mt-1">
              Vous avez refusé les notifications. Pour les réactiver, ouvrez les paramètres de votre navigateur
              ou de votre téléphone et autorisez DogWork à envoyer des notifications.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Active / Inactive ----
  const isOn = status === "subscribed";

  if (variant === "compact") {
    return (
      <Button
        variant={isOn ? "outline" : "default"}
        size="sm"
        disabled={busy}
        onClick={isOn ? handleDisable : handleEnable}
        className={className}
      >
        {isOn ? <BellRing className="h-4 w-4 mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
        {isOn ? "Notifications activées" : "Activer les notifications"}
      </Button>
    );
  }

  return (
    <Card className={cn(isOn ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/30 bg-primary/5", className)}>
      <CardContent className="py-5 space-y-3">
        <div className="flex items-start gap-3">
          {isOn ? <BellRing className="h-6 w-6 text-emerald-600 shrink-0" /> : <Bell className="h-6 w-6 text-primary shrink-0" />}
          <div className="flex-1">
            <h3 className="font-semibold">
              {isOn ? "Notifications actives" : "Activer les notifications"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isOn
                ? "Vous recevez les rappels d'exercices, nouveaux messages et alertes importantes — même quand l'app est fermée."
                : "Recevez rappels d'exercices, messages et alertes refuge directement sur votre écran, même app fermée."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy}
            variant={isOn ? "outline" : "default"}
            onClick={isOn ? handleDisable : handleEnable}
          >
            {isOn ? "Désactiver" : "Activer maintenant"}
          </Button>
          {isOn && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/settings/notifications">Préférences</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
