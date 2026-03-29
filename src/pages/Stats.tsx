import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useActiveDog } from "@/hooks/useDogs";
import { useStats } from "@/hooks/useStats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, CartesianGrid, Area, AreaChart,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, ArrowLeft, Activity,
  Target, Shield, Zap, Clock, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Flame, BarChart3, Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { UpgradePrompt } from "@/components/UpgradePrompt";

// ─── Sub-components ──────

function KPICard({ label, value, unit, trend, delay = 0 }: {
  label: string; value: string | number; unit?: string;
  trend?: "improving" | "worsening" | "stable"; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-3"
    >
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className="text-xl font-bold text-foreground">{value}</span>
        {unit && <span className="text-xs text-muted-foreground mb-0.5">{unit}</span>}
        {trend && (
          <span className="ml-auto">
            {trend === "improving" ? <TrendingDown className="h-3.5 w-3.5 text-emerald-400" /> :
             trend === "worsening" ? <TrendingUp className="h-3.5 w-3.5 text-red-400" /> :
             <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function ScoreBar({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  const color = value >= 70 ? "from-emerald-500 to-emerald-400" :
                value >= 40 ? "from-amber-500 to-amber-400" :
                "from-red-500 to-red-400";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="space-y-1.5"
    >
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-bold text-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: delay + 0.2, duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
        />
      </div>
    </motion.div>
  );
}

function PlanScoreGauge({ score, label, level, description }: {
  score: number; label: string; level: string; description: string;
}) {
  const ringColor = level === "excellent" ? "stroke-emerald-400" :
                    level === "good" ? "stroke-primary" :
                    level === "warning" ? "stroke-amber-400" :
                    "stroke-red-400";
  const bgGlow = level === "excellent" ? "shadow-[0_0_20px_rgba(52,211,153,0.15)]" :
                 level === "good" ? "shadow-[0_0_20px_hsl(var(--neon-blue)/0.15)]" :
                 level === "warning" ? "shadow-[0_0_20px_rgba(251,191,36,0.15)]" :
                 "shadow-[0_0_20px_rgba(239,68,68,0.15)]";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-5 text-center ${bgGlow}`}
    >
      <div className="relative w-24 h-24 mx-auto mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity="0.2" />
          <motion.circle
            cx="50" cy="50" r="40" fill="none"
            className={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{score}</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </motion.div>
  );
}

function SectionToggle({ title, icon: Icon, children, defaultOpen = true, delay = 0, locked = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; delay?: number; locked?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden ${locked ? "opacity-60" : ""}`}
    >
      <button onClick={() => !locked && setOpen(!open)} className="w-full flex items-center gap-2 p-4">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground flex-1 text-left">{title}</span>
        {locked ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : (
          open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {open && !locked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 space-y-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Custom tooltip ──────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/30 bg-background/90 backdrop-blur-md p-2 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-[10px] text-muted-foreground">
          {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main ──────

export default function Stats() {
  const navigate = useNavigate();
  const activeDog = useActiveDog();
  const [period, setPeriod] = useState<"7" | "14" | "30" | "all">("all");
  const advStatsGate = useFeatureGate("advanced_stats");
  const stats = useStats(period, advStatsGate.allowed);
  const hasAdvanced = advStatsGate.allowed;

  if (!activeDog) {
    return (
      <AppLayout>
        <div className="pt-4 text-center text-muted-foreground">Ajoutez d'abord un chien.</div>
      </AppLayout>
    );
  }

  if (!stats) {
    return (
      <AppLayout>
        <div className="pt-4 text-center">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Vos statistiques</h1>
          <p className="text-sm text-muted-foreground">{activeDog.name} — Progression & analyses</p>
        </motion.div>

        {/* Period filter */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2">
          {([
            { v: "7" as const, l: "7 jours" },
            { v: "14" as const, l: "14 jours" },
            { v: "30" as const, l: "30 jours" },
            { v: "all" as const, l: "Tout" },
          ]).map(p => (
            <button
              key={p.v}
              onClick={() => setPeriod(p.v)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                period === p.v
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/30 bg-card/40 text-muted-foreground"
              }`}
            >
              {p.l}
            </button>
          ))}
        </motion.div>

        {/* Plan Score — always visible */}
        <PlanScoreGauge
          score={stats.planScore.score}
          label={stats.planScore.label}
          level={stats.planScore.level}
          description={stats.planScore.description}
        />

        {/* Basic KPIs — always visible */}
        <div className="grid grid-cols-3 gap-2">
          <KPICard label="Jours validés" value={stats.completedDays} delay={0.1} />
          <KPICard label="Séances" value={stats.totalSessions} delay={0.15} />
          <KPICard label="Série" value={`${stats.streakDays}j`} delay={0.2} />
        </div>

        {/* Advanced KPIs — gated */}
        {hasAdvanced ? (
          <div className="grid grid-cols-3 gap-2">
            <KPICard label="Tension moy." value={stats.avgTension} unit="/5" trend={stats.tensionTrend} delay={0.25} />
            <KPICard label="Réact. chiens" value={stats.avgDogReaction} unit="/5" trend={stats.reactionTrend} delay={0.3} />
            <KPICard label="Réact. humains" value={stats.avgHumanReaction} unit="/5" delay={0.35} />
          </div>
        ) : (
          <UpgradePrompt
            compact
            requiredTier={advStatsGate.requiredTier}
            title="Statistiques avancées"
          />
        )}

        {/* Highlights — always visible */}
        {stats.recentHighlights.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            {stats.recentHighlights.map((h, i) => (
              <div key={i} className={`rounded-xl border p-3 flex items-start gap-2 ${
                h.type === "improvement" ? "border-emerald-500/20 bg-emerald-500/5" :
                h.type === "milestone" ? "border-primary/20 bg-primary/5" :
                "border-red-500/20 bg-red-500/5"
              }`}>
                {h.type === "improvement" ? <TrendingDown className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> :
                 h.type === "milestone" ? <Flame className="h-4 w-4 text-primary mt-0.5 shrink-0" /> :
                 <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />}
                <p className="text-xs text-foreground">{h.text}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Scores comportementaux — gated */}
        <SectionToggle title="Scores comportementaux" icon={Target} delay={0.3} locked={!hasAdvanced}>
          <ScoreBar label="Focus" value={stats.focusScore} delay={0.35} />
          <ScoreBar label="Stop" value={stats.stopScore} delay={0.4} />
          <ScoreBar label="Non / renoncement" value={stats.noScore} delay={0.45} />
          <ScoreBar label="Marche en laisse" value={stats.leashScore} delay={0.5} />
        </SectionToggle>

        {/* Tension chart — gated */}
        {stats.tensionChart.length > 0 && (
          <SectionToggle title="Évolution tension & réactivité" icon={Activity} delay={0.4} locked={!hasAdvanced}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.tensionChart}>
                <defs>
                  <linearGradient id="tensionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--neon-blue))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--neon-blue))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="reactGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="jour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="tension" name="Tension" stroke="hsl(var(--neon-blue))" strokeWidth={2} fill="url(#tensionGrad)" dot={{ r: 2, fill: "hsl(var(--neon-blue))" }} />
                <Area type="monotone" dataKey="chiens" name="Réact. chiens" stroke="#ef4444" strokeWidth={1.5} fill="url(#reactGrad)" dot={{ r: 2, fill: "#ef4444" }} />
                <Line type="monotone" dataKey="humains" name="Réact. humains" stroke="hsl(var(--neon-purple))" strokeWidth={1.5} dot={{ r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-3 justify-center text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[hsl(var(--neon-blue))] inline-block" /> Tension</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-red-500 inline-block" /> Chiens</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[hsl(var(--neon-purple))] inline-block" /> Humains</span>
            </div>
          </SectionToggle>
        )}

        {/* Distance chart — gated */}
        {stats.distanceChart.length > 0 && stats.distanceChart.some(d => d.distance != null) && (
          <SectionToggle title="Distance de confort" icon={Shield} defaultOpen={false} delay={0.5} locked={!hasAdvanced}>
            <KPICard label="Distance moyenne" value={stats.avgComfortDistance} unit="m" trend={stats.distanceTrend} />
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={stats.distanceChart}>
                <defs>
                  <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--neon-cyan))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--neon-cyan))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="jour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="distance" name="Distance (m)" stroke="hsl(var(--neon-cyan))" strokeWidth={2} fill="url(#distGrad)" dot={{ r: 2, fill: "hsl(var(--neon-cyan))" }} />
              </AreaChart>
            </ResponsiveContainer>
          </SectionToggle>
        )}

        {/* Weekly progress — always visible */}
        {stats.weeklyData.length > 0 && (
          <SectionToggle title="Progression par semaine" icon={BarChart3} defaultOpen={false} delay={0.6}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.weeklyData}>
                <XAxis dataKey="semaine" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 7]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={20} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="validés" name="Validés" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionToggle>
        )}

        {/* Recommendations — gated */}
        {stats.recommendations.length > 0 && (
          <SectionToggle title="Recommandations" icon={Zap} delay={0.7} locked={!hasAdvanced}>
            <div className="space-y-2">
              {stats.recommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                  className={`rounded-xl border p-3 space-y-1 ${
                    rec.type === "success" ? "border-emerald-500/20 bg-emerald-500/5" :
                    rec.type === "warning" ? "border-amber-500/20 bg-amber-500/5" :
                    rec.type === "danger" ? "border-red-500/20 bg-red-500/5" :
                    "border-primary/20 bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{rec.icon}</span>
                    <p className="text-xs font-semibold text-foreground">{rec.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </motion.div>
              ))}
            </div>
          </SectionToggle>
        )}

        {/* Additional info — gated */}
        {hasAdvanced ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="rounded-2xl border border-border/30 bg-card/60 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Récupération</p>
              <p className="text-sm font-semibold text-foreground capitalize">{stats.avgRecovery}</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-card/60 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Taux d'incidents</p>
              <p className={`text-sm font-semibold ${stats.incidentRate > 40 ? "text-red-400" : stats.incidentRate > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                {stats.incidentRate}%
              </p>
            </div>
          </motion.div>
        ) : null}

        {/* Upsell for advanced stats if not available */}
        {!hasAdvanced && (
          <UpgradePrompt
            requiredTier={advStatsGate.requiredTier}
            title="Débloquez les analyses avancées"
            description="Accédez aux scores comportementaux, graphiques de tension, distance de confort, recommandations personnalisées et bien plus."
          />
        )}

        {/* Empty state */}
        {stats.tensionChart.length === 0 && stats.completedDays === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border/30 bg-card/60 p-8 text-center space-y-3"
          >
            <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Pas encore de données.</p>
            <p className="text-xs text-muted-foreground">Commencez l'entraînement et remplissez le journal pour voir vos progrès.</p>
            <Button variant="outline" className="rounded-xl" onClick={() => navigate("/journal")}>
              Ouvrir le journal
            </Button>
          </motion.div>
        )}

        {/* CTA Journal */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl border-border/30 bg-card/60 backdrop-blur-sm gap-2"
            onClick={() => navigate("/journal")}
          >
            <Activity className="h-4 w-4 text-primary" />
            <span>Ouvrir le journal de bord</span>
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
