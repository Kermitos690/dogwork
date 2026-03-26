import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useIsCoach() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return data?.some((r) => r.role === "educator") ?? false;
    },
    enabled: !!user,
  });
}

export function useIsShelter() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-role-shelter", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return data?.some((r) => r.role === ("shelter" as any)) ?? false;
    },
    enabled: !!user,
  });
}

export function useIsShelterEmployee() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-role-shelter-employee", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return data?.some((r) => r.role === ("shelter_employee" as any)) ?? false;
    },
    enabled: !!user,
  });
}

export function useShelterEmployeeInfo() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["shelter-employee-info", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("shelter_employees" as any)
        .select("*")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data as any;
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
        .select("*")
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
      // Get linked client IDs
      const { data: links } = await supabase
        .from("client_links")
        .select("client_user_id, created_at, status")
        .eq("coach_user_id", user.id)
        .eq("status", "active");
      if (!links?.length) return [];

      const clientIds = links.map((l) => l.client_user_id);
      
      // Get profiles for these clients
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", clientIds);

      // Get dogs for these clients
      const { data: dogs } = await supabase
        .from("dogs")
        .select("*")
        .in("user_id", clientIds);

      // Get journal entries for recent activity
      const { data: journals } = await supabase
        .from("journal_entries")
        .select("user_id, created_at, tension_level")
        .in("user_id", clientIds)
        .order("created_at", { ascending: false })
        .limit(50);

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
        .select("*")
        .in("user_id", clientIds)
        .order("created_at", { ascending: false });

      // Get profiles to attach client names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", clientIds);

      // Get recent journals for each dog
      const dogIds = (dogs ?? []).map((d) => d.id);
      const { data: journals } = await supabase
        .from("journal_entries")
        .select("*")
        .in("dog_id", dogIds)
        .order("created_at", { ascending: false })
        .limit(100);

      // Get training plans
      const { data: plans } = await supabase
        .from("training_plans")
        .select("id, dog_id, title, is_active")
        .in("dog_id", dogIds);

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
        .select("*")
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
        .select("*")
        .eq("coach_user_id", user.id)
        .eq("resolved", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });
}
