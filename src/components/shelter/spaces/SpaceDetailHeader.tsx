import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpaceStatusBadge, SpaceRiskBadge } from "./SpaceBadges";
import { getSpaceTypeLabel, calculateOccupancyRate, SPACE_STATUSES } from "@/lib/shelterSpaces";
import type { ShelterSpace } from "@/types/shelterSpaces";
import { Building2, Layers, MapPin, Users, ArrowLeft, Pencil, QrCode, FileDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { SpaceQRDialog } from "./SpaceQRDialog";

interface Props {
  space: ShelterSpace;
  currentOccupancy?: number;
  onStatusChange?: (status: string) => void;
  onEdit?: () => void;
}

export function SpaceDetailHeader({ space, currentOccupancy = 0, onStatusChange, onEdit }: Props) {
  const max = space.capacity ?? 0;
  const rate = calculateOccupancyRate(currentOccupancy, max);
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <>
    <Card className="overflow-hidden border-border/60">
      {space.main_photo_url && (
        <div className="h-40 sm:h-48 w-full overflow-hidden bg-muted">
          <img src={space.main_photo_url} alt={space.name} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <Link to="/shelter/spaces" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground gap-1">
              <ArrowLeft className="h-3 w-3" /> Espaces
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{space.name}</h1>
            <p className="text-sm text-muted-foreground">{getSpaceTypeLabel(space.space_type)}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex flex-wrap gap-1.5 justify-end">
              <SpaceStatusBadge value={space.status} />
              <SpaceRiskBadge value={space.risk_level} />
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {onEdit && (
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
              )}
              <Button
                size="sm" variant="outline" className="h-7 gap-1.5"
                onClick={() => setQrOpen(true)}
                aria-label="Générer un QR code pour cet espace"
              >
                <QrCode className="h-3.5 w-3.5" /> QR
              </Button>
              <Button
                size="sm" variant="outline" className="h-7 gap-1.5"
                onClick={() => toast.info("Export PDF bientôt disponible.")}
                aria-label="Exporter la fiche en PDF (bientôt disponible)"
              >
                <FileDown className="h-3.5 w-3.5" /> Exporter
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <MetaItem icon={<Building2 className="h-3.5 w-3.5" />} label="Bâtiment" value={space.building} />
          <MetaItem icon={<Layers className="h-3.5 w-3.5" />} label="Étage" value={space.floor} />
          <MetaItem icon={<MapPin className="h-3.5 w-3.5" />} label="Zone" value={space.zone_label ?? space.indoor_outdoor} />
          <MetaItem
            icon={<Users className="h-3.5 w-3.5" />}
            label="Capacité"
            value={max ? `${currentOccupancy}/${max}${space.capacity_recommended ? ` (reco ${space.capacity_recommended})` : ""}` : "—"}
          />
        </div>

        {max > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Occupation</span>
              <span>{rate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${rate >= 100 ? "bg-red-500" : rate >= 80 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, rate)}%` }}
              />
            </div>
          </div>
        )}

        {space.notes && (
          <p className="text-sm text-muted-foreground border-l-2 border-border pl-3 italic">{space.notes}</p>
        )}

        {onStatusChange && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            <span className="text-xs text-muted-foreground">Changer statut :</span>
            <Select value={space.status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 text-xs flex-1 max-w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPACE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
    <SpaceQRDialog space={space} open={qrOpen} onOpenChange={setQrOpen} />
    </>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-2 space-y-0.5">
      <div className="flex items-center gap-1 text-muted-foreground text-[10px] uppercase tracking-wide">
        {icon} {label}
      </div>
      <p className="text-xs font-medium truncate">{value || "—"}</p>
    </div>
  );
}
