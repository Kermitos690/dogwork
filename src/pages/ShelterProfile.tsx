import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save } from "lucide-react";
import { motion } from "framer-motion";

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

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    organization_type: "refuge",
    description: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        address: profile.address || "",
        phone: profile.phone || "",
        organization_type: profile.organization_type || "refuge",
        description: profile.description || "",
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("shelter_profiles")
        .update(form)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-profile"] });
      toast({ title: "Profil mis à jour" });
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" }),
  });

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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Profil du refuge
        </h1>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Nom de l'organisation</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Type d'organisation</Label>
              <Select value={form.organization_type} onValueChange={(v) => setForm({ ...form, organization_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Décrivez votre organisation..."
              />
            </div>

            <Button className="w-full gap-2" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </ShelterLayout>
  );
}
