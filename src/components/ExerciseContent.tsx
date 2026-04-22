import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Play, Heart, Clock, Repeat, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Mic, User, HelpCircle, ShieldCheck, StopCircle,
} from "lucide-react";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { ExerciseCoverFallback } from "@/components/ExerciseCoverFallback";

const levelColors: Record<string, string> = {
  "débutant": "bg-success/15 text-success",
  "intermédiaire": "bg-warning/15 text-warning",
  "avancé": "bg-destructive/15 text-destructive",
};

function Section({
  title, icon, children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface ExerciseContentProps {
  exercise: any;
  /** When true, hides the owner-only CTA (Start training, favorite). */
  hideActions?: boolean;
}

/**
 * Pure presentational rendering of an exercise.
 * Shared between owner-side ExerciseDetail and coach-side preview to avoid duplication.
 */
export function ExerciseContent({ exercise, hideActions = false }: ExerciseContentProps) {
  const { t } = useTranslation();

  const tutorialSteps = Array.isArray(exercise.tutorial_steps) ? exercise.tutorial_steps : [];
  const precautions = Array.isArray(exercise.precautions) ? exercise.precautions : [];
  const contraindications = Array.isArray(exercise.contraindications) ? exercise.contraindications : [];
  const adaptations = Array.isArray(exercise.adaptations) ? exercise.adaptations : [];
  const equipment = Array.isArray(exercise.equipment) ? exercise.equipment : [];
  const tags = (exercise.tags as string[]) || [];
  const voiceCommands = Array.isArray(exercise.voice_commands) ? exercise.voice_commands : [];
  const rawBody = exercise.body_positioning;
  const bodyPositioning = rawBody && typeof rawBody === "object" && !Array.isArray(rawBody) ? rawBody : null;
  const troubleshooting = Array.isArray(exercise.troubleshooting) ? exercise.troubleshooting : [];
  const validationProtocol = exercise.validation_protocol || "";

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
    <div className="space-y-4">
      {exercise.cover_image ? (
        <div className="w-full rounded-2xl overflow-hidden border border-border">
          <img src={exercise.cover_image} alt={exercise.name} className="w-full h-auto max-w-full object-contain" />
        </div>
      ) : (
        <ExerciseCoverFallback name={exercise.name} categoryIcon={exercise.category_icon} size="lg" />
      )}

      <div className="flex flex-wrap gap-1.5">
        {exercise.level && (
          <Badge className={`text-[10px] ${levelColors[exercise.level] || ""}`}>{exercise.level}</Badge>
        )}
        {exercise.duration && (
          <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="h-2.5 w-2.5" />{exercise.duration}</Badge>
        )}
        {exercise.repetitions && (
          <Badge variant="secondary" className="text-[10px] gap-1"><Repeat className="h-2.5 w-2.5" />{exercise.repetitions}</Badge>
        )}
        {exercise.is_professional && <Badge className="text-[10px] bg-primary/15 text-primary">PRO</Badge>}
        {tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] text-primary border-primary/20">#{tag}</Badge>
        ))}
      </div>

      <div className="space-y-2">
        {exercise.objective && <p className="text-sm font-semibold text-foreground break-words">{exercise.objective}</p>}
        {exercise.description && <p className="text-xs text-muted-foreground break-words">{exercise.description}</p>}
        {exercise.dedication && <p className="text-xs text-primary/80 italic break-words">"{exercise.dedication}"</p>}
      </div>

      <ReadAloudButton
        getText={() => {
          const parts = [exercise.name, exercise.objective].filter(Boolean);
          if (exercise.description) parts.push(exercise.description);
          tutorialSteps.forEach((s: any, i: number) =>
            parts.push(`${t("exerciseDetail.stepLabel", { n: i + 1 })}: ${s.title}. ${s.description}`)
          );
          if (exercise.success_criteria) parts.push(`${t("exerciseDetail.successCriteria")}: ${exercise.success_criteria}`);
          return parts.join(". ");
        }}
        label={t("exerciseDetail.listen")}
      />

      {tutorialSteps.length > 0 && (
        <Section title={t("exerciseDetail.tutorialSteps")} icon={<Play className="h-3.5 w-3.5 text-primary" />} defaultOpen>
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

      {voiceCommands.length > 0 && (
        <Section title={t("exerciseDetail.voiceCommands")} icon={<Mic className="h-3.5 w-3.5 text-primary" />}>
          {voiceCommands.map((vc: any, i: number) => (
            <div key={i} className="rounded-lg bg-primary/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground break-words">🗣️ « {vc.command} »</p>
              <p className="text-[10px] text-muted-foreground break-words"><span className="font-medium">{t("exerciseDetail.tone")} :</span> {vc.tone}</p>
              <p className="text-[10px] text-muted-foreground break-words"><span className="font-medium">{t("exerciseDetail.when")} :</span> {vc.timing}</p>
              {vc.warning && <p className="text-[10px] text-destructive break-words">⚠️ {vc.warning}</p>}
            </div>
          ))}
        </Section>
      )}

      {bodyPositioning && (
        <Section title={t("exerciseDetail.bodyPositioning")} icon={<User className="h-3.5 w-3.5 text-accent-foreground" />}>
          <div className="space-y-2">
            {bodyPositioning.handler_position && (
              <div className="rounded-lg bg-secondary/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground">🧍 {t("exerciseDetail.handlerPosition")}</p>
                <p className="text-[11px] text-muted-foreground break-words">{bodyPositioning.handler_position}</p>
              </div>
            )}
            {bodyPositioning.dog_position && (
              <div className="rounded-lg bg-secondary/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground">🐕 {t("exerciseDetail.dogPosition")}</p>
                <p className="text-[11px] text-muted-foreground break-words">{bodyPositioning.dog_position}</p>
              </div>
            )}
            {bodyPositioning.distance && (
              <div className="rounded-lg bg-secondary/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground">📏 {t("exerciseDetail.distance")}</p>
                <p className="text-[11px] text-muted-foreground break-words">{bodyPositioning.distance}</p>
              </div>
            )}
            {bodyPositioning.leash_management && (
              <div className="rounded-lg bg-secondary/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground">🪢 {t("exerciseDetail.leashManagement")}</p>
                <p className="text-[11px] text-muted-foreground break-words">{bodyPositioning.leash_management}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {troubleshooting.length > 0 && (
        <Section title={t("exerciseDetail.troubleshooting")} icon={<HelpCircle className="h-3.5 w-3.5 text-warning" />}>
          {troubleshooting.map((ts: any, i: number) => (
            <div key={i} className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground break-words">❓ {t("exerciseDetail.ifProblem")} : {ts.problem || ts.situation || "—"}</p>
              <p className="text-[11px] text-foreground break-words">✅ {t("exerciseDetail.thenSolution")} : {ts.solution}</p>
              {ts.prevention && <p className="text-[10px] text-muted-foreground break-words">🛡️ {t("exerciseDetail.prevention")} : {ts.prevention}</p>}
            </div>
          ))}
        </Section>
      )}

      {parsedMistakes.length > 0 && (
        <Section title={t("exerciseDetail.mistakes")} icon={<XCircle className="h-3.5 w-3.5 text-destructive" />}>
          {parsedMistakes.map((m: any, i: number) => (
            <div key={i} className="rounded-lg bg-destructive/5 p-3 space-y-1">
              {typeof m === "string" ? (
                <p className="text-xs text-muted-foreground break-words flex items-start gap-2">
                  <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />{m}
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-foreground break-words">❌ {m.mistake}</p>
                  <p className="text-[10px] text-muted-foreground break-words">→ {t("exerciseDetail.consequence")} : {m.consequence}</p>
                  <p className="text-[10px] text-success break-words">✅ {t("exerciseDetail.correction")} : {m.correction}</p>
                </>
              )}
            </div>
          ))}
        </Section>
      )}

      {validationProtocol && (
        <Section title={t("exerciseDetail.validationProtocol")} icon={<ShieldCheck className="h-3.5 w-3.5 text-primary" />}>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-xs text-foreground break-words">{validationProtocol}</p>
          </div>
        </Section>
      )}

      {exercise.success_criteria && (
        <Section title={t("exerciseDetail.successCriteria")} icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />}>
          <p className="text-xs text-foreground break-words">{exercise.success_criteria}</p>
        </Section>
      )}

      {exercise.stop_criteria && (
        <Section title={t("exerciseDetail.stopCriteria")} icon={<StopCircle className="h-3.5 w-3.5 text-destructive" />}>
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <p className="text-xs text-foreground break-words">🛑 {exercise.stop_criteria}</p>
          </div>
        </Section>
      )}

      {(precautions.length > 0 || contraindications.length > 0 || exercise.vigilance) && (
        <Section title={t("exerciseDetail.vigilance")} icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />}>
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

      {adaptations.length > 0 && (
        <Section title={t("exerciseDetail.adaptations")} icon={<Heart className="h-3.5 w-3.5 text-primary" />}>
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

      {equipment.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">{t("exerciseDetail.equipment")} :</span>
          {equipment.map((m: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-[10px]">{m}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
