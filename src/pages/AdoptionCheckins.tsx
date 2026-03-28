import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Camera, CheckCircle2, Clock, Calendar, ChevronRight,
  Upload, X, Loader2, PawPrint, Send, Star, AlertCircle
} from "lucide-react";
import { format, isPast, isFuture, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

type Checkin = {
  id: string;
  adopter_user_id: string;
  animal_id: string;
  shelter_user_id: string;
  checkin_week: number;
  due_date: string;
  submitted_at: string | null;
  photos: string[];
  video_url: string | null;
  general_mood: string | null;
  health_status: string | null;
  behavior_notes: string | null;
  highlights: string | null;
  concerns: string | null;
};

const MOOD_OPTIONS = [
  { value: "excellent", label: "🌟 Excellent", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "bien", label: "😊 Bien", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "correct", label: "😐 Correct", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  { value: "difficile", label: "😟 Difficile", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { value: "preoccupant", label: "😰 Préoccupant", color: "bg-destructive/10 text-destructive border-destructive/20" },
];

export default function AdoptionCheckins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeCheckin, setActiveCheckin] = useState<string | null>(null);
  const [form, setForm] = useState({
    general_mood: "",
    health_status: "",
    behavior_notes: "",
    highlights: "",
    concerns: "",
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch all adoption check-ins for current user
  const { data: checkins, isLoading } = useQuery({
    queryKey: ["adoption_checkins", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adoption_checkins")
        .select("*")
        .eq("adopter_user_id", user!.id)
        .order("checkin_week", { ascending: true });
      if (error) throw error;
      return data as Checkin[];
    },
    enabled: !!user,
  });

  // Fetch linked animal names
  const { data: links } = useQuery({
    queryKey: ["adopter_links", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adopter_links")
        .select("animal_id, animal_name")
        .eq("adopter_user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const animalNames = new Map(links?.map(l => [l.animal_id, l.animal_name]) || []);

  const submitCheckin = useMutation({
    mutationFn: async (checkinId: string) => {
      const { error } = await supabase
        .from("adoption_checkins")
        .update({
          ...form,
          photos: photoUrls,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", checkinId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adoption_checkins"] });
      toast({ title: "Check-in envoyé ! 🎉", description: "Merci pour ces nouvelles !" });
      setActiveCheckin(null);
      setForm({ general_mood: "", health_status: "", behavior_notes: "", highlights: "", concerns: "" });
      setPhotoUrls([]);
    },
    onError: (err: any) => toast({ title: "Erreur", description: err.message, variant: "destructive" }),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("shelter-photos").upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("shelter-photos").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
      setPhotoUrls(prev => [...prev, ...urls]);
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!checkins || checkins.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <Heart className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Pas de suivi post-adoption</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Aucun programme de suivi post-adoption n'est actif pour le moment.
          </p>
        </div>
      </AppLayout>
    );
  }

  const completedCount = checkins.filter(c => c.submitted_at).length;
  const totalCount = checkins.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const nextDue = checkins.find(c => !c.submitted_at);

  // Group by animal
  const byAnimal = new Map<string, Checkin[]>();
  checkins.forEach(c => {
    const list = byAnimal.get(c.animal_id) || [];
    list.push(c);
    byAnimal.set(c.animal_id, list);
  });

  return (
    <AppLayout>
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            Suivi post-adoption
          </h1>
          <p className="text-sm text-muted-foreground">
            Donnez des nouvelles de votre compagnon à son refuge d'origine.
          </p>
        </div>

        {/* Progress */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{completedCount}/{totalCount} bilans envoyés</span>
            <span className="text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {nextDue && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Prochain bilan : semaine {nextDue.checkin_week} —{" "}
                {isPast(new Date(nextDue.due_date))
                  ? <span className="text-destructive font-medium">en retard</span>
                  : `dans ${differenceInDays(new Date(nextDue.due_date), new Date())} jours`
                }
              </span>
            </div>
          )}
        </Card>

        {/* Check-in list by animal */}
        {Array.from(byAnimal.entries()).map(([animalId, animalCheckins]) => (
          <div key={animalId} className="space-y-3">
            <div className="flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">{animalNames.get(animalId) || "Animal"}</h2>
            </div>

            <div className="space-y-2">
              {animalCheckins.map((checkin) => {
                const isSubmitted = !!checkin.submitted_at;
                const isOverdue = !isSubmitted && isPast(new Date(checkin.due_date));
                const isActive = activeCheckin === checkin.id;

                return (
                  <motion.div key={checkin.id} layout>
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        isSubmitted ? "bg-primary/5 border-primary/20" :
                        isOverdue ? "bg-destructive/5 border-destructive/20" :
                        "hover:border-primary/30"
                      }`}
                      onClick={() => !isSubmitted && setActiveCheckin(isActive ? null : checkin.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isSubmitted ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : isOverdue ? (
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium">Semaine {checkin.checkin_week}</p>
                            <p className="text-xs text-muted-foreground">
                              {isSubmitted
                                ? `Envoyé le ${format(new Date(checkin.submitted_at!), "d MMM yyyy", { locale: fr })}`
                                : `Prévu le ${format(new Date(checkin.due_date), "d MMM yyyy", { locale: fr })}`}
                            </p>
                          </div>
                        </div>
                        {isSubmitted ? (
                          <Badge variant="secondary" className="text-xs">✓ Envoyé</Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive" className="text-xs">En retard</Badge>
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Submitted summary */}
                      {isSubmitted && checkin.general_mood && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {MOOD_OPTIONS.find(m => m.value === checkin.general_mood) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                              {MOOD_OPTIONS.find(m => m.value === checkin.general_mood)?.label}
                            </span>
                          )}
                          {checkin.photos?.length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                              📷 {checkin.photos.length} photo{checkin.photos.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      )}
                    </Card>

                    {/* Expanded form */}
                    <AnimatePresence>
                      {isActive && !isSubmitted && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <Card className="mt-2 p-5 space-y-5 border-primary/30">
                            <h3 className="font-semibold text-foreground">
                              Bilan semaine {checkin.checkin_week}
                            </h3>

                            {/* Mood */}
                            <div className="space-y-2">
                              <Label className="text-sm">Comment va votre compagnon ? *</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {MOOD_OPTIONS.map(m => (
                                  <button
                                    key={m.value}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, general_mood: m.value })); }}
                                    className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                                      form.general_mood === m.value ? m.color + " border-current" : "border-border hover:border-primary/30"
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Health */}
                            <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                              <Label className="text-sm">Santé</Label>
                              <Textarea
                                value={form.health_status}
                                onChange={e => setForm(f => ({ ...f, health_status: e.target.value }))}
                                placeholder="Appétit, énergie, visites véto…"
                                className="min-h-[60px] rounded-xl"
                              />
                            </div>

                            {/* Behavior */}
                            <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                              <Label className="text-sm">Comportement</Label>
                              <Textarea
                                value={form.behavior_notes}
                                onChange={e => setForm(f => ({ ...f, behavior_notes: e.target.value }))}
                                placeholder="Socialisation, promenades, habitudes…"
                                className="min-h-[60px] rounded-xl"
                              />
                            </div>

                            {/* Highlights */}
                            <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                              <Label className="text-sm">Moments forts ✨</Label>
                              <Textarea
                                value={form.highlights}
                                onChange={e => setForm(f => ({ ...f, highlights: e.target.value }))}
                                placeholder="Une anecdote, un progrès, un moment de joie…"
                                className="min-h-[60px] rounded-xl"
                              />
                            </div>

                            {/* Concerns */}
                            <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                              <Label className="text-sm">Préoccupations (optionnel)</Label>
                              <Textarea
                                value={form.concerns}
                                onChange={e => setForm(f => ({ ...f, concerns: e.target.value }))}
                                placeholder="Difficultés, questions, besoins d'aide…"
                                className="min-h-[60px] rounded-xl"
                              />
                            </div>

                            {/* Photos */}
                            <div className="space-y-2" onClick={e => e.stopPropagation()}>
                              <Label className="text-sm">Photos 📷</Label>
                              <div className="flex flex-wrap gap-2">
                                {photoUrls.map((url, i) => (
                                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <button
                                      onClick={() => setPhotoUrls(prev => prev.filter((_, j) => j !== i))}
                                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/30">
                                  {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
                                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                                </label>
                              </div>
                            </div>

                            <Button
                              className="w-full rounded-xl"
                              disabled={!form.general_mood || submitCheckin.isPending}
                              onClick={(e) => { e.stopPropagation(); submitCheckin.mutate(checkin.id); }}
                            >
                              {submitCheckin.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                              Envoyer le bilan
                            </Button>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
