import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, ExternalLink, CheckCircle2, Sparkles, Wrench, AlertTriangle, Lock, MapPin, Building2, Users } from "lucide-react";
import { SpaceStatusBadge, SpaceRiskBadge } from "./SpaceBadges";
import { getSpaceTypeLabel, calculateOccupancyRate } from "@/lib/shelterSpaces";
import { useUpdateShelterSpace } from "@/hooks/useShelterSpaces";
import { useToast } from "@/hooks/use-toast";
import type { ShelterSpace } from "@/types/shelterSpaces";

interface Props {
  space: (ShelterSpace & { animal_name?: string | null; current_occupancy?: number | null }) | null;
  open: boolean;
  onClose: () => void;
}

export function SpaceMapSidePanel({ space, open, onClose }: Props) {
  const update = useUpdateShelterSpace();
  const { toast } = useToast();

  if (!space) return null;

  const occupancy = calculateOccupancyRate(
    space.current_occupancy ?? (space.current_animal_id ? 1 : 0),
    space.capacity
  );

  const setStatus = (status: ShelterSpace["status"]) => {
    update.mutate(
      { id: space.id, patch: { status } },
      {
        onSuccess: () => toast({ title: "Statut mis à jour" }),
        onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
      }
    );
  };

  const content = (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <SpaceStatusBadge value={space.status} />
          <SpaceRiskBadge value={space.risk_level} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{getSpaceTypeLabel(space.space_type)}</p>
        {space.description && (
          <p className="text-sm text-foreground/80 mt-2 leading-snug">{space.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <InfoCell icon={<Users className="h-3.5 w-3.5" />} label="Capacité" value={`${space.capacity ?? "—"}${space.capacity_recommended ? ` (reco ${space.capacity_recommended})` : ""}`} />
        <InfoCell icon={<Users className="h-3.5 w-3.5" />} label="Occupation" value={`${occupancy}%`} />
        <InfoCell icon={<Building2 className="h-3.5 w-3.5" />} label="Bâtiment" value={space.building ?? "—"} />
        <InfoCell icon={<MapPin className="h-3.5 w-3.5" />} label="Étage / zone" value={[space.floor, space.zone_label].filter(Boolean).join(" · ") || "—"} />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Actions rapides</p>
        <div className="grid grid-cols-2 gap-1.5">
          <QuickAction icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Disponible" onClick={() => setStatus("available")} />
          <QuickAction icon={<Sparkles className="h-3.5 w-3.5" />} label="Nettoyage" onClick={() => setStatus("cleaning_required")} />
          <QuickAction icon={<Wrench className="h-3.5 w-3.5" />} label="Maintenance" onClick={() => setStatus("maintenance")} />
          <QuickAction icon={<Lock className="h-3.5 w-3.5" />} label="Fermer" onClick={() => setStatus("closed")} />
          <QuickAction icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Urgence" onClick={() => setStatus("emergency")} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button asChild className="flex-1 gap-1.5" size="sm">
          <Link to={`/shelter/spaces/${space.id}`}>
            <ExternalLink className="h-3.5 w-3.5" /> Ouvrir fiche complète
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: docked side panel */}
      <aside className="hidden lg:block w-full h-full rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between p-3 border-b border-border/60">
          <h3 className="text-sm font-bold truncate">{space.name}</h3>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-3 overflow-y-auto" style={{ maxHeight: "calc(70vh - 56px)" }}>{content}</div>
      </aside>

      {/* Mobile/Tablet: bottom sheet */}
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="lg:hidden max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{space.name}</SheetTitle>
          </SheetHeader>
          <div className="pt-3">{content}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}<span className="text-[10px] uppercase tracking-wide">{label}</span></div>
      <p className="text-xs font-medium text-foreground mt-0.5 truncate">{value}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 justify-start" onClick={onClick}>
      {icon} {label}
    </Button>
  );
}
