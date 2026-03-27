import { useState } from "react";
import { useShelterEmployeeInfo } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PawPrint, ChevronRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type SafeAnimal = Database["public"]["Views"]["shelter_animals_safe"]["Row"];

const PAGE_SIZE = 40;

export default function EmployeeAnimals() {
  const navigate = useNavigate();
  const { data: empInfo } = useShelterEmployeeInfo();
  const shelterId = empInfo?.shelter_user_id;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ["employee-animals", shelterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals_safe")
        .select("id, name, species, breed, status, photo_url")
        .eq("user_id", shelterId!)
        .neq("status", "adopté")
        .order("name");
      return (data ?? []) as Pick<NonNullable<SafeAnimal>, "id" | "name" | "species" | "breed" | "status" | "photo_url">[];
    },
    enabled: !!shelterId,
  });

  const visible = animals.slice(0, visibleCount);
  const hasMore = visibleCount < animals.length;

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
            {visible.map((animal) => (
              <Card key={animal.id} className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate(`/employee/animals/${animal.id}`)}>
                <CardContent className="p-3 flex items-center gap-3">
                  {animal.photo_url ? (
                    <img src={animal.photo_url} alt={animal.name ?? ""} className="w-12 h-12 rounded-lg object-cover" />
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
            {hasMore && (
              <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                <ChevronDown className="h-4 w-4" /> Voir plus ({animals.length - visibleCount} restants)
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </EmployeeLayout>
  );
}
