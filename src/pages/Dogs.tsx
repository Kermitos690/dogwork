import { useNavigate } from "react-router-dom";
import { useDogs, useSetActiveDog, useDeleteDog } from "@/hooks/useDogs";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Dog, Check, Trash2, Edit, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dogs() {
  const navigate = useNavigate();
  const { data: dogs, isLoading } = useDogs();
  const setActive = useSetActiveDog();
  const deleteDog = useDeleteDog();
  const { toast } = useToast();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer ${name} ? Cette action est irréversible.`)) return;
    try {
      await deleteDog.mutateAsync(id);
      toast({ title: "Chien supprimé" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="pt-6 pb-4 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mes chiens</h1>
            <p className="text-sm text-muted-foreground">Gérez vos compagnons</p>
          </div>
          <Button onClick={() => navigate("/dogs/new")} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>

        {isLoading && <p className="text-muted-foreground text-sm">Chargement...</p>}

        <div className="space-y-3">
          {dogs?.map((dog, i) => (
            <Card
              key={dog.id}
              className={`card-press stagger-item ${dog.is_active ? "ring-2 ring-primary" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Dog className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{dog.name}</h3>
                        {dog.is_active && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dog.breed || "Race non renseignée"}
                        {dog.weight_kg ? ` · ${dog.weight_kg} kg` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {dog.muzzle_required && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" /> Muselière
                    </Badge>
                  )}
                  {dog.bite_history && (
                    <Badge variant="destructive" className="text-xs">Morsure</Badge>
                  )}
                  {dog.obedience_level && (
                    <Badge variant="secondary" className="text-xs">Obéissance {dog.obedience_level}/5</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {!dog.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActive.mutate(dog.id)}
                      className="gap-1"
                    >
                      <Check className="h-3 w-3" /> Activer
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => navigate(`/dogs/${dog.id}`)} className="gap-1">
                    <Edit className="h-3 w-3" /> Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(dog.id, dog.name)}
                    className="text-destructive hover:text-destructive gap-1 ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
