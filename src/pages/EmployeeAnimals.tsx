import { useShelterEmployeeInfo } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { PawPrint, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function EmployeeAnimals() {
  const { data: empInfo } = useShelterEmployeeInfo();
  const shelterId = empInfo?.shelter_user_id;

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ["employee-animals", shelterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals")
        .select("*")
        .eq("user_id", shelterId!)
        .neq("status", "adopté")
        .order("name");
      return data || [];
    },
    enabled: !!shelterId,
  });

  return (
    <EmployeeLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <PawPrint className="h-5 w-5 text-primary" /> Animaux
        </h1>

        {isLoading ? (
          <div className="animate-pulse text-muted-foreground text-center py-8">Chargement...</div>
        ) : animals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Aucun animal actuellement
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {animals.map((animal: any) => (
              <Card key={animal.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  {animal.photo_url ? (
                    <img src={animal.photo_url} alt={animal.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <PawPrint className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{animal.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {animal.species} {animal.breed && `— ${animal.breed}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">{animal.status}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </EmployeeLayout>
  );
}
