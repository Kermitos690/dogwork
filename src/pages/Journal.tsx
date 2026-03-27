import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveDog } from "@/hooks/useDogs";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Calendar, ChevronRight, BarChart3, Save, CheckCircle2,
  Zap, Clock, ArrowLeft, ChevronDown, ChevronUp, Activity,
  AlertTriangle, TrendingDown, TrendingUp, Filter, Search,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isAfter, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// ─── Sub-components ──────────────────────────────────────────

function LevelSelector({ label, value, max = 5, onChange }: {
  label: string; value: number; max?: number; onChange: (v: number) => void;
}) {
  const colorForLevel = (n: number, active: boolean) => {
    if (!active) return "border-border/40 bg-transparent text-muted-foreground/60";
    if (n <= 2) return "border-emerald-500/60 bg-emerald-500/20 text-emerald-400";
    if (n <= 3) return "border-amber-500/60 bg-amber-500/20 text-amber-400";
    return "border-red-500/60 bg-red-500/20 text-red-400";
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs font-semibold text-muted-foreground">{value}/{max}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <motion.button
            key={n}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(n)}
            className={`flex-1 rounded-lg border py-2.5 text-sm font-bold transition-all duration-200 ${colorForLevel(n, n <= value)}`}
          >
            {n}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function QualityChips({ label, value, options, onChange }: {
  label: string; value: string;
  options: { value: string; label: string; emoji?: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex gap-2">
        {options.map(o => (
          <motion.button
            key={o.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all duration-200 ${
              value === o.value
                ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--neon-blue)/0.15)]"
                : "border-border/40 bg-card/50 text-muted-foreground hover:border-border"
            }`}
          >
            {o.emoji && <span className="mr-1">{o.emoji}</span>}{o.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function BoolChip({ label, value, onChange, dangerWhenTrue = false }: {
  label: string; value: boolean; onChange: (v: boolean) => void; dangerWhenTrue?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => onChange(!value)}
      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
        value
          ? dangerWhenTrue
            ? "border-red-500/60 bg-red-500/15 text-red-400"
            : "border-primary/60 bg-primary/15 text-primary"
          : "border-border/40 bg-card/50 text-muted-foreground"
      }`}
    >
      {value ? "✓ " : ""}{label}
    </motion.button>
  );
}

function SectionCard({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
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

// ─── Main Component ──────────────────────────────────────────

type JournalMode = "quick" | "detailed";

const defaultEntry = {
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
};

export default function Journal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const qc = useQueryClient();
  const [tab, setTab] = useState("new");
  const [mode, setMode] = useState<JournalMode>("quick");
  const [entry, setEntry] = useState(defaultEntry);
  const [saving, setSaving] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<"7" | "30" | "all">("30");

  // ─── Data queries (limited to 200 most recent) ──────
  const { data: logs } = useQuery({
    queryKey: ["behavior_logs_all", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("behavior_logs").select("*")
        .eq("dog_id", activeDog!.id).order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: journalEntries } = useQuery({
    queryKey: ["journal_entries", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("journal_entries").select("*")
        .eq("dog_id", activeDog!.id).order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
    enabled: !!activeDog,
  });

  const { data: progressData } = useQuery({
    queryKey: ["day_progress_journal", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress").select("*")
        .eq("dog_id", activeDog!.id).order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeDog,
  });

  // ─── Filtered history ──────
  const filteredEntries = useMemo(() => {
    if (!journalEntries) return [];
    if (filterPeriod === "all") return journalEntries;
    const cutoff = subDays(new Date(), parseInt(filterPeriod));
    return journalEntries.filter(e => isAfter(parseISO(e.created_at), cutoff));
  }, [journalEntries, filterPeriod]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (filterPeriod === "all") return logs;
    const cutoff = subDays(new Date(), parseInt(filterPeriod));
    return logs.filter(l => isAfter(parseISO(l.created_at), cutoff));
  }, [logs, filterPeriod]);

  // ─── All entries merged for timeline ──────
  const timelineEntries = useMemo(() => {
    const all: Array<{
      id: string; type: "journal" | "behavior"; date: string; dayId?: number;
      tension?: number | null; dogReaction?: number | null;
      completed?: boolean; successLevel?: string | null;
      notes?: string | null; incidents?: string | null;
      focusQuality?: string | null; jumpOnHuman?: boolean; barking?: boolean;
    }> = [];

    filteredEntries.forEach(e => {
      all.push({
        id: e.id, type: "journal", date: e.created_at,
        dayId: e.day_id ?? undefined, completed: e.completed,
        successLevel: e.success_level, notes: e.notes,
        incidents: e.incidents, tension: e.tension_level,
      });
    });

    filteredLogs.forEach(l => {
      all.push({
        id: l.id, type: "behavior", date: l.created_at,
        dayId: l.day_id, tension: l.tension_level,
        dogReaction: l.dog_reaction_level,
        focusQuality: l.focus_quality,
        jumpOnHuman: l.jump_on_human ?? false,
        barking: l.barking ?? false,
      });
    });

    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredEntries, filteredLogs]);

  // ─── Quick stats ──────
  const quickStats = useMemo(() => {
    const validated = progressData?.filter(p => p.validated).length || 0;
    const totalLogs = (logs?.length || 0) + (journalEntries?.length || 0);
    let streak = 0;
    const sorted = [...(progressData || [])].sort((a, b) => b.day_id - a.day_id);
    for (const p of sorted) { if (p.validated) streak++; else break; }
    return { validated, totalLogs, streak };
  }, [progressData, logs, journalEntries]);

  // ─── Save ──────
  const saveEntry = useCallback(async () => {
    if (!activeDog || !user) return;
    setSaving(true);
    try {
      await supabase.from("journal_entries").insert({
        dog_id: activeDog.id,
        user_id: user.id,
        completed: entry.completed,
        success_level: entry.success_level,
        incidents: entry.incidents || null,
        triggers_encountered: entry.triggers_encountered || null,
        dog_reaction: entry.dog_reaction || null,
        recovery_time: entry.recovery_time,
        tension_level: entry.tension_level,
        focus_quality: entry.focus_quality,
        stop_quality: entry.stop_quality,
        no_quality: entry.no_quality,
        leash_quality: entry.leash_quality,
        notes: entry.notes || null,
      });
      qc.invalidateQueries({ queryKey: ["journal_entries"] });
      qc.invalidateQueries({ queryKey: ["stats_"] });
      toast({ title: "✓ Journal enregistré" });
      setEntry(defaultEntry);
      setTab("history");
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer.", variant: "destructive" });
    }
    setSaving(false);
  }, [activeDog, user, entry, qc]);

  const update = <K extends keyof typeof defaultEntry>(key: K, value: typeof defaultEntry[K]) => {
    setEntry(e => ({ ...e, [key]: value }));
  };

  // ─── Tension color helper ──────
  const tensionColor = (level: number | null) => {
    if (!level) return "text-muted-foreground";
    if (level <= 2) return "text-emerald-400";
    if (level <= 3) return "text-amber-400";
    return "text-red-400";
  };

  if (!activeDog) {
    return (
      <AppLayout>
        <div className="pt-12 text-center text-muted-foreground">Ajoutez d'abord un chien.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-6 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Journal de bord</h1>
          <p className="text-sm text-muted-foreground">{activeDog.name} — Suivi & historique</p>
        </motion.div>

        {/* Quick KPIs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2"
        >
          {[
            { label: "Jours validés", value: quickStats.validated, color: "text-primary" },
            { label: "Entrées", value: quickStats.totalLogs, color: "text-foreground" },
            { label: "Série", value: `${quickStats.streak}j`, color: quickStats.streak >= 3 ? "text-emerald-400" : "text-foreground" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-3 text-center">
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full bg-card/60 border border-border/30 rounded-2xl p-1 h-auto">
            <TabsTrigger value="new" className="flex-1 rounded-xl text-xs py-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Plus className="h-3.5 w-3.5 mr-1" /> Nouveau
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 rounded-xl text-xs py-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Clock className="h-3.5 w-3.5 mr-1" /> Historique
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1 rounded-xl text-xs py-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Activity className="h-3.5 w-3.5 mr-1" /> Timeline
            </TabsTrigger>
          </TabsList>

          {/* ─── NEW ENTRY ──── */}
          <TabsContent value="new" className="space-y-4 mt-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              {(["quick", "detailed"] as const).map(m => (
                <motion.button
                  key={m}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    mode === m
                      ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_15px_hsl(var(--neon-blue)/0.1)]"
                      : "border-border/30 bg-card/40 text-muted-foreground"
                  }`}
                >
                  {m === "quick" ? "⚡ Rapide" : "📋 Complet"}
                </motion.button>
              ))}
            </div>

            {/* Session done */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => update("completed", !entry.completed)}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                entry.completed
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-border/30 bg-card/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  entry.completed ? "bg-emerald-500/20" : "bg-muted/50"
                }`}>
                  {entry.completed
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {entry.completed ? "Séance réalisée ✓" : "Séance faite aujourd'hui ?"}
                  </p>
                  <p className="text-xs text-muted-foreground">Touchez pour confirmer</p>
                </div>
              </div>
            </motion.button>

            {/* Quick mode fields */}
            <SectionCard title="Niveau général">
              <LevelSelector label="Tension générale" value={entry.tension_level} onChange={v => update("tension_level", v)} />
              <QualityChips label="Réussite perçue" value={entry.success_level}
                options={[
                  { value: "bon", label: "Bon", emoji: "👍" },
                  { value: "moyen", label: "Moyen", emoji: "👌" },
                  { value: "faible", label: "Faible", emoji: "👎" },
                ]}
                onChange={v => update("success_level", v)} />
              <QualityChips label="Focus" value={entry.focus_quality}
                options={[
                  { value: "bon", label: "Bon", emoji: "🎯" },
                  { value: "moyen", label: "Moyen" },
                  { value: "faible", label: "Faible" },
                ]}
                onChange={v => update("focus_quality", v)} />
            </SectionCard>

            {/* Quick note */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Note rapide</span>
              <textarea
                value={entry.notes}
                onChange={e => update("notes", e.target.value)}
                placeholder="Observations rapides..."
                className="w-full rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 text-sm min-h-[70px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Detailed mode extras */}
            <AnimatePresence>
              {mode === "detailed" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <SectionCard title="Réponses aux signaux">
                    <QualityChips label="Stop" value={entry.stop_quality}
                      options={[
                        { value: "bon", label: "Oui" },
                        { value: "moyen", label: "Moyen" },
                        { value: "faible", label: "Non" },
                      ]}
                      onChange={v => update("stop_quality", v)} />
                    <QualityChips label="Non / renoncement" value={entry.no_quality}
                      options={[
                        { value: "bon", label: "Oui" },
                        { value: "moyen", label: "Moyen" },
                        { value: "faible", label: "Non" },
                      ]}
                      onChange={v => update("no_quality", v)} />
                    <QualityChips label="Marche en laisse" value={entry.leash_quality}
                      options={[
                        { value: "bonne", label: "Bonne" },
                        { value: "moyenne", label: "Moyenne" },
                        { value: "difficile", label: "Difficile" },
                      ]}
                      onChange={v => update("leash_quality", v)} />
                  </SectionCard>

                  <SectionCard title="Incidents & déclencheurs">
                    <div className="flex gap-2 flex-wrap">
                      <BoolChip label="Saut sur humain" value={entry.dog_reaction === "jump"} dangerWhenTrue
                        onChange={v => update("dog_reaction", v ? "jump" : "")} />
                      <BoolChip label="Aboiement" value={entry.dog_reaction === "bark"} dangerWhenTrue
                        onChange={v => update("dog_reaction", v ? "bark" : "")} />
                    </div>
                    <textarea
                      value={entry.incidents}
                      onChange={e => update("incidents", e.target.value)}
                      placeholder="Incidents rencontrés..."
                      className="w-full rounded-xl border border-border/30 bg-card/40 p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground/50"
                    />
                    <textarea
                      value={entry.triggers_encountered}
                      onChange={e => update("triggers_encountered", e.target.value)}
                      placeholder="Déclencheurs rencontrés..."
                      className="w-full rounded-xl border border-border/30 bg-card/40 p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground/50"
                    />
                  </SectionCard>

                  <SectionCard title="Récupération" defaultOpen={false}>
                    <QualityChips label="Récupération après déclencheur" value={entry.recovery_time}
                      options={[
                        { value: "rapide", label: "Rapide", emoji: "⚡" },
                        { value: "moyenne", label: "Moyenne" },
                        { value: "lente", label: "Lente", emoji: "🐢" },
                      ]}
                      onChange={v => update("recovery_time", v)} />
                  </SectionCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Save button */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full h-14 text-base font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80 shadow-[0_0_20px_hsl(var(--neon-blue)/0.2)]"
                onClick={saveEntry}
                disabled={saving}
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement...</span>
                ) : mode === "quick" ? (
                  <><Zap className="h-5 w-5 mr-2" /> Enregistrer rapidement</>
                ) : (
                  <><Save className="h-5 w-5 mr-2" /> Enregistrer</>
                )}
              </Button>
            </motion.div>
          </TabsContent>

          {/* ─── HISTORY ──── */}
          <TabsContent value="history" className="space-y-4 mt-4">
            {/* Period filter */}
            <div className="flex gap-2">
              {([
                { value: "7" as const, label: "7 jours" },
                { value: "30" as const, label: "30 jours" },
                { value: "all" as const, label: "Tout" },
              ]).map(p => (
                <button
                  key={p.value}
                  onClick={() => setFilterPeriod(p.value)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    filterPeriod === p.value
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/30 bg-card/40 text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {filteredEntries.length === 0 ? (
              <div className="rounded-2xl border border-border/30 bg-card/60 p-8 text-center space-y-3">
                <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-sm text-muted-foreground">Aucune entrée sur cette période.</p>
              </div>
            ) : (
              filteredEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entry.completed ? (
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-muted/30 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                        </div>
                      )}
                      <p className="text-sm font-semibold text-foreground">
                        {entry.day_id ? `Jour ${entry.day_id}` : format(new Date(entry.entry_date), "d MMMM", { locale: fr })}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(entry.created_at), "d MMM · HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {entry.success_level && (
                      <Badge variant="secondary" className="text-[10px] rounded-lg bg-card/80 border-border/30">
                        Réussite : {entry.success_level}
                      </Badge>
                    )}
                    {entry.tension_level && (
                      <Badge variant="secondary" className={`text-[10px] rounded-lg ${
                        entry.tension_level <= 2 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        entry.tension_level <= 3 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        Tension {entry.tension_level}/5
                      </Badge>
                    )}
                  </div>
                  {entry.incidents && <p className="text-xs text-red-400/80">⚠️ {entry.incidents}</p>}
                  {entry.notes && <p className="text-xs text-muted-foreground line-clamp-2">{entry.notes}</p>}
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* ─── TIMELINE ──── */}
          <TabsContent value="timeline" className="space-y-4 mt-4">
            <div className="flex gap-2">
              {([
                { value: "7" as const, label: "7j" },
                { value: "30" as const, label: "30j" },
                { value: "all" as const, label: "Tout" },
              ]).map(p => (
                <button
                  key={p.value}
                  onClick={() => setFilterPeriod(p.value)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                    filterPeriod === p.value
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/30 bg-card/40 text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {timelineEntries.length === 0 ? (
              <div className="rounded-2xl border border-border/30 bg-card/60 p-8 text-center space-y-3">
                <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-sm text-muted-foreground">Aucune activité sur cette période.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4">
                {/* Timeline line */}
                <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border/30 to-transparent" />

                {timelineEntries.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative"
                  >
                    {/* Dot */}
                    <div className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 ${
                      item.type === "journal"
                        ? item.completed ? "bg-emerald-500 border-emerald-400" : "bg-card border-primary/60"
                        : item.tension && item.tension > 3
                        ? "bg-red-500 border-red-400"
                        : "bg-card border-border"
                    }`} />

                    <div className="rounded-xl border border-border/20 bg-card/40 backdrop-blur-sm p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] rounded-md px-1.5 py-0.5">
                            {item.type === "journal" ? "Journal" : "Suivi"}
                          </Badge>
                          {item.dayId && <span className="text-xs text-muted-foreground">J{item.dayId}</span>}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(item.date), "d MMM HH:mm", { locale: fr })}
                        </span>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {item.tension != null && (
                          <span className={`text-xs font-medium ${tensionColor(item.tension)}`}>
                            Tension {item.tension}/5
                          </span>
                        )}
                        {item.dogReaction != null && (
                          <span className={`text-xs font-medium ${tensionColor(item.dogReaction)}`}>
                            Réact. {item.dogReaction}/5
                          </span>
                        )}
                        {item.completed !== undefined && (
                          <span className={`text-xs ${item.completed ? "text-emerald-400" : "text-muted-foreground"}`}>
                            {item.completed ? "✓ Fait" : "Non fait"}
                          </span>
                        )}
                      </div>

                      {item.incidents && <p className="text-xs text-red-400/70 line-clamp-1">⚠️ {item.incidents}</p>}
                      {item.notes && <p className="text-xs text-muted-foreground line-clamp-1">{item.notes}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* CTA Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl border-border/30 bg-card/60 backdrop-blur-sm gap-2"
            onClick={() => navigate("/stats")}
          >
            <BarChart3 className="h-4 w-4 text-primary" />
            <span>Voir mes statistiques</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
