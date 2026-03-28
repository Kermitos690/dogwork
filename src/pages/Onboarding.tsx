import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreateDog } from "@/hooks/useDogs";
import { supabase } from "@/integrations/supabase/client";
import { generatePersonalizedPlan, type DogProfile } from "@/lib/planGenerator";
import { BreedCombobox } from "@/components/BreedCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dog, Shield, ChevronRight, ChevronLeft, PartyPopper, Sparkles, Heart,
  Target, Clock, Mail, Lock, User, AlertTriangle, CheckCircle2, Loader2,
  Zap, Brain, PawPrint, Activity, Home, Baby, Users, Weight, Ruler, Calendar,
  Save, Info, Camera, Upload, X, LogOut, Building2, Search
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Dog as DogType } from "@/hooks/useDogs";

// ===== Constants =====
const TOTAL_STEPS = 12;
const STORAGE_KEY = "dogwork_onboarding";
const PROGRESS_STEPS = { first: 2, last: 9 };
const STEP_TIME_MINUTES: Record<number, number> = {
  2: 0.3, 3: 1, 4: 1.5, 5: 1, 6: 2, 7: 1.5, 8: 1, 9: 0.5,
};

const PROBLEM_OPTIONS = [
  { key: "saute_sur_gens", label: "Saute sur les gens", icon: "🦘" },
  { key: "tire_en_laisse", label: "Tire en laisse", icon: "🔗" },
  { key: "aboiements", label: "Aboiements", icon: "🗣️" },
  { key: "reactivite_chiens", label: "Réactivité aux chiens", icon: "🐕" },
  { key: "reactivite_humains", label: "Réactivité aux humains", icon: "👤" },
  { key: "frustration", label: "Frustration", icon: "😤" },
  { key: "anxiete_separation", label: "Anxiété de séparation", icon: "😰" },
  { key: "difficulte_museliere", label: "Difficulté muselière", icon: "🔒" },
  { key: "manque_focus", label: "Manque de focus", icon: "👁️" },
  { key: "ignore_stop", label: "Ignore le stop", icon: "🛑" },
  { key: "ignore_non", label: "Ignore le non", icon: "❌" },
  { key: "protection_ressources", label: "Protection de ressources", icon: "🦴" },
  { key: "destruction", label: "Destruction", icon: "💥" },
  { key: "peur_bruits", label: "Peur des bruits", icon: "🔊" },
  { key: "hyperactivite", label: "Hyperactivité", icon: "⚡" },
  { key: "rappel_faible", label: "Rappel faible", icon: "📢" },
];

const OBJECTIVE_OPTIONS = [
  { key: "marcher_sans_tirer", label: "Marcher sans tirer", icon: "🚶" },
  { key: "ignorer_chiens", label: "Ignorer les chiens", icon: "🐕" },
  { key: "ne_plus_sauter", label: "Ne plus sauter", icon: "🦘" },
  { key: "ecouter_stop", label: "Mieux écouter", icon: "👂" },
  { key: "calme_public", label: "Rester calme en public", icon: "🧘" },
  { key: "gerer_museliere", label: "Accepter la muselière", icon: "🔒" },
  { key: "diminuer_aboiements", label: "Moins d'aboiements", icon: "🤫" },
  { key: "rester_seul", label: "Rester seul", icon: "🏠" },
  { key: "rappel", label: "Revenir au rappel", icon: "📢" },
  { key: "attentif", label: "Plus d'attention", icon: "👁️" },
  { key: "poser_tapis", label: "Se poser sur tapis", icon: "🧶" },
];

const EVAL_QUESTIONS = [
  { key: "responds_to_name", label: "Répond à son nom" },
  { key: "holds_sit", label: "Tient un assis" },
  { key: "holds_down", label: "Tient un couché" },
  { key: "walks_without_pulling", label: "Marche sans tirer" },
  { key: "stays_calm_on_mat", label: "Reste calme sur tapis" },
  { key: "reacts_to_dogs", label: "Réagit aux chiens" },
  { key: "reacts_to_humans", label: "Réagit aux humains" },
  { key: "barks_frequently", label: "Aboie souvent" },
  { key: "jumps_on_people", label: "Saute sur les gens" },
  { key: "tolerates_frustration", label: "Tolère la frustration" },
  { key: "tolerates_solitude", label: "Tolère la solitude" },
];

const GEN_MESSAGES = [
  "Analyse du profil…",
  "Identification des priorités…",
  "Vérification des précautions…",
  "Construction du plan personnalisé…",
  "Préparation des exercices…",
];

// ===== Helpers =====
function saveOnboardingState(data: any) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function loadOnboardingState(): any {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}
function clearOnboardingState() {
  localStorage.removeItem(STORAGE_KEY);
}

