import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ShelterSpace, ShelterSpaceInsert } from "@/types/shelterSpaces";

export function useShelterSpaces() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["shelter-spaces-full", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shelter_spaces" as any)
        .select("*")
        .eq("shelter_user_id", user!.id)
        .order("name");
      if (error) throw error;
      return ((data as unknown) as ShelterSpace[]) ?? [];
    },
    enabled: !!user,
  });
}

export function useCreateShelterSpace() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ShelterSpaceInsert, "shelter_user_id">) => {
      const payload = {
        ...input,
        shelter_user_id: user!.id,
        created_by: user!.id,
        updated_by: user!.id,
      };
      const { data, error } = await (supabase.from("shelter_spaces" as any) as any)
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as ShelterSpace;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shelter-spaces-full"] });
      qc.invalidateQueries({ queryKey: ["shelter-spaces-grid"] });
      qc.invalidateQueries({ queryKey: ["shelter-spaces-stats"] });
      qc.invalidateQueries({ queryKey: ["shelter-spaces-occupancy"] });
    },
  });
}

export function useUpdateShelterSpace() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ShelterSpace> }) => {
      const { error } = await (supabase.from("shelter_spaces" as any) as any)
        .update({ ...patch, updated_by: user!.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shelter-spaces-full"] });
      qc.invalidateQueries({ queryKey: ["shelter-spaces-grid"] });
    },
  });
}
