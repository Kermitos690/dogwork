import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  userId?: string | null;
  /** Affiche la liste détaillée (chips). Sinon affiche un compteur compact. */
  detailed?: boolean;
  /** Limite max de chips affichées (sinon "+ N de plus") */
  maxVisible?: number;
}

interface ModuleRow {
  module_slug: string;
  status: string;
  activated_at: string;
  source: string;
  modules?: { name: string | null } | null;
}

export function ActiveModulesIndicator({ userId, detailed = false, maxVisible = 4 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["active-modules-indicator", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_modules")
        .select("module_slug, status, activated_at, source, modules(name)")
        .eq("user_id", userId!)
        .eq("status", "active")
        .order("activated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ModuleRow[];
    },
  });

  if (isLoading || !data || data.length === 0) return null;

  if (!detailed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <LayoutGrid className="h-3 w-3" />
              {data.length} module{data.length > 1 ? "s" : ""} actif{data.length > 1 ? "s" : ""}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <ul className="text-xs space-y-0.5 max-w-xs">
              {data.slice(0, 8).map((m) => (
                <li key={m.module_slug}>
                  • {m.modules?.name || m.module_slug}
                  <span className="text-muted-foreground ml-1">
                    ({format(new Date(m.activated_at), "dd/MM/yy", { locale: fr })})
                  </span>
                </li>
              ))}
              {data.length > 8 && <li className="text-muted-foreground">+ {data.length - 8} autres…</li>}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const visible = data.slice(0, maxVisible);
  const overflow = data.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {visible.map((m) => (
        <TooltipProvider key={m.module_slug}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1 cursor-help">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                {m.modules?.name || m.module_slug}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Activé le {format(new Date(m.activated_at), "dd MMM yyyy", { locale: fr })}
              <br />
              <span className="text-xs text-muted-foreground">Source : {m.source}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-xs">+ {overflow}</Badge>
      )}
    </div>
  );
}
