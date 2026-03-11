import { useNavigate } from "react-router-dom";
import { useDogs, useSetActiveDog, useDeleteDog } from "@/hooks/useDogs";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Dog, Check, Trash2, Edit, AlertTriangle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pt-6 pb-4 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mes chiens</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Gérez vos compagnons</p>
          </div>
          <motion.div whileTap={{ scale: 0.93 }}>
            <Button onClick={() => navigate("/dogs/new")} size="sm" className="gap-1.5 rounded-xl neon-glow">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </motion.div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-card/50 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (!dogs || dogs.length === 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Dog className="h-8 w-8 text-primary" />
            </div>
            <p className="text-foreground font-semibold">Aucun chien ajouté</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">Ajoutez votre premier compagnon pour commencer le programme.</p>
            <Button onClick={() => navigate("/dogs/new")} className="mt-4 gap-1.5 rounded-xl">
              <Plus className="h-4 w-4" /> Ajouter un chien
            </Button>
          </motion.div>
        )}

        <div className="space-y-3">
          {dogs?.map((dog, i) => (
            <motion.div
              key={dog.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
              whileTap={{ scale: 0.97 }}
            >
              <Card className={`glass-card overflow-hidden transition-all ${dog.is_active ? "neon-border ring-1 ring-primary/20" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-card border border-border flex-shrink-0">
                      {dog.photo_url ? (
                        <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <Dog className="h-6 w-6 text-primary/60" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{dog.name}</h3>
                        {dog.is_active && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-0">
                            Actif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {dog.breed || "Race non renseignée"}
                        {dog.weight_kg ? ` · ${dog.weight_kg} kg` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  {(dog.muzzle_required || dog.bite_history || dog.obedience_level) && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {dog.muzzle_required && (
                        <Badge variant="destructive" className="text-[10px] gap-1 rounded-md">
                          <Shield className="h-2.5 w-2.5" /> Muselière
                        </Badge>
                      )}
                      {dog.bite_history && (
                        <Badge variant="destructive" className="text-[10px] rounded-md">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Morsure
                        </Badge>
                      )}
                      {dog.obedience_level && (
                        <Badge variant="secondary" className="text-[10px] rounded-md">Obéissance {dog.obedience_level}/5</Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                    {!dog.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActive.mutate(dog.id)}
                        className="gap-1 text-xs rounded-lg h-8"
                      >
                        <Check className="h-3 w-3" /> Activer
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => navigate(`/dogs/${dog.id}`)} className="gap-1 text-xs rounded-lg h-8">
                      <Edit className="h-3 w-3" /> Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(dog.id, dog.name)}
                      className="text-destructive hover:text-destructive gap-1 ml-auto text-xs h-8"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AppLayout>
  );
}
