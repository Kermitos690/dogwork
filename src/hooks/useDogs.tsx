import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Dog = {
  id: string;
  user_id: string;
  name: string;
  photo_url: string | null;
  breed: string | null;
  is_mixed: boolean;
  sex: string | null;
  is_neutered: boolean;
  birth_date: string | null;
  weight_kg: number | null;
  size: string | null;
  activity_level: string | null;
  origin: string | null;
  adoption_date: string | null;
  environment: string | null;
  has_children: boolean;
  has_other_animals: boolean;
  alone_hours_per_day: number | null;
  known_diseases: string | null;
  joint_pain: boolean;
  heart_problems: boolean;
  epilepsy: boolean;
  allergies: string | null;
  overweight: boolean;
  current_treatments: string | null;
  vet_restrictions: string | null;
  physical_limitations: string | null;
  muzzle_required: boolean;
  bite_history: boolean;
  health_notes: string | null;
  obedience_level: number | null;
  sociability_dogs: number | null;
  sociability_humans: number | null;
  excitement_level: number | null;
  frustration_level: number | null;
  recovery_capacity: number | null;
  noise_sensitivity: number | null;
  separation_sensitivity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useDogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dogs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("dogs").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Dog[];
    },
    enabled: !!user,
  });
}

export function useActiveDog() {
  const { data: dogs } = useDogs();
  return dogs?.find((d) => d.is_active) || dogs?.[0] || null;
}

const TEXT_CHECK_FIELDS = ["sex", "size", "activity_level", "origin", "environment"] as const;
const NUMERIC_CHECK_FIELDS = [
  "obedience_level", "sociability_dogs", "sociability_humans",
  "excitement_level", "frustration_level", "recovery_capacity",
  "noise_sensitivity", "separation_sensitivity",
] as const;

function cleanDogData(dog: Partial<Dog>): Partial<Dog> {
  const cleaned = { ...dog };
  for (const key of TEXT_CHECK_FIELDS) {
    if ((cleaned as any)[key] === "") (cleaned as any)[key] = null;
  }
  for (const key of NUMERIC_CHECK_FIELDS) {
    if ((cleaned as any)[key] === 0) (cleaned as any)[key] = null;
  }
  return cleaned;
}

export function useCreateDog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (dog: Partial<Dog>) => {
      const { data, error } = await supabase
        .from("dogs")
        .insert({ ...cleanDogData(dog), user_id: user!.id, name: dog.name || "Mon chien" })
        .select()
        .single();
      if (error) throw error;
      return data as Dog;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dogs"] }),
  });
}

export function useUpdateDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Dog> & { id: string }) => {
      const { data, error } = await supabase.from("dogs").update(cleanDogData(updates)).eq("id", id).select().single();
      if (error) throw error;
      return data as Dog;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dogs"] }),
  });
}

export function useDeleteDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dogs"] }),
  });
}

export function useSetActiveDog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (dogId: string) => {
      // Deactivate all
      await supabase.from("dogs").update({ is_active: false }).eq("user_id", user!.id);
      // Activate selected
      const { error } = await supabase.from("dogs").update({ is_active: true }).eq("id", dogId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dogs"] }),
  });
}
