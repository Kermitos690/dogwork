import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  ShelterSpace,
  SpaceEquipment,
  SpaceAssignment,
  SpaceCleaningLog,
  SpaceMaintenanceLog,
  SpaceIncident,
  SpaceNote,
  SpaceDocument,
} from "@/types/shelterSpaces";

const sb = supabase as any;

function makeChildList<T>(table: string, key: string, spaceId: string | undefined, order = "created_at", asc = false) {
  return useQuery({
    queryKey: [key, spaceId],
    queryFn: async () => {
      const { data, error } = await sb.from(table).select("*").eq("space_id", spaceId!).order(order, { ascending: asc });
      if (error) throw error;
      return (data ?? []) as T[];
    },
    enabled: !!spaceId,
  });
}

export function useShelterSpace(spaceId?: string) {
  return useQuery({
    queryKey: ["shelter-space", spaceId],
    queryFn: async () => {
      const { data, error } = await sb.from("shelter_spaces").select("*").eq("id", spaceId!).maybeSingle();
      if (error) throw error;
      return data as ShelterSpace | null;
    },
    enabled: !!spaceId,
  });
}

export const useSpaceEquipment = (id?: string) => makeChildList<SpaceEquipment>("shelter_space_equipment", "space-equipment", id, "name", true);
export const useSpaceAssignments = (id?: string) => makeChildList<SpaceAssignment>("shelter_space_assignments", "space-assignments", id, "starts_at");
export const useSpaceCleaningLogs = (id?: string) => makeChildList<SpaceCleaningLog>("shelter_space_cleaning_logs", "space-cleaning", id, "cleaned_at");
export const useSpaceMaintenanceLogs = (id?: string) => makeChildList<SpaceMaintenanceLog>("shelter_space_maintenance_logs", "space-maintenance", id);
export const useSpaceIncidents = (id?: string) => makeChildList<SpaceIncident>("shelter_space_incidents", "space-incidents", id, "occurred_at");
export const useSpaceNotes = (id?: string) => makeChildList<SpaceNote>("shelter_space_notes", "space-notes", id);
export const useSpaceDocuments = (id?: string) => makeChildList<SpaceDocument>("shelter_space_documents", "space-documents", id);

function useChildMutate(table: string, invalidateKeys: string[]) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return {
    create: useMutation({
      mutationFn: async (payload: Record<string, any>) => {
        const insertPayload = { ...payload, created_by: user?.id ?? null };
        const { data, error } = await sb.from(table).insert(insertPayload).select("*").single();
        if (error) throw error;
        return data;
      },
      onSuccess: () => invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
        const { error } = await sb.from(table).update(patch).eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await sb.from(table).delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
    }),
  };
}

export const useEquipmentMutations = () => useChildMutate("shelter_space_equipment", ["space-equipment"]);
export const useCleaningMutations = () => useChildMutate("shelter_space_cleaning_logs", ["space-cleaning", "shelter-space"]);
export const useMaintenanceMutations = () => useChildMutate("shelter_space_maintenance_logs", ["space-maintenance"]);
export const useIncidentMutations = () => useChildMutate("shelter_space_incidents", ["space-incidents"]);
export const useNoteMutations = () => useChildMutate("shelter_space_notes", ["space-notes"]);
export const useDocumentMutations = () => useChildMutate("shelter_space_documents", ["space-documents"]);
