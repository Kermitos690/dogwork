import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog } from "@/hooks/useDogs";
import { useIsCoach } from "@/hooks/useCoach";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Save, Shield, Download, Trash2, User, GraduationCap, ShieldCheck, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const activeDog = useActiveDog();
  const { data: isCoach } = useIsCoach();
  const { data: isAdmin } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return data === true;
    },
    enabled: !!user,
  });
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("display_name").eq("user_id", user.id).single().then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
    }
  }, [user]);

  const handleSaveName = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    toast({ title: "Profil mis à jour" });
  };

  const handleExport = async () => {
    if (!activeDog) return;
    const [{ data: progress }, { data: logs }, { data: sessions }] = await Promise.all([
      supabase.from("day_progress").select("*").eq("dog_id", activeDog.id),
      supabase.from("behavior_logs").select("*").eq("dog_id", activeDog.id),
      supabase.from("exercise_sessions").select("*").eq("dog_id", activeDog.id),
    ]);
    const exportData = { dog: activeDog, progress, logs, sessions, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pawplan-${activeDog.name}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Données exportées" });
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <AppLayout>
      <div className="pt-6 pb-8 space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Profil</h1>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Mon compte</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="space-y-1">
              <Label>Nom d'affichage</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <Button onClick={handleSaveName} size="sm" className="gap-1">
              <Save className="h-3 w-3" /> Enregistrer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Accès rapide</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/help")}>
              <HelpCircle className="h-4 w-4" /> Guide d'utilisation & IA
            </Button>
              <Shield className="h-4 w-4" /> Sécurité et méthode
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/evaluation")}>
              Évaluation initiale
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/problems")}>
              Problématiques
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/objectives")}>
              Objectifs
            </Button>
            {isCoach && (
              <Button className="w-full justify-start gap-2 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30" onClick={() => navigate("/coach")}>
                <GraduationCap className="h-4 w-4" /> Espace Éducateur
              </Button>
            )}
            {isAdmin && (
              <Button className="w-full justify-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20" onClick={() => navigate("/admin")}>
                <ShieldCheck className="h-4 w-4" /> Administration
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Exporter mes données</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full gap-2" onClick={handleExport} disabled={!activeDog}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full h-12 text-destructive hover:text-destructive gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Se déconnecter
        </Button>
      </div>
    </AppLayout>
  );
}
