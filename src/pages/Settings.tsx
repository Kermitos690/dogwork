import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, LogOut, Info, User, Shield, CreditCard, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog } from "@/hooks/useDogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const activeDog = useActiveDog();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleExport = async () => {
    if (!user || !activeDog) return;
    const [progress, journals, logs] = await Promise.all([
      supabase.from("day_progress").select("*").eq("dog_id", activeDog.id),
      supabase.from("journal_entries").select("*").eq("dog_id", activeDog.id),
      supabase.from("behavior_logs").select("*").eq("dog_id", activeDog.id),
    ]);
    const blob = new Blob([JSON.stringify({
      dog: activeDog,
      progress: progress.data,
      journals: journals.data,
      behaviorLogs: logs.data,
      exportedAt: new Date().toISOString(),
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dogwork-${activeDog.name}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export réussi", description: "Vos données ont été téléchargées." });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-5 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>

        {/* Account */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Compte</h3>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-foreground">{profile?.display_name || "Utilisateur"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/profile")}>
            Modifier mon profil
          </Button>
        </div>

        {/* Active dog */}
        {activeDog && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Chien actif</h3>
            </div>
            <p className="text-sm text-foreground">{activeDog.name}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/dogs")}>
              Gérer mes chiens
            </Button>
          </div>
        )}

        {/* Subscription */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Abonnement</h3>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/subscription")}>
            Gérer mon abonnement
          </Button>
        </div>

        {/* Preferences */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Préférences</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Personnalisez les couleurs, la visibilité des modules et les fonctionnalités.
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/preferences")}>
            <Palette className="h-4 w-4" /> Personnaliser
          </Button>
        </div>

        {/* Export */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Exporter mes données</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Téléchargez toutes vos données (progrès, journal, logs) au format JSON.
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={handleExport} disabled={!activeDog}>
            <Download className="h-4 w-4" /> Exporter
          </Button>
        </div>

        {/* Info */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">À propos</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Vos données sont stockées de manière sécurisée dans le cloud et synchronisées entre vos appareils.
          </p>
        </div>

        {/* Sign out */}
        <Button variant="destructive" className="w-full rounded-xl" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Se déconnecter
        </Button>

        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>DogWork — v2.0</p>
        </div>
      </div>
    </AppLayout>
  );
}
