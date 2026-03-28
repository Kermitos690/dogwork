import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { AdminGuard } from "@/components/AdminGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, Bug, Lightbulb, HelpCircle, Send } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const CATEGORIES: Record<string, { label: string; color: string; icon: any }> = {
  bug: { label: "Bug", color: "bg-destructive/20 text-destructive", icon: Bug },
  feature: { label: "Suggestion", color: "bg-amber-500/20 text-amber-400", icon: Lightbulb },
  question: { label: "Question", color: "bg-primary/20 text-primary", icon: HelpCircle },
  other: { label: "Autre", color: "bg-muted text-muted-foreground", icon: MessageSquare },
};

const STATUS_OPTIONS = [
  { value: "open", label: "Ouvert", color: "bg-amber-500/20 text-amber-400" },
  { value: "in_progress", label: "En cours", color: "bg-primary/20 text-primary" },
  { value: "resolved", label: "Résolu", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "closed", label: "Fermé", color: "bg-muted text-muted-foreground" },
];

export default function AdminTickets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: tickets = [], refetch } = useQuery({
    queryKey: ["admin_tickets", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data } = await query;
      if (!data?.length) return [];
      const userIds = [...new Set(data.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.display_name || "Sans nom"; });
      return data.map((t: any) => ({ ...t, display_name: nameMap[t.user_id] || "Inconnu" }));
    },
  });

  const handleUpdate = async () => {
    if (!selectedTicket) return;
    setSaving(true);
    try {
      const updates: any = {};
      if (response.trim()) updates.admin_response = response.trim();
      if (newStatus) {
        updates.status = newStatus;
        if (newStatus === "resolved") updates.resolved_at = new Date().toISOString();
      }
      if (Object.keys(updates).length === 0) { setSaving(false); return; }
      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", selectedTicket.id);
      if (error) throw error;
      toast({ title: "Ticket mis à jour ✅" });
      setSelectedTicket(null);
      setResponse("");
      setNewStatus("");
      refetch();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const openCount = tickets.filter((t: any) => t.status === "open").length;

  return (
    <AdminGuard>
      <AppLayout>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> Tickets support
              </h1>
              <p className="text-[10px] text-muted-foreground">{openCount} ticket(s) ouvert(s)</p>
            </div>
          </div>

          <div className="flex gap-2">
            {[{ v: "open", l: "Ouverts" }, { v: "in_progress", l: "En cours" }, { v: "resolved", l: "Résolus" }, { v: "all", l: "Tous" }].map(f => (
              <Button
                key={f.v}
                variant={statusFilter === f.v ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setStatusFilter(f.v)}
              >
                {f.l}
              </Button>
            ))}
          </div>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Aucun ticket.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tickets.map((t: any) => {
                const cat = CATEGORIES[t.category] || CATEGORIES.other;
                const status = STATUS_OPTIONS.find(s => s.value === t.status) || STATUS_OPTIONS[0];
                const CatIcon = cat.icon;
                return (
                  <Card key={t.id} className="cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => { setSelectedTicket(t); setResponse(t.admin_response || ""); setNewStatus(t.status); }}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <CatIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">par {t.display_name}</p>
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Ticket detail/response dialog */}
          <Dialog open={!!selectedTicket} onOpenChange={(o) => { if (!o) { setSelectedTicket(null); setResponse(""); setNewStatus(""); } }}>
            <DialogContent className="max-w-[90vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm">{selectedTicket?.title}</DialogTitle>
              </DialogHeader>
              {selectedTicket && (
                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground">
                    par {selectedTicket.display_name} — {new Date(selectedTicket.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  {selectedTicket.description && (
                    <p className="text-sm text-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-lg">{selectedTicket.description}</p>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Statut</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Réponse admin</label>
                    <Textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Votre réponse au ticket..."
                      rows={4}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>Annuler</Button>
                <Button onClick={handleUpdate} disabled={saving} className="gap-1">
                  <Send className="h-3.5 w-3.5" />
                  {saving ? "Sauvegarde..." : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </AppLayout>
    </AdminGuard>
  );
}
