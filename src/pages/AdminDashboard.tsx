import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Users, GraduationCap, BookOpen, DollarSign, Plus, ArrowLeft, Trash2, Check, X, Eye, ChevronDown, Home, Sparkles, Image, Wallet, CreditCard,
  Search, Dog, FileText, MessageSquare, AlertTriangle, Edit2, UserCog, Mail, Rocket, Lock, FileDown, Loader2,
} from "lucide-react";
import { generateConnectionGuidePDF } from "@/lib/generateConnectionGuide";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  owner: { label: "Propriétaire", color: "bg-sky-500/20 text-sky-400", icon: "🐕" },
  educator: { label: "Éducateur", color: "bg-emerald-500/20 text-emerald-400", icon: "🎓" },
  admin: { label: "Admin", color: "bg-rose-500/20 text-rose-400", icon: "🛡️" },
  shelter: { label: "Refuge", color: "bg-amber-500/20 text-amber-400", icon: "🏠" },
  shelter_employee: { label: "Employé refuge", color: "bg-purple-500/20 text-purple-400", icon: "👤" },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newEducatorEmail, setNewEducatorEmail] = useState("");
  const [newEducatorName, setNewEducatorName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newShelterEmail, setNewShelterEmail] = useState("");
  const [newShelterName, setNewShelterName] = useState("");
  const [creatingShelter, setCreatingShelter] = useState(false);
  const [tempPasswordDialog, setTempPasswordDialog] = useState<{ email: string; password: string } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ processed: number; total: number; success: number; failed: number; done: boolean } | null>(null);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState<{ total: number; success: number; failed: number; pending: number; processing: number; done: boolean } | null>(null);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const [{ count: usersCount }, { count: dogsCount }, { count: educatorsCount }, { count: exercisesCount }, { count: coursesCount }, { count: pendingCount }, { count: sheltersCount }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("dogs").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "educator"),
        supabase.from("exercises").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "shelter" as any),
      ]);
      return { users: usersCount || 0, dogs: dogsCount || 0, educators: educatorsCount || 0, exercises: exercisesCount || 0, courses: coursesCount || 0, pendingCourses: pendingCount || 0, shelters: sheltersCount || 0 };
    },
    enabled: isAdmin === true,
  });

  const { data: educators, refetch: refetchEducators } = useQuery({
    queryKey: ["admin_educators"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "educator");
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
      return profiles || [];
    },
    enabled: isAdmin === true,
  });

  const { data: pendingCourses = [], refetch: refetchCourses } = useQuery({
    queryKey: ["admin_pending_courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isAdmin === true,
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ["admin_all_bookings"],
    queryFn: async () => {
      const { data } = await supabase.from("course_bookings").select("*").eq("payment_status", "paid");
      return data || [];
    },
    enabled: isAdmin === true,
  });

  const totalRevenue = allBookings.reduce((s: number, b: any) => s + (b.amount_cents || 0), 0);
  const totalCommission = allBookings.reduce((s: number, b: any) => s + (b.commission_cents || 0), 0);

  const handleCreateEducator = async () => {
    if (!newEducatorEmail) return;
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée");
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: newEducatorEmail, displayName: newEducatorName || newEducatorEmail.split("@")[0], role: "educator" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTempPasswordDialog({ email: newEducatorEmail, password: data.temporaryPassword });
      toast({ title: "Éducateur créé ✅", description: `${newEducatorEmail} a été ajouté.` });
      setNewEducatorEmail(""); setNewEducatorName("");
      refetchEducators();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de créer l'éducateur", variant: "destructive" });
    }
    setCreating(false);
  };

  const handleCreateShelter = async () => {
    if (!newShelterEmail) return;
    setCreatingShelter(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée");
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: newShelterEmail, displayName: newShelterName || newShelterEmail.split("@")[0], role: "shelter" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTempPasswordDialog({ email: newShelterEmail, password: data.temporaryPassword });
      toast({ title: "Refuge créé ✅", description: `${newShelterEmail} a été ajouté.` });
      setNewShelterEmail(""); setNewShelterName("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de créer le refuge", variant: "destructive" });
    }
    setCreatingShelter(false);
  };

  const handleApproval = async (courseId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("courses").update({ approval_status: status }).eq("id", courseId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "Cours approuvé ✅" : "Cours refusé ❌" });
      refetchCourses();
      try {
        await supabase.functions.invoke("send-notification-email", {
          body: { type: status === "approved" ? "course_approved" : "course_rejected", data: { courseId } },
        });
      } catch (e) { console.error("Email notification error:", e); }
    }
  };

  if (adminLoading) return <AppLayout><div className="pt-4 text-center animate-pulse text-muted-foreground">Chargement...</div></AppLayout>;
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="pt-4 text-center space-y-4">
          <Shield className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-foreground font-bold">Accès refusé</p>
          <p className="text-sm text-muted-foreground">Vous n'avez pas les droits administrateur.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Retour</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4 theme-admin">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Administration</h1>
            <p className="text-[10px] text-muted-foreground">Gestion complète de la plateforme</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Users, label: "Utilisateurs", value: stats?.users },
            { icon: GraduationCap, label: "Éducateurs", value: stats?.educators },
            { icon: Home, label: "Refuges", value: stats?.shelters },
            { icon: BookOpen, label: "Cours", value: stats?.courses },
          ].map((s, i) => (
            <Card key={i} className="text-center">
              <CardContent className="p-2.5">
                <s.icon className="h-4 w-4 text-primary mx-auto mb-0.5" />
                <p className="text-lg font-bold text-foreground">{s.value ?? "–"}</p>
                <p className="text-[8px] text-muted-foreground leading-tight">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-4 w-4 text-primary mx-auto mb-0.5" />
              <p className="text-lg font-bold text-foreground">{(totalRevenue / 100).toFixed(0)} CHF</p>
              <p className="text-[9px] text-muted-foreground">CA total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-4 w-4 text-primary mx-auto mb-0.5" />
              <p className="text-lg font-bold text-foreground">{(totalCommission / 100).toFixed(0)} CHF</p>
              <p className="text-[9px] text-muted-foreground">Commission</p>
            </CardContent>
          </Card>
        </div>

        {/* Main admin tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-10">
            <TabsTrigger value="users" className="text-xs gap-1"><Users className="h-3 w-3" /> Utilisateurs</TabsTrigger>
            <TabsTrigger value="courses" className="text-xs gap-1"><BookOpen className="h-3 w-3" /> Cours</TabsTrigger>
            <TabsTrigger value="tools" className="text-xs gap-1"><Sparkles className="h-3 w-3" /> Outils</TabsTrigger>
            <TabsTrigger value="create" className="text-xs gap-1"><Plus className="h-3 w-3" /> Créer</TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-3 mt-3">
            <AdminUsersManager />
          </TabsContent>

          {/* COURSES TAB */}
          <TabsContent value="courses" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" /> À valider ({pendingCourses.filter((c: any) => c.approval_status === "pending").length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingCourses.filter((c: any) => c.approval_status === "pending").length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun cours en attente.</p>
                )}
                {pendingCourses.filter((c: any) => c.approval_status === "pending").map((course: any) => (
                  <div key={course.id} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{course.title}</p>
                      <p className="text-[10px] text-muted-foreground">{(course.price_cents / 100).toFixed(0)} CHF — {course.category} — {course.duration_minutes} min</p>
                      {course.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 gap-1" onClick={() => handleApproval(course.id, "approved")}>
                        <Check className="h-3 w-3" /> Approuver
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => handleApproval(course.id, "rejected")}>
                        <X className="h-3 w-3" /> Refuser
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Collapsible>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Tous les cours ({pendingCourses.length})</CardTitle>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-1.5 pt-0">
                    {pendingCourses.map((course: any) => (
                      <div key={course.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                        <div>
                          <p className="text-sm font-medium text-foreground">{course.title}</p>
                          <p className="text-[10px] text-muted-foreground">{(course.price_cents / 100).toFixed(0)} CHF</p>
                        </div>
                        <Badge className={`text-[9px] border-0 ${course.approval_status === "approved" ? "bg-emerald-500/20 text-emerald-400" : course.approval_status === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-destructive/20 text-destructive"}`}>
                          {course.approval_status === "approved" ? "Approuvé" : course.approval_status === "pending" ? "En attente" : "Refusé"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </TabsContent>

          {/* TOOLS TAB */}
          <TabsContent value="tools" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Enrichir exercices (IA)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Enrichit descriptions, étapes et conseils par lots.</p>
                {enrichProgress && (
                  <div className="space-y-1">
                    <Progress value={(enrichProgress.processed / Math.max(enrichProgress.total, 1)) * 100} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">{enrichProgress.processed}/{enrichProgress.total} — {enrichProgress.success} ✓ — {enrichProgress.failed} ✗{enrichProgress.done && " — Terminé !"}</p>
                  </div>
                )}
                <Button
                  onClick={async () => {
                    setEnriching(true);
                    let totalProcessed = 0, totalSuccess = 0, totalFailed = 0, isDone = false;
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.access_token) { toast({ title: "Erreur", description: "Session expirée", variant: "destructive" }); setEnriching(false); return; }
                    while (!isDone) {
                      let retries = 0, batchSuccess = false;
                      while (retries < 3 && !batchSuccess) {
                        try {
                          const { data, error } = await supabase.functions.invoke("enrich-exercises", { body: { batchSize: 1, offset: 0 }, headers: { Authorization: `Bearer ${session.access_token}` } });
                          if (error) throw error;
                          totalProcessed += data.success || 0; totalSuccess += data.success || 0; totalFailed += data.failed || 0;
                          isDone = data.done || (data.remaining ?? 0) === 0; batchSuccess = true;
                          setEnrichProgress({ processed: totalProcessed, total: totalProcessed + (data.remaining ?? 0), success: totalSuccess, failed: totalFailed, done: isDone });
                          if (!isDone) await new Promise(r => setTimeout(r, 500));
                        } catch (err: any) {
                          retries++;
                          if (retries >= 3) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); isDone = true; }
                          else await new Promise(r => setTimeout(r, 5000));
                        }
                      }
                    }
                    setEnriching(false);
                    if (totalSuccess > 0) toast({ title: "Enrichissement terminé ✨", description: `${totalSuccess} exercices enrichis.` });
                  }}
                  disabled={enriching} className="w-full gap-2" size="sm"
                >
                  <Sparkles className="h-4 w-4" /> {enriching ? "En cours..." : "Lancer l'enrichissement IA"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Image className="h-4 w-4 text-primary" /> Illustrations (IA)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Génère les illustrations manquantes en arrière-plan. Vous pouvez quitter la page.</p>
                {imageProgress && (
                  <div className="space-y-1">
                    <Progress value={((imageProgress.success + imageProgress.failed) / Math.max(imageProgress.total, 1)) * 100} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">
                      {imageProgress.success + imageProgress.failed}/{imageProgress.total} — {imageProgress.success} ✓ — {imageProgress.failed} ✗
                      {imageProgress.done ? " — Terminé !" : ` — ${imageProgress.pending + imageProgress.processing} en attente`}
                    </p>
                  </div>
                )}
                <Button
                  onClick={async () => {
                    setGeneratingImages(true);
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.access_token) { toast({ title: "Erreur", description: "Session expirée", variant: "destructive" }); setGeneratingImages(false); return; }
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-exercise-images", {
                        body: { action: "enqueue" },
                        headers: { Authorization: `Bearer ${session.access_token}` },
                      });
                      if (error) throw error;
                      if (data?.queued === 0) {
                        toast({ title: "✨", description: data.message || "Tous les exercices ont une illustration." });
                        setGeneratingImages(false);
                        return;
                      }
                      toast({ title: "File d'attente créée 🎨", description: `${data.queued} illustrations lancées en arrière-plan.` });
                      // Start polling for status
                      const pollInterval = setInterval(async () => {
                        try {
                          const { data: { session: s } } = await supabase.auth.getSession();
                          if (!s?.access_token) return;
                          const { data: status } = await supabase.functions.invoke("generate-exercise-images", {
                            body: { action: "status" },
                            headers: { Authorization: `Bearer ${s.access_token}` },
                          });
                          if (status) {
                            setImageProgress({
                              total: status.total, success: status.done, failed: status.failed,
                              pending: status.pending, processing: status.processing, done: status.finished,
                            });
                            if (status.finished) {
                              clearInterval(pollInterval);
                              setGeneratingImages(false);
                              toast({ title: "Illustrations terminées 🎨", description: `${status.done} images générées, ${status.failed} erreurs.` });
                            }
                          }
                        } catch { /* ignore polling errors */ }
                      }, 5000);
                    } catch (err: any) {
                      toast({ title: "Erreur", description: err.message || "Impossible de lancer la génération", variant: "destructive" });
                      setGeneratingImages(false);
                    }
                  }}
                  disabled={generatingImages} className="w-full gap-2" size="sm"
                >
                  <Image className="h-4 w-4" /> {generatingImages ? "En cours..." : "Générer illustrations IA"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><UserCog className="h-4 w-4 text-primary" /> Nettoyage comptes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">Supprime les comptes test/doublons et corrige les profils/rôles manquants.</p>
                <Button
                  onClick={async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.access_token) throw new Error("Session expirée");
                      const { data, error } = await supabase.functions.invoke("cleanup-accounts", {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                      });
                      if (error) throw error;
                      if (data?.error) throw new Error(data.error);
                      toast({ title: "Nettoyage terminé ✅", description: `${data.deleted} comptes supprimés. ${data.logs?.length || 0} opérations.` });
                      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
                    } catch (err: any) {
                      toast({ title: "Erreur", description: err.message, variant: "destructive" });
                    }
                  }}
                  variant="outline" size="sm" className="w-full gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Nettoyer comptes test/doublons
                </Button>
              </CardContent>
            </Card>

            <SheltersList />
          </TabsContent>

          {/* CREATE TAB */}
          <TabsContent value="create" className="space-y-3 mt-3">
            <AdminCreateUser onCreated={() => { refetchEducators(); }} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Créer un éducateur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={newEducatorEmail} onChange={e => setNewEducatorEmail(e.target.value)} placeholder="educateur@email.com" /></div>
                <div className="space-y-1"><Label className="text-xs">Nom</Label><Input value={newEducatorName} onChange={e => setNewEducatorName(e.target.value)} placeholder="Nom" /></div>
                <p className="text-[10px] text-muted-foreground">Un mot de passe temporaire sera généré automatiquement. L'utilisateur devra le changer à sa première connexion.</p>
                <Button onClick={handleCreateEducator} disabled={creating || !newEducatorEmail} className="w-full gap-2" size="sm">
                  <GraduationCap className="h-4 w-4" /> {creating ? "Création..." : "Créer l'éducateur"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4" /> Créer un refuge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={newShelterEmail} onChange={e => setNewShelterEmail(e.target.value)} placeholder="refuge@email.com" /></div>
                <div className="space-y-1"><Label className="text-xs">Nom du refuge</Label><Input value={newShelterName} onChange={e => setNewShelterName(e.target.value)} placeholder="SPA de Genève" /></div>
                <p className="text-[10px] text-muted-foreground">Un mot de passe temporaire sera généré automatiquement.</p>
                <Button onClick={handleCreateShelter} disabled={creatingShelter || !newShelterEmail} className="w-full gap-2" size="sm">
                  <Home className="h-4 w-4" /> {creatingShelter ? "Création..." : "Créer le refuge"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-11 gap-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 col-span-2" onClick={() => navigate("/admin/launch")}>
            <Rocket className="h-4 w-4" /> Checklist de lancement
          </Button>
          <Button variant="outline" className="h-11 gap-2 text-sm" onClick={() => navigate("/admin/subscriptions")}>
            <CreditCard className="h-4 w-4" /> Abonnements
          </Button>
          <Button variant="outline" className="h-11 gap-2 text-sm" onClick={() => navigate("/admin/tickets")}>
            <MessageSquare className="h-4 w-4" /> Tickets
          </Button>
          <Button variant="outline" className="h-11 gap-2 text-sm" onClick={() => navigate("/admin/treasury")}>
            <Wallet className="h-4 w-4" /> Trésorerie
          </Button>
          <Button variant="outline" className="h-11 gap-2 text-sm" onClick={() => navigate("/exercises")}>
            <BookOpen className="h-4 w-4" /> Exercices
          </Button>
          <Button variant="outline" className="h-11 gap-2 text-sm" onClick={() => navigate("/coach")}>
            <GraduationCap className="h-4 w-4" /> Coach
          </Button>
          <Button variant="outline" className="h-11 gap-2 text-sm" onClick={() => navigate("/shelter")}>
            <Home className="h-4 w-4" /> Refuge
          </Button>
        </div>

        {/* Temporary password dialog */}
        <Dialog open={!!tempPasswordDialog} onOpenChange={(o) => !o && setTempPasswordDialog(null)}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Mot de passe temporaire</DialogTitle>
            </DialogHeader>
            {tempPasswordDialog && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Compte créé pour <strong className="text-foreground">{tempPasswordDialog.email}</strong>. Communiquez ce mot de passe temporaire à l'utilisateur :
                </p>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-base font-mono font-bold text-foreground text-center select-all break-all">{tempPasswordDialog.password}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ L'utilisateur devra créer son propre mot de passe à sa première connexion. Ce mot de passe temporaire ne sera plus affiché.
                </p>
                <Button className="w-full" onClick={() => {
                  navigator.clipboard.writeText(tempPasswordDialog.password);
                  toast({ title: "Copié ✅", description: "Mot de passe copié dans le presse-papier." });
                }}>
                  Copier le mot de passe
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setTempPasswordDialog(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
}

/* ───────── USERS MANAGER ───────── */
function AdminUsersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ userId: string; name: string; roles: string[] } | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoleToAdd, setEditRoleToAdd] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<Record<string, { email: string; tempPassword: string }>>({});

  // Fetch ALL users with roles
  const { user } = useAuth();

  const { data: isAdmin } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
  });

  const { data: allUsers = [], isLoading, refetch } = useQuery({
    queryKey: ["admin_all_users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");

      if (!error && Array.isArray(data)) {
        return data.map((u: any) => {
          const roles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : ["owner"];
          return {
            userId: u.user_id,
            email: u.email || "",
            name: u.display_name || "Sans nom",
            roles,
            createdAt: u.created_at,
          };
        });
      }

      // Fallback legacy (si la fonction SQL n'est pas encore déployée)
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, created_at").order("created_at", { ascending: false });
      if (!profiles) return [];
      const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap: Record<string, string[]> = {};
      (allRoles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      return profiles.map((p: any) => ({
        userId: p.user_id,
        email: "",
        name: p.display_name || "Sans nom",
        roles: roleMap[p.user_id] || ["owner"],
        createdAt: p.created_at,
      }));
    },
    enabled: isAdmin === true,
    refetchOnMount: "always",
  });

  const filtered = allUsers.filter((u: any) => {
    const query = searchQuery.toLowerCase();
    const matchSearch = searchQuery.length < 2
      || u.name.toLowerCase().includes(query)
      || u.email.toLowerCase().includes(query)
      || u.userId.includes(searchQuery);
    const matchRole = roleFilter === "all" || u.roles.includes(roleFilter);
    return matchSearch && matchRole;
  });

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      // Delete all user data cascading
      await Promise.all([
        supabase.from("dogs").delete().eq("user_id", deleteTarget.userId),
        supabase.from("training_plans").delete().eq("user_id", deleteTarget.userId),
        supabase.from("day_progress").delete().eq("user_id", deleteTarget.userId),
        supabase.from("journal_entries").delete().eq("user_id", deleteTarget.userId),
        supabase.from("behavior_logs").delete().eq("user_id", deleteTarget.userId),
        supabase.from("dog_evaluations").delete().eq("user_id", deleteTarget.userId),
        supabase.from("dog_objectives").delete().eq("user_id", deleteTarget.userId),
        supabase.from("dog_problems").delete().eq("user_id", deleteTarget.userId),
        supabase.from("exercise_sessions").delete().eq("user_id", deleteTarget.userId),
        supabase.from("messages").delete().eq("sender_id", deleteTarget.userId),
        supabase.from("messages").delete().eq("recipient_id", deleteTarget.userId),
        supabase.from("user_preferences").delete().eq("user_id", deleteTarget.userId),
        supabase.from("client_links").delete().eq("client_user_id", deleteTarget.userId),
        supabase.from("client_links").delete().eq("coach_user_id", deleteTarget.userId),
        supabase.from("user_roles").delete().eq("user_id", deleteTarget.userId),
        supabase.from("profiles").delete().eq("user_id", deleteTarget.userId),
      ]);
      toast({ title: "Utilisateur supprimé ✅", description: `${deleteTarget.name} et toutes ses données ont été supprimés.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      // Update display name
      if (editName !== editTarget.name) {
        const { error } = await supabase.from("profiles").update({ display_name: editName }).eq("user_id", editTarget.userId);
        if (error) throw error;
      }
      toast({ title: "Modifié ✅" });
      refetch();
      setEditTarget(null);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleAddRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;
      toast({ title: "Rôle ajouté ✅" });
      refetch();
      if (editTarget) setEditTarget({ ...editTarget, roles: [...editTarget.roles, role] });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
      if (error) throw error;
      toast({ title: "Rôle retiré ✅" });
      refetch();
      if (editTarget) setEditTarget({ ...editTarget, roles: editTarget.roles.filter(r => r !== role) });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    setResettingPassword(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée");

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { userId, resetOnly: true },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedCredentials(prev => ({
        ...prev,
        [userId]: { email: data.email, tempPassword: data.temporaryPassword },
      }));

      toast({ title: "Mot de passe réinitialisé ✅", description: `Nouveau MDP temporaire généré pour ${userName}. Vous pouvez maintenant télécharger la fiche PDF.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de réinitialiser le mot de passe", variant: "destructive" });
    }
    setResettingPassword(null);
  };

  const handleDownloadGuide = async (userId: string, userName: string, roles: string[]) => {
    const creds = generatedCredentials[userId];
    if (!creds) {
      toast({ title: "MDP non généré", description: "Cliquez d'abord sur 🔑 pour générer un nouveau mot de passe temporaire.", variant: "destructive" });
      return;
    }

    setGeneratingPdf(userId);
    try {
      const primaryRole = roles.includes("shelter") ? "shelter"
        : roles.includes("educator") ? "educator"
        : roles.includes("shelter_employee") ? "shelter_employee"
        : roles.includes("admin") ? "admin"
        : "owner";

      const doc = generateConnectionGuidePDF({
        name: userName,
        email: creds.email,
        role: primaryRole,
        tempPassword: creds.tempPassword,
      });

      const fileName = `DogWork_Guide_${userName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const blob = doc.output("blob");

      // iOS: priorité au partage natif (fiable sur Safari mobile)
      if (isIOS && "share" in navigator && "canShare" in navigator) {
        const file = new File([blob], fileName, { type: "application/pdf" });
        const shareData: ShareData = { files: [file], title: fileName };
        if ((navigator as Navigator & { canShare?: (data?: ShareData) => boolean }).canShare?.(shareData)) {
          try {
            await navigator.share(shareData);
            toast({ title: "Fiche prête ✅", description: "Choisissez “Enregistrer dans Fichiers” dans le menu de partage." });
            return;
          } catch (shareError: any) {
            if (shareError?.name === "AbortError") {
              toast({ title: "Partage annulé", description: "Aucune action effectuée." });
              return;
            }
          }
        }
      }

      // Téléchargement standard (desktop/Android)
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Fallback iOS: ouvrir le PDF dans un nouvel onglet pour sauvegarde manuelle
      if (isIOS) {
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (!popup) {
          doc.save(fileName);
        }
        toast({ title: "PDF ouvert ✅", description: "Utilisez Partager → Enregistrer dans Fichiers." });
      } else {
        toast({ title: "Téléchargement lancé ✅", description: `Fichier : ${fileName}` });
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Le PDF n'a pas pu être généré.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><UserCog className="h-4 w-4" /> Tous les utilisateurs ({allUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher..." className="pl-8 h-9 text-sm" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="owner">Propriétaires</SelectItem>
                <SelectItem value="educator">Éducateurs</SelectItem>
                <SelectItem value="shelter">Refuges</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="shelter_employee">Employés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4 animate-pulse">Chargement...</p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Aucun utilisateur trouvé.</p>}
              {filtered.map((u: any) => (
                <div key={u.userId} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email || "Email indisponible"}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {u.roles.map((r: string) => (
                        <Badge key={r} className={`text-[8px] px-1.5 py-0 border-0 ${ROLE_LABELS[r]?.color || "bg-muted text-muted-foreground"}`}>
                          {ROLE_LABELS[r]?.icon} {ROLE_LABELS[r]?.label || r}
                        </Badge>
                      ))}
                      {u.roles.length === 0 && <span className="text-[9px] text-muted-foreground">Aucun rôle</span>}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-amber-500 hover:text-amber-400"
                      disabled={resettingPassword === u.userId}
                      onClick={() => handleResetPassword(u.userId, u.name)}
                      title="Générer un nouveau mot de passe temporaire"
                    >
                      {resettingPassword === u.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className={`h-7 w-7 ${generatedCredentials[u.userId] ? "text-primary hover:text-primary" : "text-muted-foreground"}`}
                      disabled={!generatedCredentials[u.userId] || generatingPdf === u.userId}
                      onClick={() => handleDownloadGuide(u.userId, u.name, u.roles)}
                      title={generatedCredentials[u.userId] ? "Télécharger la fiche PDF" : "Générez d'abord un MDP (🔑)"}
                    >
                      {generatingPdf === u.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTarget(u); setEditName(u.name); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ userId: u.userId, name: u.name })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Supprimer l'utilisateur
            </AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer <strong>{deleteTarget?.name}</strong> et TOUTES ses données (chiens, plans, journaux, messages) ? Irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer tout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit2 className="h-4 w-4" /> Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nom d'affichage</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Rôles actuels</Label>
                <div className="flex flex-wrap gap-1.5">
                  {editTarget.roles.map((r) => (
                    <Badge key={r} className={`text-xs gap-1 ${ROLE_LABELS[r]?.color || ""}`}>
                      {ROLE_LABELS[r]?.icon} {ROLE_LABELS[r]?.label || r}
                      <button onClick={() => handleRemoveRole(editTarget.userId, r)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Ajouter un rôle</Label>
                <div className="flex gap-2">
                  <Select value={editRoleToAdd} onValueChange={setEditRoleToAdd}>
                    <SelectTrigger className="flex-1 h-9 text-xs">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).filter(([k]) => !editTarget.roles.includes(k)).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" disabled={!editRoleToAdd} onClick={() => { if (editRoleToAdd) { handleAddRole(editTarget.userId, editRoleToAdd); setEditRoleToAdd(""); } }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">ID: {editTarget.userId}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Annuler</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving ? "Sauvegarde..." : "Sauvegarder"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ───────── SHELTERS LIST ───────── */
function SheltersList() {
  const { data: shelters = [] } = useQuery({
    queryKey: ["admin_shelters_list"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("shelter_profiles").select("*").order("created_at", { ascending: false });
      if (!profiles?.length) return [];
      const { data: employees } = await supabase.from("shelter_employees_safe").select("shelter_user_id").eq("is_active", true);
      const empCounts: Record<string, number> = {};
      (employees || []).forEach((e: any) => { empCounts[e.shelter_user_id] = (empCounts[e.shelter_user_id] || 0) + 1; });
      return profiles.map((p: any) => ({ ...p, employeeCount: empCounts[p.user_id] || 0 }));
    },
  });

  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4" /> Refuges ({shelters.length})</CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-1.5 pt-0">
            {shelters.length === 0 && <p className="text-xs text-muted-foreground">Aucun refuge.</p>}
            {shelters.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name || "Sans nom"}</p>
                  <p className="text-[10px] text-muted-foreground">{s.organization_type || "refuge"} — {s.employeeCount} employé(s)</p>
                </div>
                <Home className="h-4 w-4 text-primary" />
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ───────── ADMIN CREATE USER ───────── */
function AdminCreateUser({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("owner");
  const [creating, setCreating] = useState(false);
  const [tempPwd, setTempPwd] = useState<{ email: string; password: string } | null>(null);

  const handleCreate = async () => {
    if (!email) return;
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée");
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email, displayName: name || email.split("@")[0], role: role === "owner" ? undefined : role },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTempPwd({ email, password: data.temporaryPassword });
      toast({ title: "Compte créé ✅", description: `${email} devra changer son mot de passe à la première connexion.` });
      setEmail(""); setName(""); setRole("owner");
      onCreated();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de créer le compte", variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <>
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><UserCog className="h-4 w-4 text-primary" /> Créer un compte utilisateur</CardTitle>
          <p className="text-[10px] text-muted-foreground">Un mot de passe temporaire est généré. L'utilisateur le changera à sa première connexion.</p>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Email *</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="utilisateur@email.com" type="email" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nom</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Prénom Nom" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">🐕 Propriétaire</SelectItem>
                <SelectItem value="educator">🎓 Éducateur</SelectItem>
                <SelectItem value="shelter">🏠 Refuge</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={creating || !email} className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> {creating ? "Création..." : "Créer le compte"}
          </Button>
        </CardContent>
      </Card>

      {/* Temp password dialog */}
      <Dialog open={!!tempPwd} onOpenChange={(o) => !o && setTempPwd(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🔑 Mot de passe temporaire</DialogTitle>
          </DialogHeader>
          {tempPwd && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Compte <strong className="text-foreground">{tempPwd.email}</strong> créé. Transmettez ce mot de passe temporaire :
              </p>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-base font-mono font-bold text-foreground text-center select-all break-all">{tempPwd.password}</p>
              </div>
              <p className="text-xs text-muted-foreground">L'utilisateur devra créer son propre mot de passe à sa première connexion.</p>
              <Button className="w-full" onClick={() => {
                navigator.clipboard.writeText(tempPwd.password);
                toast({ title: "Copié ✅" });
              }}>
                Copier le mot de passe
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTempPwd(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
