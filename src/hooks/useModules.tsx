import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ModuleRow {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  available_for_roles: string[];
  sort_order: number;
}

export function useAllModules() {
  return useQuery({
    queryKey: ["modules", "all"],
    queryFn: async (): Promise<ModuleRow[]> => {
      const { data, error } = await supabase
        .from("modules" as any)
        .select("slug,name,description,category,available_for_roles,sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data as any) ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useUserActiveModules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_modules", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("user_modules" as any)
        .select("module_slug,status,expires_at")
        .eq("user_id", user!.id);
      if (error) return [];
      const now = Date.now();
      return ((data as any[]) ?? [])
        .filter((m) => ["active", "trial"].includes(m.status))
        .filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > now)
        .map((m) => m.module_slug);
    },
  });
}

export function useFeatureCosts() {
  return useQuery({
    queryKey: ["feature_credit_costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_credit_costs" as any)
        .select("feature_key,label,credit_cost,module_slug")
        .eq("is_active", true)
        .order("credit_cost");
      if (error) throw error;
      return (data as any) ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans_dogwork"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans" as any)
        .select("slug,name,target_role,price_chf,billing_interval,included_credits,description,sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data as any) ?? [];
    },
    staleTime: 5 * 60_000,
  });
}
