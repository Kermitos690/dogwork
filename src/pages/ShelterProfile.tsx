import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Sparkles, Loader2, Globe } from "lucide-react";
import { motion } from "framer-motion";

type ShelterForm = {
  name: string;
  organization_type: string;
  mission: string;
  description: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  email_public: string;
  website: string;
  opening_hours: string;
  since_year: string;
  logo_url: string;
};

const EMPTY: ShelterForm = {
  name: "",
  organization_type: "refuge",
  mission: "",
  description: "",
  address: "",
  postal_code: "",
  city: "",
  country: "",
  phone: "",
  email_public: "",
  website: "",
  opening_hours: "",
  since_year: "",
  logo_url: "",
};

export default function ShelterProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["shelter-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState<ShelterForm>(EMPTY);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        organization_type: profile.organization_type || "refuge",
        mission: (profile as any).mission || "",
        description: profile.description || "",
        address: profile.address || "",
        postal_code: (profile as any).postal_code || "",
        city: (profile as any).city || "",
        country: (profile as any).country || "",
        phone: profile.phone || "",
        email_public: (profile as any).email_public || "",
        website: (profile as any).website || "",
        opening_hours: (profile as any).opening_hours || "",
        since_year: (profile as any).since_year ? String((profile as any).since_year) : "",
        logo_url: (profile as any).logo_url || "",
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        since_year: form.since_year ? parseInt(form.since_year, 10) : null,
      };
      const { error } = await supabase
        .from("shelter_profiles")
        .update(payload)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-profile"] });
      toast({ title: "Profil mis à jour" });
    },
    onError: () =>
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder",
        variant: "destructive",
      }),
  });

  // ---- AI Enrichment ----
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [enrichUrl, setEnrichUrl] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [preview, setPreview] = useState<Partial<ShelterForm> | null>(null);

  async function runEnrich() {
    if (!/^https?:\/\//i.test(enrichUrl)) {
      toast({
        title: "URL invalide",
        description: "Entrez une URL complète commençant par https://",
        variant: "destructive",
      });
      return;
    }
    setEnriching(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-shelter-profile", {
        body: { url: enrichUrl },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Échec de l'enrichissement");
      const ext = data.data || {};
      setPreview({
        name: ext.name,
        organization_type: ext.organization_type,
        mission: ext.mission,
        description: ext.description,
        address: ext.address,
        postal_code: ext.postal_code,
        city: ext.city,
        country: ext.country,
        phone: ext.phone,
        email_public: ext.email_public,
        website: ext.website,
        opening_hours: ext.opening_hours,
        since_year: ext.since_year ? String(ext.since_year) : undefined,
        logo_url: ext.logo_url,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast({ title: "Échec de l'enrichissement", description: msg, variant: "destructive" });
    } finally {
      setEnriching(false);
    }
  }

  function applyPreview() {
    if (!preview) return;
    setForm((prev) => {
      const next = { ...prev };
      (Object.keys(preview) as (keyof ShelterForm)[]).forEach((k) => {
        const v = preview[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          next[k] = String(v);
        }
      });
      return next;
    });
    setPreview(null);
    setEnrichOpen(false);
    toast({
      title: "Champs pré-remplis",
      description: "Vérifiez les informations puis enregistrez.",
    });
  }

  if (isLoading) {
    return (
      <ShelterLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </ShelterLayout>
    );
  }

  return (
    <ShelterLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-8 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Profil de l'organisation
          </h1>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              setEnrichUrl(form.website || "");
              setEnrichOpen(true);
            }}
          >
            <Sparkles className="h-4 w-4" />
            Enrichir avec l'IA
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Renseignez les informations publiques de votre structure. Elles servent à
          présenter votre refuge aux adoptants potentiels.
        </p>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Nom de l'organisation</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.organization_type}
                  onValueChange={(v) => setForm({ ...form, organization_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refuge">Refuge</SelectItem>
                    <SelectItem value="spa">SPA</SelectItem>
                    <SelectItem value="chenil">Chenil</SelectItem>
                    <SelectItem value="association">Association</SelectItem>
                    <SelectItem value="pension">Pension</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Année de création</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="1861"
                  value={form.since_year}
                  onChange={(e) => setForm({ ...form, since_year: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mission (1-2 phrases)</Label>
              <Textarea
                rows={2}
                value={form.mission}
                onChange={(e) => setForm({ ...form, mission: e.target.value })}
                placeholder="Ex: Recueillir, soigner et replacer les animaux abandonnés du canton de Vaud."
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Activités, valeurs, public visé..."
              />
            </div>

            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Code postal</Label>
                <Input
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Ville</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Suisse"
              />
            </div>

            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email public</Label>
              <Input
                type="email"
                value={form.email_public}
                onChange={(e) => setForm({ ...form, email_public: e.target.value })}
                placeholder="contact@..."
              />
            </div>
            <div className="space-y-2">
              <Label>Site web</Label>
              <Input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Horaires d'accueil</Label>
              <Textarea
                rows={2}
                value={form.opening_hours}
                onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                placeholder="Ex: Lun-Ven 14h-17h, Sam-Dim 10h-12h / 14h-17h"
              />
            </div>
            <div className="space-y-2">
              <Label>URL du logo</Label>
              <Input
                type="url"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialog d'enrichissement IA */}
      <Dialog open={enrichOpen} onOpenChange={setEnrichOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Enrichir le profil avec l'IA
            </DialogTitle>
            <DialogDescription>
              L'IA analyse le site web officiel de votre structure et pré-remplit les
              champs. Vous validez avant l'enregistrement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> URL du site
              </Label>
              <Input
                type="url"
                value={enrichUrl}
                onChange={(e) => setEnrichUrl(e.target.value)}
                placeholder="https://svpa.ch"
                disabled={enriching}
              />
            </div>

            {preview && (
              <div className="border rounded-md p-3 bg-muted/30 space-y-1.5 text-xs max-h-64 overflow-y-auto">
                <div className="font-medium text-foreground mb-1">
                  Aperçu des données extraites :
                </div>
                {Object.entries(preview).map(([k, v]) =>
                  v ? (
                    <div key={k} className="flex gap-2">
                      <span className="text-muted-foreground min-w-[110px]">{k}</span>
                      <span className="text-foreground flex-1">{String(v)}</span>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!preview ? (
              <Button onClick={runEnrich} disabled={enriching || !enrichUrl} className="gap-2">
                {enriching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Lancer l'analyse
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Recommencer
                </Button>
                <Button onClick={applyPreview} className="gap-2">
                  <Save className="h-4 w-4" /> Appliquer au formulaire
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ShelterLayout>
  );
}
