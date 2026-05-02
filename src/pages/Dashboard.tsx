import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog, useDogs } from "@/hooks/useDogs";
import { useAdaptiveSuggestion } from "@/hooks/useAdaptive";
import { AppLayout } from "@/components/AppLayout";
import { InstallAppCard } from "@/components/InstallAppCard";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dog, Play, BookOpen, BarChart3, ClipboardList, AlertTriangle, Plus, Shield,
  TrendingUp, TrendingDown, ChevronRight, Sparkles, Heart, Calendar, Activity,
  PawPrint, Eye, Zap, Settings, FileText, Target, ArrowRight, LogOut, Timer
} from "lucide-react";
import { DogSwitcher } from "@/components/DogSwitcher";
import { CreditsSummaryCard } from "@/components/CreditsSummaryCard";
import { useSubscription, PLANS } from "@/hooks/useSubscription";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDayById } from "@/data/program";
import { useTranslation } from "react-i18next";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

function dogAge(birthDate: string | null) {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  const y = Math.floor(diff / (365.25 * 86400000));
  const m = Math.floor((diff % (365.25 * 86400000)) / (30.44 * 86400000));
  return y > 0 ? `${y} an${y > 1 ? "s" : ""}` : `${m} mois`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const activeDog = useActiveDog();
  const { data: dogs } = useDogs();
  const adaptiveSuggestion = useAdaptiveSuggestion();
  const { tier, subscribed } = useSubscription();
  const { t } = useTranslation();

  const monthlyIncluded = tier === "expert" ? 15 : tier === "pro" ? 5 : 1;
  const planLabel = subscribed
    ? `Plan ${PLANS[tier as keyof typeof PLANS]?.name ?? tier}`
    : "Plan Découverte (gratuit)";

  const { data: progress } = useQuery({
    queryKey: ["day_progress", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress")
        .select("day_id, status, validated, completed_exercises")
        .eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: lastLog } = useQuery({
    queryKey: ["last_behavior_log", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("behavior_logs")
        .select("tension_level, focus_quality, recovery_after_trigger")
        .eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  const { data: lastJournal } = useQuery({
    queryKey: ["last_journal", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("tension_level, focus_quality, recovery_time")
        .eq("dog_id", activeDog!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  const { data: activePlan } = useQuery({
    queryKey: ["active_plan_dashboard", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_plans")
        .select("id, total_days, axes, days, summary, security_level, created_at")
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

  const { data: lastSession } = useQuery({
    queryKey: ["last_session", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercise_sessions")
        .select("id, day_id, started_at")
        .eq("dog_id", activeDog!.id)
        .eq("completed", false).order("started_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!activeDog,
  });

  // ── No dogs: elegant empty state ──
  if (!dogs || dogs.length === 0) {
    return (
      <AppLayout>
        <div className="pt-4 pb-8 flex flex-col items-center text-center gap-6">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 20 }}>
            <div className="w-20 h-20 rounded-[1.25rem] bg-primary/10 flex items-center justify-center">
              <Dog className="h-10 w-10 text-primary" />
            </div>
          </motion.div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-foreground">{t("dashboard.welcome")}</h1>
            <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
              {t("dashboard.welcomeDesc")}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/onboarding")}
            className="flex items-center gap-2.5 h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg"
          >
            <Plus className="h-4.5 w-4.5" /> {t("dashboard.addDog")}
          </motion.button>
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
  const hasIncompleteSession = !!lastSession;

  // ── Next exercise to do ──
  const completedExerciseIds = inProgress?.completed_exercises || [];
  const planDays = (activePlan?.days as any[]) || [];
  const planDay = planDays.find((d: any) => d.dayNumber === resumeDay || d.id === resumeDay || d.dayId === resumeDay);
  const planExercises = planDay?.exercises || [];
  const dayExercises = planExercises.length > 0 ? planExercises : (getDayById(resumeDay)?.exercises || []);
  const nextExercise = dayExercises.find((ex: any) => !completedExerciseIds.includes(ex.id));
  const nextExerciseDayData = getDayById(resumeDay);

  // Determine primary state for adaptive dashboard
  type DashState = "no_plan" | "no_progress" | "in_progress" | "day_done" | "all_done";
  const dashState: DashState = !hasPlan ? "no_plan"
    : validated >= totalDays ? "all_done"
    : inProgress ? "in_progress"
    : validated === 0 ? "no_progress"
    : "day_done";

  // Badges (compact)
  const dogBadges: { label: string; cls: string }[] = [];
  if (activeDog?.bite_history) dogBadges.push({ label: t("dashboard.sensitive"), cls: "bg-destructive/10 text-destructive" });
  if (activeDog?.muzzle_required) dogBadges.push({ label: t("dashboard.muzzle"), cls: "bg-warning/10 text-warning" });
  if (activePlan?.security_level && activePlan.security_level !== "standard") dogBadges.push({ label: t("dashboard.cautious"), cls: "bg-warning/10 text-warning" });

  // Smart quick actions based on state
  const quickActions = [
    hasPlan && { icon: Play, label: t("nav.training"), path: `/training/${resumeDay}?source=plan`, priority: dashState === "in_progress" ? 10 : 5 },
    { icon: BookOpen, label: t("nav.plan"), path: "/plan", priority: dashState === "no_plan" ? 10 : 3 },
    { icon: ClipboardList, label: t("nav.journal"), path: "/journal", priority: 2 },
    { icon: BarChart3, label: t("nav.stats"), path: "/stats", priority: 1 },
    { icon: PawPrint, label: t("nav.profile"), path: activeDog ? `/dogs/${activeDog.id}` : "/dogs", priority: 0 },
    { icon: Activity, label: t("nav.exercises"), path: "/exercises", priority: 0 },
  ].filter(Boolean).sort((a: any, b: any) => b.priority - a.priority) as { icon: any; label: string; path: string; priority: number }[];

  return (
    <AppLayout>
      <motion.div initial="hidden" animate="show" className="pb-4 space-y-3.5">

        {/* ── Header: greeting + dog pill ── */}
        <motion.div custom={0} variants={fadeUp} className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{t("dashboard.today")}</h1>
          <div className="flex items-center gap-2">
            <DogSwitcher />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={signOut}
              className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-sm"
              title={t("common.signOut")}
            >
              <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.button>
          </div>
        </motion.div>

        {/* ── Install app CTA (auto-hide si déjà installée) ── */}
        <InstallAppCard variant="compact" dismissKey="dw_install_dashboard" />

        {/* ── Crédits IA — solde rapide ── */}
        <motion.div custom={0.4} variants={fadeUp}>
          <CreditsSummaryCard
            creditsPath="/credits"
            monthlyIncluded={monthlyIncluded}
            planLabel={planLabel}
          />
        </motion.div>

        {/* ── Security alert (compact) ── */}
        {hasAlerts && (
          <motion.div custom={0.5} variants={fadeUp}>
            <div className="rounded-xl border border-destructive/15 bg-destructive/5 px-3.5 py-2.5 flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-foreground font-medium leading-snug">
                {activeDog!.muzzle_required ? t("dashboard.muzzleRequired") : t("dashboard.sensitiveProfile")} — {t("dashboard.calmEnvironment")}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Adaptive suggestion (inline) ── */}
        {adaptiveSuggestion && !hasAlerts && (
          <motion.div custom={0.5} variants={fadeUp}>
            <div className={`rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 ${
              adaptiveSuggestion.type === "warning" ? "bg-warning/5 border border-warning/15" :
              adaptiveSuggestion.type === "success" ? "bg-success/5 border border-success/15" :
              "bg-muted/50 border border-border"
            }`}>
              {adaptiveSuggestion.type === "warning" ? <TrendingDown className="h-4 w-4 text-warning shrink-0" /> :
               adaptiveSuggestion.type === "success" ? <TrendingUp className="h-4 w-4 text-success shrink-0" /> :
               <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />}
              <p className="text-xs text-foreground leading-snug">{adaptiveSuggestion.message}</p>
            </div>
          </motion.div>
        )}

        {/* ══════ HERO: Primary Action Card ══════ */}
        <motion.div custom={1} variants={fadeUp}>
          <AnimatePresence mode="wait">
            {dashState === "no_plan" ? (
              <motion.div key="no_plan" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                <Card className="overflow-hidden border-primary/20 card-press" onClick={() => navigate("/plan")}>
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-md">
                        <Sparkles className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{t("dashboard.generatePlan")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.profileReady")}</p>
                      </div>
                      <ArrowRight className="h-4.5 w-4.5 text-primary shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="today" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                <Card
                  className="overflow-hidden border-primary/20 card-press"
                  onClick={() => navigate(`/day/${resumeDay}?source=plan`)}
                >
                  <CardContent className="p-0">
                    <div className="relative bg-gradient-to-br from-primary/5 via-card to-primary/8 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                            {dashState === "in_progress" ? "En cours" : dashState === "all_done" ? "Terminé 🎉" : `Jour ${resumeDay}`}
                          </p>
                          <h2 className="text-lg font-bold text-foreground mt-0.5 leading-tight">
                            {dashState === "all_done" ? "Programme terminé !" : todayData?.title || `Jour ${resumeDay}`}
                          </h2>
                          {todayData?.objective && dashState !== "all_done" && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{todayData.objective}</p>
                          )}
                        </div>
                        <motion.div
                          whileTap={{ scale: 0.88 }}
                          className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0 ml-3"
                        >
                          <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                        </motion.div>
                      </div>

                      {/* In-progress bar */}
                      {inProgress && (
                        <div className="mt-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{inProgress.completed_exercises?.length || 0} exercice(s) fait(s)</span>
                          </div>
                          <Progress value={Math.min(((inProgress.completed_exercises?.length || 0) / 4) * 100, 100)} className="h-1.5" />
                        </div>
                      )}

                      {/* CTA label */}
                      {!inProgress && dashState !== "all_done" && (
                        <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mt-2">
                          <Play className="h-3 w-3" />
                          <span>{validated === 0 ? "Commencer" : "Continuer"}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Resume incomplete session banner ── */}
        {hasIncompleteSession && (
          <motion.div custom={1.5} variants={fadeUp}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/training/${lastSession!.day_id}?source=plan`)}
              className="w-full flex items-center gap-3 rounded-xl bg-accent/10 border border-accent/20 px-3.5 py-2.5 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Play className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Séance en cours</p>
                <p className="text-[10px] text-muted-foreground">Reprendre l'exercice — Jour {lastSession!.day_id}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-accent shrink-0" />
            </motion.button>
          </motion.div>
        )}

        {/* ── Next exercise card ── */}
        {nextExercise && hasPlan && dashState !== "all_done" && (
          <motion.div custom={1.8} variants={fadeUp}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/training/${resumeDay}?source=plan`)}
              className="w-full flex items-center gap-3 rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3.5 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md">
                <Timer className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Prochain exercice</p>
                <p className="text-sm font-bold text-foreground mt-0.5 line-clamp-1">{nextExercise.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {nextExercise.timerSuggested && (
                    <span className="text-[10px] text-muted-foreground">{Math.floor(nextExercise.timerSuggested / 60)} min</span>
                  )}
                  {nextExercise.repetitionsTarget && (
                    <span className="text-[10px] text-muted-foreground">× {nextExercise.repetitionsTarget} rép.</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="text-[9px] text-primary font-semibold">Go</span>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* ── Progress strip ── */}
        <motion.div custom={2} variants={fadeUp} className="grid grid-cols-3 gap-2">
          {[
            { value: validated, label: "Validés", color: "text-primary" },
            { value: `${completionRate}%`, label: "Progression", color: "text-foreground" },
            { value: lastLog?.tension_level ?? "–", label: "Tension", color: lastLog?.tension_level && lastLog.tension_level > 3 ? "text-destructive" : "text-success" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl bg-card border border-border py-2.5 text-center">
              <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Plan summary (compact) ── */}
        {activePlan && (
          <motion.div custom={3} variants={fadeUp}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/plan")}
              className="w-full flex items-center gap-3 rounded-xl bg-card border border-border p-3 text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {planAxes && planAxes.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {planAxes.slice(0, 2).map((a: any, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{a.label}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-foreground">Votre plan</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{activePlan.summary}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </motion.button>
          </motion.div>
        )}

        {/* ── Last activity (compact) ── */}
        {(lastLog || lastJournal) && (
          <motion.div custom={4} variants={fadeUp}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/journal")}
              className="w-full rounded-xl bg-card border border-border p-3 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dernière activité</p>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { v: lastLog?.tension_level ?? lastJournal?.tension_level ?? "–", l: "Tension" },
                  { v: lastLog?.focus_quality || lastJournal?.focus_quality || "–", l: "Focus" },
                  { v: lastLog?.recovery_after_trigger || lastJournal?.recovery_time || "–", l: "Récup." },
                ].map((s, i) => (
                  <div key={i}>
                    <p className="text-sm font-bold text-foreground tabular-nums">{s.v}</p>
                    <p className="text-[9px] text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* ── Empty state: no sessions yet ── */}
        {!lastLog && !lastJournal && hasPlan && (
          <motion.div custom={4} variants={fadeUp}>
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-center">
              <ClipboardList className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">Aucune séance enregistrée</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Commencez votre premier jour pour voir vos données ici.</p>
            </div>
          </motion.div>
        )}

        {/* ── Quick actions grid ── */}
        <motion.div custom={5} variants={fadeUp}>
          <div className="grid grid-cols-3 gap-2">
            {quickActions.slice(0, 6).map((action, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.94 }}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-card border border-border py-3 px-2 text-center"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[10px] font-medium text-foreground leading-tight">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </AppLayout>
  );
}
