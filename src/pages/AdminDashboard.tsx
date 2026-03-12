import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, GraduationCap, BookOpen, DollarSign, Plus, ArrowLeft, Trash2, Check, X, Eye, ChevronDown, Home } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newEducatorEmail, setNewEducatorEmail] = useState("");
  const [newEducatorName, setNewEducatorName] = useState("");
  const [newEducatorPassword, setNewEducatorPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [newShelterEmail, setNewShelterEmail] = useState("");
  const [newShelterName, setNewShelterName] = useState("");
  const [newShelterPassword, setNewShelterPassword] = useState("");
  const [creatingShelter, setCreatingShelter] = useState(false);

  // Check admin role
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
  });

  // Stats
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

  // Educators list
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

  // Pending courses
  const { data: pendingCourses = [], refetch: refetchCourses } = useQuery({
    queryKey: ["admin_pending_courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isAdmin === true,
  });

  // Bookings stats
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
    if (!newEducatorEmail || !newEducatorPassword) return;
    setCreating(true);
    try {
      // Create the user via edge function (service role needed)
      const { data, error } = await supabase.functions.invoke("create-educator", {
        body: { email: newEducatorEmail, password: newEducatorPassword, displayName: newEducatorName || newEducatorEmail.split("@")[0] },
      });
      if (error) throw error;
      toast({ title: "Éducateur créé", description: `${newEducatorEmail} a été ajouté comme éducateur.` });
      setNewEducatorEmail("");
      setNewEducatorName("");
      setNewEducatorPassword("");
      refetchEducators();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de créer l'éducateur", variant: "destructive" });
    }
    setCreating(false);
  };

  const handleApproval = async (courseId: string, status: "approved" | "rejected") => {
    const course = pendingCourses.find((c: any) => c.id === courseId);
    const { error } = await supabase.from("courses").update({ approval_status: status }).eq("id", courseId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "Cours approuvé ✅" : "Cours refusé ❌" });
      refetchCourses();
      // Send notification email to educator
      try {
        // Fetch educator email for notification
        const { data: eduProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", course?.educator_user_id)
          .single();
        await supabase.functions.invoke("send-notification-email", {
          body: {
            type: status === "approved" ? "course_approved" : "course_rejected",
            data: { title: course?.title || "", educatorName: eduProfile?.display_name || "" },
          },
        });
      } catch (e) {
        console.error("Email notification error:", e);
      }
    }
  };

  if (adminLoading) return <AppLayout><div className="pt-12 text-center animate-pulse text-muted-foreground">Chargement...</div></AppLayout>;

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="pt-12 text-center space-y-4">
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-6 pb-8 space-y-4 theme-admin">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </motion.button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Administration</h1>
            <p className="text-[10px] text-muted-foreground">Gestion de la plateforme</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Users, label: "Utilisateurs", value: stats?.users },
            { icon: GraduationCap, label: "Éducateurs", value: stats?.educators },
            { icon: BookOpen, label: "Cours", value: stats?.courses },
          ].map((s, i) => (
            <Card key={i} className="text-center">
              <CardContent className="p-3">
                <s.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{s.value ?? "–"}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue stats */}
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{(totalRevenue / 100).toFixed(0)} CHF</p>
              <p className="text-[9px] text-muted-foreground">CA total cours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{(totalCommission / 100).toFixed(0)} CHF</p>
              <p className="text-[9px] text-muted-foreground">Commission (30%)</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending courses approval */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" /> Cours à valider ({pendingCourses.filter((c: any) => c.approval_status === "pending").length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingCourses.filter((c: any) => c.approval_status === "pending").length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun cours en attente de validation.</p>
            )}
            {pendingCourses.filter((c: any) => c.approval_status === "pending").map((course: any) => (
              <div key={course.id} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{course.title}</p>
                    <p className="text-[10px] text-muted-foreground">{(course.price_cents / 100).toFixed(0)} CHF — {course.category} — {course.duration_minutes} min</p>
                    {course.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.description}</p>}
                    {course.location && <p className="text-xs text-muted-foreground">📍 {course.location}</p>}
                  </div>
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

        {/* All courses list — collapsible */}
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Tous les cours ({pendingCourses.length})</CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-2 pt-0">
                {pendingCourses.map((course: any) => (
                  <div key={course.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{course.title}</p>
                      <p className="text-[10px] text-muted-foreground">{(course.price_cents / 100).toFixed(0)} CHF</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {course.approval_status === "approved" && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border-0">Approuvé</Badge>}
                      {course.approval_status === "pending" && <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-0">En attente</Badge>}
                      {course.approval_status === "rejected" && <Badge variant="destructive" className="text-[9px]">Refusé</Badge>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Create educator — collapsible */}
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Créer un éducateur
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={newEducatorEmail} onChange={e => setNewEducatorEmail(e.target.value)} placeholder="educateur@email.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nom d'affichage</Label>
                  <Input value={newEducatorName} onChange={e => setNewEducatorName(e.target.value)} placeholder="Nom du professionnel" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mot de passe</Label>
                  <Input type="password" value={newEducatorPassword} onChange={e => setNewEducatorPassword(e.target.value)} placeholder="Mot de passe temporaire" />
                </div>
                <Button onClick={handleCreateEducator} disabled={creating || !newEducatorEmail || !newEducatorPassword} className="w-full gap-2">
                  <GraduationCap className="h-4 w-4" /> {creating ? "Création..." : "Créer l'éducateur"}
                </Button>
                <p className="text-[10px] text-muted-foreground">L'éducateur paiera 30% de commission sur chaque cours vendu.</p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Educators list — collapsible */}
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Éducateurs ({educators?.length || 0})</CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-2 pt-0">
                {educators?.length === 0 && <p className="text-xs text-muted-foreground">Aucun éducateur pour le moment.</p>}
                {educators?.map((ed: any) => (
                  <div key={ed.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{ed.display_name || "Sans nom"}</p>
                      <p className="text-[10px] text-muted-foreground">{ed.user_id}</p>
                    </div>
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-12 gap-2" onClick={() => navigate("/exercises")}>
            <BookOpen className="h-4 w-4" /> Exercices
          </Button>
          <Button variant="outline" className="h-12 gap-2" onClick={() => navigate("/coach")}>
            <GraduationCap className="h-4 w-4" /> Espace Coach
          </Button>
        </div>
      </motion.div>
    </AppLayout>
  );
}
