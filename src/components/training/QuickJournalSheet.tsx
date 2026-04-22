import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveDog } from "@/hooks/useDogs";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { zoneFromTension, ZONE_CLASSES, ZONE_META, type Zone } from "@/lib/zones";
import { enqueue } from "@/lib/offlineQueue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface QuickJournalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: number;
  /** Optional callback after a successful save. */
  onSaved?: () => void;
}

/**
 * Quick behavioral log capture optimized for outdoor / one-thumb usage.
 * Targets sub-5s entry: 3 sliders, 1 distance, 3 toggles, optional note.
 * Auto-derives zone_state from tension before insert into behavior_logs.
 *
 * Phase 2C — `avoidance` is now a real column on `behavior_logs`.
 *   The Phase 1 sentinel string in `recovery_after_trigger` has been
 *   migrated and is no longer written.
 *
 * Phase 3 — offline-first: when offline, the entry is queued locally and
 *   replayed on reconnect. The user gets immediate confirmation either way.
 */
export function QuickJournalSheet({
  open,
  onOpenChange,
  dayId,
  onSaved,
}: QuickJournalSheetProps) {
  const { user } = useAuth();
  const activeDog = useActiveDog();
  const qc = useQueryClient();
  const online = useOnlineStatus();

  const [tension, setTension] = useState(2);
  const [dogReact, setDogReact] = useState(1);
  const [humanReact, setHumanReact] = useState(1);
  const [distance, setDistance] = useState(20);
  const [barking, setBarking] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [avoidance, setAvoidance] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const zone: Zone = zoneFromTension(tension) ?? "green";
  const meta = ZONE_META[zone];

  const reset = () => {
    setTension(2);
    setDogReact(1);
    setHumanReact(1);
    setDistance(20);
    setBarking(false);
    setJumping(false);
    setAvoidance(false);
    setNote("");
  };

  const handleSave = async () => {
    if (!user || !activeDog) {
      toast({
        title: "Aucun chien actif",
        description: "Sélectionnez un chien pour enregistrer le journal.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);

    const payload = {
      user_id: user.id,
      dog_id: activeDog.id,
      day_id: dayId,
      tension_level: tension,
      dog_reaction_level: dogReact,
      human_reaction_level: humanReact,
      comfort_distance_meters: distance,
      barking,
      jump_on_human: jumping,
      // Phase 2C: dedicated boolean column. The temporary
      // `recovery_after_trigger='avoidance'` workaround is gone.
      avoidance,
      comments: note || null,
      zone_state: zone,
    };

    try {
      if (!online) {
        // Skip the network entirely when we already know we're offline.
        enqueue({ kind: "insert", table: "behavior_logs", payload });
        toast({
          title: "Journal mis en file d'attente",
          description: `Hors-ligne — synchronisation automatique au retour du réseau.`,
        });
      } else {
        const { error } = await supabase.from("behavior_logs").insert(payload);
        if (error) {
          // Network-class failure → queue + tell the user we'll retry.
          const msg = String(error.message || "");
          const looksOffline =
            msg.includes("Failed to fetch") ||
            msg.includes("NetworkError") ||
            msg.includes("network error");
          if (looksOffline) {
            enqueue({ kind: "insert", table: "behavior_logs", payload });
            toast({
              title: "Journal mis en file d'attente",
              description: `Réseau instable — synchronisation au retour.`,
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "Journal enregistré",
            description: `Zone ${meta.short.toLowerCase()} — ${meta.description}`,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["day_zones", activeDog.id, dayId] });
      qc.invalidateQueries({ queryKey: ["behavior_logs"] });
      qc.invalidateQueries({ queryKey: ["stats_behavior"] });

      reset();
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error("QuickJournal save error:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le journal.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88vh] sm:h-[80vh] overflow-y-auto rounded-t-3xl p-0 flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-left text-lg">Journal rapide</SheetTitle>
          <SheetDescription className="text-left text-xs">
            Comment était {activeDog?.name ?? "votre chien"} pendant cette séance ?
          </SheetDescription>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-xs font-medium ${ZONE_CLASSES[zone]}`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </div>
            {!online && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                <WifiOff className="h-3 w-3" />
                Hors-ligne — sera synchronisé
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 px-5 py-4 space-y-5">
          <SliderRow
            label="Tension générale"
            value={tension}
            onChange={setTension}
            min={1}
            max={5}
            hint={`${tension}/5`}
          />
          <SliderRow
            label="Réaction face aux chiens"
            value={dogReact}
            onChange={setDogReact}
            min={1}
            max={5}
            hint={`${dogReact}/5`}
          />
          <SliderRow
            label="Réaction face aux humains"
            value={humanReact}
            onChange={setHumanReact}
            min={1}
            max={5}
            hint={`${humanReact}/5`}
          />
          <SliderRow
            label="Distance de confort"
            value={distance}
            onChange={setDistance}
            min={1}
            max={100}
            step={1}
            hint={`${distance} m`}
          />

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Comportements observés
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <ToggleChip label="Aboiements" active={barking} onClick={() => setBarking((v) => !v)} />
              <ToggleChip label="Sauts" active={jumping} onClick={() => setJumping((v) => !v)} />
              <ToggleChip
                label="Évitement"
                active={avoidance}
                onClick={() => setAvoidance((v) => !v)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-journal-note" className="text-xs uppercase tracking-wide text-muted-foreground">
              Note (optionnelle)
            </Label>
            <Textarea
              id="quick-journal-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Un mot sur le contexte, le déclencheur, la météo…"
              className="min-h-[72px] resize-none"
              maxLength={400}
            />
          </div>
        </div>

        <div className="border-t border-border px-5 py-3 bg-muted/20 flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            className="w-full sm:flex-1 h-12"
            onClick={handleSave}
            disabled={saving || !activeDog}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  hint: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-xs font-semibold text-foreground tabular-nums">{hint}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
        className="touch-none"
      />
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}
