import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Search, Plus, ChevronRight, Dog, Calendar, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useCoachClients } from "@/hooks/useCoach";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function CoachClients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clients = [], isLoading } = useCoachClients();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();

  const filtered = clients.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClient = async () => {
    if (!clientEmail.trim() || !user) return;
    setAdding(true);
    try {
      // Look up profile by searching - we need to find user by some identifier
      // For now, we'll use a placeholder approach
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .ilike("display_name", `%${clientEmail.trim()}%`);

      if (!profiles?.length) {
        toast({ title: "Client non trouvé", description: "Aucun utilisateur trouvé avec ce nom.", variant: "destructive" });
        setAdding(false);
        return;
      }

      const clientUserId = profiles[0].user_id;

      if (clientUserId === user.id) {
        toast({ title: "Erreur", description: "Vous ne pouvez pas vous ajouter vous-même comme client.", variant: "destructive" });
        setAdding(false);
        return;
      }

      const { error } = await supabase.from("client_links").insert({
        coach_user_id: user.id,
        client_user_id: clientUserId,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Client déjà lié", variant: "destructive" });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Client ajouté ✓" });
        queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
        setAddOpen(false);
        setClientEmail("");
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setAdding(false);
  };

  return (
    <CoachLayout>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Mes clients</h1>
            <p className="text-xs text-muted-foreground">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un client</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="Nom du client..."
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
                <Button className="w-full" onClick={handleAddClient} disabled={adding}>
                  {adding ? "Recherche..." : "Lier le client"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            className="pl-10 bg-card/50 border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.map((client, i) => (
            <motion.div
              key={client.userId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className="bg-card/70 border-border/40 cursor-pointer hover:bg-card/90 transition-all"
                onClick={() => navigate(`/coach/clients/${client.userId}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium text-sm text-foreground">{client.displayName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1">
                          <Dog className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{client.dogsCount}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">·</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(client.lastActivity), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && !isLoading && (
            <Card className="bg-card/50 border-border/40">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search ? "Aucun client trouvé" : "Aucun client lié. Ajoutez votre premier client."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CoachLayout>
  );
}
