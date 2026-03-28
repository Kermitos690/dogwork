import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, MessageSquare, Bug, Lightbulb, HelpCircle, Send } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const CATEGORIES = [
  { value: "bug", label: "Bug", icon: Bug, color: "bg-destructive/20 text-destructive" },
  { value: "feature", label: "Suggestion", icon: Lightbulb, color: "bg-amber-500/20 text-amber-400" },
  { value: "question", label: "Question", icon: HelpCircle, color: "bg-primary/20 text-primary" },
  { value: "other", label: "Autre", icon: MessageSquare, color: "bg-muted text-muted-foreground" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Ouvert", color: "bg-amber-500/20 text-amber-400" },
  in_progress: { label: "En cours", color: "bg-primary/20 text-primary" },
  resolved: { label: "Résolu", color: "bg-emerald-500/20 text-emerald-400" },
  closed: { label: "Fermé", color: "bg-muted text-muted-foreground" },
};

export default function SupportTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("bug");
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const { data: tickets = [], refetch } = useQuery({
    queryKey: ["my_tickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
      });
      if (error) throw error;
      toast({ title: "Ticket envoyé ✅", description: "Nous vous répondrons bientôt." });
      setTitle("");
      setDescription("");
      setCategory("bug");
      setShowNew(false);
      refetch();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const catInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[3];

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Support & Feedback
            </h1>
            <p className="text-[10px] text-muted-foreground">Signalez un bug ou proposez une amélioration</p>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setShowNew(true)}>
            <Plus className="h-3.5 w-3.5" /> Nouveau
          </Button>
        </div>

        {/* Ticket list */}
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun ticket pour le moment.</p>
              <Button size="sm" className="mt-3 gap-1" onClick={() => setShowNew(true)}>
                <Plus className="h-3.5 w-3.5" /> Créer un ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickets.map((t: any) => {
              const cat = catInfo(t.category);
              const status = STATUS_LABELS[t.status] || STATUS_LABELS.open;
              const CatIcon = cat.icon;
              return (
                <Card key={t.id} className="cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => setSelectedTicket(t)}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <CatIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[8px] border-0 ${cat.color}`}>{cat.label}</Badge>
                          <Badge className={`text-[8px] border-0 ${status.color}`}>{status.label}</Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {t.admin_response && (
                      <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-[10px] text-primary font-medium">Réponse admin :</p>
                        <p className="text-xs text-foreground mt-0.5">{t.admin_response}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* New ticket dialog */}
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Nouveau ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Résumé du problème..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez le problème ou la suggestion en détail..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
                {submitting ? "Envoi..." : "Envoyer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ticket detail dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">{selectedTicket?.title}</DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Badge className={`text-[9px] border-0 ${catInfo(selectedTicket.category).color}`}>
                    {catInfo(selectedTicket.category).label}
                  </Badge>
                  <Badge className={`text-[9px] border-0 ${(STATUS_LABELS[selectedTicket.status] || STATUS_LABELS.open).color}`}>
                    {(STATUS_LABELS[selectedTicket.status] || STATUS_LABELS.open).label}
                  </Badge>
                </div>
                {selectedTicket.description && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Créé le {new Date(selectedTicket.created_at).toLocaleDateString("fr-FR")}
                </p>
                {selectedTicket.admin_response && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs text-primary font-medium mb-1">Réponse de l'administrateur :</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.admin_response}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
}
