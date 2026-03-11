import { useNavigate } from "react-router-dom";
import { Play, Calendar, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { getSettings, getAllProgress, getAllBehavior, getDayProgress } from "@/lib/storage";
import { getDayById, WEEK_TITLES } from "@/data/program";
import { Layout } from "@/components/Layout";

const Index = () => {
  const navigate = useNavigate();
  const settings = getSettings();
  const allProgress = getAllProgress();
  const currentDay = getDayById(settings.currentDay);
  const dayProgress = getDayProgress(settings.currentDay);
  const completedDays = Object.values(allProgress).filter((p) => p.validated).length;
  const pct = Math.round((completedDays / 28) * 100);
  const allBehavior = getAllBehavior();
  const lastBehavior = allBehavior[settings.currentDay - 1] || null;

  const weekNum = currentDay ? currentDay.week : 1;

  // Weekly progress
  const weekCompleted = Object.values(allProgress)
    .filter((p) => {
      const d = getDayById(p.dayId);
      return d && d.week === weekNum && p.validated;
    }).length;

  return (
    <Layout>
      <div className="animate-fade-in space-y-5 pt-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mon défi 28 jours</h1>
          <p className="text-sm text-muted-foreground">Reste sous seuil. Travaille proprement.</p>
        </div>

        {/* Progress card */}
        <div className="rounded-xl bg-primary p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-foreground/80">Progression globale</p>

              <p className="text-3xl font-bold text-primary-foreground">{pct}%</p>
              <p className="text-sm text-primary-foreground/70">{completedDays}/28 jours validés</p>
            </div>
            <div className="relative h-16 w-16">
              <svg className="-rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`} />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-primary-foreground/70">
              Semaine {weekNum} — {WEEK_TITLES[weekNum - 1]} ({weekCompleted}/7)
            </p>
            <div className="mt-1 h-1.5 rounded-full bg-primary-foreground/20">
              <div className="h-full rounded-full bg-primary-foreground/80 transition-all" style={{ width: `${(weekCompleted / 7) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Current day */}
        {currentDay && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Jour {currentDay.id}</p>
                <h2 className="text-lg font-semibold">{currentDay.title}</h2>
              </div>
              <StatusBadge status={dayProgress?.status || "todo"} />
            </div>
            <p className="text-sm text-muted-foreground">{currentDay.objective}</p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>⏱ {currentDay.duration}</span>
              <span>•</span>
              <span>{currentDay.difficulty}</span>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="xl" className="w-full animate-pulse-glow" onClick={() => navigate(`/training/${currentDay.id}`)}>
                <Play className="h-5 w-5" />
                Reprendre aujourd'hui
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/day/${currentDay.id}`)}>
                Voir la fiche du jour
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Quick exercises preview */}
        {currentDay && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Exercices du jour</h3>
            <div className="space-y-2">
              {currentDay.exercises.slice(0, 3).map((ex) => {
                const done = dayProgress?.completedExercises.includes(ex.id);
                return (
                  <div key={ex.id} className="flex items-center gap-3 text-sm">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${done ? "bg-success border-success" : "border-muted-foreground/30"}`}>
                      {done && <span className="text-success-foreground text-xs">✓</span>}
                    </div>
                    <span className={done ? "text-muted-foreground line-through" : ""}>{ex.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">×{ex.repetitionsTarget}</span>
                  </div>
                );
              })}
              {currentDay.exercises.length > 3 && (
                <p className="text-xs text-muted-foreground">+{currentDay.exercises.length - 3} exercice(s)...</p>
              )}
            </div>
          </div>
        )}

        {/* Last behavior summary */}
        {lastBehavior && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Dernier bilan (Jour {settings.currentDay - 1})</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Tension : <span className="font-medium">{lastBehavior.tensionLevel}/5</span></div>
              <div>Réactivité : <span className="font-medium">{lastBehavior.dogReactionLevel}/5</span></div>
              <div>Distance : <span className="font-medium">{lastBehavior.comfortDistanceMeters}m</span></div>
              <div>Récup. : <span className="font-medium">{lastBehavior.recoveryAfterTrigger}</span></div>
            </div>
          </div>
        )}

        {/* Last notes */}
        {dayProgress?.notes && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">Notes du jour</h3>
            <p className="text-sm text-muted-foreground">{dayProgress.notes}</p>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-14" onClick={() => navigate("/program")}>
            <Calendar className="h-4 w-4" /> Programme
          </Button>
          <Button variant="outline" className="h-14" onClick={() => navigate("/safety")}>
            <Shield className="h-4 w-4" /> Sécurité
          </Button>
        </div>

        {/* Safety reminder */}
        <div className="rounded-xl border border-zone-orange/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-warning">🔒 Rappel sécurité</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Muselière obligatoire en public. Aucune rencontre improvisée avec d'autres chiens.
            Travaillez toujours sous le seuil de réactivité.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
