import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useShelterEmployeeInfo } from "@/hooks/useCoach";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ACTION_TYPES = [
  { value: "nourrissage", label: "Nourrissage" },
  { value: "promenade", label: "Promenade" },
  { value: "soin", label: "Soin" },
  { value: "nettoyage", label: "Nettoyage" },
  { value: "observation", label: "Observation" },
  { value: "medication", label: "Médication" },
];

export default function EmployeeActivity() {
  const { user } = useAuth();
  const { data: empInfo } = useShelterEmployeeInfo();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState("observation");
  const [description, setDescription] = useState("");
  const [animalId, setAnimalId] = useState<string>("");

  const shelterId = empInfo?.shelter_user_id;

  const { data: animals = [] } = useQuery({
    queryKey: ["employee-animals-list", shelterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals")
        .select("id, name")
        .eq("user_id", shelterId!)
        .neq("status", "adopté")
        .order("name");
      return data || [];
    },
    enabled: !!shelterId,
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["employee-activities", shelterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_activity_log")
        .select("*")
        .eq("shelter_user_id", shelterId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as any[]) || [];
    },
    enabled: !!shelterId,
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error("Description requise");
      const { error } = await (supabase.from("shelter_activity_log") as any).insert({
        shelter_user_id: shelterId,
        employee_id: empInfo?.id,
        employee_name: empInfo?.name || "Employé",
        employee_role: empInfo?.role || "soigneur",
        action_type: actionType,
        description: description.trim(),
        animal_id: animalId && animalId !== "none" ? animalId : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-activities"] });
      setDialogOpen(false);
      setDescription("");
      setAnimalId("");
      toast({ title: "Activité enregistrée ✅" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <EmployeeLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Activités
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Logger
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle activité</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Animal (optionnel)</Label>
                  <Select value={animalId} onValueChange={setAnimalId}>
                    <SelectTrigger><SelectValue placeholder="Aucun animal spécifique" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {animals.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails de l'activité..." />
                </div>
                <Button className="w-full" onClick={() => logMutation.mutate()} disabled={logMutation.isPending}>
                  {logMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="animate-pulse text-muted-foreground text-center py-8">Chargement...</div>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Aucune activité enregistrée
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activities.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary capitalize">{a.action_type}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(a.created_at), "dd MMM HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{a.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Par {a.employee_name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </EmployeeLayout>
  );
}
