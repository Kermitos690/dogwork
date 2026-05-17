import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SPACE_FEATURE_KEYS, COMPATIBILITY_KEYS, RESTRICTION_KEYS, INDOOR_OUTDOOR, LEVELS,
} from "@/lib/shelterSpaces";
import type { ShelterSpace } from "@/types/shelterSpaces";
import { Eye, EyeOff, Calendar, Ruler, ShieldCheck } from "lucide-react";

export function SpaceOverviewPanel({ space }: { space: ShelterSpace }) {
  const features = space.features || {};
  const compatibility = space.compatibility_rules || {};
  const restrictions = space.restrictions || {};
  const protocols = space.protocols || {};
  const schedule = space.schedule_config || {};
  const indoorLabel = INDOOR_OUTDOOR.find((i) => i.value === space.indoor_outdoor)?.label;
  const levelLabel = (v?: string | null) => LEVELS.find((l) => l.value === v)?.label ?? v ?? "—";

  const activeFeatures = SPACE_FEATURE_KEYS.filter((f) => features[f.key]);
  const activeCompat = COMPATIBILITY_KEYS.filter((c) => compatibility[c.key]);
  const activeRestrictions = RESTRICTION_KEYS.filter((r) => restrictions[r.key]);
  const protocolEntries = Object.entries(protocols).filter(([, v]) => v && String(v).trim());
  const scheduleEntries = Object.entries(schedule).filter(([, v]) => v != null && v !== "");

  return (
    <div className="space-y-3">
      {space.description && (
        <Card><CardContent className="p-3 text-sm text-muted-foreground whitespace-pre-wrap">{space.description}</CardContent></Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <InfoCard icon={<Ruler className="h-3.5 w-3.5" />} label="Surface" value={space.surface_m2 ? `${space.surface_m2} m²` : "—"} />
        <InfoCard icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Type d'environnement" value={indoorLabel || "—"} />
        <InfoCard label="Niveau bruit" value={levelLabel(space.noise_level)} />
        <InfoCard label="Stimulation" value={levelLabel(space.stimulation_level)} />
        <InfoCard label="Isolement" value={levelLabel(space.isolation_level)} />
        <InfoCard label="Surveillance" value={levelLabel(space.supervision_level)} />
      </div>

      <Card>
        <CardContent className="p-3 space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Accès</h3>
          <div className="flex flex-wrap gap-1.5">
            <Flag on={space.is_public_for_adopters} label="Visible adoptants" />
            <Flag on={space.is_reservable} label="Réservable" />
            <Flag on={space.requires_staff_validation} label="Validation staff" />
            <Flag on={space.is_active} label="Actif" />
          </div>
        </CardContent>
      </Card>

      <Block title="Caractéristiques" empty="Aucune caractéristique renseignée.">
        {activeFeatures.map((f) => <Badge key={f.key} variant="secondary" className="text-[10px]">{f.label}</Badge>)}
      </Block>

      <Block title="Compatibilité animaux" empty="Aucune règle de compatibilité.">
        {activeCompat.map((c) => <Badge key={c.key} className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">{c.label}</Badge>)}
      </Block>

      <Block title="Restrictions" empty="Aucune restriction.">
        {activeRestrictions.map((r) => <Badge key={r.key} className="text-[10px] bg-red-500/15 text-red-700 dark:text-red-400 border-0">{r.label}</Badge>)}
      </Block>

      {protocolEntries.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Protocoles</h3>
            <div className="space-y-1.5">
              {protocolEntries.map(([k, v]) => (
                <div key={k} className="text-xs">
                  <p className="font-medium capitalize">{k.replace(/_/g, " ")}</p>
                  <p className="text-muted-foreground">{String(v)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {scheduleEntries.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Horaires
            </h3>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {scheduleEntries.map(([k, v]) => (
                <div key={k} className="rounded border border-border/60 p-1.5">
                  <p className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                  <p className="font-medium">{String(v)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">{icon}{label}</p>
        <p className="text-sm font-medium mt-0.5">{value}</p>
      </CardContent>
    </Card>
  );
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${on ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
      {on ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {label}
    </Badge>
  );
}

function Block({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  const hasContent = arr.filter(Boolean).length > 0;
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{title}</h3>
        {hasContent ? <div className="flex flex-wrap gap-1.5">{children}</div> : <p className="text-xs text-muted-foreground italic">{empty}</p>}
      </CardContent>
    </Card>
  );
}
