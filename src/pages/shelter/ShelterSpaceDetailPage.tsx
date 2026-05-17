import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useShelterSpace, useSpaceAssignments } from "@/hooks/useShelterSpaceDetail";
import { useUpdateShelterSpace } from "@/hooks/useShelterSpaces";
import { toast } from "sonner";
import { SpaceDetailHeader } from "@/components/shelter/spaces/SpaceDetailHeader";
import { SpaceOverviewPanel } from "@/components/shelter/spaces/SpaceOverviewPanel";
import { SpaceOccupationPanel } from "@/components/shelter/spaces/SpaceOccupationPanel";
import { SpaceEquipmentPanel } from "@/components/shelter/spaces/SpaceEquipmentPanel";
import { SpaceCleaningPanel } from "@/components/shelter/spaces/SpaceCleaningPanel";
import { SpaceMaintenancePanel } from "@/components/shelter/spaces/SpaceMaintenancePanel";
import { SpaceIncidentsPanel } from "@/components/shelter/spaces/SpaceIncidentsPanel";
import { SpaceNotesPanel } from "@/components/shelter/spaces/SpaceNotesPanel";
import { SpaceDocumentsPanel } from "@/components/shelter/spaces/SpaceDocumentsPanel";
import { SpaceTimeline } from "@/components/shelter/spaces/SpaceTimeline";
import { ArrowLeft } from "lucide-react";

export default function ShelterSpaceDetailPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { data: space, isLoading, error } = useShelterSpace(spaceId);
  const { data: assignments = [] } = useSpaceAssignments(spaceId);
  const updateSpace = useUpdateShelterSpace();

  const activeCount = assignments.filter((a) => a.status === "active" && !a.ends_at).length;
  const currentOccupancy = space?.current_animal_id ? Math.max(1, activeCount) : activeCount;

  const handleStatusChange = (status: string) => {
    if (!space) return;
    updateSpace.mutate({ id: space.id, patch: { status: status as any } }, {
      onSuccess: () => toast.success("Statut mis à jour"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) {
    return (
      <ShelterLayout>
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ShelterLayout>
    );
  }

  if (error) {
    return (
      <ShelterLayout>
        <Card><CardContent className="p-6 text-center space-y-3">
          <p className="text-sm text-destructive">Erreur de chargement : {(error as Error).message}</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/shelter/spaces")}><ArrowLeft className="h-4 w-4 mr-1" /> Retour</Button>
        </CardContent></Card>
      </ShelterLayout>
    );
  }

  if (!space) {
    return (
      <ShelterLayout>
        <Card><CardContent className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Espace introuvable ou accès refusé.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/shelter/spaces")}><ArrowLeft className="h-4 w-4 mr-1" /> Retour aux espaces</Button>
        </CardContent></Card>
      </ShelterLayout>
    );
  }

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-10">
        <SpaceDetailHeader space={space} currentOccupancy={currentOccupancy} onStatusChange={handleStatusChange} />

        <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="overview" className="text-xs">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="occupation" className="text-xs">Occupation</TabsTrigger>
              <TabsTrigger value="equipment" className="text-xs">Équipements</TabsTrigger>
              <TabsTrigger value="cleaning" className="text-xs">Nettoyage</TabsTrigger>
              <TabsTrigger value="maintenance" className="text-xs">Maintenance</TabsTrigger>
              <TabsTrigger value="incidents" className="text-xs">Incidents</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Historique</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview"><SpaceOverviewPanel space={space} /></TabsContent>
          <TabsContent value="occupation"><SpaceOccupationPanel space={space} currentOccupancy={currentOccupancy} /></TabsContent>
          <TabsContent value="equipment"><SpaceEquipmentPanel spaceId={space.id} shelterUserId={space.shelter_user_id} /></TabsContent>
          <TabsContent value="cleaning"><SpaceCleaningPanel space={space} /></TabsContent>
          <TabsContent value="maintenance"><SpaceMaintenancePanel space={space} /></TabsContent>
          <TabsContent value="incidents"><SpaceIncidentsPanel space={space} /></TabsContent>
          <TabsContent value="notes"><SpaceNotesPanel space={space} /></TabsContent>
          <TabsContent value="documents"><SpaceDocumentsPanel space={space} /></TabsContent>
          <TabsContent value="history"><SpaceTimeline space={space} /></TabsContent>
        </Tabs>
      </motion.div>
    </ShelterLayout>
  );
}
