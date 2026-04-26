import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useCoachVerified } from "@/hooks/useCoachVerified";

interface Props {
  coachUserId?: string | null;
  size?: "sm" | "md";
  /** Si true, n'affiche rien quand non vérifié. Par défaut true. */
  hideIfNotVerified?: boolean;
}

export function CoachVerifiedBadge({ coachUserId, size = "sm", hideIfNotVerified = true }: Props) {
  const { data, isLoading } = useCoachVerified(coachUserId);
  if (isLoading || !data) return null;
  if (!data.verified && hideIfNotVerified) return null;

  if (!data.verified) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground border-muted">
        <ShieldCheck className="h-3 w-3 opacity-50" />
        Charte en attente
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="gap-1 bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/20">
            <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
            Vérifié charte
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Coach ayant accepté la Charte DogWork et conforme aux règles marketplace.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
