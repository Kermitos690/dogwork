import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAllModules, useUserActiveModules } from "@/hooks/useModules";
import { Link } from "react-router-dom";
import { CheckCircle2, Lock } from "lucide-react";

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

export default function Modules() {
  const { data: modules = [], isLoading } = useAllModules();
  const { data: activeSlugs = [] } = useUserActiveModules();

  const grouped = modules.reduce<Record<string, typeof modules>>((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mes modules</h1>
        <p className="text-muted-foreground mt-2">
          Les modules donnent l'accès aux fonctionnalités. Les Crédits DogWork financent les fonctions intelligentes.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Chargement…</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[category] ?? category}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => {
                  const isActive = activeSlugs.includes(m.slug);
                  return (
                    <Card key={m.slug} className={isActive ? "border-primary/40" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{m.name}</CardTitle>
                          {isActive ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Actif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" /> Verrouillé
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs">
                          {m.available_for_roles.join(" · ")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 min-h-[3rem]">{m.description}</p>
                        {!isActive && (
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <Link to="/pricing">Voir les plans</Link>
                          </Button>
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
