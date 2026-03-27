import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Heart, Clock, Repeat, AlertTriangle, CheckCircle2, XCircle, Camera, ChevronDown, ChevronUp, Mic, User, HelpCircle, ShieldCheck, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ReadAloudButton } from "@/components/ReadAloudButton";

const levelColors: Record<string, string> = {
  "débutant": "bg-success/15 text-success",
  "intermédiaire": "bg-warning/15 text-warning",
  "avancé": "bg-destructive/15 text-destructive",
};

function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
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
            <div className="px-4 pb-4 space-y-3">{children}</div>
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

  const tutorialSteps = Array.isArray(exercise.tutorial_steps) ? exercise.tutorial_steps : [];
  const mistakes = Array.isArray(exercise.mistakes) ? exercise.mistakes : [];
  const precautions = Array.isArray(exercise.precautions) ? exercise.precautions : [];
  const contraindications = Array.isArray(exercise.contraindications) ? exercise.contraindications : [];
  const adaptations = Array.isArray(exercise.adaptations) ? exercise.adaptations : [];
  const equipment = Array.isArray(exercise.equipment) ? exercise.equipment : [];
  const tags = (exercise.tags as string[]) || [];
  const voiceCommands = Array.isArray((exercise as any).voice_commands) ? (exercise as any).voice_commands : [];
  const rawBody = (exercise as any).body_positioning;
  const bodyPositioning = rawBody && typeof rawBody === "object" && !Array.isArray(rawBody) ? rawBody : null;
  const troubleshooting = Array.isArray((exercise as any).troubleshooting) ? (exercise as any).troubleshooting : [];
  const validationProtocol = (exercise as any).validation_protocol || "";

  // Mistakes can be a JSON-encoded string array
  const parsedMistakes = (() => {
    if (Array.isArray(exercise.mistakes)) {
      const first = exercise.mistakes[0];
      if (typeof first === "string") {
        try { const parsed = JSON.parse(first); if (Array.isArray(parsed)) return parsed; } catch {}
      }
      return exercise.mistakes;
    }
    return [];
  })();

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-6 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/exercises")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{exercise.exercise_categories?.icon} {exercise.exercise_categories?.name}</p>
            <h1 className="text-lg font-bold text-foreground break-words">{exercise.name}</h1>
          </div>
        </div>

        {/* Cover image — responsive, no overlap */}
        {exercise.cover_image ? (
          <div className="w-full rounded-2xl overflow-hidden border border-border">
            <img src={exercise.cover_image} alt={exercise.name} className="w-full h-auto max-w-full object-contain" />
          </div>
        ) : (
          <div className="w-full h-40 rounded-2xl bg-secondary/50 flex items-center justify-center border border-border">
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
              <Camera className="h-8 w-8" />
              <span className="text-[10px]">Illustration à venir</span>
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge className={`text-[10px] ${levelColors[exercise.level] || ""}`}>{exercise.level}</Badge>
          <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="h-2.5 w-2.5" />{exercise.duration}</Badge>
          <Badge variant="secondary" className="text-[10px] gap-1"><Repeat className="h-2.5 w-2.5" />{exercise.repetitions}</Badge>
          {exercise.is_professional && <Badge className="text-[10px] bg-primary/15 text-primary">PRO</Badge>}
          {tags.slice(0, 3).map(t => (
            <Badge key={t} variant="outline" className="text-[10px] text-primary border-primary/20">#{t}</Badge>
          ))}
        </div>

        {/* Objective + description */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground break-words">{exercise.objective}</p>
          {exercise.description && <p className="text-xs text-muted-foreground break-words">{exercise.description}</p>}
          {exercise.dedication && <p className="text-xs text-primary/80 italic break-words">"{exercise.dedication}"</p>}
        </div>

        <ReadAloudButton
          getText={() => {
            const parts = [exercise.name, exercise.objective];
            if (exercise.description) parts.push(exercise.description);
            tutorialSteps.forEach((s: any, i: number) => parts.push(`Étape ${i + 1}: ${s.title}. ${s.description}`));
            if (exercise.success_criteria) parts.push(`Critère de réussite: ${exercise.success_criteria}`);
            return parts.join(". ");
          }}
          label="Écouter"
        />

        {/* Tutorial steps */}
        {tutorialSteps.length > 0 && (
          <Section title="Étapes du tutoriel" icon={<Play className="h-3.5 w-3.5 text-primary" />} defaultOpen={true}>
            {tutorialSteps.map((ts: any, i: number) => (
              <div key={i} className="rounded-lg bg-secondary/30 p-3 space-y-1.5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground break-words">{ts.title}</p>
                    <p className="text-[11px] text-muted-foreground break-words mt-0.5">{ts.description}</p>
                  </div>
                </div>
                {ts.voice_command && (
                  <div className="ml-11 flex items-start gap-1.5 rounded-md bg-primary/5 p-2">
                    <Mic className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-primary break-words">{ts.voice_command}</p>
                  </div>
                )}
                {ts.body_position && (
                  <div className="ml-11 flex items-start gap-1.5 rounded-md bg-accent/10 p-2">
                    <User className="h-3 w-3 text-accent-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground break-words">{ts.body_position}</p>
                  </div>
                )}
                {ts.tip && <p className="text-[10px] text-primary ml-11 break-words">💡 {ts.tip}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Voice commands summary */}
        {voiceCommands.length > 0 && (
          <Section title="Que dire et comment" icon={<Mic className="h-3.5 w-3.5 text-primary" />}>
            {voiceCommands.map((vc: any, i: number) => (
              <div key={i} className="rounded-lg bg-primary/5 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground break-words">🗣️ « {vc.command} »</p>
                <p className="text-[10px] text-muted-foreground break-words"><span className="font-medium">Ton :</span> {vc.tone}</p>
                <p className="text-[10px] text-muted-foreground break-words"><span className="font-medium">Quand :</span> {vc.timing}</p>
                {vc.warning && <p className="text-[10px] text-destructive break-words">⚠️ {vc.warning}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Body positioning */}
        {bodyPositioning && (
          <Section title="Position du corps" icon={<User className="h-3.5 w-3.5 text-accent-foreground" />}>
            <div className="space-y-2">
              {bodyPositioning.handler_position && (
                <div className="rounded-lg bg-secondary/30 p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground">🧍 Position du maître</p>
                  <p className="text-[11px] text-muted-foreground break-words">{bodyPositioning.handler_position}</p>
                </div>
              )}
              {bodyPositioning.dog_position && (
                <div className="rounded-lg bg-secondary/30 p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground">🐕 Position du chien</p>
                  <p className="text-[11px] text-muted-foreground break-words">{bodyPositioning.dog_position}</p>
                </div>
              )}
              {bodyPositioning.distance && (
                <div className="rounded-lg bg-secondary/30 p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground">📏 Distance</p>
                  <p className="text-[11px] text-muted-foreground break-words">{bodyPositioning.distance}</p>
                </div>
              )}
              {bodyPositioning.leash_management && (
                <div className="rounded-lg bg-secondary/30 p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground">🪢 Gestion de la laisse</p>
                  <p className="text-[11px] text-muted-foreground break-words">{bodyPositioning.leash_management}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Troubleshooting */}
        {troubleshooting.length > 0 && (
          <Section title="En cas de difficulté" icon={<HelpCircle className="h-3.5 w-3.5 text-warning" />}>
            {troubleshooting.map((ts: any, i: number) => (
              <div key={i} className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground break-words">❓ Si : {ts.situation}</p>
                <p className="text-[11px] text-foreground break-words">✅ Alors : {ts.solution}</p>
                {ts.prevention && <p className="text-[10px] text-muted-foreground break-words">🛡️ Prévention : {ts.prevention}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Mistakes */}
        {mistakes.length > 0 && (
          <Section title="Erreurs à éviter" icon={<XCircle className="h-3.5 w-3.5 text-destructive" />}>
            {mistakes.map((m: any, i: number) => (
              <div key={i} className="rounded-lg bg-destructive/5 p-3 space-y-1">
                {typeof m === "string" ? (
                  <p className="text-xs text-muted-foreground break-words flex items-start gap-2"><XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />{m}</p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-foreground break-words">❌ {m.mistake}</p>
                    <p className="text-[10px] text-muted-foreground break-words">→ Conséquence : {m.consequence}</p>
                    <p className="text-[10px] text-success break-words">✅ Correction : {m.correction}</p>
                  </>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Validation protocol */}
        {validationProtocol && (
          <Section title="Protocole de validation" icon={<ShieldCheck className="h-3.5 w-3.5 text-primary" />}>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs text-foreground break-words">{validationProtocol}</p>
            </div>
          </Section>
        )}

        {/* Success criteria */}
        {exercise.success_criteria && (
          <Section title="Critère de réussite" icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />}>
            <p className="text-xs text-foreground break-words">{exercise.success_criteria}</p>
          </Section>
        )}

        {/* Stop criteria */}
        {exercise.stop_criteria && (
          <Section title="Signaux d'arrêt" icon={<StopCircle className="h-3.5 w-3.5 text-destructive" />}>
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <p className="text-xs text-foreground break-words">🛑 {exercise.stop_criteria}</p>
            </div>
          </Section>
        )}

        {/* Vigilance & safety */}
        {(precautions.length > 0 || contraindications.length > 0 || exercise.vigilance) && (
          <Section title="Vigilance & sécurité" icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />}>
            {exercise.vigilance && <p className="text-xs text-foreground break-words">{exercise.vigilance}</p>}
            {precautions.map((p: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-2 break-words">
                <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                {typeof p === "string" ? p : p.text}
              </p>
            ))}
            {contraindications.map((c: any, i: number) => (
              <p key={i} className="text-xs text-destructive flex items-start gap-2 break-words">
                <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                {typeof c === "string" ? c : c.text}
              </p>
            ))}
          </Section>
        )}

        {/* Adaptations */}
        {adaptations.length > 0 && (
          <Section title="Adaptations par profil" icon={<Heart className="h-3.5 w-3.5 text-primary" />}>
            {adaptations.map((a: any, i: number) => (
              <div key={i} className="rounded-lg bg-secondary/30 p-3 space-y-0.5">
                {typeof a === "string" ? (
                  <p className="text-xs text-muted-foreground break-words">• {a}</p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-foreground break-words">🐾 {a.profile}</p>
                    <p className="text-[11px] text-muted-foreground break-words">{a.adaptation}</p>
                  </>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Equipment */}
        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground mr-1">Matériel :</span>
            {equipment.map((m: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{m}</Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
            <Button className="w-full gap-2 rounded-xl h-11">
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
