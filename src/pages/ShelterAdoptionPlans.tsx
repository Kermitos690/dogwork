import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, ClipboardList, ChevronRight, Calendar, Target, Trash2, PawPrint, Sparkles, Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCreditConfirmation } from "@/hooks/useCreditConfirmation";
import { CreditConfirmDialog } from "@/components/CreditConfirmDialog";
import { AIResultDialog } from "@/components/AIResultDialog";
import { createAdoptionPlanFromAi, extractPlanShape, type AiPlanShape } from "@/lib/aiDestinations";

const TASK_TEMPLATES = [
  { title: "Observer le comportement au repas", type: "observation", desc: "Notez comment l'animal se comporte pendant les repas" },
  { title: "Promenade en laisse (15 min)", type: "exercise", desc: "Promenade calme, observer la réactivité" },
  { title: "Socialisation avec humains", type: "observation", desc: "Interactions avec de nouvelles personnes" },
  { title: "Exercice de rappel", type: "exercise", desc: "Pratiquer le rappel dans un espace sécurisé" },
  { title: "Temps calme sur tapis", type: "exercise", desc: "Apprendre à se poser sur son tapis" },
  { title: "Sortie en environnement nouveau", type: "exercise", desc: "Promenade dans un lieu différent du quotidien" },
  { title: "Jeu d'intelligence", type: "exercise", desc: "Proposer un jouet distributeur ou un jeu de recherche" },
  { title: "Contact vétérinaire de contrôle", type: "health", desc: "Vérifier l'état de santé avec le vétérinaire" },
  { title: "Photo/vidéo progrès", type: "media", desc: "Documenter visuellement les progrès de l'animal" },
  { title: "Évaluation du stress", type: "observation", desc: "Observer les signaux de stress et noter les déclencheurs" },
];

type Plan = {
  id: string;
  title: string;
  description: string;
  duration_weeks: number;
  status: string;
  objectives: string[];
  adopter_user_id: string;
  animal_id: string;
  shelter_user_id: string;
  created_at: string;
};

type PlanTask = {
  id: string;
  plan_id: string;
  week_number: number;
  title: string;
  description: string;
  task_type: string;
  sort_order: number;
};

