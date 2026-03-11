import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog, useDogs } from "@/hooks/useDogs";
import { useAdaptiveSuggestion } from "@/hooks/useAdaptive";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Dog, Play, BookOpen, BarChart3, ClipboardList, AlertTriangle, Plus, Shield,
  TrendingUp, TrendingDown, ChevronRight, Sparkles, Heart, Calendar, Activity,
  PawPrint, Eye, Zap, Settings
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDayById } from "@/data/program";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

function DogAge(birthDate: string | null) {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
  if (years > 0) return `${years} an${years > 1 ? "s" : ""}`;
  return `${months} mois`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const { data: dogs } = useDogs();
  const adaptiveSuggestion = useAdaptiveSuggestion();

  const { data: progress } = useQuery({
    queryKey: ["day_progress", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress").select("*").eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: lastLog } = useQuery({
    queryKey: ["last_behavior_log", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("behavior_logs").select("*").eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  const { data: lastJournal } = useQuery({
    queryKey: ["last_journal", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("journal_entries").select("*").eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  const { data: activePlan } = useQuery({
    queryKey: ["active_plan_dashboard", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_plans").select("*")
        .eq("dog_id", activeDog!.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  const { data: sessionCount } = useQuery({
    queryKey: ["session_count", activeDog?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("exercise_sessions").select("*", { count: "exact", head: true })
        .eq("dog_id", activeDog!.id).eq("completed", true);
      return count || 0;
    },
    enabled: !!activeDog,
  });

  // No dogs state
  if (!dogs || dogs.length === 0) {
    return (
      <AppLayout>
        <div className="pt-16 space-y-8 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
            <div className="mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Dog className="h-12 w-12 text-primary" />
            </div>
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Bienvenue sur PawPlan</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Votre compagnon d'éducation canine personnalisée</p>
          </div>
          <Button onClick={() => navigate("/onboarding")} size="lg" className="gap-2 h-14 rounded-2xl text-base">
            <Plus className="h-5 w-5" /> Ajouter mon chien
          </Button>
        </div>
      </AppLayout>
    );
  }

  const validated = progress?.filter(p => p.validated).length || 0;
  const totalDays = (activePlan as any)?.total_days || 28;
  const inProgress = progress?.find(p => p.status === "in_progress" && !p.validated);
  const completionRate = Math.round((validated / totalDays) * 100);
  const currentDay = validated + 1;
  const todayData = getDayById(Math.min(currentDay, totalDays));
  const hasAlerts = activeDog && (activeDog.muzzle_required || activeDog.bite_history);
  const planAxes = activePlan?.axes as any[] | null;
  const resumeDay = inProgress ? inProgress.day_id : Math.min(currentDay, totalDays);
  const hasPlan = !!activePlan;

  // Badges
  const dogBadges: { label: string; color: string }[] = [];
  if (activeDog?.bite_history) dogBadges.push({ label: "Profil sensible", color: "bg-destructive/10 text-destructive" });
  if (activeDog?.muzzle_required) dogBadges.push({ label: "Muselière", color: "bg-warning/10 text-warning" });
  if (activePlan?.security_level && activePlan.security_level !== "standard") dogBadges.push({ label: "Plan prudent", color: "bg-warning/10 text-warning" });
  if (activeDog?.birth_date) {
    const age = (Date.now() - new Date(activeDog.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age > 8) dogBadges.push({ label: "Senior", color: "bg-muted text-muted-foreground" });
  }

  return (
    <AppLayout>
      <motion.div
        initial="hidden"
        animate="show"
        className="pt-6 pb-4 space-y-4"
      >
        {/* BLOC 1 — Dog Card */}
        <motion.div custom={0} variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Bonjour 👋</p>
            <h1 className="text-2xl font-bold text-foreground">Aujourd'hui</h1>
          </div>
          <button
            onClick={() => navigate(`/dogs/${activeDog?.id}`)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-card border border-border active:scale-95 transition-all shadow-sm"
          >
            {activeDog?.photo_url ? (
              <img src={activeDog.photo_url} alt={activeDog.name} className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Dog className="h-4.5 w-4.5 text-primary" />
              </div>
            )}
            <div className="text-left">
              <span className="text-sm font-semibold text-foreground block leading-tight">{activeDog?.name}</span>
              {activeDog?.breed && (
                <span className="text-[10px] text-muted-foreground leading-tight">{activeDog.breed}</span>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
          </button>
        </motion.div>

        {/* Dog badges */}
        {dogBadges.length > 0 && (
          <motion.div custom={0.5} variants={fadeUp} className="flex flex-wrap gap-1.5">
            {dogBadges.map((b, i) => (
              <span key={i} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${b.color}`}>
                {b.label}
              </span>
            ))}
            {activeDog?.birth_date && (
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                {DogAge(activeDog.birth_date)}
              </span>
            )}
          </motion.div>
        )}

        {/* BLOC 4 — Security Alerts */}
        {hasAlerts && (
          <motion.div custom={1} variants={fadeUp}>
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm space-y-0.5">
                <p className="font-semibold text-destructive">Vigilance renforcée</p>
                {activeDog!.muzzle_required && <p className="text-xs text-muted-foreground">Muselière obligatoire en extérieur</p>}
                {activeDog!.bite_history && <p className="text-xs text-muted-foreground">Antécédent de morsure — Aucun contact direct</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* Adaptive suggestion */}
        {adaptiveSuggestion && (
          <motion.div custom={1.5} variants={fadeUp}>
            <div className={`rounded-2xl border p-3.5 flex items-start gap-3 ${
              adaptiveSuggestion.type === "warning" ? "border-warning/20 bg-warning/5" :
              adaptiveSuggestion.type === "success" ? "border-success/20 bg-success/5" :
              "border-border bg-card"
            }`}>
              {adaptiveSuggestion.type === "warning" ? <TrendingDown className="h-4.5 w-4.5 text-warning shrink-0 mt-0.5" /> :
               adaptiveSuggestion.type === "success" ? <TrendingUp className="h-4.5 w-4.5 text-success shrink-0 mt-0.5" /> :
               <Sparkles className="h-4.5 w-4.5 text-muted-foreground shrink-0 mt-0.5" />}
              <p className="text-xs text-foreground leading-relaxed font-medium">{adaptiveSuggestion.message}</p>
            </div>
          </motion.div>
        )}

        {/* BLOC 2 — Big Today Card */}
        <motion.div custom={2} variants={fadeUp}>
          {!hasPlan ? (
            <Card className="overflow-hidden border-primary/15 card-press" onClick={() => navigate("/plan")}>
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-primary/5 to-primary/15 p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                    <Sparkles className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-foreground">Générer votre plan</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Le profil est prêt. Créons un plan adapté.</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-primary/15 card-press" onClick={() => navigate(`/day/${resumeDay}?source=plan`)}>
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {inProgress ? "Reprendre" : "Aujourd'hui"}
                      </p>
                      <h2 className="text-xl font-bold text-foreground">Jour {resumeDay}</h2>
                    </div>
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg"
                    >
                      <Play className="h-7 w-7 text-primary-foreground ml-0.5" />
                    </motion.div>
                  </div>
                  {todayData && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{todayData.title}</p>
                  )}
                  {inProgress && (
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>En cours</span>
                        <span>{inProgress.completed_exercises?.length || 0} exercice(s)</span>
                      </div>
                      <Progress value={((inProgress.completed_exercises?.length || 0) / 3) * 100} className="h-1.5" />
                    </div>
                  )}
                  {!inProgress && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium mt-1">
                      <Play className="h-3 w-3" />
                      <span>{validated === 0 ? "Commencer aujourd'hui" : "Voir le jour suivant"}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* BLOC 3 — Progress Strip */}
        <motion.div custom={3} variants={fadeUp} className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-bold text-primary tabular-nums">{validated}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Jours validés</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">{completionRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Progression</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-bold tabular-nums" style={{ color: lastLog?.tension_level && lastLog.tension_level > 3 ? "hsl(var(--destructive))" : "hsl(var(--success))" }}>
              {lastLog?.tension_level ?? "–"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tension</p>
          </div>
        </motion.div>

        {/* BLOC 5 — Plan Summary */}
        {activePlan && (
          <motion.div custom={4} variants={fadeUp}>
            <Card className="card-press" onClick={() => navigate("/plan")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Votre plan</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{activePlan.summary}</p>
                    {planAxes && planAxes.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {planAxes.slice(0, 3).map((a: any, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{a.label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* BLOC 6 — Last Session / Journal */}
        {(lastLog || lastJournal) && (
          <motion.div custom={5} variants={fadeUp}>
            <Card className="card-press" onClick={() => navigate("/journal")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Dernière séance</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      {lastLog?.tension_level ?? lastJournal?.tension_level ?? "–"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Tension</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {lastLog?.focus_quality || lastJournal?.focus_quality || "–"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Focus</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {lastLog?.recovery_after_trigger || lastJournal?.recovery_time || "–"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Récupération</p>
                  </div>
                </div>
                {(lastLog?.comments || lastJournal?.notes) && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
                    "{lastLog?.comments || lastJournal?.notes}"
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* BLOC 7 — Stats Preview */}
        <motion.div custom={6} variants={fadeUp} className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-bold text-primary tabular-nums">{sessionCount ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Séances terminées</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3 text-center">
            <p className="text-xl font-bold text-foreground tabular-nums">
              {hasPlan ? `${totalDays - validated}` : "–"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Jours restants</p>
          </div>
        </motion.div>

        {/* BLOC 8 — Quick Actions */}
        <motion.div custom={7} variants={fadeUp}>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Accès rapides</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: BookOpen, label: "Mon plan", sub: "Voir le programme", path: "/plan", show: true },
              { icon: Play, label: "Entraînement", sub: "Lancer une séance", path: `/training/${resumeDay}`, show: hasPlan },
              { icon: ClipboardList, label: "Journal", sub: "Ajouter une note", path: "/journal", show: true },
              { icon: BarChart3, label: "Statistiques", sub: "Voir la progression", path: "/stats", show: true },
              { icon: PawPrint, label: "Profil chien", sub: "Modifier la fiche", path: activeDog ? `/dogs/${activeDog.id}` : "/dogs", show: true },
              { icon: Activity, label: "Exercices", sub: "Bibliothèque", path: "/exercises", show: true },
            ].filter(a => a.show).map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3.5 text-left active:scale-[0.97] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <action.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{action.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
