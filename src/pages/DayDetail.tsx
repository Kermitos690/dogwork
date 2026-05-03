import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { Play, ArrowLeft, CheckCircle2, ChevronRight, ChevronDown, Sparkles, AlertTriangle, Lock, BookOpen, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { getDayById } from "@/data/program";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { PlanDay } from "@/lib/planGenerator";
import { upsertDayProgress } from "@/lib/dayProgress";
import { ZoneBadge } from "@/components/ZoneBadge";
import { ZoneSafetyGuide } from "@/components/ZoneSafetyGuide";
import { zoneFromTension, type Zone } from "@/lib/zones";
import { DayJourneyHeader } from "@/components/DayJourneyHeader";
import { NoActiveDogState } from "@/components/NoActiveDogState";
import { QuickJournalSheet } from "@/components/training/QuickJournalSheet";
import { useDayLockState } from "@/hooks/useDayLockState";

function ExerciseCard({ ex, done, onToggle }: { ex: any; done: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasSteps = ex.tutorialSteps && ex.tutorialSteps.length > 0;
  const hasDescription = ex.description && ex.description.length > 0;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${done ? "border-success/30 bg-success/5" : "border-border bg-card"}`}
    >
      {ex.coverImage && (
        <div className="w-full h-28 overflow-hidden">
          <img src={ex.coverImage} alt={ex.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}

      <div className="p-4">
      <button onClick={onToggle} className="flex w-full items-start gap-3 text-left">
        <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${done ? "bg-success border-success" : "border-muted-foreground/30"}`}>
          {done && <CheckCircle2 className="h-4 w-4 text-success-foreground" />}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{ex.name}</p>
          {hasDescription && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{ex.description}</p>
          )}
          <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
            <span>×{ex.repetitionsTarget || ex.repetitions}</span>
            {(ex.timerSuggested || ex.timerSeconds) && <span>⏱ {ex.timerSuggested || ex.timerSeconds}s</span>}
          </div>
        </div>
      </button>

      {hasSteps && (
        <div className="mt-2 pl-9">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Masquer les étapes" : "Voir les étapes détaillées"}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {ex.tutorialSteps.map((step: any, i: number) => (
                <div key={i} className="rounded-xl bg-muted/50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    Étape {i + 1} — {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  {step.tip && (
                    <p className="text-xs text-primary italic">💡 {step.tip}</p>
                  )}
                </div>
              ))}
              {ex.validationProtocol && (
                <div className="rounded-xl bg-success/5 border border-success/20 p-3">
                  <p className="text-xs font-semibold text-success">✓ Critère de réussite</p>
                  <p className="text-xs text-foreground mt-0.5">{ex.validationProtocol}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {ex.slug && (
        <div className="mt-2 pl-9">
          <Link to={`/exercises/${ex.slug}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <BookOpen className="h-3 w-3" />
            Voir la fiche complète
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}

export default function DayDetail() {
  const { dayId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const qc = useQueryClient();
  const id = Number(dayId);
  const source = searchParams.get("source");
  const [notes, setNotes] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

  const { data: planDay } = useQuery({
    queryKey: ["plan_day", activeDog?.id, id],
    queryFn: async () => {
      const { data } = await supabase.from("training_plans").select("days")
        .eq("dog_id", activeDog!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data?.days) return null;
      return (data.days as unknown as PlanDay[]).find(d => d.dayNumber === id) || null;
    },
    enabled: !!activeDog && source === "plan",
  });

  const standardDay = getDayById(id);
  const isPersonalized = source === "plan" && planDay;

  const planSlugs = isPersonalized
    ? planDay.exercises.map((e: any) => e.slug).filter(Boolean)
    : [];

  const { data: enrichedExercises } = useQuery({
    queryKey: ["enriched_exercises", planSlugs],
    queryFn: async () => {
      if (planSlugs.length === 0) return {};
      const { data } = await supabase
        .from("exercises")
        .select("slug, name, description, summary, objective, short_instruction, tutorial_steps, steps, success_criteria, stop_criteria, vigilance, voice_commands, body_positioning, troubleshooting, validation_protocol, mistakes, precautions, adaptations, cover_image")
        .in("slug", planSlugs);
      const map: Record<string, any> = {};
      (data || []).forEach((ex: any) => { map[ex.slug] = ex; });
      return map;
    },
    enabled: planSlugs.length > 0,
    staleTime: 10 * 60_000,
  });

  const dayTitle = isPersonalized ? planDay.title : standardDay?.title || "Jour inconnu";
  const dayObjective = isPersonalized ? planDay.objective : standardDay?.objective || "";
  const dayDuration = isPersonalized ? planDay.duration : standardDay?.duration || "";
  const dayDifficulty = isPersonalized ? planDay.difficulty : standardDay?.difficulty || "";
  const planExercises = isPersonalized
    ? planDay.exercises.map((e: any, i: number) => {
        const db = enrichedExercises?.[e.slug] || {};
        const dbTutorial = Array.isArray(db.tutorial_steps) ? db.tutorial_steps : [];
        const planTutorial = e.tutorialSteps || [];
        return {
          id: e.id || `plan-ex-${i}`,
          name: e.name,
          slug: e.slug || "",
          description: db.description || db.summary || db.objective || e.description || "",
          instructions: db.short_instruction || e.instructions || "",
          repetitionsTarget: e.repetitions,
          timerSuggested: e.timerSeconds,
          tutorialSteps: dbTutorial.length > 0 ? dbTutorial : planTutorial,
          validationProtocol: db.validation_protocol || db.success_criteria || e.validationProtocol || e.successCriteria || "",
          stopCriteria: db.stop_criteria || "",
          vigilance: db.vigilance || "",
          coverImage: db.cover_image || "",
          dayId: id,
        };
      })
    : [];
  const dayExercises = planExercises.length > 0 ? planExercises : (standardDay?.exercises || []);
  const dayVigilance = isPersonalized ? planDay.vigilance : standardDay?.vigilance || "";
  const dayValidation = isPersonalized ? planDay.validationCriteria : standardDay?.validationCriteria || "";
  const dayWeek = isPersonalized ? planDay.week : standardDay?.week || 1;
  const dayFunctions = isPersonalized ? [] : standardDay?.functions || [];
  const contextualTips = isPersonalized ? planDay.contextualTips || [] : [];

  const { data: progress, refetch } = useQuery({
    queryKey: ["day_progress", activeDog?.id, id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress").select("*")
        .eq("dog_id", activeDog!.id).eq("day_id", id).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  // Centralized lock + state resolution (Phase 2A) — single source of truth
  // shared with Plan grid, Training and TrainingSession.
  const lockSnapshot = useDayLockState(id);
  const isDayLocked = lockSnapshot.locked;

  // Today's behavioural zones for this day (sessions + behaviour log)
  const { data: dayZones } = useQuery({
    queryKey: ["day_zones", activeDog?.id, id],
    queryFn: async () => {
      const [{ data: sess }, { data: logs }] = await Promise.all([
        supabase
          .from("exercise_sessions")
          .select("zone_state, created_at")
          .eq("dog_id", activeDog!.id)
          .eq("day_id", id),
        supabase
          .from("behavior_logs")
          .select("zone_state, tension_level, created_at")
          .eq("dog_id", activeDog!.id)
          .eq("day_id", id),
      ]);
      const zones: Zone[] = [];
      (sess || []).forEach((s: any) => { if (s.zone_state) zones.push(s.zone_state as Zone); });
      (logs || []).forEach((l: any) => {
        if (l.zone_state) zones.push(l.zone_state as Zone);
        else {
          const z = zoneFromTension(l.tension_level);
          if (z) zones.push(z);
        }
      });
      return zones;
    },
    enabled: !!activeDog && !!id,
  });

  useEffect(() => { if (progress?.notes) setNotes(progress.notes); }, [progress]);

  // Auto-create progress row on first visit — but only once, using upsert
  useEffect(() => {
    if (activeDog && user && !progress && !initDone) {
      setInitDone(true);
      upsertDayProgress(activeDog.id, user.id, id, { status: "in_progress" })
        .then(() => refetch())
        .catch(() => {}); // silently ignore if already exists
    }
  }, [activeDog, user, progress, id, initDone]);

  if (!standardDay && !planDay) return <AppLayout><p className="pt-4 text-center text-muted-foreground">Jour non trouvé</p></AppLayout>;
  if (!activeDog) return <AppLayout><NoActiveDogState title="Aucun chien actif" description="Sélectionnez un chien pour suivre sa progression du jour." /></AppLayout>;

  if (isDayLocked) {
    return (
      <AppLayout>
        <div className="pt-4 text-center space-y-6 animate-fade-in">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Jour {id} verrouillé</h1>
            <p className="text-sm text-muted-foreground">Vous devez valider le Jour {id - 1} avant de pouvoir accéder à celui-ci.</p>
          </div>
          <div className="space-y-3 max-w-xs mx-auto">
            <Button className="w-full h-12 rounded-xl" onClick={() => navigate(source === "plan" ? `/day/${id - 1}?source=plan` : `/day/${id - 1}`)}>
              <ArrowLeft className="h-5 w-5" /> Aller au Jour {id - 1}
            </Button>
            <Button variant="ghost" className="w-full h-12 rounded-xl" onClick={() => navigate("/plan")}>
              Retour au plan
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const completedExercises: string[] = progress?.completed_exercises || [];
  const status = progress?.status || "todo";
  const completedCount = completedExercises.length;
  const totalExercises = dayExercises.length;
  const exercisePct = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  const toggleExercise = async (exId: string) => {
    if (!activeDog || !user) return;
    try {
      const newCompleted = completedExercises.includes(exId)
        ? completedExercises.filter(e => e !== exId)
        : [...completedExercises, exId];
      const newStatus = newCompleted.length > 0 ? "in_progress" : "todo";

      await upsertDayProgress(activeDog.id, user.id, id, {
        completed_exercises: newCompleted,
        status: progress?.validated ? "done" : newStatus,
      });
      refetch();
    } catch (err: any) {
      console.error("Toggle exercise error:", err);
      toast({ title: "Erreur", description: "Impossible de mettre à jour l'exercice.", variant: "destructive" });
    }
  };

  const validateDay = async () => {
    if (!activeDog || !user) return;
    try {
      await upsertDayProgress(activeDog.id, user.id, id, {
        status: "done", validated: true, notes,
      });
      refetch();
      qc.invalidateQueries({ queryKey: ["day_progress"] });
      setShowValidation(true);
      toast({ title: "✓ Jour validé", description: "Prochaine étape prête." });
    } catch (err: any) {
      console.error("Validate day error:", err);
      toast({ title: "Erreur", description: "Impossible de valider le jour.", variant: "destructive" });
    }
  };

  const saveNotes = async () => {
    if (!activeDog || !user) return;
    try {
      await upsertDayProgress(activeDog.id, user.id, id, { notes });
      refetch();
      toast({ title: "✓ Notes sauvegardées" });
    } catch (err: any) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les notes.", variant: "destructive" });
    }
  };

  const trainingUrl = source === "plan" ? `/training/${id}?source=plan` : `/training/${id}`;
  const fieldUrl = source === "plan" ? `/training/session/${id}?source=plan` : `/training/session/${id}`;
  const nextDayUrl = source === "plan" ? `/day/${id + 1}?source=plan` : `/day/${id + 1}`;

  if (showValidation) {
    return (
      <AppLayout>
        <div className="pt-4 text-center space-y-6 animate-fade-in">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-success/10 flex items-center justify-center animate-bounce-check">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Jour {id} validé !</h1>
            <p className="text-sm text-muted-foreground">Bravo, continuez comme ça.</p>
          </div>
          <div className="space-y-3 max-w-xs mx-auto">
            {id < 28 && (
              <Button className="w-full h-12 rounded-xl" onClick={() => { setShowValidation(false); navigate(nextDayUrl); }}>
                <ChevronRight className="h-5 w-5" /> Voir le jour suivant
              </Button>
            )}
            <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => navigate(`/behavior/${id}`)}>
              Faire le bilan comportemental
            </Button>
            <Button variant="ghost" className="w-full h-12 rounded-xl" onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        {/* Premium day journey header — replaces basic title strip */}
        <DayJourneyHeader
          dayId={id}
          totalDays={28}
          week={dayWeek}
          state={progress?.validated ? "done" : (status as "todo" | "in_progress" | "done")}
          completion={totalExercises > 0 ? completedCount / totalExercises : 0}
          hasPrev={id > 1}
          hasNext={id < 28 && (progress?.validated ?? false)}
          source={source}
        />

        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">
            {dayTitle}
            {isPersonalized && (
              <span className="ml-2 align-middle inline-block text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                Personnalisé
              </span>
            )}
          </h1>
          {dayObjective && <p className="text-sm text-muted-foreground mt-1">{dayObjective}</p>}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-muted px-3 py-1 text-xs">⏱ {dayDuration}</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs">📊 {dayDifficulty}</span>
          {dayFunctions.map((f: string) => (
            <span key={f} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary font-medium">{f}</span>
          ))}
        </div>

        {contextualTips.length > 0 && (
          <Card className="border-primary/10 bg-primary/5">
            <CardContent className="p-3 space-y-1">
              {contextualTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground">{tip}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Avant séance — récapitulatif rapide pour cadrer la session */}
        <section
          aria-label="Avant la séance"
          className="rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-2"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Avant la séance
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-background/60 p-2">
              <p className="text-[10px] text-muted-foreground">Durée</p>
              <p className="text-sm font-semibold text-foreground">{dayDuration || "—"}</p>
            </div>
            <div className="rounded-xl bg-background/60 p-2">
              <p className="text-[10px] text-muted-foreground">Exercices</p>
              <p className="text-sm font-semibold text-foreground">{totalExercises}</p>
            </div>
            <div className="rounded-xl bg-background/60 p-2">
              <p className="text-[10px] text-muted-foreground">Niveau</p>
              <p className="text-sm font-semibold text-foreground">{dayDifficulty || "—"}</p>
            </div>
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed pt-1">
            Vérifiez que votre chien est calme et disponible. Préparez vos récompenses, choisissez un environnement adapté et lisez le guide des zones ci-dessous avant de démarrer.
          </p>
        </section>

        {/* Pedagogical zone guide — folded by default */}
        <ZoneSafetyGuide defaultOpen={false} />

        {/* Today's behavioural zone summary */}
        {dayZones && dayZones.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Zones observées aujourd'hui</span>
              <span className="text-[10px] text-muted-foreground">{dayZones.length} obs.</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["green", "orange", "red"] as const).map((z) => {
                const n = dayZones.filter((x) => x === z).length;
                if (n === 0) return null;
                return (
                  <span key={z} className="flex items-center gap-1">
                    <ZoneBadge zone={z} size="sm" />
                    <span className="text-[10px] text-muted-foreground">×{n}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-foreground">Exercices</span>
            <span className="text-muted-foreground">{completedCount}/{totalExercises}</span>
          </div>
          <Progress value={exercisePct} className="h-2" />
        </div>

        <div className="space-y-2">
          {dayExercises.map((ex: any) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              done={completedExercises.includes(ex.id)}
              onToggle={() => toggleExercise(ex.id)}
            />
          ))}
        </div>

        {dayVigilance && (
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-warning">Point de vigilance</p>
                <p className="text-xs text-foreground mt-0.5">{dayVigilance}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {dayValidation && (
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-success">Critère de validation</p>
                <p className="text-xs text-foreground mt-0.5">{dayValidation}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Notes du jour</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations, réussites, difficultés..."
            className="w-full rounded-2xl border border-border bg-card p-3 text-sm min-h-[70px] resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          />
          <Button variant="outline" size="sm" className="rounded-xl" onClick={saveNotes}>Enregistrer</Button>
        </div>

        {/* Bottom action stack — sticky CTA highlights the next meaningful step */}
        <div className="flex flex-col gap-2 pb-24">
          <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => setJournalOpen(true)}>
            Journal rapide
          </Button>
          <Button variant="ghost" className="w-full h-12 rounded-xl" onClick={() => navigate(`/behavior/${id}`)}>
            Suivi comportemental détaillé
          </Button>
        </div>

        {/* Sticky next-step CTA */}
        <div className="fixed left-0 right-0 bottom-16 z-30 border-t border-border/40 bg-background/95 backdrop-blur-md px-4 py-3 mx-auto max-w-lg">
          {progress?.validated ? (
            id < 28 ? (
              <Button
                className="w-full h-12 rounded-xl text-sm font-semibold"
                onClick={() => navigate(nextDayUrl)}
              >
                <ChevronRight className="h-4 w-4" /> Jour suivant — J{id + 1}
              </Button>
            ) : (
              <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => navigate("/stats")}>
                Voir vos statistiques
              </Button>
            )
          ) : completedCount < totalExercises ? (
            <Button className="w-full h-12 rounded-xl text-sm font-semibold" onClick={() => navigate(fieldUrl)}>
              <Play className="h-4 w-4" />
              {completedCount === 0 ? "Démarrer la séance" : "Reprendre la séance"}
            </Button>
          ) : (
            <Button
              className="w-full h-12 rounded-xl bg-success hover:bg-success/90 text-success-foreground text-sm font-semibold"
              onClick={validateDay}
            >
              <CheckCircle2 className="h-4 w-4" /> Valider ce jour
            </Button>
          )}
        </div>
      </div>

      <QuickJournalSheet open={journalOpen} onOpenChange={setJournalOpen} dayId={id} />
    </AppLayout>
  );
}
