// DogWork — Permanent module management page (/modules)
// Lets the user see what's included in their plan and toggle add-ons
// at any time. The base plan price is shown when known.

import { useEffect, useState } from "react";
import ModuleSelector from "@/components/ModuleSelector";
import { useUserRoles } from "@/hooks/useCoach";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Layers } from "lucide-react";

const BASE_PLAN_PRICES: Record<string, { label: string; price: number }> = {
  pro: { label: "Pro", price: 9.9 },
  expert: { label: "Expert", price: 19.9 },
  educator: { label: "Éducateur", price: 16.9 },
  shelter: { label: "Refuge", price: 0 },
};

export default function ModulesPage() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useUserRoles();
  const [base, setBase] = useState<{ label: string; price: number } | null>(null);
  const [activeAddons, setActiveAddons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [{ data: subData }, { data: addonRows }] = await Promise.all([
        supabase.functions.invoke("check-subscription").catch(() => ({ data: null })),
        supabase
          .from("user_modules")
          .select("module_slug")
          .eq("user_id", user.id)
          .eq("source", "addon"),
      ]);

      if (!alive) return;
      const tier =
        subData?.tier ??
        subData?.subscription_tier ??
        subData?.product_tier ??
        null;
      if (tier && BASE_PLAN_PRICES[tier as string]) {
        setBase(BASE_PLAN_PRICES[tier as string]);
      }
      setActiveAddons((addonRows ?? []).map((r: { module_slug: string }) => r.module_slug));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (rolesLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userRoles = (roles ?? []) as string[];
  // Default to "owner" if user has no role yet (shouldn't happen but safe)
  const effectiveRoles = userRoles.length ? userRoles : ["owner"];

  return (
    <div className="container max-w-3xl mx-auto pt-16 pb-12 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-orange-600" />
            <CardTitle>Mes modules</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Activez ou désactivez les modules selon vos besoins. Les modifications
            sont appliquées immédiatement à votre abonnement.
          </p>
        </CardHeader>
        <CardContent>
          <ModuleSelector
            roles={effectiveRoles}
            basePriceChf={base?.price ?? 0}
            basePlanLabel={base?.label}
            initialSelection={activeAddons}
            confirmLabel="Mettre à jour mon abonnement"
          />
        </CardContent>
      </Card>
    </div>
  );
}
