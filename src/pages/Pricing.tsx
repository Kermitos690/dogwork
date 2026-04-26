import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePlans, useFeatureCosts } from "@/hooks/useModules";
import { Link } from "react-router-dom";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  educator: "Éducateur",
  shelter: "Refuge",
};

const INTERVAL_LABEL: Record<string, string> = {
  month: "/ mois",
  year: "/ an",
  "90_days": "/ 90 jours",
};

export default function Pricing() {
  const { data: plans = [] } = usePlans();
  const { data: costs = [] } = useFeatureCosts();

  const groupedPlans = (plans as any[]).reduce<Record<string, any[]>>((acc, p: any) => {
    (acc[p.target_role] = acc[p.target_role] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="container max-w-6xl py-8 px-4 space-y-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Tarifs & Crédits DogWork</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Les modules donnent l'accès aux fonctionnalités. Les Crédits DogWork financent les fonctions intelligentes : IA, plans, analyses, rapports, exports.
        </p>
      </header>

      {Object.entries(groupedPlans).map(([role, items]) => (
        <section key={role}>
          <h2 className="text-xl font-semibold mb-4">Plans {ROLE_LABEL[role] ?? role}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {items.map((p: any) => (
              <Card key={p.slug}>
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">
                      {p.price_chf === 0 ? "Gratuit" : `${p.price_chf} CHF`}
                    </span>
                    {p.price_chf > 0 && (
                      <span className="text-muted-foreground"> {INTERVAL_LABEL[p.billing_interval] ?? ""}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <Badge variant="secondary">{p.included_credits} crédits / période</Badge>
                  <Button asChild size="sm" className="w-full">
                    <Link to="/subscription">Voir les détails</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="text-xl font-semibold mb-4">Coût des fonctions intelligentes</h2>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonctionnalité</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead className="text-right">Crédits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((c: any) => (
                  <TableRow key={c.feature_key}>
                    <TableCell className="font-medium">{c.label}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.module_slug}</TableCell>
                    <TableCell className="text-right">{c.credit_cost}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border bg-muted/30 p-6">
        <h3 className="font-semibold mb-2">Marketplace éducateurs</h3>
        <p className="text-sm text-muted-foreground">
          Les ventes générées via DogWork sont soumises à une commission de 15 %. Les clients conseillés ou invités par l'éducateur via un code ou un lien dédié bénéficient d'un taux réduit de 8 %. Toute prestation publiée ou réservée via DogWork doit être payée via la plateforme.
        </p>
        <p className="text-sm text-muted-foreground mt-2 font-medium">Confiance oui. Complaisance non.</p>
      </section>
    </div>
  );
}
