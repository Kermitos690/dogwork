import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CoachNav } from "@/components/CoachNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, MapPin, Clock, Users, Euro, Calendar,
  Pencil, ToggleLeft, ToggleRight, BookOpen
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  dog_level: string | null;
  price_cents: number;
  commission_rate: number;
  duration_minutes: number | null;
  max_participants: number | null;
  location: string | null;
  address: string | null;
  next_session_at: string | null;
  is_active: boolean | null;
  educator_user_id: string;
  created_at: string | null;
};

type Booking = {
  id: string;
  course_id: string;
  user_id: string;
  status: string | null;
  payment_status: string | null;
  amount_cents: number | null;
  commission_cents: number | null;
  created_at: string | null;
};

const CATEGORIES = [
  { value: "obeissance", label: "Obéissance" },
  { value: "agility", label: "Agility" },
  { value: "pistage", label: "Pistage" },
  { value: "socialisation", label: "Socialisation" },
  { value: "chiot", label: "Cours chiot" },
  { value: "reactivity", label: "Chien réactif" },
  { value: "pro", label: "Formation pro / K9" },
  { value: "balade", label: "Balade éducative" },
  { value: "general", label: "Général" },
];

const DOG_LEVELS = [
  { value: "tous", label: "Tous niveaux" },
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
];

const emptyForm = {
  title: "",
  description: "",
  category: "general",
  dog_level: "tous",
  price_cents: 0,
  duration_minutes: 60,
  max_participants: 10,
  location: "",
  address: "",
  next_session_at: "",
};

