import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

interface ReferralCode {
  id: string;
  code: string;
  status: string;
  commission_rate: number;
  created_at: string;
  expires_at: string | null;
}

export default function EducatorReferrals() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("educator_referral_codes" as any)
      .select("*")
      .eq("educator_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setCodes((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const create = async () => {
    if (!user) return;
    setCreating(true);
    const code =
      newCode.trim().toUpperCase() ||
      Math.random().toString(36).slice(2, 10).toUpperCase();
    const { error } = await supabase.from("educator_referral_codes" as any).insert({
      educator_id: user.id,
      code,
      status: "active",
      commission_rate: 0.08,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Ce code existe déjà" : error.message);
      return;
    }
    setNewCode("");
    toast.success("Code créé");
    load();
  };

  const toggle = async (c: ReferralCode) => {
    const { error } = await supabase
      .from("educator_referral_codes" as any)
      .update({ status: c.status === "active" ? "paused" : "active" })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce code définitivement ?")) return;
    const { error } = await supabase.from("educator_referral_codes" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Code supprimé");
      load();
    }
  };

  const copy = (code: string) => {
    const link = `${window.location.origin}/auth?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié");
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Helmet>
        <title>Mes codes parrainage — DogWork</title>
        <meta
          name="description"
          content="Gérer vos codes parrainage et invitations clients DogWork"
        />
      </Helmet>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Codes parrainage</h1>
        <p className="text-muted-foreground mt-2">
          Partagez un code à vos clients. Toute réservation effectuée via ce code applique la
          commission réduite à <strong>8 %</strong> au lieu de 15 % standard.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Créer un code
          </CardTitle>
          <CardDescription>
            Laissez vide pour générer automatiquement, ou choisissez un code personnalisé (8 caractères max).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="MONCODE (optionnel)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 12))}
            maxLength={12}
          />
          <Button onClick={create} disabled={creating}>
            {creating ? "..." : "Créer"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Mes codes ({codes.length})</h2>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun code créé pour l’instant.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {codes.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-lg font-mono font-semibold">{c.code}</code>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>
                      {c.status === "active" ? "Actif" : "En pause"}
                    </Badge>
                    <Badge variant="outline">{(c.commission_rate * 100).toFixed(0)}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Créé le {new Date(c.created_at).toLocaleDateString("fr-CH")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => copy(c.code)} title="Copier le lien">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggle(c)}>
                    {c.status === "active" ? "Pause" : "Réactiver"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
