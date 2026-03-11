import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Heart, Clock, Repeat, AlertTriangle, CheckCircle2, XCircle, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const levelColors: Record<string, string> = {
  "débutant": "bg-success/15 text-success",
  "intermédiaire": "bg-warning/15 text-warning",
  "avancé": "bg-destructive/15 text-destructive",
};

function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ExerciseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: exercise, isLoading } = useQuery({
    queryKey: ["exercise_detail", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("*, exercise_categories(name, icon, slug)")
        .eq("slug", slug!)
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return <AppLayout><div className="pt-12 text-center"><div className="animate-pulse text-muted-foreground">Chargement...</div></div></AppLayout>;
  }

  if (!exercise) {
    return (
      <AppLayout>
        <div className="pt-12 text-center">
          <p className="text-muted-foreground">Exercice introuvable.</p>
          <Button variant="outline" onClick={() => navigate("/exercises")} className="mt-4">Retour</Button>
        </div>
      </AppLayout>
    );
  }

  const tutorialSteps = (exercise.tutorial_steps as any[]) || [];
  const mistakes = (exercise.mistakes as string[]) || [];
  const precautions = (exercise.precautions as string[]) || [];
  const contraindications = (exercise.contraindications as string[]) || [];
  const adaptations = (exercise.adaptations as string[]) || [];
  const equipment = (exercise.equipment as string[]) || [];
  const tags = (exercise.tags as string[]) || [];

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-6 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/exercises")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{exercise.exercise_categories?.icon} {exercise.exercise_categories?.name}</p>
            <h1 className="text-lg font-bold text-foreground truncate">{exercise.name}</h1>
          </div>
        </div>

        <div className="w-full h-40 rounded-2xl bg-secondary/50 flex items-center justify-center overflow-hidden neon-border">
          {exercise.cover_image ? (
            <img src={exercise.cover_image} alt={exercise.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
              <Camera className="h-8 w-8" />
              <span className="text-[10px]">Photo tutoriel</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge className={`text-[10px] ${levelColors[exercise.level]}`}>{exercise.level}</Badge>
          <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="h-2.5 w-2.5" />{exercise.duration}</Badge>
          <Badge variant="secondary" className="text-[10px] gap-1"><Repeat className="h-2.5 w-2.5" />{exercise.repetitions}</Badge>
          {exercise.is_professional && <Badge className="text-[10px] bg-primary/15 text-primary">PRO</Badge>}
          {tags.slice(0, 3).map(t => (
            <Badge key={t} variant="outline" className="text-[10px] text-primary border-primary/20">#{t}</Badge>
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{exercise.objective}</p>
          {exercise.dedication && <p className="text-xs text-primary/80 italic">"{exercise.dedication}"</p>}
        </div>

        {tutorialSteps.length > 0 && (
          <Section title="Étapes du tutoriel" icon={<Play className="h-3.5 w-3.5 text-primary" />} defaultOpen={true}>
            {tutorialSteps.map((ts: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-secondary/30">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{ts.title}</p>
                  <p className="text-[11px] text-muted-foreground">{ts.description}</p>
                  {ts.tip && <p className="text-[10px] text-primary mt-1">💡 {ts.tip}</p>}
                </div>
              </div>
            ))}
          </Section>
        )}

        {mistakes.length > 0 && (
          <Section title="Erreurs à éviter" icon={<XCircle className="h-3.5 w-3.5 text-destructive" />}>
            {mistakes.map((m: string, i: number) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-2"><XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />{m}</p>
            ))}
          </Section>
        )}

        {(precautions.length > 0 || contraindications.length > 0) && (
          <Section title="Vigilance & sécurité" icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />}>
            {precautions.map((p: string, i: number) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-2"><AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />{p}</p>
            ))}
            {contraindications.map((c: string, i: number) => (
              <p key={i} className="text-xs text-destructive flex items-start gap-2"><AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />{c}</p>
            ))}
          </Section>
        )}

        {exercise.success_criteria && (
          <Section title="Critère de réussite" icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />}>
            <p className="text-xs text-foreground">{exercise.success_criteria}</p>
          </Section>
        )}

        {adaptations.length > 0 && (
          <Section title="Adaptations" icon={<Heart className="h-3.5 w-3.5 text-accent" />}>
            {adaptations.map((a: string, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">• {a}</p>
            ))}
          </Section>
        )}

        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground mr-1">Matériel :</span>
            {equipment.map((m: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{m}</Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
            <Button className="w-full gap-2 rounded-xl neon-glow h-11">
              <Play className="h-4 w-4" /> Commencer
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button variant="outline" className="rounded-xl h-11 px-4">
              <Heart className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
