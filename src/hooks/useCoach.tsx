import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Single query to fetch ALL roles for the current user.
 * Every role-check hook below derives from this shared cache.
 */
export function useUserRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return (data ?? []).map((r) => r.role);
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useIsCoach() {
  const { data: roles, ...rest } = useUserRoles();
  return { ...rest, data: roles?.includes("educator") ?? false };
}

export function useIsShelter() {
  const { data: roles, ...rest } = useUserRoles();
  // "shelter" exists in DB but not in the generated app_role enum type
  return { ...rest, data: roles?.includes("shelter" as AppRole) ?? false };
}

export function useIsShelterEmployee() {
  const { data: roles, ...rest } = useUserRoles();
  // "shelter_employee" exists in DB but not in the generated app_role enum type
  return { ...rest, data: roles?.includes("shelter_employee" as AppRole) ?? false };
}

export function useShelterEmployeeInfo() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["shelter-employee-info", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("shelter_employees_safe" as any)
        .select("id, name, role, job_title, email, phone, shelter_user_id, auth_user_id, is_active, created_at, updated_at")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data as unknown as {
        id: string;
        name: string;
        role: string;
        job_title: string | null;
        email: string | null;
        phone: string | null;
        shelter_user_id: string;
        auth_user_id: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      } | null;
    },
    enabled: !!user,
  });
}

export function useClientLinks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-links", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("client_links")
        .select("id, client_user_id, coach_user_id, status, created_at")
        .eq("coach_user_id", user.id)
        .eq("status", "active");
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useCoachClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-clients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: links } = await supabase
        .from("client_links")
        .select("client_user_id, created_at, status")
        .eq("coach_user_id", user.id)
        .eq("status", "active");
      if (!links?.length) return [];

      const clientIds = links.map((l) => l.client_user_id);
      
      const [{ data: profiles }, { data: dogs }, { data: journals }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", clientIds),
        supabase.from("dogs").select("id, name, breed, user_id, photo_url").in("user_id", clientIds),
        supabase.from("journal_entries")
          .select("user_id, created_at, tension_level")
          .in("user_id", clientIds)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      return links.map((link) => {
        const profile = profiles?.find((p) => p.user_id === link.client_user_id);
        const clientDogs = dogs?.filter((d) => d.user_id === link.client_user_id) ?? [];
        const clientJournals = journals?.filter((j) => j.user_id === link.client_user_id) ?? [];
        const lastActivity = clientJournals[0]?.created_at || link.created_at;

        return {
          userId: link.client_user_id,
          displayName: profile?.display_name || "Client",
          avatarUrl: profile?.avatar_url,
          linkedAt: link.created_at,
          status: link.status,
          dogsCount: clientDogs.length,
          dogs: clientDogs,
          lastActivity,
          recentJournals: clientJournals,
        };
      });
    },
    enabled: !!user,
  });
}

export function useCoachDogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-dogs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: links } = await supabase
        .from("client_links")
        .select("client_user_id")
        .eq("coach_user_id", user.id)
        .eq("status", "active");
      if (!links?.length) return [];

      const clientIds = links.map((l) => l.client_user_id);
      const { data: dogs } = await supabase
        .from("dogs")
        .select("id, name, breed, photo_url, user_id, bite_history, muzzle_required, created_at, weight_kg, size, vet_restrictions, physical_limitations, joint_pain, heart_problems, epilepsy, obedience_level, sociability_dogs, sociability_humans, excitement_level, frustration_level, recovery_capacity")
        .in("user_id", clientIds)
        .order("created_at", { ascending: false });

      const dogIds = (dogs ?? []).map((d) => d.id);

      const [{ data: profiles }, { data: journals }, { data: plans }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name").in("user_id", clientIds),
        supabase.from("journal_entries")
          .select("dog_id, tension_level, created_at")
          .in("dog_id", dogIds)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("training_plans")
          .select("id, dog_id, title, is_active")
          .in("dog_id", dogIds),
      ]);

      return (dogs ?? []).map((dog) => {
        const profile = profiles?.find((p) => p.user_id === dog.user_id);
        const dogJournals = journals?.filter((j) => j.dog_id === dog.id) ?? [];
        const activePlan = plans?.find((p) => p.dog_id === dog.id && p.is_active);
        const avgTension = dogJournals.length
          ? dogJournals.reduce((s, j) => s + (j.tension_level ?? 0), 0) / dogJournals.length
          : null;

        return {
          ...dog,
          clientName: profile?.display_name || "Client",
          recentJournals: dogJournals.slice(0, 5),
          activePlan,
          avgTension,
          isSensitive: dog.bite_history || dog.muzzle_required,
        };
      });
    },
    enabled: !!user,
  });
}

export function useCoachNotes(dogId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-notes", user?.id, dogId],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from("coach_notes")
        .select("id, title, content, note_type, priority_level, dog_id, client_user_id, created_at, updated_at")
        .eq("coach_user_id", user.id)
        .order("created_at", { ascending: false });
      if (dogId) q = q.eq("dog_id", dogId);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useProAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-alerts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("professional_alerts")
        .select("id, title, description, severity, alert_type, dog_id, client_user_id, resolved, created_at")
        .eq("coach_user_id", user.id)
        .eq("resolved", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });
}
