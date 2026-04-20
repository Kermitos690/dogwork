import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { AdminGuard } from "@/components/AdminGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, Plus, Trash2, Search, Crown, Shield } from "lucide-react";
import { motion } from "framer-motion";

const TIER_OPTIONS = [
  { value: "pro", label: "Pro (9.90 CHF/mois)", color: "bg-primary/20 text-primary" },
  { value: "expert", label: "Expert (19.90 CHF/mois)", color: "bg-accent/20 text-accent-foreground" },
  { value: "educator", label: "Éducateur (200 CHF/an)", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "shelter", label: "Refuge (sur mesure)", color: "bg-amber-500/20 text-amber-400" },
];

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTier, setSelectedTier] = useState("");
  const [notes, setNotes] = useState("");
  const [granting, setGranting] = useState(false);

  // Fetch all active admin subscriptions
  const { data: overrides = [], refetch } = useQuery({
    queryKey: ["admin_subscriptions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_subscriptions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      // Get profile names
      const userIds = [...new Set(data.map((o: any) => o.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.display_name || "Sans nom"; });
      return data.map((o: any) => ({ ...o, display_name: nameMap[o.user_id] || "Inconnu" }));
    },
  });

  // Search users
  const { data: searchResults = [] } = useQuery({
    queryKey: ["admin_search_users_sub", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .ilike("display_name", `%${searchQuery}%`)
        .limit(10);
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  const handleGrant = async () => {
    if (!selectedUserId || !selectedTier || !user) return;
    setGranting(true);
    try {
      const { error: revokeError } = await supabase
        .from("admin_subscriptions")
        .update({ is_active: false })
        .eq("user_id", selectedUserId)
        .eq("is_active", true);
      if (revokeError) throw revokeError;

      const { error } = await supabase.from("admin_subscriptions").insert({
        user_id: selectedUserId,
        tier: selectedTier,
        granted_by: user.id,
        is_active: true,
        notes,
      });
      if (error) throw error;
      toast({ title: "Abonnement activé ✅", description: `Tier ${selectedTier} attribué gratuitement.` });
      setSelectedUserId("");
      setSelectedTier("");
      setNotes("");
      setSearchQuery("");
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] })]);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setGranting(false);
  };

  const handleRevoke = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_subscriptions")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Abonnement révoqué ✅" });
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ["admin_subscriptions"] })]);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const tierLabel = (tier: string) => TIER_OPTIONS.find(t => t.value === tier);

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
                <Crown className="h-5 w-5 text-primary" /> Abonnements gratuits
              </h1>
              <p className="text-[10px] text-muted-foreground">Attribuez des abonnements de test gratuitement</p>
            </div>
          </div>

          {/* Grant form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Attribuer un abonnement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Rechercher un utilisateur</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedUserId(""); }}
                    placeholder="Nom d'utilisateur..."
                    className="pl-8"
                  />
                </div>
                {searchResults.length > 0 && !selectedUserId && (
                  <div className="border border-border rounded-lg bg-card max-h-40 overflow-y-auto">
                    {searchResults.map((u: any) => (
                      <button
                        key={u.user_id}
                        onClick={() => { setSelectedUserId(u.user_id); setSearchQuery(u.display_name || ""); }}
                        className="w-full text-left px-3 py-2 hover:bg-secondary/50 text-sm text-foreground"
                      >
                        {u.display_name || "Sans nom"}
                        <span className="text-[9px] text-muted-foreground ml-2">{u.user_id.slice(0, 8)}...</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUserId && (
                  <p className="text-[10px] text-emerald-400">✓ Utilisateur sélectionné</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tier d'abonnement</Label>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Choisir un plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optionnel)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Testeur beta, etc." />
              </div>

              <Button
                onClick={handleGrant}
                disabled={granting || !selectedUserId || !selectedTier}
                className="w-full gap-2"
                size="sm"
              >
                <CreditCard className="h-4 w-4" />
                {granting ? "Attribution..." : "Attribuer gratuitement"}
              </Button>
            </CardContent>
          </Card>

          {/* Active overrides */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" /> Abonnements actifs ({overrides.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overrides.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Aucun abonnement gratuit actif.</p>
              )}
              {overrides.map((o: any) => {
                const t = tierLabel(o.tier);
                return (
                  <div key={o.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{o.display_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className={`text-[9px] border-0 ${t?.color || "bg-muted text-muted-foreground"}`}>
                          {t?.label || o.tier}
                        </Badge>
                        {o.notes && <span className="text-[9px] text-muted-foreground truncate">{o.notes}</span>}
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Depuis le {new Date(o.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleRevoke(o.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </AppLayout>
    </AdminGuard>
  );
}
