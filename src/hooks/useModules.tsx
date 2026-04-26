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
    queryKey: ["user_modules_active", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      // RPC handles admin bypass server-side: returns ALL modules for admin
      // (minus those explicitly disabled via admin_module_overrides)
      const { data, error } = await supabase.rpc("get_my_active_modules" as any);
      if (error) {
        console.error("[useUserActiveModules] RPC error:", error);
        return [];
      }
      return ((data as any[]) ?? []).map((row) => row.module_slug);
    },
  });
}

// Admin-only: returns the explicit overrides map (slug -> enabled).
// Modules absent from the map are considered enabled by default for admin.
export function useAdminModuleOverrides() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin_module_overrides", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await supabase
        .from("admin_module_overrides" as any)
        .select("module_slug,enabled")
        .eq("admin_user_id", user!.id);
      if (error) return {};
      const map: Record<string, boolean> = {};
      ((data as any[]) ?? []).forEach((row) => {
        map[row.module_slug] = row.enabled;
      });
      return map;
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
