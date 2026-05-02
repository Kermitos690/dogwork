import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PushNotificationCard } from "@/components/PushNotificationCard";
import { AppLayout } from "@/components/AppLayout";

interface AdminPrefs {
  messages_enabled: boolean;
  support_enabled: boolean;
  admin_alerts_enabled: boolean;
  billing_enabled: boolean;
}

const DEFAULTS: AdminPrefs = {
  messages_enabled: true,
  support_enabled: true,
  admin_alerts_enabled: true,
  billing_enabled: true,
};

export default function AdminPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<AdminPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("messages_enabled, support_enabled, admin_alerts_enabled, billing_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          messages_enabled: data.messages_enabled ?? true,
          support_enabled: (data as any).support_enabled ?? true,
          admin_alerts_enabled: (data as any).admin_alerts_enabled ?? true,
          billing_enabled: data.billing_enabled ?? true,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...prefs } as any, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Préférences admin enregistrées" });
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
    <AppLayout>
      <div className="container max-w-2xl py-6 space-y-6 pt-16">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Retour dashboard admin</Link>
        </Button>

        <header className="flex items-start gap-3">
          <Shield className="h-7 w-7 text-amber-500 mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Préférences admin</h1>
            <p className="text-muted-foreground mt-1">
              Choisissez les notifications push que vous souhaitez recevoir en tant qu'administrateur.
            </p>
          </div>
        </header>

        <PushNotificationCard />

        <Card>
          <CardHeader><CardTitle className="text-base">Catégories admin</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <Row
              label="Alertes système"
              desc="Nouvelles inscriptions, nouveaux tickets, cours soumis, événements Stripe critiques."
              checked={prefs.admin_alerts_enabled}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, admin_alerts_enabled: v }))}
            />
            <Row
              label="Tickets support"
              desc="Réponses utilisateur sur vos tickets."
              checked={prefs.support_enabled}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, support_enabled: v }))}
            />
            <Row
              label="Messages"
              desc="Messages directs reçus."
              checked={prefs.messages_enabled}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, messages_enabled: v }))}
            />
            <Row
              label="Événements Stripe"
              desc="Paiements, abonnements, échecs."
              checked={prefs.billing_enabled}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, billing_enabled: v }))}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({
  label, desc, checked, onCheckedChange,
}: {
  label: string; desc: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
