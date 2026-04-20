/**
 * Centralized feature gating hook.
 * Separates structural permissions (role) from commercial permissions (plan).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useDogs } from "@/hooks/useDogs";
import { PLANS, tierGrantsFullAccess, type OwnerTier, type PlanFeatures } from "@/lib/plans";

interface FeatureGateResult {
  allowed: boolean;
  reason?: "no_plan" | "limit_reached" | "feature_locked" | "tier_required";
  requiredTier?: OwnerTier;
  currentUsage?: number;
  limit?: number;
}

/** Resolve the effective plan to use for feature lookups. Educator/Shelter map onto Expert. */
function effectivePlan(tier: string) {
  if (tier === "educator" || tier === "shelter" || tier === "expert") return PLANS.expert;
  if (tier === "pro") return PLANS.pro;
  return PLANS.starter;
}

export function useFeatureGate(feature: keyof PlanFeatures): FeatureGateResult {
  const { user } = useAuth();
  const { tier } = useSubscription();

  // Admin/educator (role) bypass
  const { data: isPrivileged } = useQuery({
    queryKey: ["privileged-role", user?.id],
    queryFn: async () => {
      const [{ data: admin }, { data: educator }] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase.rpc("is_educator"),
      ]);
      return admin === true || educator === true;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (isPrivileged) return { allowed: true };

  // Commercial bypass: Expert / Educator / Shelter unlock everything
  if (tierGrantsFullAccess(tier)) return { allowed: true };

  const plan = effectivePlan(tier);
  const value = plan.features[feature];

  // AI features are gated by credits, not by plan tier
  if (feature === "ai_plan" || feature === "ai_chat") {
    return { allowed: true };
  }

  if (typeof value === "boolean") {
    if (value) return { allowed: true };
    const requiredTier = (["pro", "expert"] as OwnerTier[]).find(
      t => !!PLANS[t].features[feature]
    );
    return { allowed: false, reason: "feature_locked", requiredTier };
  }

  return { allowed: true };
}

export function useDogsLimit(): FeatureGateResult & { dogsCount: number } {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { data: dogs } = useDogs();

  const { data: isPrivileged } = useQuery({
    queryKey: ["privileged-role", user?.id],
    queryFn: async () => {
      const [{ data: admin }, { data: educator }] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase.rpc("is_educator"),
      ]);
      return admin === true || educator === true;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const dogsCount = dogs?.length || 0;

  if (isPrivileged || tierGrantsFullAccess(tier)) {
    return { allowed: true, dogsCount, currentUsage: dogsCount, limit: Infinity };
  }

  const limit = effectivePlan(tier).features.dogs_limit;

  if (dogsCount >= limit) {
    const requiredTier = tier === "starter" ? "pro" : "expert";
    return {
      allowed: false,
      reason: "limit_reached",
      requiredTier: requiredTier as OwnerTier,
      currentUsage: dogsCount,
      limit,
      dogsCount,
    };
  }

  return { allowed: true, dogsCount, currentUsage: dogsCount, limit };
}

export function useExerciseAccess(exerciseMinTier: string): FeatureGateResult {
  const { user } = useAuth();
  const { tier } = useSubscription();

  const { data: isPrivileged } = useQuery({
    queryKey: ["privileged-role", user?.id],
    queryFn: async () => {
      const [{ data: admin }, { data: educator }] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase.rpc("is_educator"),
      ]);
      return admin === true || educator === true;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (isPrivileged || tierGrantsFullAccess(tier)) return { allowed: true };

  const allowedTiers = effectivePlan(tier).features.allowed_exercise_tiers;
  if (allowedTiers.includes(exerciseMinTier as OwnerTier)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "tier_required",
    requiredTier: exerciseMinTier as OwnerTier,
  };
}
