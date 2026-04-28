// DogWork — Selector for optional add-on modules.
//
// Used both during post-onboarding personalization and from the
// permanent /modules management page. Filters automatically by the
// user's role(s) and shows a live monthly total.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ModuleRow {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  is_addon: boolean;
  pricing_type: string;
  monthly_price_chf: number | null;
  yearly_price_chf: number | null;
  available_for_roles: string[];
  addon_label: string | null;
  tagline: string | null;
  sort_order: number;
}

interface Props {
  /** Active roles for the current user (e.g. ["owner"], ["educator","owner"]) */
  roles: string[];
  /** Optional base subscription monthly price (CHF) shown in the running total. */
  basePriceChf?: number;
  /** Optional plan label ("Pro", "Expert"…) to display in the total card. */
  basePlanLabel?: string;
  /** Called after user confirms; receives the list of slugs to activate. */
  onConfirm?: (selectedSlugs: string[]) => Promise<void> | void;
  /** Initial selection (e.g. modules already active for the user). */
  initialSelection?: string[];
  /** Hide the confirm button (when parent owns the action). */
  hideConfirm?: boolean;
  /** Custom CTA label */
  confirmLabel?: string;
}

export default function ModuleSelector({
  roles,
  basePriceChf = 0,
  basePlanLabel,
  onConfirm,
  initialSelection = [],
  hideConfirm,
  confirmLabel = "Activer ma sélection",
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelection));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(
          "slug,name,description,category,is_addon,pricing_type,monthly_price_chf,yearly_price_chf,available_for_roles,addon_label,tagline,sort_order"
        )
        .eq("is_active", true)
        .order("sort_order");
      if (!alive) return;
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        setModules((data ?? []) as ModuleRow[]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  // Filter modules by role intersection
  const visible = useMemo(() => {
    return modules.filter((m) =>
      m.available_for_roles.some((r) => roles.includes(r))
    );
  }, [modules, roles]);

  const includedModules = visible.filter((m) => !m.is_addon);
  const addonModules = visible.filter((m) => m.is_addon);

  const selectedAddons = useMemo(
    () => addonModules.filter((m) => selected.has(m.slug)),
    [addonModules, selected]
  );

  const addonsTotal = selectedAddons.reduce(
    (sum, m) => sum + Number(m.monthly_price_chf ?? 0),
    0
  );
  const grandTotal = basePriceChf + addonsTotal;

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function handleConfirm() {
    if (!user) {
      toast({ title: "Connectez-vous d'abord", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (onConfirm) {
        await onConfirm(Array.from(selected));
      } else {
        // Default behavior: call subscribe-modules edge function
        const { data, error } = await supabase.functions.invoke("subscribe-modules", {
          body: { selected_slugs: Array.from(selected) },
        });
        if (error) throw error;
        if (data?.checkout_url) {
          window.location.href = data.checkout_url;
          return;
        }
        toast({ title: "Modules mis à jour ✅", description: "Votre sélection est active." });
      }
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible de mettre à jour les modules.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Included modules */}
      {includedModules.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Check className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Inclus dans votre abonnement</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {includedModules.map((m) => (
              <div
                key={m.slug}
                className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{m.name}</p>
                  {m.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {m.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Addons */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-orange-600" />
          <h3 className="text-sm font-semibold">Personnalisez avec des modules</h3>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            Facturé mensuellement
          </Badge>
        </div>

        {addonModules.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            Aucun module supplémentaire disponible pour votre profil pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {addonModules.map((m) => {
              const isOn = selected.has(m.slug);
              return (
                <Card
                  key={m.slug}
                  className={`transition border-2 ${
                    isOn ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20" : "border-border"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Switch checked={isOn} onCheckedChange={() => toggle(m.slug)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-sm leading-tight">
                            {m.addon_label ?? m.name}
                          </p>
                          <p className="text-sm font-bold tabular-nums whitespace-nowrap">
                            +{Number(m.monthly_price_chf ?? 0).toFixed(2)} CHF
                            <span className="text-xs font-normal text-muted-foreground"> /mois</span>
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {m.tagline ?? m.description ?? ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Total */}
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20">
        <CardContent className="p-4 space-y-2 text-sm">
          {basePriceChf > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Abonnement {basePlanLabel ?? "de base"}
              </span>
              <span className="tabular-nums">{basePriceChf.toFixed(2)} CHF / mois</span>
            </div>
          )}
          {selectedAddons.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Modules ({selectedAddons.length})
              </span>
              <span className="tabular-nums">+{addonsTotal.toFixed(2)} CHF / mois</span>
            </div>
          )}
          <div className="pt-2 border-t border-orange-500/20 flex items-center justify-between">
            <span className="font-semibold">Total mensuel</span>
            <span className="text-lg font-extrabold tabular-nums text-orange-700 dark:text-orange-400">
              {grandTotal.toFixed(2)} CHF
            </span>
          </div>
          {selectedAddons.length === 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Vous pouvez activer ou désactiver les modules à tout moment depuis la page Modules.
            </p>
          )}
        </CardContent>
      </Card>

      {!hideConfirm && (
        <Button
          size="lg"
          className="w-full"
          onClick={handleConfirm}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {confirmLabel}
        </Button>
      )}
    </div>
  );
}
