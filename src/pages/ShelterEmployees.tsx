import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Pencil, Trash2, Phone, Mail, KeyRound } from "lucide-react";
import { motion } from "framer-motion";

const ROLES = [
  { value: "soigneur", label: "Soigneur" },
  { value: "responsable", label: "Responsable" },
  { value: "benevole", label: "Bénévole" },
  { value: "veterinaire", label: "Vétérinaire" },
  { value: "administratif", label: "Administratif" },
  { value: "educateur", label: "Éducateur canin" },
];

interface EmployeeForm {
  name: string;
  role: string;
  job_title: string;
  email: string;
  phone: string;
}

const emptyForm: EmployeeForm = { name: "", role: "soigneur", job_title: "", email: "", phone: "" };

export default function ShelterEmployees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["shelter-employees", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_employees" as any)
        .select("*")
        .eq("shelter_user_id", user!.id)
        .eq("is_active", true)
        .order("name");
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nom requis");
      if (!form.email.trim()) throw new Error("Email requis");

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke("create-shelter-employee", {
        body: {
          name: form.name,
          email: form.email,
          role: form.role,
          job_title: form.job_title,
          phone: form.phone,
          shelter_user_id: user!.id,
        },
      });

      if (error) throw new Error(error.message || "Erreur création employé");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shelter-employees"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({
        title: "Employé créé ✅",
        description: `Code PIN envoyé à ${form.email}. PIN: ${data?.pin || "voir email"}`,
      });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nom requis");
      const { error } = await (supabase.from("shelter_employees" as any) as any)
        .update({ name: form.name, role: form.role, job_title: form.job_title, email: form.email, phone: form.phone })
        .eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-employees"] });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      toast({ title: "Employé mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("shelter_employees" as any) as any)
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelter-employees"] });
      toast({ title: "Employé désactivé" });
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: async (emp: any) => {
      const { data, error } = await supabase.functions.invoke("create-shelter-employee", {
        body: { action: "reset-pin", auth_user_id: emp.auth_user_id, employee_id: emp.id },
      });
      if (error) throw new Error(error.message || "Erreur reset PIN");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shelter-employees"] });
      toast({ title: "PIN réinitialisé ✅", description: `Nouveau PIN : ${data?.pin}. Envoyé par email.` });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const openEdit = (emp: any) => {
    setEditId(emp.id);
    setForm({ name: emp.name, role: emp.role, job_title: emp.job_title || "", email: emp.email || "", phone: emp.phone || "" });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Employés
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={openNew}>
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Modifier l'employé" : "Nouvel employé"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom complet" />
                </div>
                <div className="space-y-2">
                  <Label>Email * {!editId && <span className="text-muted-foreground text-xs">(le code PIN sera envoyé ici)</span>}</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" disabled={!!editId} />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Titre de poste</Label>
                  <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="Ex: Chef soigneur, Stagiaire vétérinaire..." />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" />
                </div>
                {!editId && (
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
                    <KeyRound className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Un code PIN à 6 chiffres sera généré et envoyé par email. L'employé pourra se connecter avec son email et ce code.</span>
                  </div>
                )}
                <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Sauvegarde..." : "Enregistrer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="animate-pulse text-muted-foreground text-center py-8">Chargement...</div>
        ) : employees.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun employé enregistré</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openNew}>
                <Plus className="h-4 w-4" /> Ajouter un employé
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {employees.map((emp: any) => (
              <Card key={emp.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {emp.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {ROLES.find((r) => r.value === emp.role)?.label || emp.role}
                      {emp.job_title && ` — ${emp.job_title}`}
                    </p>
                    <div className="flex gap-3 mt-0.5">
                      {emp.email && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Mail className="h-3 w-3" /> {emp.email}
                        </span>
                      )}
                      {emp.phone && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Phone className="h-3 w-3" /> {emp.phone}
                        </span>
                      )}
                    </div>
                    {emp.auth_user_id && (
                      <span className="text-[10px] text-green-600 flex items-center gap-0.5 mt-0.5">
                        <KeyRound className="h-3 w-3" /> Compte actif
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {emp.auth_user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={resetPinMutation.isPending}
                        onClick={() => resetPinMutation.mutate(emp)}
                        title="Réinitialiser le PIN"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(emp.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </ShelterLayout>
  );
}
