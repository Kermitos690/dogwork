import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PushNotificationCard } from "@/components/PushNotificationCard";

interface Prefs {
  exercises_enabled: boolean;
  exercises_time: string;
  messages_enabled: boolean;
  shelter_enabled: boolean;
  billing_enabled: boolean;
  plans_enabled: boolean;
  appointments_enabled: boolean;
  support_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
}

const DEFAULTS: Prefs = {
  exercises_enabled: true,
  exercises_time: "18:00",
  messages_enabled: true,
  shelter_enabled: true,
  billing_enabled: true,
  plans_enabled: true,
  appointments_enabled: true,
  support_enabled: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
  timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Europe/Zurich",
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          exercises_enabled: data.exercises_enabled,
          exercises_time: (data.exercises_time as string).slice(0, 5),
          messages_enabled: data.messages_enabled,
          shelter_enabled: data.shelter_enabled,
          billing_enabled: data.billing_enabled,
          plans_enabled: (data as any).plans_enabled ?? true,
          appointments_enabled: (data as any).appointments_enabled ?? true,
          support_enabled: (data as any).support_enabled ?? true,
          quiet_hours_start: data.quiet_hours_start ? (data.quiet_hours_start as string).slice(0, 5) : null,
          quiet_hours_end: data.quiet_hours_end ? (data.quiet_hours_end as string).slice(0, 5) : null,
          timezone: data.timezone || DEFAULTS.timezone,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("notification_preferences").upsert({
      user_id: user.id,
      ...prefs,
      exercises_time: `${prefs.exercises_time}:00`,
      quiet_hours_start: prefs.quiet_hours_start ? `${prefs.quiet_hours_start}:00` : null,
      quiet_hours_end: prefs.quiet_hours_end ? `${prefs.quiet_hours_end}:00` : null,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Préférences enregistrées" });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-32 sm:pb-12">
      <div className="container max-w-2xl py-6 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Link>
        </Button>

        <header>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Choisissez les notifications que vous souhaitez recevoir, et quand.
          </p>
        </header>

        <PushNotificationCard />

        <Card>
          <CardHeader><CardTitle className="text-base">Catégories</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <Row
              label="Rappels d'exercices"
              desc="Notification quotidienne pour faire la séance du jour avec votre chien."
              checked={prefs.exercises_enabled}
              onCheckedChange={(v) => setPrefs(p => ({ ...p, exercises_enabled: v }))}
              extra={prefs.exercises_enabled && (
                <div className="pl-0 sm:pl-2 mt-2">
                  <Label className="text-xs text-muted-foreground">Heure du rappel</Label>
                  <Input
                    type="time"
                    value={prefs.exercises_time}
                    onChange={(e) => setPrefs(p => ({ ...p, exercises_time: e.target.value }))}
                    className="w-32 mt-1"
                  />
                </div>
              )}
            />
            <Row
              label="Messages"
              desc="Nouveau message reçu (coach, refuge, support)."
              checked={prefs.messages_enabled}
              onCheckedChange={(v) => setPrefs(p => ({ ...p, messages_enabled: v }))}
            />
            <Row
              label="Plans & séances"
              desc="Nouveau plan d'entraînement généré, séance proposée pour votre chien."
              checked={prefs.plans_enabled}
              onCheckedChange={(v) => setPrefs(p => ({ ...p, plans_enabled: v }))}
            />
            <Row
              label="Rendez-vous & cours"
              desc="Confirmation de rendez-vous coach, nouvelle réservation de cours."
              checked={prefs.appointments_enabled}
              onCheckedChange={(v) => setPrefs(p => ({ ...p, appointments_enabled: v }))}
            />
            <Row
              label="Refuge & adoption"
              desc="Nouveau plan post-adoption, nouvel animal, demande employé."
              checked={prefs.shelter_enabled}
              onCheckedChange={(v) => setPrefs(p => ({ ...p, shelter_enabled: v }))}
            />
            <Row
              label="Crédits IA & abonnement"
              desc="Solde bas, paiement échoué, achat confirmé, renouvellement."
              checked={prefs.billing_enabled}
              onCheckedChange={(v) => setPrefs(p => ({ ...p, billing_enabled: v }))}
            />
            <Row
              label="Support"
              desc="Réponse de l'équipe support à vos tickets."
              checked={prefs.support_enabled}
              onCheckedChange={(v) => setPrefs(p => ({ ...p, support_enabled: v }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Heures de silence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucune notification ne sera envoyée pendant cette plage. Laissez vide pour désactiver.
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <Label className="text-xs text-muted-foreground">De</Label>
                <Input
                  type="time"
                  value={prefs.quiet_hours_start ?? ""}
                  onChange={(e) => setPrefs(p => ({ ...p, quiet_hours_start: e.target.value || null }))}
                  className="w-32 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">À</Label>
                <Input
                  type="time"
                  value={prefs.quiet_hours_end ?? ""}
                  onChange={(e) => setPrefs(p => ({ ...p, quiet_hours_end: e.target.value || null }))}
                  className="w-32 mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label, desc, checked, onCheckedChange, extra,
}: {
  label: string; desc: string; checked: boolean;
  onCheckedChange: (v: boolean) => void; extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
        {extra}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
