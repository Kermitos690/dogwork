import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAllModules, useAdminModuleOverrides } from "@/hooks/useModules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  "éducation": "Éducation",
  "ia": "IA",
  "suivi": "Suivi",
  "professionnel": "Professionnel",
  "commerce": "Commerce",
  "refuge": "Refuge",
  "adoption": "Adoption",
  "organisation": "Organisation",
  "documents": "Documents",
  "image": "Image",
  "communication": "Communication",
};

export default function AdminModules() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: modules = [], isLoading } = useAllModules();
  const { data: overrides = {} } = useAdminModuleOverrides();

  const grouped = useMemo(() => {
    return modules.reduce<Record<string, typeof modules>>((acc, m) => {
      (acc[m.category] = acc[m.category] || []).push(m);
      return acc;
    }, {});
  }, [modules]);

  async function setModule(slug: string, enabled: boolean) {
    if (!user) return;
    // Default state for admin = enabled. Only persist when user disables it.
    if (enabled) {
      // Re-enable: delete override row
      const { error } = await supabase
        .from("admin_module_overrides" as any)
        .delete()
        .eq("admin_user_id", user.id)
        .eq("module_slug", slug);
      if (error) {
        toast.error("Erreur : " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("admin_module_overrides" as any)
        .upsert({ admin_user_id: user.id, module_slug: slug, enabled: false }, {
          onConflict: "admin_user_id,module_slug",
        } as any);
      if (error) {
        toast.error("Erreur : " + error.message);
        return;
      }
    }
    toast.success(enabled ? "Module activé" : "Module désactivé");
    qc.invalidateQueries({ queryKey: ["admin_module_overrides"] });
    qc.invalidateQueries({ queryKey: ["user_modules_active"] });
  }

  async function resetAll() {
    if (!user) return;
    const { error } = await supabase
      .from("admin_module_overrides" as any)
      .delete()
      .eq("admin_user_id", user.id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success("Tous les modules réactivés");
    qc.invalidateQueries({ queryKey: ["admin_module_overrides"] });
    qc.invalidateQueries({ queryKey: ["user_modules_active"] });
  }

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Retour admin</Link>
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Modules — accès admin</h1>
            </div>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              En tant qu'admin, tous les modules sont actifs par défaut sur votre compte.
              Désactivez-en un temporairement pour tester l'écran « verrouillé » côté utilisateur.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RefreshCcw className="h-4 w-4 mr-2" />Tout réactiver
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Chargement…</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[category] ?? category}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const overrideVal = overrides[m.slug];
                  // default = enabled. Only false if explicit override === false
                  const enabled = overrideVal !== false;
                  return (
                    <Card key={m.slug} className={enabled ? "border-primary/30" : "opacity-70"}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm">{m.name}</CardTitle>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(v) => setModule(m.slug, v)}
                          />
                        </div>
                        <CardDescription className="text-xs">
                          {m.available_for_roles.join(" · ")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                        {!enabled && (
                          <Badge variant="outline" className="mt-2 text-xs">Désactivé (test)</Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
