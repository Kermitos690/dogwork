import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, GraduationCap, Search, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ShelterCoaches() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch shelter's linked coaches
  const { data: shelterCoaches = [], isLoading } = useQuery({
    queryKey: ["shelter-coaches", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_coaches" as any)
        .select("*")
        .eq("shelter_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];

      const coachIds = (data as any[]).map((sc: any) => sc.coach_user_id);
      const { data: profiles } = await supabase
        .from("coach_profiles")
        .select("*")
        .in("user_id", coachIds);

      return (data as any[]).map((sc: any) => ({
        ...sc,
        coachProfile: (profiles as any[])?.find((p: any) => p.user_id === sc.coach_user_id),
      }));
    },
    enabled: !!user,
  });

  // Fetch available educators (not already linked)
  const { data: availableCoaches = [] } = useQuery({
    queryKey: ["available-coaches", user?.id, searchTerm],
    queryFn: async () => {
      const linkedIds = shelterCoaches.map((sc: any) => sc.coach_user_id);
      
      let query = supabase
        .from("coach_profiles")
        .select("*")
        .order("display_name");

      const { data } = await query;
      return ((data as any[]) || []).filter(
        (cp: any) => !linkedIds.includes(cp.user_id)
      );
    },
    enabled: !!user && addDialogOpen,
  });

  const filteredAvailable = availableCoaches.filter((cp: any) =>
    !searchTerm || (cp.display_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cp.specialty || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const linkCoach = useMutation({
    mutationFn: async (coachUserId: string) => {
      const { error } = await supabase
        .from("shelter_coaches" as any)
        .insert({
          shelter_user_id: user!.id,
          coach_user_id: coachUserId,
          specialty,
          notes,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-coaches"] });
      queryClient.invalidateQueries({ queryKey: ["available-coaches"] });
      toast.success("Éducateur associé avec succès");
      setSpecialty("");
      setNotes("");
      setAddDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unlinkCoach = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shelter_coaches" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-coaches"] });
      toast.success("Éducateur retiré");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <ShelterLayout>
      <div className="p-4 pb-24 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Éducateurs partenaires</h1>
              <p className="text-sm text-muted-foreground">
                Gérez les éducateurs associés à votre refuge pour les évaluations pré-adoption
              </p>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Associer un éducateur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un éducateur..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {filteredAvailable.length === 0 ? (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? "Aucun éducateur trouvé" : "Aucun éducateur disponible"}
                      </p>
                      <div className="border border-dashed border-border rounded-lg p-4 space-y-2">
                        <Mail className="h-5 w-5 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Pour inviter un éducateur externe, contactez l'administrateur avec l'email de l'éducateur.
                        </p>
                        <Input
                          placeholder="Email de l'éducateur à inviter..."
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={!inviteEmail}
                          onClick={() => {
                            toast.info("Demande d'invitation envoyée à l'administrateur");
                            setInviteEmail("");
                          }}
                        >
                          Demander l'invitation
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {filteredAvailable.map((cp: any) => (
                        <Card
                          key={cp.id}
                          className="cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => linkCoach.mutate(cp.user_id)}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {cp.display_name || "Éducateur"}
                              </p>
                              {cp.specialty && (
                                <p className="text-xs text-muted-foreground">{cp.specialty}</p>
                              )}
                            </div>
                            <UserPlus className="h-4 w-4 text-primary" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Chargement...</div>
          ) : shelterCoaches.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-3">
                <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  Aucun éducateur associé à votre refuge
                </p>
                <p className="text-xs text-muted-foreground">
                  Ajoutez des éducateurs partenaires pour les évaluations pré-adoption
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {shelterCoaches.map((sc: any) => (
                <Card key={sc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          <p className="font-semibold text-foreground">
                            {sc.coachProfile?.display_name || "Éducateur"}
                          </p>
                        </div>
                        {sc.coachProfile?.specialty && (
                          <p className="text-xs text-muted-foreground">{sc.coachProfile.specialty}</p>
                        )}
                        {sc.specialty && (
                          <Badge variant="secondary" className="text-xs">{sc.specialty}</Badge>
                        )}
                        {sc.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{sc.notes}</p>
                        )}
                        <Badge
                          variant={sc.status === "active" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {sc.status === "active" ? "Actif" : sc.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => unlinkCoach.mutate(sc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </ShelterLayout>
  );
}
