import { Badge } from "@/components/ui/badge";
import { getStatusMeta, getRiskMeta } from "@/lib/shelterSpaces";
import { cn } from "@/lib/utils";

export function SpaceStatusBadge({ value, className }: { value?: string | null; className?: string }) {
  const m = getStatusMeta(value);
  return (
    <Badge variant="outline" className={cn("border text-[10px] font-semibold", m.className, className)}>
      {m.label}
    </Badge>
  );
}

export function SpaceRiskBadge({ value, className }: { value?: string | null; className?: string }) {
  const m = getRiskMeta(value);
  if (m.value === "low") return null; // n'affiche pas le risque faible (par défaut)
  return (
    <Badge variant="outline" className={cn("border text-[10px] font-semibold", m.className, className)}>
      Risque · {m.label}
    </Badge>
  );
}