// ===== Animation variants =====
const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ===== Sub-components =====
function ChoiceChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-press rounded-2xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
        selected
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/30"
      }`}
    >
      {children}
    </button>
  );
}

function TriChoice({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: "oui", l: "Oui" },
          { v: "parfois", l: "Parfois" },
          { v: "non", l: "Non" },
        ].map((o) => (
          <ChoiceChip key={o.v} selected={value === o.v} onClick={() => onChange(o.v)}>
            {o.l}
          </ChoiceChip>
        ))}
      </div>
    </div>
  );
}

function HintBanner({ icon, text, variant = "info" }: { icon: React.ReactNode; text: string; variant?: "info" | "warning" | "success" }) {
  const colors = {
    info: "bg-primary/5 border-primary/15 text-primary",
    warning: "bg-warning/5 border-warning/20 text-warning",
    success: "bg-success/5 border-success/20 text-success",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2.5 p-3 rounded-xl border ${colors[variant]}`}
    >
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <p className="text-xs font-medium leading-relaxed">{text}</p>
    </motion.div>
  );
}

function ProfilePill({ dogName, securityFlags, filledCount, totalFields }: {
  dogName: string; securityFlags: string[]; filledCount: number; totalFields: number;
}) {
  const percent = Math.round((filledCount / totalFields) * 100);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs shadow-sm">
      <PawPrint className="h-3 w-3 text-primary" />
      <span className="font-medium text-foreground truncate max-w-[100px]">{dogName || "Profil"}</span>
      <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
      {securityFlags.length > 0 && <Shield className="h-3 w-3 text-warning" />}
    </div>
  );
}