export default function CoachCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Fetch courses
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["coach-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("educator_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
  });

  // Fetch bookings for all educator courses
  const courseIds = courses.map((c) => c.id);
  const { data: bookings = [] } = useQuery({
    queryKey: ["coach-bookings", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("course_bookings")
        .select("*")
        .in("course_id", courseIds);
      if (error) throw error;
      return data as Booking[];
    },
    enabled: courseIds.length > 0,
  });

  // Create / update mutation
  const saveCourse = useMutation({
    mutationFn: async (payload: typeof form & { id?: string }) => {
      const record = {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        dog_level: payload.dog_level,
        price_cents: payload.price_cents,
        duration_minutes: payload.duration_minutes,
        max_participants: payload.max_participants,
        location: payload.location,
        address: payload.address,
        next_session_at: payload.next_session_at || null,
        educator_user_id: user!.id,
      };

      if (payload.id) {
        const { error } = await supabase.from("courses").update(record).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-courses"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Cours modifié" : "Cours créé" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Toggle active
  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("courses").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach-courses"] }),
  });

  const openEdit = (course: Course) => {
    setEditingId(course.id);
    setForm({
      title: course.title,
      description: course.description || "",
      category: course.category || "general",
      dog_level: course.dog_level || "tous",
      price_cents: course.price_cents,
      duration_minutes: course.duration_minutes || 60,
      max_participants: course.max_participants || 10,
      location: course.location || "",
      address: course.address || "",
      next_session_at: course.next_session_at ? course.next_session_at.slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({ title: "Le titre est requis", variant: "destructive" });
      return;
    }
    saveCourse.mutate(editingId ? { ...form, id: editingId } : form);
  };

  // Stats
  const totalRevenue = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + (b.amount_cents || 0), 0);
  const totalCommission = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + (b.commission_cents || 0), 0);
  const netRevenue = totalRevenue - totalCommission;
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;

  const getBookingsForCourse = (courseId: string) => bookings.filter((b) => b.course_id === courseId);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Mes cours</h1>
            <p className="text-sm text-muted-foreground">Gérez vos cours en présentiel</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" /> Nouveau
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Modifier le cours" : "Nouveau cours"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Titre *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Cours d'obéissance en groupe" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Décrivez votre cours..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Catégorie</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Niveau</Label>
                    <Select value={form.dog_level} onValueChange={(v) => setForm({ ...form, dog_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOG_LEVELS.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prix (CHF)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.price_cents / 100}
                      onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value) * 100) })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Commission 30% : {((form.price_cents * 0.3) / 100).toFixed(2)} CHF — Vous recevez : {((form.price_cents * 0.7) / 100).toFixed(2)} CHF
                    </p>
                  </div>
                  <div>
                    <Label>Durée (min)</Label>
                    <Input type="number" min={15} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Participants max</Label>
                  <Input type="number" min={1} value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Lieu</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Parc de la Tête d'Or" />
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ex: 69006 Lyon" />
                </div>
                <div>
                  <Label>Prochaine session</Label>
                  <Input type="datetime-local" value={form.next_session_at} onChange={(e) => setForm({ ...form, next_session_at: e.target.value })} />
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={saveCourse.isPending}>
                  {saveCourse.isPending ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer le cours"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{courses.length}</p>
            <p className="text-xs text-muted-foreground">Cours créés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalBookings}</p>
            <p className="text-xs text-muted-foreground">Réservations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-500">{(netRevenue / 100).toFixed(0)} €</p>
            <p className="text-xs text-muted-foreground">Revenus nets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{(totalCommission / 100).toFixed(0)} €</p>
            <p className="text-xs text-muted-foreground">Commission (30%)</p>
          </CardContent>
        </Card>
      </div>

      {/* Course list */}
      <div className="px-4 pt-4 space-y-3">
        {isLoading && <p className="text-muted-foreground text-center py-8">Chargement...</p>}

        {!isLoading && courses.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Aucun cours créé</p>
              <p className="text-sm text-muted-foreground mt-1">Créez votre premier cours pour commencer à recevoir des réservations.</p>
            </CardContent>
          </Card>
        )}

        {courses.map((course) => {
          const cb = getBookingsForCourse(course.id);
          const revenue = cb.filter((b) => b.payment_status === "paid").reduce((s, b) => s + (b.amount_cents || 0), 0);
          const commission = cb.filter((b) => b.payment_status === "paid").reduce((s, b) => s + (b.commission_cents || 0), 0);
          const catLabel = CATEGORIES.find((c) => c.value === course.category)?.label || course.category;
          const levelLabel = DOG_LEVELS.find((l) => l.value === course.dog_level)?.label || course.dog_level;

          return (
            <Card key={course.id} className={!course.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge variant="secondary" className="text-[10px]">{catLabel}</Badge>
                      <Badge variant="outline" className="text-[10px]">{levelLabel}</Badge>
                      {!course.is_active && <Badge variant="destructive" className="text-[10px]">Inactif</Badge>}
                      {(course as any).approval_status === "pending" && <Badge className="text-[10px] bg-yellow-500/20 text-yellow-700 border-yellow-300">En attente d'approbation</Badge>}
                      {(course as any).approval_status === "rejected" && <Badge variant="destructive" className="text-[10px]">Refusé</Badge>}
                      {(course as any).approval_status === "approved" && <Badge className="text-[10px] bg-green-500/20 text-green-700 border-green-300">Approuvé</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(course)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleActive.mutate({ id: course.id, active: !course.is_active })}
                    >
                      {course.is_active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                )}
                <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Euro className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{(course.price_cents / 100).toFixed(0)} €</span>
                    <span className="text-xs">(net: {((course.price_cents * 0.7) / 100).toFixed(0)} €)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{course.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{cb.length}/{course.max_participants} inscrits</span>
                  </div>
                  {course.location && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{course.location}</span>
                    </div>
                  )}
                </div>
                {course.next_session_at && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span className="text-primary font-medium">
                      {format(new Date(course.next_session_at), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                )}
                {cb.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CA brut</span>
                      <span className="font-medium">{(revenue / 100).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission (30%)</span>
                      <span className="font-medium text-orange-500">-{(commission / 100).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted-foreground">Net</span>
                      <span className="font-bold text-green-500">{((revenue - commission) / 100).toFixed(2)} €</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CoachNav />
    </div>
  );
}