export default function ShelterAdoptionPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", type: "observation", week: 1 });
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiResult, setAiResult] = useState<{
    plan: AiPlanShape;
    raw: unknown;
    animal_id: string;
    adopter_user_id: string | null;
    adopter_email: string | null;
    creditsSpent: number;
  } | null>(null);
  const [savingAi, setSavingAi] = useState(false);
  const credit = useCreditConfirmation();

  // Mode: "registered" → adopter has account / "pending" → not yet signed up
  const [mode, setMode] = useState<"registered" | "pending">("registered");

  // Form state for new plan
  const [form, setForm] = useState({
    animal_id: "",
    adopter_user_id: "",
    adopter_email: "",
    title: "",
    description: "",
    duration_weeks: 8,
    objectives: [""],
  });

  // Fetch adopted animals with adopter links
  const { data: adoptedAnimals } = useQuery({
    queryKey: ["shelter-adopted-animals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: links } = await supabase
        .from("adopter_links")
        .select("adopter_user_id, animal_id, animal_name")
        .eq("shelter_user_id", user.id);
      if (!links?.length) return [];
      const animalIds = links.map(l => l.animal_id);
      const { data: animals } = await supabase
        .from("shelter_animals_safe")
        .select("id, name, breed, species, photo_url")
        .in("id", animalIds);
      const adopterIds = [...new Set(links.map(l => l.adopter_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", adopterIds);
      return links.map(link => ({
        ...link,
        animal: animals?.find(a => a.id === link.animal_id),
        adopterName: profiles?.find(p => p.user_id === link.adopter_user_id)?.display_name || "Adoptant",
      }));
    },
    enabled: !!user,
  });

  // Fetch existing plans
  const { data: plans } = useQuery({
    queryKey: ["shelter-adoption-plans", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("adoption_plans")
        .select("*")
        .eq("shelter_user_id", user.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Plan[];
    },
    enabled: !!user,
  });

  // Fetch tasks for selected plan
  const { data: planTasks } = useQuery({
    queryKey: ["adoption-plan-tasks", selectedPlan],
    queryFn: async () => {
      if (!selectedPlan) return [];
      const { data } = await supabase
        .from("adoption_plan_tasks")
        .select("*")
        .eq("plan_id", selectedPlan)
        .order("week_number")
        .order("sort_order");
      return (data ?? []) as PlanTask[];
    },
    enabled: !!selectedPlan,
  });

  // Fetch entries for selected plan
  const { data: planEntries } = useQuery({
    queryKey: ["adoption-plan-entries", selectedPlan],
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

  // All shelter animals (used in "pending" mode where adopter has no account yet)
  const { data: allShelterAnimals } = useQuery({
    queryKey: ["shelter-all-animals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("shelter_animals_safe")
        .select("id, name, breed, species, status")
        .eq("user_id", user.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      if (!form.animal_id) throw new Error("Animal requis.");
      if (mode === "pending" && !form.adopter_email.trim()) {
        throw new Error("Email du futur adoptant requis.");
      }
      if (mode === "registered" && !form.adopter_user_id) {
        throw new Error("Adoptant requis.");
      }
      const objectives = form.objectives.filter(o => o.trim());
      const payload: Record<string, unknown> = {
        shelter_user_id: user.id,
        animal_id: form.animal_id,
        title: form.title || "Plan de suivi post-adoption",
        description: form.description,
        duration_weeks: form.duration_weeks,
        objectives,
      };
      if (mode === "registered") {
        payload.adopter_user_id = form.adopter_user_id;
      } else {
        payload.adopter_user_id = null;
        payload.adopter_email = form.adopter_email.trim().toLowerCase();
      }
      const { error } = await supabase.from("adoption_plans").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shelter-adoption-plans"] });
      setCreateOpen(false);
      setForm({ animal_id: "", adopter_user_id: "", adopter_email: "", title: "", description: "", duration_weeks: 8, objectives: [""] });
      toast({
        title: "Plan créé",
        description: mode === "pending"
          ? "Le plan sera automatiquement transmis à l'adoptant à son inscription."
          : "Le plan de suivi a été créé.",
      });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) throw new Error("Aucun plan sélectionné");
      const existingCount = planTasks?.filter(t => t.week_number === newTask.week).length ?? 0;
      const { error } = await supabase.from("adoption_plan_tasks").insert({
        plan_id: selectedPlan,
        week_number: newTask.week,
        title: newTask.title,
        description: newTask.description,
        task_type: newTask.type,
        sort_order: existingCount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adoption-plan-tasks"] });
      setNewTask({ title: "", description: "", type: "observation", week: newTask.week });
      toast({ title: "Tâche ajoutée" });
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("adoption_plan_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adoption-plan-tasks"] }),
  });

  const activePlan = plans?.find(p => p.id === selectedPlan);
  const currentWeeks = activePlan ? Array.from({ length: activePlan.duration_weeks }, (_, i) => i + 1) : [];

  // Email format validation (RFC-lite)
  const emailTrimmed = form.adopter_email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailTrimmed);
  // Detect if the chosen animal already has a plan (any status) — prevents duplicates
  const animalAlreadyHasPlan = !!form.animal_id && !!plans?.some(p => p.animal_id === form.animal_id);
  // Detect if a pending plan already exists for the same animal + email pair
  const pendingDuplicate = mode === "pending" && !!form.animal_id && emailValid &&
    !!plans?.some(p => p.animal_id === form.animal_id && (p as any).adopter_email === emailTrimmed);
  // Selected animal status (when in "pending" mode)
  const selectedAnimal = allShelterAnimals?.find(a => a.id === form.animal_id);

  const handleSelectAnimal = (animalId: string) => {
    const link = adoptedAnimals?.find(a => a.animal_id === animalId);
    if (link) {
      setForm(f => ({ ...f, animal_id: animalId, adopter_user_id: link.adopter_user_id }));
    }
  };

  return (
    <ShelterLayout>
      <div className="p-4 pb-24 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Plans de suivi post-adoption</h1>
            <p className="text-sm text-muted-foreground">Accompagnez vos adoptants après l'adoption</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau plan</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un plan de suivi</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Mode toggle */}
                <div className="flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
                  <button type="button"
                    className={`flex-1 px-2 py-1.5 rounded-md font-medium transition-colors ${mode === "registered" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                    onClick={() => setMode("registered")}>
                    Adoptant déjà inscrit
                  </button>
                  <button type="button"
                    className={`flex-1 px-2 py-1.5 rounded-md font-medium transition-colors ${mode === "pending" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                    onClick={() => setMode("pending")}>
                    Préparer pour adoption à venir
                  </button>
                </div>

                {mode === "registered" ? (
                  <div>
                    <Label>Animal adopté</Label>
                    <Select value={form.animal_id} onValueChange={handleSelectAnimal}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un animal" /></SelectTrigger>
                      <SelectContent>
                        {adoptedAnimals?.length ? adoptedAnimals.map(a => (
                          <SelectItem key={a.animal_id} value={a.animal_id}>
                            {a.animal?.name || a.animal_name} — {a.adopterName}
                          </SelectItem>
                        )) : (
                          <div className="px-3 py-4 text-xs text-muted-foreground">
                            Aucun adoptant inscrit pour le moment.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Animal du refuge</Label>
                      <Select value={form.animal_id} onValueChange={(v) => setForm(f => ({ ...f, animal_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un animal" /></SelectTrigger>
                        <SelectContent>
                          {allShelterAnimals?.map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}{a.breed ? ` — ${a.breed}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Email du futur adoptant</Label>
                      <Input
                        type="email"
                        value={form.adopter_email}
                        onChange={e => setForm(f => ({ ...f, adopter_email: e.target.value }))}
                        placeholder="adoptant@exemple.com"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Le plan sera automatiquement transmis à cet adoptant dès son inscription sur DogWork avec cette adresse.
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <Label>Titre du plan</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: Suivi d'intégration de Rex" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Contexte, recommandations particulières..." rows={3} />
                </div>
                <div>
                  <Label>Durée (semaines)</Label>
                  <Select value={String(form.duration_weeks)} onValueChange={v => setForm(f => ({ ...f, duration_weeks: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7, 8].map(w => (
                        <SelectItem key={w} value={String(w)}>{w} semaines</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Objectifs</Label>
                  <div className="space-y-2">
                    {form.objectives.map((obj, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={obj} onChange={e => {
                          const o = [...form.objectives];
                          o[i] = e.target.value;
                          setForm(f => ({ ...f, objectives: o }));
                        }} placeholder={`Objectif ${i + 1}`} />
                        {form.objectives.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => {
                            setForm(f => ({ ...f, objectives: f.objectives.filter((_, j) => j !== i) }));
                          }}><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, objectives: [...f.objectives, ""] }))}>
                      <Plus className="h-3 w-3 mr-1" /> Ajouter un objectif
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-1.5" disabled={!form.animal_id || generatingAI}
                    onClick={() => {
                      if (!form.animal_id) return;
                      credit.requestConfirmation({
                        featureCode: "ai_adoption_plan",
                        benefit: "Génère un plan post-adoption structuré avec objectifs et tâches hebdomadaires.",
                        onConfirm: async () => {
                          setGeneratingAI(true);
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.access_token) throw new Error("Session expirée");
                            const { data, error } = await supabase.functions.invoke("generate-adoption-plan", {
                              body: { animal_id: form.animal_id },
                              headers: { Authorization: `Bearer ${session.access_token}` },
                            });
                            if (error) throw error;
                            if (data?.code === "INSUFFICIENT_CREDITS") {
                              toast({ title: "Crédits insuffisants", description: `Il vous faut ${data.required} crédits (solde : ${data.balance}). Rechargez vos crédits IA.`, variant: "destructive" });
                              return;
                            }
                            if (data?.error) throw new Error(data.error);
                            const plan = (data.plan ?? {}) as AiPlanShape;
                            // Pre-fill the form so the user can still tweak before saving manually.
                            setForm(f => ({
                              ...f,
                              title: plan.title || f.title,
                              description: plan.description || f.description,
                              duration_weeks: plan.duration_weeks || f.duration_weeks,
                              objectives: plan.objectives?.length ? plan.objectives : f.objectives,
                            }));
                            // Also surface the full result with a real "Save as plan" CTA.
                            setAiResult({
                              plan,
                              raw: data.plan,
                              animal_id: form.animal_id,
                              adopter_user_id: mode === "registered" ? form.adopter_user_id : null,
                              adopter_email: mode === "pending" ? form.adopter_email.trim().toLowerCase() : null,
                              creditsSpent: data.credits_spent ?? 0,
                            });
                          } catch (err: any) {
                            toast({ title: "Erreur IA", description: err.message, variant: "destructive" });
                          } finally {
                            setGeneratingAI(false);
                          }
                        },
                      });
                    }}>
                    {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {generatingAI ? "Génération..." : "Générer avec IA"}
                  </Button>
                  <Button className="flex-1" onClick={() => createPlan.mutate()}
                    disabled={!form.animal_id || createPlan.isPending}>
                    Créer le plan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plan list */}
        {!selectedPlan && (
          <div className="space-y-3">
            {!plans?.length && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">
                <PawPrint className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Aucun plan de suivi créé pour le moment.
              </CardContent></Card>
            )}
            {plans?.map(plan => {
              const link = adoptedAnimals?.find(a => a.animal_id === plan.animal_id);
              return (
                <Card key={plan.id} className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setSelectedPlan(plan.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{plan.title || "Plan de suivi"}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{link?.animal?.name || "Animal"}</span>
                        <span>•</span>
                        <span>{link?.adopterName || "Adoptant"}</span>
                        <span>•</span>
                        <span>{plan.duration_weeks} sem.</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                        {plan.status === "active" ? "Actif" : plan.status === "completed" ? "Terminé" : plan.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Plan detail */}
        {selectedPlan && activePlan && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>← Retour</Button>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{activePlan.title || "Plan de suivi"}</CardTitle>
                {activePlan.description && <CardDescription>{activePlan.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.isArray(activePlan.objectives) && activePlan.objectives.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1 flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Objectifs</p>
                    <ul className="text-sm text-muted-foreground space-y-0.5">
                      {(activePlan.objectives as string[]).map((o, i) => (
                        <li key={i}>• {o}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {activePlan.duration_weeks} semaines — créé le {format(new Date(activePlan.created_at), "d MMMM yyyy", { locale: fr })}
                </p>
              </CardContent>
            </Card>

            {/* Weeks + tasks */}
            {currentWeeks.map(week => {
              const weekTasks = planTasks?.filter(t => t.week_number === week) ?? [];
              return (
                <Card key={week}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Semaine {week}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {weekTasks.map(task => {
                      const entry = planEntries?.find(e => e.task_id === task.id);
                      return (
                        <div key={task.id} className="flex items-start justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex-1">
                            <div className="text-sm font-medium flex items-center gap-2">
                              {task.title}
                              {entry?.completed && <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">✓</Badge>}
                            </div>
                            {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                            onClick={() => deleteTask.mutate(task.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      );
                    })}

                    {/* Quick-add task */}
                    <div className="pt-2 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Ajouter une tâche :</p>
                      <div className="flex flex-wrap gap-1">
                        {TASK_TEMPLATES.map((tpl, i) => (
                          <Button key={i} variant="outline" size="sm" className="text-xs h-7"
                            onClick={() => {
                              setNewTask({ title: tpl.title, description: tpl.desc, type: tpl.type, week });
                              addTask.mutate();
                            }}>
                            {tpl.title}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Tâche personnalisée..." className="text-sm h-8"
                          value={newTask.week === week ? newTask.title : ""}
                          onChange={e => setNewTask({ ...newTask, title: e.target.value, week })} />
                        <Button size="sm" className="h-8" disabled={!newTask.title || newTask.week !== week}
                          onClick={() => addTask.mutate()}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <CreditConfirmDialog
        open={credit.open}
        onOpenChange={credit.setOpen}
        onConfirm={credit.handleConfirm}
        cost={credit.cost}
        balance={credit.balance}
        featureLabel={credit.featureLabel}
        benefit={credit.benefit}
        loading={credit.loading || generatingAI}
      />

      {aiResult && (
        <AIResultDialog
          open={!!aiResult}
          onOpenChange={(o) => !o && setAiResult(null)}
          title={aiResult.plan.title || "Plan post-adoption généré"}
          summary={
            aiResult.plan.tasks?.length
              ? `${aiResult.plan.tasks.length} tâches sur ${aiResult.plan.duration_weeks ?? 8} semaines`
              : aiResult.plan.description ?? null
          }
          content={aiResult.raw}
          creditsSpent={aiResult.creditsSpent}
          extraActions={[
            {
              label: "Créer le plan complet",
              icon: Plus,
              variant: "default",
              loading: savingAi,
              disabled: savingAi || !user,
              onClick: async () => {
                if (!user) return;
                setSavingAi(true);
                try {
                  const planId = await createAdoptionPlanFromAi({
                    shelterUserId: user.id,
                    adopterUserId: aiResult.adopter_user_id,
                    adopterEmail: aiResult.adopter_email,
                    animalId: aiResult.animal_id,
                    plan: aiResult.plan,
                    status: "active",
                  });
                  qc.invalidateQueries({ queryKey: ["shelter-adoption-plans"] });
                  qc.invalidateQueries({ queryKey: ["adoption-plan-tasks"] });
                  toast({
                    title: "Plan créé ✨",
                    description: `${aiResult.plan.tasks?.length ?? 0} tâches insérées.`,
                  });
                  setAiResult(null);
                  setCreateOpen(false);
                  setSelectedPlan(planId);
                } catch (err: any) {
                  toast({
                    title: "Erreur",
                    description: err.message ?? "Impossible de créer le plan",
                    variant: "destructive",
                  });
                } finally {
                  setSavingAi(false);
                }
              },
            },
            {
              label: "Sauver comme brouillon",
              icon: ClipboardList,
              variant: "outline",
              loading: savingAi,
              disabled: savingAi || !user,
              onClick: async () => {
                if (!user) return;
                setSavingAi(true);
                try {
                  await createAdoptionPlanFromAi({
                    shelterUserId: user.id,
                    adopterUserId: aiResult.adopter_user_id,
                    adopterEmail: aiResult.adopter_email,
                    animalId: aiResult.animal_id,
                    plan: aiResult.plan,
                    status: "draft",
                  });
                  qc.invalidateQueries({ queryKey: ["shelter-adoption-plans"] });
                  toast({ title: "Brouillon sauvegardé" });
                  setAiResult(null);
                } catch (err: any) {
                  toast({
                    title: "Erreur",
                    description: err.message ?? "Échec",
                    variant: "destructive",
                  });
                } finally {
                  setSavingAi(false);
                }
              },
            },
          ]}
        />
      )}
    </ShelterLayout>
  );
}
