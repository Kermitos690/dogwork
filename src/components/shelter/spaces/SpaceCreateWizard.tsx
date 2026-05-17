import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useCreateShelterSpace } from "@/hooks/useShelterSpaces";
import {
  SPACE_TYPES, SPACE_STATUSES, RISK_LEVELS, INDOOR_OUTDOOR, LEVELS,
  SPACE_FEATURE_KEYS, COMPATIBILITY_KEYS, RESTRICTION_KEYS,
  getSpaceTypeLabel,
} from "@/lib/shelterSpaces";
import {
  Building2, Layers, Sparkles, PawPrint, Gauge, ListChecks,
  ChevronLeft, ChevronRight, Check, Shield,
} from "lucide-react";

const STEPS = [
  { id: "identity", label: "Identité", icon: Building2 },
  { id: "type", label: "Type & zone", icon: Layers },
  { id: "features", label: "Caractéristiques", icon: Sparkles },
  { id: "compat", label: "Compatibilité", icon: PawPrint },
  { id: "capacity", label: "Capacité & statut", icon: Gauge },
  { id: "review", label: "Résumé", icon: ListChecks },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface FormState {
  name: string;
  description: string;
  building: string;
  floor: string;
  zone_label: string;
  space_type: string;
  indoor_outdoor: string;
  noise_level: string;
  stimulation_level: string;
  isolation_level: string;
  supervision_level: string;
  surface_m2: string;
  capacity: string;
  capacity_recommended: string;
  status: string;
  risk_level: string;
  is_reservable: boolean;
  requires_staff_validation: boolean;
  is_public_for_adopters: boolean;
  features: Record<string, boolean>;
  compatibility_rules: Record<string, boolean>;
  restrictions: Record<string, boolean>;
  notes: string;
}

const initial: FormState = {
  name: "",
  description: "",
  building: "",
  floor: "",
  zone_label: "",
  space_type: "box",
  indoor_outdoor: "indoor",
  noise_level: "low",
  stimulation_level: "low",
  isolation_level: "low",
  supervision_level: "medium",
  surface_m2: "",
  capacity: "1",
  capacity_recommended: "",
  status: "available",
  risk_level: "low",
  is_reservable: true,
  requires_staff_validation: false,
  is_public_for_adopters: false,
  features: {},
  compatibility_rules: {},
  restrictions: {},
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function SpaceCreateWizard({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const create = useCreateShelterSpace();
  const [form, setForm] = useState<FormState>(initial);
  const [stepIndex, setStepIndex] = useState(0);

  const reset = () => { setForm(initial); setStepIndex(0); };
  const step = STEPS[stepIndex];

  const canNext = useMemo(() => {
    if (step.id === "identity") return form.name.trim().length > 0;
    if (step.id === "capacity") {
      const cap = parseInt(form.capacity, 10);
      const rec = form.capacity_recommended ? parseInt(form.capacity_recommended, 10) : null;
      if (Number.isNaN(cap) || cap < 1) return false;
      if (rec !== null && (Number.isNaN(rec) || rec > cap)) return false;
      return true;
    }
    return true;
  }, [step.id, form]);

  const submit = async () => {
    try {
      const cap = parseInt(form.capacity, 10) || 1;
      const rec = form.capacity_recommended ? parseInt(form.capacity_recommended, 10) : null;
      const surface = form.surface_m2 ? parseFloat(form.surface_m2) : null;
      await create.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || null,
        building: form.building.trim() || null,
        floor: form.floor.trim() || null,
        zone_label: form.zone_label.trim() || null,
        space_type: form.space_type,
        indoor_outdoor: form.indoor_outdoor as any,
        noise_level: form.noise_level,
        stimulation_level: form.stimulation_level,
        isolation_level: form.isolation_level,
        supervision_level: form.supervision_level,
        surface_m2: surface,
        capacity: cap,
        capacity_recommended: rec,
        status: form.status as any,
        risk_level: form.risk_level as any,
        is_reservable: form.is_reservable,
        requires_staff_validation: form.requires_staff_validation,
        is_public_for_adopters: form.is_public_for_adopters,
        features: form.features,
        compatibility_rules: form.compatibility_rules,
        restrictions: form.restrictions,
        notes: form.notes.trim() || null,
      });
      toast({ title: "Espace créé ✅", description: `« ${form.name} » a été ajouté à votre refuge.` });
      onOpenChange(false);
      reset();
      onCreated?.();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message ?? "Impossible de créer l'espace", variant: "destructive" });
    }
  };

  const toggleKey = (group: "features" | "compatibility_rules" | "restrictions", key: string) => {
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: !f[group][key] } }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Nouvel espace refuge
          </DialogTitle>
          <DialogDescription className="text-xs">
            Décrivez votre espace en quelques étapes guidées.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => i <= stepIndex && setStepIndex(i)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                      active ? "bg-primary text-primary-foreground shadow-sm"
                        : done ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className="h-px w-3 bg-border" />}
                </div>
              );
            })}
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="px-6 py-5 space-y-4"
          >
            {step.id === "identity" && (
              <>
                <Field label="Nom de l'espace *" hint="Ex : Box A12, Parc détente nord, Salle vétérinaire">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Box A12" />
                </Field>
                <Field label="Description">
                  <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Particularités, usages, contexte…" />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Bâtiment"><Input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder="Principal" /></Field>
                  <Field label="Étage"><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="RDC" /></Field>
                  <Field label="Zone"><Input value={form.zone_label} onChange={(e) => setForm({ ...form, zone_label: e.target.value })} placeholder="Aile Nord" /></Field>
                </div>
              </>
            )}

            {step.id === "type" && (
              <>
                <Field label="Type d'espace *">
                  <Select value={form.space_type} onValueChange={(v) => setForm({ ...form, space_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {SPACE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Environnement">
                  <Select value={form.indoor_outdoor} onValueChange={(v) => setForm({ ...form, indoor_outdoor: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INDOOR_OUTDOOR.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <LevelSelect label="Niveau sonore" value={form.noise_level} onChange={(v) => setForm({ ...form, noise_level: v })} />
                  <LevelSelect label="Niveau de stimulation" value={form.stimulation_level} onChange={(v) => setForm({ ...form, stimulation_level: v })} />
                  <LevelSelect label="Niveau d'isolement" value={form.isolation_level} onChange={(v) => setForm({ ...form, isolation_level: v })} />
                  <LevelSelect label="Surveillance requise" value={form.supervision_level} onChange={(v) => setForm({ ...form, supervision_level: v })} />
                </div>
              </>
            )}

            {step.id === "features" && (
              <>
                <p className="text-xs text-muted-foreground">Cochez les caractéristiques présentes dans cet espace.</p>
                <div className="grid grid-cols-2 gap-2">
                  {SPACE_FEATURE_KEYS.map((f) => (
                    <ToggleRow key={f.key} label={f.label} checked={!!form.features[f.key]} onChange={() => toggleKey("features", f.key)} />
                  ))}
                </div>
                <Separator />
                <Field label="Surface approximative (m²)">
                  <Input type="number" min={0} step="0.1" value={form.surface_m2} onChange={(e) => setForm({ ...form, surface_m2: e.target.value })} placeholder="12" />
                </Field>
              </>
            )}

            {step.id === "compat" && (
              <>
                <p className="text-xs font-semibold text-foreground">Profils de chiens accueillis</p>
                <div className="grid grid-cols-2 gap-2">
                  {COMPATIBILITY_KEYS.map((c) => (
                    <ToggleRow key={c.key} label={c.label} checked={!!form.compatibility_rules[c.key]} onChange={() => toggleKey("compatibility_rules", c.key)} />
                  ))}
                </div>
                <Separator />
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-amber-600" /> Restrictions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {RESTRICTION_KEYS.map((r) => (
                    <ToggleRow key={r.key} label={r.label} checked={!!form.restrictions[r.key]} onChange={() => toggleKey("restrictions", r.key)} />
                  ))}
                </div>
              </>
            )}

            {step.id === "capacity" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Capacité maximale *">
                    <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                  </Field>
                  <Field label="Capacité recommandée" hint="≤ capacité maximale">
                    <Input type="number" min={0} value={form.capacity_recommended} onChange={(e) => setForm({ ...form, capacity_recommended: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Statut initial">
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPACE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Niveau de risque">
                    <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Separator />
                <ToggleRow label="Réservable" checked={form.is_reservable} onChange={() => setForm((f) => ({ ...f, is_reservable: !f.is_reservable }))} />
                <ToggleRow label="Validation staff obligatoire" checked={form.requires_staff_validation} onChange={() => setForm((f) => ({ ...f, requires_staff_validation: !f.requires_staff_validation }))} />
                <ToggleRow label="Visible des adoptants" checked={form.is_public_for_adopters} onChange={() => setForm((f) => ({ ...f, is_public_for_adopters: !f.is_public_for_adopters }))} />
                <Field label="Notes staff">
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Consignes, particularités…" />
                </Field>
              </>
            )}

            {step.id === "review" && (
              <ReviewBlock form={form} />
            )}
          </motion.div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 px-6 py-3 border-t border-border bg-card">
          <Button
            variant="ghost" size="sm"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          {stepIndex < STEPS.length - 1 ? (
            <Button size="sm" disabled={!canNext} onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" disabled={create.isPending || !form.name.trim()} onClick={submit}>
              {create.isPending ? "Création…" : "Créer l'espace"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LevelSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-left transition-all ${
        checked ? "border-primary/40 bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted/30"
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onChange} className="pointer-events-none" />
      <span className="flex-1">{label}</span>
    </button>
  );
}

function ReviewBlock({ form }: { form: FormState }) {
  const selectedFeatures = SPACE_FEATURE_KEYS.filter((f) => form.features[f.key]);
  const selectedCompat = COMPATIBILITY_KEYS.filter((c) => form.compatibility_rules[c.key]);
  const selectedRestrictions = RESTRICTION_KEYS.filter((r) => form.restrictions[r.key]);
  return (
    <div className="space-y-3 text-sm">
      <ReviewRow label="Nom" value={form.name || "—"} />
      <ReviewRow label="Type" value={getSpaceTypeLabel(form.space_type)} />
      <ReviewRow label="Localisation" value={[form.building, form.floor, form.zone_label].filter(Boolean).join(" · ") || "—"} />
      <ReviewRow label="Environnement" value={INDOOR_OUTDOOR.find((i) => i.value === form.indoor_outdoor)?.label ?? "—"} />
      <ReviewRow label="Capacité" value={`${form.capacity}${form.capacity_recommended ? ` (recommandée ${form.capacity_recommended})` : ""}`} />
      <ReviewRow label="Statut initial" value={SPACE_STATUSES.find((s) => s.value === form.status)?.label ?? "—"} />
      <ReviewRow label="Risque" value={RISK_LEVELS.find((r) => r.value === form.risk_level)?.label ?? "—"} />
      {selectedFeatures.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground">Caractéristiques</p>
          <div className="flex flex-wrap gap-1">
            {selectedFeatures.map((f) => <Badge key={f.key} variant="secondary" className="text-[10px]">{f.label}</Badge>)}
          </div>
        </div>
      )}
      {selectedCompat.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground">Compatibilité</p>
          <div className="flex flex-wrap gap-1">
            {selectedCompat.map((c) => <Badge key={c.key} variant="secondary" className="text-[10px]">{c.label}</Badge>)}
          </div>
        </div>
      )}
      {selectedRestrictions.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground">Restrictions</p>
          <div className="flex flex-wrap gap-1">
            {selectedRestrictions.map((r) => <Badge key={r.key} variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">{r.label}</Badge>)}
          </div>
        </div>
      )}
      {form.notes && <ReviewRow label="Notes" value={form.notes} />}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-1.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-xs text-foreground text-right max-w-[60%]">{value}</span>
    </div>
  );
}
