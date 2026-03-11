import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardList, Calendar, ChevronRight, BarChart3, Save, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

export default function Journal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const qc = useQueryClient();
  const [tab, setTab] = useState("logs");
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    completed: false,
    success_level: "moyen",
    incidents: "",
    triggers_encountered: "",
    dog_reaction: "",
    recovery_time: "moyenne",
    tension_level: 3,
    focus_quality: "moyen",
    stop_quality: "moyen",
    no_quality: "moyen",
    leash_quality: "moyenne",
    notes: "",
  });

  const { data: logs } = useQuery({
    queryKey: ["behavior_logs_all", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("behavior_logs")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: journalEntries } = useQuery({
    queryKey: ["journal_entries", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: sessions } = useQuery({
    queryKey: ["exercise_sessions_journal", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercise_sessions")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: progressData } = useQuery({
    queryKey: ["day_progress_journal", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("day_progress")
        .select("*")
        .eq("dog_id", activeDog!.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeDog,
  });

  const groupedLogs = useMemo(() => {
    if (!logs) return {};
    const groups: Record<string, typeof logs> = {};
    logs.forEach((log) => {
      const date = format(new Date(log.created_at), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  }, [logs]);

  const sessionsByDay = useMemo(() => {
    if (!sessions) return {};
    const groups: Record<number, number> = {};
    sessions.forEach((s) => {
      groups[s.day_id] = (groups[s.day_id] || 0) + 1;
    });
    return groups;
  }, [sessions]);

  const saveJournalEntry = async () => {
    if (!activeDog || !user) return;
    await supabase.from("journal_entries").insert({
      dog_id: activeDog.id,
      user_id: user.id,
      ...newEntry,
    });
    setShowNewEntry(false);
    qc.invalidateQueries({ queryKey: ["journal_entries"] });
    toast({ title: "✓ Entrée enregistrée" });
  };

  if (!activeDog) {
    return (
      <AppLayout>
        <div className="pt-12 text-center text-muted-foreground">Ajoutez d'abord un chien.</div>
      </AppLayout>
    );
  }

  const tensionColor = (level: number | null) => {
    if (!level) return "text-muted-foreground";
    if (level <= 2) return "text-success";
    if (level <= 3) return "text-warning";
    return "text-destructive";
  };

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Journal de bord</h1>
            <p className="text-sm text-muted-foreground">{activeDog.name} — Historique complet</p>
          </div>
          <Button size="sm" onClick={() => setShowNewEntry(!showNewEntry)} className="gap-1">
            <Plus className="h-4 w-4" /> Entrée
          </Button>
        </div>

        {/* New journal entry form */}
        {showNewEntry && (
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">Nouvelle entrée de journal</p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewEntry(e => ({ ...e, completed: !e.completed }))}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium ${newEntry.completed ? "bg-success border-success text-success-foreground" : "border-border bg-card text-foreground"}`}
                >
                  {newEntry.completed ? "✓ Séance faite" : "Séance non faite"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {["bon", "moyen", "faible"].map(level => (
                  <button key={level} onClick={() => setNewEntry(e => ({ ...e, success_level: level }))}
                    className={`px-2 py-2 rounded-lg border text-xs font-medium ${newEntry.success_level === level ? "bg-primary border-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
                    Réussite : {level}
                  </button>
                ))}
              </div>

              <textarea
                value={newEntry.incidents}
                onChange={(e) => setNewEntry(en => ({ ...en, incidents: e.target.value }))}
                placeholder="Incidents rencontrés..."
                className="w-full rounded-lg border border-border bg-card p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />

              <textarea
                value={newEntry.triggers_encountered}
                onChange={(e) => setNewEntry(en => ({ ...en, triggers_encountered: e.target.value }))}
                placeholder="Déclencheurs rencontrés..."
                className="w-full rounded-lg border border-border bg-card p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />

              <textarea
                value={newEntry.notes}
                onChange={(e) => setNewEntry(en => ({ ...en, notes: e.target.value }))}
                placeholder="Notes libres..."
                className="w-full rounded-lg border border-border bg-card p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />

              <Button className="w-full h-12" onClick={saveJournalEntry}>
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{logs?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Suivis</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{sessions?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Exercices</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-success">{progressData?.filter(p => p.validated).length || 0}</p>
              <p className="text-xs text-muted-foreground">Jours validés</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="logs" className="flex-1 text-xs">Suivi comportemental</TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 text-xs">Journal</TabsTrigger>
            <TabsTrigger value="sessions" className="flex-1 text-xs">Séances</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-3 mt-4">
            {(!logs || logs.length === 0) && (
              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Aucun suivi enregistré.</p>
                  <p className="text-xs text-muted-foreground">Remplissez le suivi après chaque séance.</p>
                </CardContent>
              </Card>
            )}

            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {format(new Date(date), "EEEE d MMMM", { locale: fr })}
                </p>
                {dateLogs.map((log) => (
                  <Card key={log.id} className="card-press" onClick={() => navigate(`/behavior/${log.day_id}`)}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Jour {log.day_id}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className={`text-lg font-bold ${tensionColor(log.tension_level)}`}>{log.tension_level || "–"}</p>
                          <p className="text-xs text-muted-foreground">Tension</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${tensionColor(log.dog_reaction_level)}`}>{log.dog_reaction_level || "–"}</p>
                          <p className="text-xs text-muted-foreground">Réact. chiens</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{log.comfort_distance_meters || "–"}m</p>
                          <p className="text-xs text-muted-foreground">Distance</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {log.jump_on_human && <Badge variant="destructive" className="text-xs">Saut</Badge>}
                        {log.barking && <Badge variant="destructive" className="text-xs">Aboiement</Badge>}
                        {log.stop_response && <Badge variant="secondary" className="text-xs">Stop: {log.stop_response}</Badge>}
                        {log.focus_quality && <Badge variant="secondary" className="text-xs">Focus: {log.focus_quality}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="journal" className="space-y-3 mt-4">
            {(!journalEntries || journalEntries.length === 0) && (
              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Aucune entrée de journal.</p>
                  <p className="text-xs text-muted-foreground">Utilisez le bouton + Entrée pour ajouter une note.</p>
                </CardContent>
              </Card>
            )}

            {journalEntries?.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entry.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <p className="text-sm font-medium text-foreground">
                        {entry.day_id ? `Jour ${entry.day_id}` : format(new Date(entry.entry_date), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "d MMM HH:mm", { locale: fr })}
                    </span>
                  </div>
                  {entry.success_level && (
                    <Badge variant="secondary" className="text-xs">Réussite : {entry.success_level}</Badge>
                  )}
                  {entry.incidents && <p className="text-xs text-muted-foreground">🚨 {entry.incidents}</p>}
                  {entry.triggers_encountered && <p className="text-xs text-muted-foreground">⚡ {entry.triggers_encountered}</p>}
                  {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-3 mt-4">
            {(!progressData || progressData.length === 0) && (
              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Aucune séance enregistrée.</p>
                </CardContent>
              </Card>
            )}

            {progressData?.map((prog) => {
              const exercisesDone = prog.completed_exercises?.length || 0;
              const sessionsForDay = sessionsByDay[prog.day_id] || 0;
              return (
                <Card key={prog.id} className="card-press" onClick={() => navigate(`/day/${prog.day_id}`)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          prog.validated ? "bg-success text-success-foreground" : prog.status === "in_progress" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {prog.day_id}
                        </div>
                        <p className="text-sm font-medium text-foreground">Jour {prog.day_id}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(prog.updated_at), "d MMM", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{exercisesDone} exercice(s)</span>
                      <span>•</span>
                      <span>{sessionsForDay} session(s)</span>
                      {prog.validated && <Badge variant="secondary" className="text-xs ml-auto">Validé ✓</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-12 gap-1" onClick={() => navigate("/stats")}>
            <BarChart3 className="h-4 w-4" /> Statistiques
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
