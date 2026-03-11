import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Dog, Shield, Activity, FileText, BarChart3,
  Calendar, AlertTriangle, Clock, TrendingUp, TrendingDown,
  Heart, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCoachDogs, useCoachNotes } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function CoachDogDetail() {
  const { dogId } = useParams();
  const navigate = useNavigate();
  const { data: dogs = [] } = useCoachDogs();
  const { data: notes = [] } = useCoachNotes(dogId);

  const dog = dogs.find((d) => d.id === dogId);

  // Fetch journal entries for this dog
  const { data: journals = [] } = useQuery({
    queryKey: ["coach-dog-journals", dogId],
    queryFn: async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("dog_id", dogId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!dogId,
  });

  // Fetch evaluations
  const { data: evaluation } = useQuery({
    queryKey: ["coach-dog-eval", dogId],
    queryFn: async () => {
      const { data } = await supabase
        .from("dog_evaluations")
        .select("*")
        .eq("dog_id", dogId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!dogId,
  });

  // Fetch problems
  const { data: problems = [] } = useQuery({
    queryKey: ["coach-dog-problems", dogId],
    queryFn: async () => {
      const { data } = await supabase
        .from("dog_problems")
        .select("*")
        .eq("dog_id", dogId!);
      return data ?? [];
    },
    enabled: !!dogId,
  });

  if (!dog) {
    return (
      <AppLayout title="Chien">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chien non trouvé</p>
        </div>
      </AppLayout>
    );
  }

  const avgTension = journals.length
    ? journals.reduce((s, j) => s + (j.tension_level ?? 0), 0) / journals.length
    : null;

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <AppLayout title={dog.name}>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{dog.name}</h1>
              {dog.isSensitive && <Shield className="h-4 w-4 text-destructive" />}
            </div>
            <p className="text-xs text-muted-foreground">{dog.clientName} · {dog.breed || "Race inconnue"}</p>
          </div>
        </div>

        {/* Status Cards */}
        <motion.div {...fadeUp} className="grid grid-cols-3 gap-2">
          <Card className="bg-card/70 border-border/40">
            <CardContent className="p-3 text-center">
              <Activity className={`h-4 w-4 mx-auto mb-1 ${avgTension && avgTension > 3 ? "text-amber-400" : "text-emerald-400"}`} />
              <span className="text-lg font-bold text-foreground">{avgTension?.toFixed(1) ?? "—"}</span>
              <p className="text-[10px] text-muted-foreground">Tension moy.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/70 border-border/40">
            <CardContent className="p-3 text-center">
              <Calendar className="h-4 w-4 mx-auto mb-1 text-primary" />
              <span className="text-lg font-bold text-foreground">{journals.length}</span>
              <p className="text-[10px] text-muted-foreground">Entrées journal</p>
            </CardContent>
          </Card>
          <Card className="bg-card/70 border-border/40">
            <CardContent className="p-3 text-center">
              <FileText className="h-4 w-4 mx-auto mb-1 text-purple-400" />
              <span className="text-lg font-bold text-foreground">{notes.length}</span>
              <p className="text-[10px] text-muted-foreground">Notes pro</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Badges */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="flex flex-wrap gap-2">
          {dog.bite_history && <Badge variant="destructive">Historique morsure</Badge>}
          {dog.muzzle_required && <Badge className="bg-amber-500/20 text-amber-400 border-0">Muselière obligatoire</Badge>}
          {dog.weight_kg && <Badge variant="outline">{dog.weight_kg} kg</Badge>}
          {dog.size && <Badge variant="outline">{dog.size}</Badge>}
          {problems.map((p) => <Badge key={p.id} variant="secondary" className="text-xs">{p.problem_key}</Badge>)}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full bg-card/50 border border-border/40">
            <TabsTrigger value="profile" className="flex-1 text-xs">Profil</TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 text-xs">Journal</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 text-xs">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-3 mt-3">
            {/* Health Info */}
            <Card className="bg-card/60 border-border/40">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-400" /> Santé & Contraintes
                </h3>
                <div className="space-y-1.5 text-xs">
                  {dog.vet_restrictions && <p className="text-amber-400">⚠️ {dog.vet_restrictions}</p>}
                  {dog.physical_limitations && <p className="text-muted-foreground">Limitations : {dog.physical_limitations}</p>}
                  {dog.joint_pain && <p className="text-muted-foreground">• Douleurs articulaires</p>}
                  {dog.heart_problems && <p className="text-muted-foreground">• Problèmes cardiaques</p>}
                  {dog.epilepsy && <p className="text-muted-foreground">• Épilepsie</p>}
                  {!dog.vet_restrictions && !dog.physical_limitations && !dog.joint_pain && !dog.heart_problems && !dog.epilepsy && (
                    <p className="text-muted-foreground">Aucune contrainte signalée</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Behavioral Scores */}
            {(dog.obedience_level || dog.sociability_dogs || dog.excitement_level) && (
              <Card className="bg-card/60 border-border/40">
                <CardContent className="p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Profil comportemental</h3>
                  {[
                    { label: "Obéissance", value: dog.obedience_level },
                    { label: "Sociabilité chiens", value: dog.sociability_dogs },
                    { label: "Sociabilité humains", value: dog.sociability_humans },
                    { label: "Excitation", value: dog.excitement_level },
                    { label: "Frustration", value: dog.frustration_level },
                    { label: "Récupération", value: dog.recovery_capacity },
                  ].filter((s) => s.value != null).map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className={`h-2 w-5 rounded-full ${n <= (s.value ?? 0) ? "bg-primary" : "bg-border/40"}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Evaluation Summary */}
            {evaluation && (
              <Card className="bg-card/60 border-border/40">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Évaluation initiale</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {evaluation.reacts_to_dogs && <div><span className="text-muted-foreground">Réactivité chiens :</span> <span className="text-foreground">{evaluation.reacts_to_dogs}</span></div>}
                    {evaluation.reacts_to_humans && <div><span className="text-muted-foreground">Réactivité humains :</span> <span className="text-foreground">{evaluation.reacts_to_humans}</span></div>}
                    {evaluation.walks_without_pulling && <div><span className="text-muted-foreground">Marche :</span> <span className="text-foreground">{evaluation.walks_without_pulling}</span></div>}
                    {evaluation.recovery_time && <div><span className="text-muted-foreground">Récupération :</span> <span className="text-foreground">{evaluation.recovery_time}</span></div>}
                    {evaluation.main_trigger && <div className="col-span-2"><span className="text-muted-foreground">Déclencheur principal :</span> <span className="text-foreground">{evaluation.main_trigger}</span></div>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Plan */}
            {dog.activePlan && (
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-primary mb-1">Plan actif</h3>
                  <p className="text-xs text-foreground">{dog.activePlan.title}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="journal" className="space-y-2 mt-3">
            {journals.length === 0 ? (
              <Card className="bg-card/50 border-border/40">
                <CardContent className="p-6 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune entrée de journal</p>
                </CardContent>
              </Card>
            ) : journals.map((j) => (
              <Card key={j.id} className="bg-card/60 border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {format(new Date(j.entry_date), "d MMMM yyyy", { locale: fr })}
                    </span>
                    <div className="flex items-center gap-1">
                      <Activity className={`h-3 w-3 ${(j.tension_level ?? 0) > 3 ? "text-amber-400" : "text-emerald-400"}`} />
                      <span className="text-xs text-muted-foreground">{j.tension_level ?? "—"}/5</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {j.success_level && <Badge variant="outline" className="text-[10px]">{j.success_level}</Badge>}
                    {j.focus_quality && <Badge variant="outline" className="text-[10px]">Focus: {j.focus_quality}</Badge>}
                    {j.incidents && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Incident</Badge>}
                  </div>
                  {j.notes && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{j.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="notes" className="space-y-2 mt-3">
            <Button size="sm" className="w-full gap-1" variant="outline" onClick={() => navigate("/coach/notes")}>
              <FileText className="h-4 w-4" /> Ajouter une note
            </Button>
            {notes.length === 0 ? (
              <Card className="bg-card/50 border-border/40">
                <CardContent className="p-6 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune note pour ce chien</p>
                </CardContent>
              </Card>
            ) : notes.map((note) => (
              <Card key={note.id} className="bg-card/60 border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{note.note_type}</Badge>
                    {note.priority_level === "high" && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Prioritaire</Badge>}
                  </div>
                  <p className="text-sm font-medium text-foreground">{note.title}</p>
                  {note.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>}
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {format(new Date(note.created_at), "d MMM yyyy", { locale: fr })}
                  </span>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
