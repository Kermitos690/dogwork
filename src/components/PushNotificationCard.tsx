import {
  AlertTriangle,
  Apple,
  Bell,
  BellOff,
  BellRing,
  Smartphone,
} from "lucide-react";
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
  const { status, busy, enable, disable, refresh } = usePushNotifications();
  const { toast } = useToast();

  if (status === "unsupported") return null;

  async function handleEnable() {
    const result = await enable();

    if (result.ok) {
      toast({
        title: "Notifications activées",
        description:
          "DogWork a activé et synchronisé les notifications push sur cet appareil.",
      });
      return;
    }

    if (result.reason === "permission-denied") {
      toast({
        title: "Notifications refusées",
        description:
          "L’autorisation est bloquée par le navigateur ou l’iPhone. Réactivez-la dans les réglages système.",
        variant: "destructive",
      });
      return;
    }

    if (result.reason === "needs-ios-install") {
      toast({
        title: "Installation requise sur iPhone",
        description:
          "Installez DogWork sur l’écran d’accueil pour activer les notifications iOS.",
      });
      return;
    }

    if (result.reason && result.reason !== "preview") {
      toast({
        title: "Erreur notifications",
        description: result.reason,
        variant: "destructive",
      });
    }
  }

  async function handleDisable() {
    await disable();

    toast({
      title: "Notifications désactivées",
      description:
        "DogWork ne vous enverra plus de notifications push sur cet appareil.",
    });
  }

  async function handleRefresh() {
    await refresh();

    toast({
      title: "Vérification effectuée",
      description:
        "DogWork a revérifié et resynchronisé l’état des notifications push.",
    });
  }

  function handlePreferencesClick() {
    const categories =
      document.getElementById("notification-categories") ||
      document.querySelector("[data-notification-categories]");

    if (categories) {
      categories.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }

  if (status === "blocked-preview") {
    return (
      <Card className={cn("border-amber-200 bg-amber-50", className)}>
        <CardContent className="p-4 text-sm text-amber-900">
          Les notifications push ne fonctionnent pas dans l&apos;aperçu Lovable.
          Testez sur votre site publié www.dogwork-at-home.com.
        </CardContent>
      </Card>
    );
  }

  if (status === "needs-ios-install") {
    return (
      <Card className={cn("border-blue-200 bg-blue-50", className)}>
        <CardContent className="flex gap-3 p-4">
          <Apple className="mt-1 h-5 w-5 shrink-0 text-blue-600" />

          <div className="space-y-2">
            <h3 className="font-semibold text-blue-950">
              Activer les notifications sur iPhone
            </h3>

            <p className="text-sm text-blue-900">
              Pour recevoir les notifications sur iOS, vous devez d&apos;abord
              installer DogWork sur votre écran d&apos;accueil. C&apos;est une
              exigence Apple pour les apps web.
            </p>

            <Button asChild size="sm" variant="outline">
              <Link to="/install">
                <Smartphone className="mr-2 h-4 w-4" />
                Installer l&apos;app
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "denied") {
    return (
      <Card className={cn("border-destructive/30 bg-destructive/5", className)}>
        <CardContent className="flex gap-3 p-4">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-destructive" />

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-destructive">
                Notifications bloquées par le système
              </h3>

              <p className="text-sm text-muted-foreground">
                iPhone : Réglages → Notifications → DogWork → Autoriser. Sur
                Mac/Android : autorisez DogWork dans les paramètres de
                notifications du navigateur, puis revenez ici.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={busy}
            >
              {busy ? "Vérification…" : "J’ai corrigé, revérifier"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOn = status === "subscribed";

  if (variant === "compact") {
    return (
      <Button
        variant={isOn ? "secondary" : "default"}
        size="sm"
        onClick={isOn ? handleDisable : handleEnable}
        disabled={busy}
        className={className}
      >
        {isOn ? (
          <BellRing className="mr-2 h-4 w-4" />
        ) : (
          <Bell className="mr-2 h-4 w-4" />
        )}

        {busy
          ? "Traitement…"
          : isOn
            ? "Notifications activées"
            : status === "granted-not-subscribed"
              ? "Réparer les notifications"
              : "Activer les notifications"}
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        isOn ? "border-primary/30 bg-primary/5" : "border-border",
        className,
      )}
    >
      <CardContent className="flex gap-4 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isOn
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isOn ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="font-semibold">
              {isOn
                ? "Notifications actives"
                : status === "granted-not-subscribed"
                  ? "Notifications à réparer"
                  : "Activer les notifications"}
            </h3>

            <p className="text-sm text-muted-foreground">
              {isOn
                ? "Vous recevez les rappels d’exercices, nouveaux messages et alertes importantes — même quand l’app est fermée."
                : status === "granted-not-subscribed"
                  ? "L’autorisation semble accordée, mais la souscription push doit être resynchronisée avec DogWork."
                  : "Recevez rappels d’exercices, messages et alertes refuge directement sur votre écran, même quand l’app est fermée."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={isOn ? handleDisable : handleEnable}
              disabled={busy}
              variant={isOn ? "outline" : "default"}
            >
              {busy
                ? "Traitement…"
                : isOn
                  ? "Désactiver"
                  : status === "granted-not-subscribed"
                    ? "Réparer la souscription"
                    : "Activer maintenant"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={busy}
            >
              {busy ? "Vérification…" : "Revérifier"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePreferencesClick}
            >
              Préférences
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
