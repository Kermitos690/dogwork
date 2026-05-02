import { useAuth } from "@/hooks/useAuth";
import { useShelterEmployeeInfo } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { InstallAppCard } from "@/components/InstallAppCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PawPrint, ClipboardList, LogOut, NotebookPen, MessageSquare,
  Settings as SettingsIcon, Eye, ListChecks, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function EmployeeDashboard() {
  const { signOut } = useAuth();
  const { data: empInfo } = useShelterEmployeeInfo();

  const shelterId = empInfo?.shelter_user_id;

  const { data: animals = [], isLoading: animalsLoading } = useQuery({
    queryKey: ["employee-animals", shelterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals_safe")
        .select("id, name, status, primary_photo_url")
        .eq("user_id", shelterId!)
        .neq("status", "adopté")
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: !!shelterId,
  });

  const { data: todayActivities = 0 } = useQuery({
    queryKey: ["employee-today-activities", shelterId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("shelter_activity_log")
        .select("*", { count: "exact", head: true })
        .eq("shelter_user_id", shelterId!)
        .gte("created_at", today);
      return count || 0;
    },
    enabled: !!shelterId,
  });

  const { data: recentObservations = [], isLoading: obsLoading } = useQuery({
    queryKey: ["employee-recent-observations", shelterId, empInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_observations")
        .select("id, content, observation_type, observation_date, created_at, employee_name")
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!shelterId,
  });

  const { data: shelterProfile } = useQuery({
    queryKey: ["employee-shelter-profile", shelterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_profiles")
        .select("name")
        .eq("user_id", shelterId!)
        .maybeSingle();
      return data;
    },
    enabled: !!shelterId,
  });

  return (
    <EmployeeLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
              Bonjour, {empInfo?.name || "Employé"} 👋
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {shelterProfile?.name || "Refuge"} — {empInfo?.role || "Soigneur"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Se déconnecter">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <InstallAppCard variant="compact" dismissKey="dw_install_employee" />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <PawPrint className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{animals.length}</p>
              <p className="text-xs text-muted-foreground">Animaux suivis</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardList className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{todayActivities}</p>
              <p className="text-xs text-muted-foreground">Activités aujourd'hui</p>
            </CardContent>
          </Card>
        </div>

        {/* Animaux assignés */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-primary" />
              Animaux à suivre
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {animalsLoading ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Chargement de votre espace DogWork…
              </p>
            ) : animals.length === 0 ? (
              <EmptyState
                variant="dashed"
                icon={PawPrint}
                title="Aucun chien ne vous est encore assigné."
                description="Voici les chiens qui vous seront confiés dès qu'ils seront ajoutés au refuge."
              />
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Voici les chiens qui vous sont assignés aujourd'hui.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {animals.slice(0, 6).map((a: any) => (
                    <a
                      key={a.id}
                      href={`/employee/animals/${a.id}`}
                      className="rounded-lg border border-border/60 bg-card/60 p-2 hover:border-primary/40 transition-colors min-w-0"
                    >
                      <div className="aspect-square rounded-md bg-secondary mb-1.5 overflow-hidden">
                        {a.primary_photo_url ? (
                          <img
                            src={a.primary_photo_url}
                            alt={a.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PawPrint className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.status || "—"}</p>
                    </a>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tâches du jour — module non activé */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Tâches du jour
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <EmptyState
              variant="dashed"
              icon={Sparkles}
              title="Aucune tâche active pour le moment."
              description="Cette information sera disponible dès que le module tâches sera activé pour votre refuge."
            />
          </CardContent>
        </Card>

        {/* Observations récentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Observations récentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {obsLoading ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Chargement de votre espace DogWork…
              </p>
            ) : recentObservations.length === 0 ? (
              <EmptyState
                variant="dashed"
                icon={NotebookPen}
                title="Rien à afficher pour le moment."
                description="Ajoutez une observation pour garder l'équipe alignée."
                actionLabel="Ouvrir le journal"
                onAction={() => (window.location.href = "/employee/journal")}
              />
            ) : (
              <ul className="space-y-2">
                {recentObservations.map((o: any) => (
                  <li key={o.id} className="rounded-lg border border-border/60 bg-card/60 p-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                        {o.observation_type || "Observation"}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {o.created_at
                          ? formatDistanceToNow(new Date(o.created_at), { addSuffix: true, locale: fr })
                          : ""}
                      </span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2 leading-snug">{o.content}</p>
                    {o.employee_name && (
                      <p className="text-[10px] text-muted-foreground mt-1">par {o.employee_name}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Raccourcis */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-2">Actions rapides</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
                <a href="/employee/animals">
                  <PawPrint className="h-5 w-5" />
                  <span className="text-xs">Voir animaux</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
                <a href="/employee/activity">
                  <ClipboardList className="h-5 w-5" />
                  <span className="text-xs">Logger activité</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
                <a href="/employee/journal">
                  <NotebookPen className="h-5 w-5" />
                  <span className="text-xs">Journal</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" asChild>
                <a href="/employee/messages">
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-xs">Messages</span>
                </a>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col gap-1 col-span-2"
                asChild
              >
                <a href="/employee/settings">
                  <SettingsIcon className="h-5 w-5" />
                  <span className="text-xs">Paramètres personnels</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </EmployeeLayout>
  );
}