// Photo upload component
function PhotoUpload({ photoPreview, onPhotoSelect, onPhotoRemove, uploading }: {
  photoPreview: string | null;
  onPhotoSelect: (file: File) => void;
  onPhotoRemove: () => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPhotoSelect(file);
        }}
      />
      {photoPreview ? (
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-primary/20 shadow-lg">
            <img src={photoPreview} alt="Photo du chien" className="w-full h-full object-cover" />
          </div>
          <button
            type="button"
            onClick={onPhotoRemove}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-28 h-28 rounded-3xl border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-1.5 hover:border-primary/30 transition-colors active:scale-95"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          ) : (
            <>
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">Ajouter photo</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ===== Main Component =====
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, signIn, signUp, signOut, loading: authLoading } = useAuth();
  const createDog = useCreateDog();
  const { toast } = useToast();

  // Global state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dog profile
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [isMixed, setIsMixed] = useState(false);
  const [sex, setSex] = useState("");
  const [isNeutered, setIsNeutered] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [size, setSize] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [origin, setOrigin] = useState("");
  const [adoptionDate, setAdoptionDate] = useState("");
  const [environment, setEnvironment] = useState("");
  const [hasChildren, setHasChildren] = useState(false);
  const [hasOtherAnimals, setHasOtherAnimals] = useState(false);
  const [aloneHours, setAloneHours] = useState("4");

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Health
  const [jointPain, setJointPain] = useState(false);
  const [heartProblems, setHeartProblems] = useState(false);
  const [epilepsy, setEpilepsy] = useState(false);
  const [overweight, setOverweight] = useState(false);
  const [muzzleRequired, setMuzzleRequired] = useState(false);
  const [biteHistory, setBiteHistory] = useState(false);
  const [healthNotes, setHealthNotes] = useState("");

  // Evaluation
  const [evaluation, setEvaluation] = useState<Record<string, string>>({});

  // Problems
  const [selectedProblems, setSelectedProblems] = useState<Record<string, { intensity: number; frequency: string }>>({});

  // Objectives
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [primaryObjective, setPrimaryObjective] = useState("");

  // Rhythm
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [intensity, setIntensity] = useState("standard");

  // Plan generation
  const [genPhase, setGenPhase] = useState(0);
  const [planReady, setPlanReady] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [createdDogId, setCreatedDogId] = useState<string | null>(null);

  // Restore state
  useEffect(() => {
    const saved = loadOnboardingState();
    if (saved) {
      if (saved.step) setStep(saved.step);
      if (saved.dogName) setDogName(saved.dogName);
      if (saved.breed) setBreed(saved.breed);
      if (saved.sex) setSex(saved.sex);
      if (saved.size) setSize(saved.size);
      if (saved.activityLevel) setActivityLevel(saved.activityLevel);
      if (saved.origin) setOrigin(saved.origin);
      if (saved.environment) setEnvironment(saved.environment);
      if (saved.evaluation) setEvaluation(saved.evaluation);
      if (saved.selectedProblems) setSelectedProblems(saved.selectedProblems);
      if (saved.selectedObjectives) setSelectedObjectives(saved.selectedObjectives);
      if (saved.primaryObjective) setPrimaryObjective(saved.primaryObjective);
      if (saved.muzzleRequired) setMuzzleRequired(saved.muzzleRequired);
      if (saved.biteHistory) setBiteHistory(saved.biteHistory);
      if (saved.weightKg) setWeightKg(saved.weightKg);
      if (saved.birthDate) setBirthDate(saved.birthDate);
      if (saved.isMixed) setIsMixed(saved.isMixed);
      if (saved.isNeutered) setIsNeutered(saved.isNeutered);
      if (saved.hasChildren) setHasChildren(saved.hasChildren);
      if (saved.hasOtherAnimals) setHasOtherAnimals(saved.hasOtherAnimals);
      if (saved.jointPain) setJointPain(saved.jointPain);
      if (saved.heartProblems) setHeartProblems(saved.heartProblems);
      if (saved.epilepsy) setEpilepsy(saved.epilepsy);
      if (saved.overweight) setOverweight(saved.overweight);
      if (saved.dailyMinutes) setDailyMinutes(saved.dailyMinutes);
      if (saved.daysPerWeek) setDaysPerWeek(saved.daysPerWeek);
      if (saved.intensity) setIntensity(saved.intensity);
      if (saved.aloneHours) setAloneHours(saved.aloneHours);
      if (saved.healthNotes) setHealthNotes(saved.healthNotes);
      if (saved.adoptionDate) setAdoptionDate(saved.adoptionDate);
    }
  }, []);

  // Auto-save
  useEffect(() => {
    if (step >= 2) {
      saveOnboardingState({
        step, dogName, breed, sex, size, activityLevel, origin, environment,
        evaluation, selectedProblems, selectedObjectives, primaryObjective,
        muzzleRequired, biteHistory, weightKg, birthDate, isMixed, isNeutered,
        hasChildren, hasOtherAnimals, jointPain, heartProblems, epilepsy,
        overweight, dailyMinutes, daysPerWeek, intensity, aloneHours,
        healthNotes, adoptionDate,
      });
    }
  }, [step, dogName, breed, sex, size, activityLevel, origin, environment, evaluation, selectedProblems, selectedObjectives, primaryObjective, muzzleRequired, biteHistory, weightKg, birthDate, isMixed, isNeutered, hasChildren, hasOtherAnimals, jointPain, heartProblems, epilepsy, overweight, dailyMinutes, daysPerWeek, intensity, aloneHours, healthNotes, adoptionDate]);

  // Skip auth if logged in
  useEffect(() => {
    if (user && step <= 1) setStep(2);
  }, [user, step]);

  // === Derived state ===
  const stepsInRange = PROGRESS_STEPS.last - PROGRESS_STEPS.first + 1;
  const currentProgress = step >= PROGRESS_STEPS.first && step <= PROGRESS_STEPS.last
    ? step - PROGRESS_STEPS.first : step > PROGRESS_STEPS.last ? stepsInRange : 0;
  const progressPercent = Math.round((currentProgress / stepsInRange) * 100);

  const timeRemaining = useMemo(() => {
    let mins = 0;
    for (let s = Math.max(step, PROGRESS_STEPS.first); s <= PROGRESS_STEPS.last; s++) {
      mins += STEP_TIME_MINUTES[s] || 1;
    }
    if (mins < 1) return "< 1 min";
    return `~${Math.ceil(mins)} min`;
  }, [step]);

  const profileFields = useMemo(() => {
    const filled: string[] = [];
    const total = ["dogName", "sex", "size", "activityLevel", "environment", "evaluation", "problems", "objectives"];
    if (dogName.trim()) filled.push("dogName");
    if (sex) filled.push("sex");
    if (size) filled.push("size");
    if (activityLevel) filled.push("activityLevel");
    if (environment) filled.push("environment");
    if (Object.keys(evaluation).length >= 5) filled.push("evaluation");
    if (Object.keys(selectedProblems).length > 0) filled.push("problems");
    if (selectedObjectives.length > 0) filled.push("objectives");
    return { filled: filled.length, total: total.length };
  }, [dogName, sex, size, activityLevel, environment, evaluation, selectedProblems, selectedObjectives]);

  const securityFlags = useMemo(() => {
    const flags: string[] = [];
    if (biteHistory) flags.push("Antécédent de morsure");
    if (muzzleRequired) flags.push("Muselière obligatoire");
    if (jointPain || heartProblems || epilepsy) flags.push("Contraintes de santé");
    return flags;
  }, [biteHistory, muzzleRequired, jointPain, heartProblems, epilepsy]);

  const hints = useMemo(() => {
    const h: { text: string; variant: "info" | "warning" | "success" }[] = [];
    if (weightKg && size) {
      const w = Number(weightKg);
      if (size === "petit" && w > 15) h.push({ text: `${w} kg semble élevé pour un petit chien. Vérifiez la taille ou le poids.`, variant: "info" });
      if (size === "grand" && w < 10) h.push({ text: `${w} kg semble faible pour un grand chien. Vérifiez la taille ou le poids.`, variant: "info" });
    }
    if (biteHistory && !muzzleRequired) {
      h.push({ text: "Antécédent de morsure détecté : la muselière est fortement recommandée.", variant: "warning" });
    }
    if (evaluation.reacts_to_dogs === "oui" && !selectedProblems.reactivite_chiens && step >= 7) {
      h.push({ text: "Votre chien réagit aux chiens, mais cette problématique n'est pas cochée.", variant: "info" });
    }
    if (evaluation.jumps_on_people === "oui" && !selectedProblems.saute_sur_gens && step >= 7) {
      h.push({ text: "Votre chien saute sur les gens, mais cette problématique n'est pas cochée.", variant: "info" });
    }
    return h;
  }, [weightKg, size, biteHistory, muzzleRequired, evaluation, selectedProblems, step]);

  const stepSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    if (step === 3 && !dogName.trim()) suggestions.push("Le nom de votre chien est nécessaire pour continuer.");
    if (step === 4 && !size) suggestions.push("Indiquer la taille aide à mieux adapter les exercices.");
    if (step === 6 && Object.keys(evaluation).length < 5) suggestions.push("Plus vous répondez, plus le plan sera précis.");
    if (step === 8 && selectedObjectives.length === 0) suggestions.push("Choisissez au moins un objectif pour générer votre plan.");
    return suggestions;
  }, [step, dogName, size, evaluation, selectedObjectives]);

  // Photo handling
  const handlePhotoSelect = (file: File) => {
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handlePhotoRemove = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const uploadPhoto = async (dogId: string): Promise<string | null> => {
    if (!photoFile || !user) return null;
    setPhotoUploading(true);
    try {
      const { uploadDogPhoto } = await import("@/lib/photoUrl");
      return await uploadDogPhoto(photoFile, user.id, dogId);
    } catch (err) {
      console.error("Photo upload failed:", err);
      return null;
    } finally {
      setPhotoUploading(false);
    }
  };

  // Auth
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError("");
    try {
      if (authMode === "signup") {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        toast({ title: "Inscription réussie", description: "Vérifiez votre email pour confirmer votre compte." });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
      goTo(2);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const goTo = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };
  const next = () => goTo(Math.min(step + 1, TOTAL_STEPS - 1));
  const prev = () => goTo(Math.max(step - 1, step <= 2 ? 2 : 0));

  const saveAndQuit = () => {
    toast({ title: "Progression sauvegardée", description: "Vous pourrez reprendre à tout moment." });
  };

  const toggleProblem = (key: string) => {
    setSelectedProblems((prev) => {
      const copy = { ...prev };
      if (copy[key]) { delete copy[key]; }
      else { copy[key] = { intensity: 3, frequency: "souvent" }; }
      return copy;
    });
  };

  const toggleObjective = (key: string) => {
    setSelectedObjectives((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Generate plan
  const handleGenerate = useCallback(async () => {
    if (!user) return;
    goTo(10);
    setGenPhase(0);

    const interval = setInterval(() => {
      setGenPhase((p) => (p < GEN_MESSAGES.length - 1 ? p + 1 : p));
    }, 800);

    try {
      const dogData: Partial<DogType> = {
        name: dogName || "Mon chien",
        breed, is_mixed: isMixed, sex, is_neutered: isNeutered,
        birth_date: birthDate || null, weight_kg: weightKg ? Number(weightKg) : null,
        size, activity_level: activityLevel, origin, adoption_date: adoptionDate || null,
        environment, has_children: hasChildren, has_other_animals: hasOtherAnimals,
        alone_hours_per_day: Number(aloneHours) || null,
        joint_pain: jointPain, heart_problems: heartProblems, epilepsy,
        overweight, muzzle_required: muzzleRequired, bite_history: biteHistory,
        health_notes: healthNotes,
      };
      const createdDog = await createDog.mutateAsync(dogData);
      setCreatedDogId(createdDog.id);

      // Upload photo if selected
      const photoUrl = await uploadPhoto(createdDog.id);
      if (photoUrl) {
        await supabase.from("dogs").update({ photo_url: photoUrl }).eq("id", createdDog.id);
      }

      const evalPayload: any = { dog_id: createdDog.id, user_id: user.id };
      Object.entries(evaluation).forEach(([k, v]) => { evalPayload[k] = v; });
      await supabase.from("dog_evaluations").insert(evalPayload);

      const problemRows = Object.entries(selectedProblems).map(([k, v]) => ({
        dog_id: createdDog.id, user_id: user.id, problem_key: k,
        intensity: v.intensity, frequency: v.frequency,
      }));
      if (problemRows.length > 0) await supabase.from("dog_problems").insert(problemRows);

      const objRows = selectedObjectives.map((k) => ({
        dog_id: createdDog.id, user_id: user.id, objective_key: k,
        is_priority: k === primaryObjective,
      }));
      if (objRows.length > 0) await supabase.from("dog_objectives").insert(objRows);

      const profile: DogProfile = {
        dog: { ...dogData, id: createdDog.id, user_id: user.id } as DogType,
        problems: problemRows.map((p) => ({ problem_key: p.problem_key, intensity: p.intensity, frequency: p.frequency })),
        objectives: objRows.map((o) => ({ objective_key: o.objective_key, is_priority: o.is_priority })),
        evaluation: evaluation,
      };
      const plan = generatePersonalizedPlan(profile);
      setGeneratedPlan(plan);

      await supabase.from("training_plans").insert({
        dog_id: createdDog.id, user_id: user.id,
        title: plan.summary.slice(0, 100),
        summary: plan.summary,
        axes: plan.axes as any,
        precautions: plan.precautions as any,
        days: plan.days as any,
        frequency: plan.frequency,
        average_duration: plan.averageDuration,
        total_days: plan.totalDays,
        security_level: plan.securityLevel,
        is_active: true,
      });

      clearInterval(interval);
      setGenPhase(GEN_MESSAGES.length - 1);
      await new Promise((r) => setTimeout(r, 600));
      setPlanReady(true);
      goTo(11);
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      goTo(9);
    }
  }, [user, dogName, breed, isMixed, sex, isNeutered, birthDate, weightKg, size, activityLevel, origin, adoptionDate, environment, hasChildren, hasOtherAnimals, aloneHours, jointPain, heartProblems, epilepsy, overweight, muzzleRequired, biteHistory, healthNotes, evaluation, selectedProblems, selectedObjectives, primaryObjective, createDog, toast, photoFile]);

  const finishOnboarding = () => {
    clearOnboardingState();
    navigate("/");
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Floating logout — always visible */}
      {user && (
        <button
          onClick={() => { signOut(); }}
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-card border border-border shadow-lg hover:bg-muted transition-colors"
          title="Se déconnecter"
        >
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </button>
      )}
      {step >= 2 && step <= 9 && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-0 left-0 right-0 z-50 bg-background/90 glass"
        >
          <div className="px-4 pt-3 pb-2 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <button onClick={prev} className="p-1.5 -ml-1.5 rounded-xl hover:bg-muted transition-colors">
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <ProfilePill
                dogName={dogName}
                securityFlags={securityFlags}
                filledCount={profileFields.filled}
                totalFields={profileFields.total}
              />
              <button onClick={saveAndQuit} className="p-1.5 -mr-1.5 rounded-xl hover:bg-muted transition-colors" title="Sauvegarder et quitter">
                <Save className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <Progress value={progressPercent} className="h-1.5 rounded-full" />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">
                Étape {currentProgress + 1} / {stepsInRange}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {timeRemaining} restantes
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex-1 flex items-center justify-center px-5 py-20">
        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 0 — Welcome */}
          {step === 0 && (
            <motion.div
              key="step-0"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="flex flex-col items-center text-center space-y-8">
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center"
                  >
                    <PawPrint className="h-12 w-12 text-primary" />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-accent flex items-center justify-center"
                  >
                    <Sparkles className="h-4 w-4 text-accent-foreground" />
                  </motion.div>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight">
                    Un plan d'éducation vraiment adapté à votre chien.
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Créez son profil, identifiez ses difficultés, et obtenez un plan clair et progressif.
                  </p>
                </div>

                <div className="w-full space-y-3 text-left">
                  {[
                    { icon: Dog, text: "Profil personnalisé" },
                    { icon: Target, text: "Plan progressif adapté" },
                    { icon: Activity, text: "Suivi quotidien simple" },
                  ].map(({ icon: Icon, text }, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Environ 5 minutes</span>
                </div>

                <div className="w-full space-y-3">
                  <Button size="lg" className="w-full h-14 text-base rounded-2xl" onClick={() => goTo(1)}>
                    Commencer <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                  <button
                    onClick={() => { setAuthMode("login"); goTo(1); }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors w-full"
                  >
                    J'ai déjà un compte
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 1 — Auth */}
          {step === 1 && !user && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center"
                  >
                    <PawPrint className="h-8 w-8 text-primary-foreground" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {authMode === "signup" ? "Créer un compte" : "Connexion"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {authMode === "signup" ? "En quelques secondes" : "Retrouvez votre espace"}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === "signup" && (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Votre nom</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Prénom" className="pl-10 h-12 rounded-xl" autoFocus />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre@email.com" required className="pl-10 h-12 rounded-xl" autoFocus={authMode === "login"} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" required minLength={6} className="pl-10 h-12 rounded-xl" />
                    </div>
                  </div>

                  {authError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5"
                    >
                      {authError}
                    </motion.p>
                  )}

                  <Button type="submit" className="w-full h-12 text-base rounded-xl" disabled={submitting}>
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> :
                      authMode === "signup" ? "Créer mon compte" : "Se connecter"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  {authMode === "signup" ? (
                    <>Déjà un compte ? <button onClick={() => setAuthMode("login")} className="text-primary font-medium">Se connecter</button></>
                  ) : (
                    <>Pas de compte ? <button onClick={() => setAuthMode("signup")} className="text-primary font-medium">S'inscrire</button></>
                  )}
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Welcome */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center"
                >
                  <Heart className="h-10 w-10 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Bienvenue{displayName ? `, ${displayName}` : ""} !</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    En quelques étapes, nous allons créer le profil de votre chien pour vous proposer un plan adapté.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-xl px-4 py-2.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Environ 5 minutes — Vous pouvez sauvegarder à tout moment</span>
                </div>
                <Button size="lg" className="w-full h-14 text-base rounded-2xl" onClick={next}>
                  C'est parti <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Dog Identity + Photo */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">Créons le profil de votre chien</h2>
                  <p className="text-sm text-muted-foreground">Commençons par les bases</p>
                </div>

                {/* Photo upload */}
                <PhotoUpload
                  photoPreview={photoPreview}
                  onPhotoSelect={handlePhotoSelect}
                  onPhotoRemove={handlePhotoRemove}
                  uploading={photoUploading}
                />

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nom du chien *</Label>
                    <Input value={dogName} onChange={(e) => setDogName(e.target.value)} placeholder="Ex: Luna, Rex…"
                      className="h-12 rounded-xl text-base" autoFocus />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Race</Label>
                    <BreedCombobox value={breed} onChange={setBreed} placeholder="Rechercher une race…" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                    <span className="text-sm font-medium">Croisé</span>
                    <Switch checked={isMixed} onCheckedChange={setIsMixed} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Sexe</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <ChoiceChip selected={sex === "male"} onClick={() => setSex("male")}>♂ Mâle</ChoiceChip>
                      <ChoiceChip selected={sex === "female"} onClick={() => setSex("female")}>♀ Femelle</ChoiceChip>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                    <span className="text-sm font-medium">Stérilisé(e)</span>
                    <Switch checked={isNeutered} onCheckedChange={setIsNeutered} />
                  </div>
                </div>

                {stepSuggestions.map((s, i) => (
                  <HintBanner key={i} icon={<Info className="h-3.5 w-3.5" />} text={s} />
                ))}

                <Button size="lg" className="w-full h-13 rounded-2xl" onClick={next} disabled={!dogName.trim()}>
                  Continuer <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4 — Age, Size, Context */}
          {step === 4 && (
            <motion.div
              key="step-4"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">Gabarit & contexte</h2>
                  <p className="text-sm text-muted-foreground">Pour adapter le programme</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Date de naissance (approximative)</Label>
                    <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                      className="h-12 rounded-xl" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Poids (kg)</Label>
                      <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="25" className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Taille</Label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {["petit", "moyen", "grand"].map((s) => (
                          <ChoiceChip key={s} selected={size === s} onClick={() => setSize(s)}>
                            {s === "petit" ? "Petit" : s === "moyen" ? "Moyen" : "Grand"}
                          </ChoiceChip>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Niveau d'activité</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v: "faible", l: "Calme" },
                        { v: "moyen", l: "Modéré" },
                        { v: "élevé", l: "Énergique" },
                      ].map((o) => (
                        <ChoiceChip key={o.v} selected={activityLevel === o.v} onClick={() => setActivityLevel(o.v)}>
                          {o.l}
                        </ChoiceChip>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Environnement</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: "appartement", l: "🏢 Appartement" },
                        { v: "maison_jardin", l: "🏡 Maison + jardin" },
                        { v: "rural", l: "🌾 Rural" },
                        { v: "urbain", l: "🏙️ Urbain" },
                      ].map((o) => (
                        <ChoiceChip key={o.v} selected={environment === o.v} onClick={() => setEnvironment(o.v)}>
                          {o.l}
                        </ChoiceChip>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Provenance</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: "elevage", l: "Élevage" },
                        { v: "refuge", l: "Refuge" },
                        { v: "particulier", l: "Particulier" },
                        { v: "autre", l: "Autre" },
                      ].map((o) => (
                        <ChoiceChip key={o.v} selected={origin === o.v} onClick={() => setOrigin(o.v)}>
                          {o.l}
                        </ChoiceChip>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                      <span className="text-sm">Enfants à la maison</span>
                      <Switch checked={hasChildren} onCheckedChange={setHasChildren} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                      <span className="text-sm">Autres animaux</span>
                      <Switch checked={hasOtherAnimals} onCheckedChange={setHasOtherAnimals} />
                    </div>
                  </div>
                </div>

                {hints.filter(h => h.text.includes("taille") || h.text.includes("poids")).map((h, i) => (
                  <HintBanner key={i} icon={<Info className="h-3.5 w-3.5" />} text={h.text} variant={h.variant} />
                ))}

                {stepSuggestions.map((s, i) => (
                  <HintBanner key={`s${i}`} icon={<Info className="h-3.5 w-3.5" />} text={s} />
                ))}

                <Button size="lg" className="w-full h-13 rounded-2xl" onClick={next}>
                  Continuer <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5 — Health */}
          {step === 5 && (
            <motion.div
              key="step-5"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">Santé & sécurité</h2>
                  <p className="text-sm text-muted-foreground">Points importants pour adapter le plan</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Douleurs articulaires", value: jointPain, set: setJointPain, icon: "🦴" },
                    { label: "Problèmes cardiaques", value: heartProblems, set: setHeartProblems, icon: "❤️" },
                    { label: "Épilepsie", value: epilepsy, set: setEpilepsy, icon: "⚡" },
                    { label: "Surpoids", value: overweight, set: setOverweight, icon: "⚖️" },
                  ].map(({ label, value, set, icon }) => (
                    <div key={label} className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border">
                      <div className="flex items-center gap-2.5">
                        <span>{icon}</span>
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <Switch checked={value} onCheckedChange={set} />
                    </div>
                  ))}

                  <div className="pt-2 border-t border-border" />

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-warning/5 border border-warning/20">
                    <div className="flex items-center gap-2.5">
                      <Shield className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium">Muselière obligatoire</span>
                    </div>
                    <Switch checked={muzzleRequired} onCheckedChange={setMuzzleRequired} />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">Antécédent de morsure</span>
                    </div>
                    <Switch checked={biteHistory} onCheckedChange={setBiteHistory} />
                  </div>

                  {(biteHistory || muzzleRequired) && (
                    <HintBanner
                      icon={<Shield className="h-3.5 w-3.5" />}
                      text="Le plan sera adapté avec des mesures de sécurité renforcées. C'est tout à fait normal et prévu."
                      variant="warning"
                    />
                  )}

                  {hints.filter(h => h.text.includes("muselière") || h.text.includes("morsure")).map((h, i) => (
                    <HintBanner key={i} icon={<Info className="h-3.5 w-3.5" />} text={h.text} variant={h.variant} />
                  ))}

                  <div className="space-y-1.5">
                    <Label className="text-sm">Notes de santé (optionnel)</Label>
                    <Input value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)}
                      placeholder="Traitements, restrictions…" className="h-12 rounded-xl" />
                  </div>
                </div>

                <Button size="lg" className="w-full h-13 rounded-2xl" onClick={next}>
                  Continuer <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 6 — Evaluation */}
          {step === 6 && (
            <motion.div
              key="step-6"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">Évaluation comportementale</h2>
                  <p className="text-sm text-muted-foreground">Où en est {dogName || "votre chien"} aujourd'hui ?</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>{Object.keys(evaluation).length} / {EVAL_QUESTIONS.length} répondues</span>
                </div>

                <div className="space-y-4">
                  {EVAL_QUESTIONS.map((q, i) => (
                    <motion.div
                      key={q.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <TriChoice
                        label={q.label}
                        value={evaluation[q.key] || ""}
                        onChange={(v) => setEvaluation((prev) => ({ ...prev, [q.key]: v }))}
                      />
                    </motion.div>
                  ))}
                </div>

                {stepSuggestions.map((s, i) => (
                  <HintBanner key={i} icon={<Info className="h-3.5 w-3.5" />} text={s} />
                ))}

                <Button size="lg" className="w-full h-13 rounded-2xl" onClick={next}>
                  Continuer <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 7 — Problems */}
          {step === 7 && (
            <motion.div
              key="step-7"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">Problématiques rencontrées</h2>
                  <p className="text-sm text-muted-foreground">Sélectionnez celles qui vous concernent</p>
                </div>

                {hints.filter(h => h.text.includes("problématique")).map((h, i) => (
                  <HintBanner key={i} icon={<Info className="h-3.5 w-3.5" />} text={h.text} />
                ))}

                <div className="grid grid-cols-2 gap-2">
                  {PROBLEM_OPTIONS.map((p) => (
                    <motion.button
                      key={p.key}
                      type="button"
                      onClick={() => toggleProblem(p.key)}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedProblems[p.key]
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-xs font-medium leading-tight">{p.label}</span>
                    </motion.button>
                  ))}
                </div>

                {Object.keys(selectedProblems).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 pt-2 border-t border-border"
                  >
                    <p className="text-sm font-medium text-foreground">Intensité</p>
                    {Object.entries(selectedProblems).map(([key, val]) => {
                      const label = PROBLEM_OPTIONS.find((p) => p.key === key)?.label || key;
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className="text-xs font-medium text-primary">{val.intensity}/5</span>
                          </div>
                          <Slider
                            min={1} max={5} step={1} value={[val.intensity]}
                            onValueChange={([v]) => setSelectedProblems((prev) => ({
                              ...prev, [key]: { ...prev[key], intensity: v },
                            }))}
                          />
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                <Button size="lg" className="w-full h-13 rounded-2xl" onClick={next}>
                  Continuer <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 8 — Objectives */}
          {step === 8 && (
            <motion.div
              key="step-8"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">Vos priorités</h2>
                  <p className="text-sm text-muted-foreground">Qu'aimeriez-vous améliorer en premier ?</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {OBJECTIVE_OPTIONS.map((o) => (
                    <motion.button
                      key={o.key}
                      type="button"
                      onClick={() => toggleObjective(o.key)}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedObjectives.includes(o.key)
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg">{o.icon}</span>
                      <span className="text-xs font-medium leading-tight">{o.label}</span>
                    </motion.button>
                  ))}
                </div>

                {selectedObjectives.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2 pt-2 border-t border-border"
                  >
                    <p className="text-sm font-medium">Objectif principal</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedObjectives.map((key) => {
                        const label = OBJECTIVE_OPTIONS.find((o) => o.key === key)?.label || key;
                        return (
                          <ChoiceChip key={key} selected={primaryObjective === key} onClick={() => setPrimaryObjective(key)}>
                            {label}
                          </ChoiceChip>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {stepSuggestions.map((s, i) => (
                  <HintBanner key={i} icon={<Info className="h-3.5 w-3.5" />} text={s} />
                ))}

                <Button size="lg" className="w-full h-13 rounded-2xl" onClick={next}
                  disabled={selectedObjectives.length === 0}>
                  Continuer <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 9 — Rhythm & Summary */}
          {step === 9 && (
            <motion.div
              key="step-9"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md mx-auto"
            >
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">Presque terminé !</h2>
                  <p className="text-sm text-muted-foreground">Votre rythme et résumé du profil</p>
                </div>

                <div className="space-y-4 p-4 rounded-2xl bg-card border border-border">
                  <p className="text-sm font-semibold text-foreground">Votre rythme</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Minutes par jour</span>
                      <span className="font-medium text-primary">{dailyMinutes} min</span>
                    </div>
                    <Slider min={5} max={45} step={5} value={[dailyMinutes]}
                      onValueChange={([v]) => setDailyMinutes(v)} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Jours par semaine</span>
                      <span className="font-medium text-primary">{daysPerWeek}j</span>
                    </div>
                    <Slider min={3} max={7} step={1} value={[daysPerWeek]}
                      onValueChange={([v]) => setDaysPerWeek(v)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: "doux", l: "Doux" },
                      { v: "standard", l: "Standard" },
                      { v: "intensif", l: "Intensif" },
                    ].map((o) => (
                      <ChoiceChip key={o.v} selected={intensity === o.v} onClick={() => setIntensity(o.v)}>
                        {o.l}
                      </ChoiceChip>
                    ))}
                  </div>
                </div>

                {/* Profile Summary */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Résumé du profil</p>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {profileFields.filled}/{profileFields.total} complété
                    </span>
                  </div>

                  {/* Photo preview in summary */}
                  {photoPreview && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden">
                        <img src={photoPreview} alt={dogName} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{dogName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{breed || "Race inconnue"}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5 text-sm">
                    {!photoPreview && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chien</span>
                        <span className="font-medium">{dogName || "—"} {breed ? `(${breed})` : ""}</span>
                      </div>
                    )}
                    {size && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gabarit</span>
                        <span className="font-medium capitalize">{size}{weightKg ? ` · ${weightKg} kg` : ""}</span>
                      </div>
                    )}
                    {activityLevel && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Énergie</span>
                        <span className="font-medium capitalize">{activityLevel === "faible" ? "Calme" : activityLevel === "moyen" ? "Modéré" : "Énergique"}</span>
                      </div>
                    )}
                    {environment && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Environnement</span>
                        <span className="font-medium capitalize">{environment.replace("_", " + ")}</span>
                      </div>
                    )}

                    {securityFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {securityFlags.map((f) => (
                          <span key={f} className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-lg font-medium">
                            ⚠️ {f}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Problématiques</span>
                      <span className="font-medium">{Object.keys(selectedProblems).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Objectifs</span>
                      <span className="font-medium">{selectedObjectives.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Évaluation</span>
                      <span className="font-medium">{Object.keys(evaluation).length}/{EVAL_QUESTIONS.length} réponses</span>
                    </div>
                  </div>

                  <button onClick={() => goTo(3)} className="text-xs text-primary font-medium hover:underline">
                    Modifier le profil
                  </button>
                </div>

                {hints.map((h, i) => (
                  <HintBanner key={i} icon={<Info className="h-3.5 w-3.5" />} text={h.text} variant={h.variant} />
                ))}

                <Button size="lg" className="w-full h-14 text-base rounded-2xl" onClick={handleGenerate}>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Générer mon plan
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 10 — Generating */}
          {step === 10 && (
            <motion.div
              key="step-10"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md mx-auto flex flex-col items-center justify-center text-center"
            >
              <div className="flex flex-col items-center space-y-8">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center"
                >
                  <Brain className="h-10 w-10 text-primary" />
                </motion.div>
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-foreground">Création en cours…</h2>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={genPhase}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="text-sm text-muted-foreground"
                    >
                      {GEN_MESSAGES[genPhase]}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <Progress value={(genPhase + 1) / GEN_MESSAGES.length * 100} className="h-1.5 w-48 rounded-full" />
              </div>
            </motion.div>
          )}

          {/* STEP 11 — Plan Ready */}
          {step === 11 && generatedPlan && (
            <motion.div
              key="step-11"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="w-full max-w-md mx-auto"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-3xl bg-success/10 flex items-center justify-center"
                >
                  <PartyPopper className="h-10 w-10 text-success" />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Votre plan est prêt !</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {generatedPlan.summary}
                  </p>
                </div>

                <div className="w-full space-y-3 text-left">
                  <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Axes prioritaires</p>
                    {generatedPlan.axes.slice(0, 3).map((a: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium">{a.label}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-card border border-border text-center">
                      <p className="text-lg font-bold text-primary">{generatedPlan.totalDays}j</p>
                      <p className="text-xs text-muted-foreground">Durée</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border text-center">
                      <p className="text-lg font-bold text-primary">{generatedPlan.averageDuration}</p>
                      <p className="text-xs text-muted-foreground">Par séance</p>
                    </div>
                  </div>

                  {generatedPlan.securityLevel !== "standard" && (
                    <HintBanner
                      icon={<Shield className="h-3.5 w-3.5" />}
                      text={`Niveau de sécurité : ${generatedPlan.securityLevel}. Le plan intègre des mesures adaptées.`}
                      variant="warning"
                    />
                  )}
                </div>

                <div className="w-full space-y-2 pt-2">
                  <Button size="lg" className="w-full h-14 text-base rounded-2xl" onClick={finishOnboarding}>
                    Commencer aujourd'hui <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                  <Button variant="ghost" className="w-full rounded-xl" onClick={() => { clearOnboardingState(); navigate("/plan"); }}>
                    Voir mon plan détaillé
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
