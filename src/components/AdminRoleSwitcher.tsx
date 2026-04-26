import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, ChevronDown, ShieldCheck } from "lucide-react";

/**
 * Admin-only role view switcher.
 * Lets the admin jump into any role's main entry point (owner / coach / shelter / employee)
 * to QA the experience as that role would see it. Admin guards bypass everywhere.
 */
export function AdminRoleSwitcher() {
  const { user } = useAuth();

  const { data: isAdmin } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (!isAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Vue</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Simuler une vue
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard">Vue propriétaire</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/coach">Vue coach</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/shelter">Vue refuge</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/employee">Vue employé refuge</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/admin">← Retour admin</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
