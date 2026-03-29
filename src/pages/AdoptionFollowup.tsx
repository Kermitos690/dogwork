import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Circle, Target, Calendar, Camera, Video, ChevronRight, PawPrint, Heart } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const MOODS = [
  { value: "excellent", label: "🌟 Excellent", color: "text-green-600" },
  { value: "good", label: "😊 Bien", color: "text-blue-600" },
  { value: "ok", label: "😐 Correct", color: "text-yellow-600" },
  { value: "difficult", label: "😟 Difficile", color: "text-orange-600" },
  { value: "concerning", label: "😰 Préoccupant", color: "text-red-600" },
];

export default function AdoptionFollowup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<Record<string, { notes: string; mood: string; photos: string; video_url: string }>>({});

  // Fetch adopter's plans
  const { data: plans } = useQuery({
    queryKey: ["adopter-plans", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("adoption_plans")
        .select("*")
        .eq("adopter_user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch animal info for plans
  const { data: animals } = useQuery({
    queryKey: ["adopter-plan-animals", plans?.map(p => p.animal_id)],
    queryFn: async () => {
      if (!plans?.length) return [];
      const ids = plans.map(p => p.animal_id);
      const { data } = await supabase
        .from("shelter_animals_safe")
        .select("id, name, breed, photo_url")
        .in("id", ids);
      return data ?? [];
    },
    enabled: !!plans?.length,
  });

  // Fetch tasks for selected plan
  const { data: tasks } = useQuery({
    queryKey: ["adopter-plan-tasks", selectedPlan],
    queryFn: async () => {
      if (!selectedPlan) return [];
      const { data } = await supabase
        .from("adoption_plan_tasks")
        .select("*")
        .eq("plan_id", selectedPlan)
        .order("week_number")
        .order("sort_order");
      return data ?? [];
    },
    enabled: !!selectedPlan,
  });

  // Fetch entries
  const { data: entries } = useQuery({
    queryKey: ["adopter-plan-entries", selectedPlan],
    queryFn: async () => {
      if (!selectedPlan) return [];
      const { data } = await supabase
        .from("adoption_plan_entries")
        .select("*")
        .eq("plan_id", selectedPlan);
      return data ?? [];
    },
    enabled: !!selectedPlan,
  });

  const submitEntry = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      if (!user || !selectedPlan) throw new Error("Non authentifié");
      const form = entryForm[taskId] || {};
      const existingEntry = entries?.find(e => e.task_id === taskId);
      const photosStr = (form as any).photos as string | undefined;
      const photos = photosStr ? photosStr.split(",").map(s => s.trim()).filter(Boolean) : [];

      if (existingEntry) {
        const { error } = await supabase.from("adoption_plan_entries").update({
          completed,
          notes: (form as any).notes || existingEntry.notes || "",
          mood: (form as any).mood || existingEntry.mood,
          photos: photos.length ? photos : existingEntry.photos,
          video_url: (form as any).video_url || existingEntry.video_url,
        }).eq("id", existingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("adoption_plan_entries").insert({
          task_id: taskId,
          plan_id: selectedPlan,
          adopter_user_id: user.id,
          completed,
          notes: (form as any).notes || "",
          mood: (form as any).mood || null,
          photos,
          video_url: (form as any).video_url || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adopter-plan-entries"] });
      toast({ title: "Progrès enregistré !" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const activePlanData = plans?.find(p => p.id === selectedPlan);
  const animal = animals?.find(a => a.id === activePlanData?.animal_id);
  const totalTasks = tasks?.length ?? 0;
  const completedTasks = entries?.filter(e => e.completed).length ?? 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const weeks = activePlanData ? Array.from({ length: activePlanData.duration_weeks }, (_, i) => i + 1) : [];

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Suivi post-adoption</h1>
          <p className="text-sm text-muted-foreground">Votre programme de suivi avec le refuge</p>
        </div>

        {!selectedPlan && (
          <div className="space-y-3">
            {!plans?.length && (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                <PawPrint className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Aucun plan de suivi actif pour le moment.</p>
                <p className="text-xs mt-1">Votre refuge vous assignera un plan de suivi après l'adoption.</p>
              </CardContent></Card>
            )}
            {plans?.map(plan => {
              const a = animals?.find(x => x.id === plan.animal_id);
              return (
                <Card key={plan.id} className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setSelectedPlan(plan.id)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    {a?.photo_url ? (
                      <img src={a.photo_url} alt={a.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <PawPrint className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{plan.title || "Plan de suivi"}</div>
                      <div className="text-sm text-muted-foreground">{a?.name || "Votre animal"} — {plan.duration_weeks} sem.</div>
                    </div>
                    <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                      {plan.status === "active" ? "Actif" : "Terminé"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedPlan && activePlanData && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedPlan(null); setExpandedTask(null); }}>← Retour</Button>

            {/* Header */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {animal?.photo_url ? (
                    <img src={animal.photo_url} alt={animal.name} className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                      <PawPrint className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold">{activePlanData.title}</h2>
                    <p className="text-sm text-muted-foreground">{animal?.name} — {animal?.breed}</p>
                  </div>
                </div>
                {activePlanData.description && (
                  <p className="text-sm text-muted-foreground">{activePlanData.description}</p>
                )}
                {Array.isArray(activePlanData.objectives) && activePlanData.objectives.length > 0 && (
                  <div>
                    <p className="text-xs font-medium flex items-center gap-1 mb-1"><Target className="h-3 w-3" /> Objectifs</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {(activePlanData.objectives as string[]).filter(Boolean).map((o, i) => (
                        <li key={i}>• {o}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progression globale</span>
                    <span className="font-medium">{completedTasks}/{totalTasks} tâches</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Weeks */}
            {weeks.map(week => {
              const weekTasks = tasks?.filter(t => t.week_number === week) ?? [];
              if (!weekTasks.length) return null;
              const weekCompleted = weekTasks.filter(t => entries?.find(e => e.task_id === t.id && e.completed)).length;
              const weekTotal = weekTasks.length;
              return (
                <Card key={week}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Semaine {week}
                      </CardTitle>
                      <Badge variant={weekCompleted === weekTotal ? "default" : "outline"}>
                        {weekCompleted}/{weekTotal}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {weekTasks.map(task => {
                      const entry = entries?.find(e => e.task_id === task.id);
                      const isExpanded = expandedTask === task.id;
                      const form = entryForm[task.id] || { notes: entry?.notes || "", mood: entry?.mood || "", photos: "", video_url: entry?.video_url || "" };
                      return (
                        <div key={task.id} className={`rounded-lg border p-3 transition-colors ${entry?.completed ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : "bg-muted/30"}`}>
                          <div className="flex items-start gap-2 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              submitEntry.mutate({ taskId: task.id, completed: !entry?.completed });
                            }} className="mt-0.5">
                              {entry?.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${entry?.completed ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </p>
                              {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                            </div>
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t space-y-3">
                              {/* Mood */}
                              <div>
                                <p className="text-xs font-medium mb-1.5">Humeur de l'animal</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {MOODS.map(m => (
                                    <button key={m.value}
                                      onClick={() => setEntryForm(f => ({ ...f, [task.id]: { ...form, mood: m.value } }))}
                                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.mood === m.value ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}>
                                      {m.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Notes */}
                              <div>
                                <p className="text-xs font-medium mb-1">Notes (optionnel)</p>
                                <Textarea
                                  placeholder="Comment ça s'est passé..."
                                  value={form.notes}
                                  onChange={e => setEntryForm(f => ({ ...f, [task.id]: { ...form, notes: e.target.value } }))}
                                  rows={2} className="text-sm" />
                              </div>

                              {/* Media */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs font-medium mb-1 flex items-center gap-1"><Camera className="h-3 w-3" /> Photos</p>
                                  <Input type="url" placeholder="URL de la photo"
                                    value={form.photos}
                                    onChange={e => setEntryForm(f => ({ ...f, [task.id]: { ...form, photos: e.target.value } }))}
                                    className="text-xs h-8" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium mb-1 flex items-center gap-1"><Video className="h-3 w-3" /> Vidéo</p>
                                  <Input type="url" placeholder="URL de la vidéo"
                                    value={form.video_url}
                                    onChange={e => setEntryForm(f => ({ ...f, [task.id]: { ...form, video_url: e.target.value } }))}
                                    className="text-xs h-8" />
                                </div>
                              </div>

                              <Button size="sm" className="w-full" onClick={() => submitEntry.mutate({ taskId: task.id, completed: true })}>
                                {entry?.completed ? "Mettre à jour" : "Marquer comme fait"}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
