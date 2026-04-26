import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CoachLayout } from "@/components/CoachLayout";
import { CharterGate } from "@/components/CharterGate";
import { useCharterAcceptance } from "@/hooks/useCharterAcceptance";
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
  Pencil, ToggleLeft, ToggleRight, BookOpen, Dog, CheckCircle, XCircle, AlertTriangle
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
  dog_id: string | null;
  status: string | null;
  payment_status: string | null;
  amount_cents: number | null;
  commission_cents: number | null;
  educator_note: string | null;
  reviewed_at: string | null;
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
  const { hasAccepted: hasAcceptedCharter } = useCharterAcceptance();

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

  // Fetch dog profiles for bookings that have a dog_id
  const bookingDogIds = [...new Set(bookings.filter((b) => b.dog_id).map((b) => b.dog_id!))];
  const { data: bookingDogs = [] } = useQuery({
    queryKey: ["booking-dogs", bookingDogIds],
    queryFn: async () => {
      if (bookingDogIds.length === 0) return [];
      const { data } = await supabase
        .from("dogs")
        .select("id, name, breed, sex, birth_date, weight_kg, size, bite_history, muzzle_required, obedience_level, sociability_dogs, sociability_humans")
        .in("id", bookingDogIds);
      return data ?? [];
    },
    enabled: bookingDogIds.length > 0,
  });

  // Fetch user profiles for bookings
  const bookingUserIds = [...new Set(bookings.map((b) => b.user_id))];
  const { data: bookingProfiles = [] } = useQuery({
    queryKey: ["booking-profiles", bookingUserIds],
    queryFn: async () => {
      if (bookingUserIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", bookingUserIds);
      return data ?? [];
    },
    enabled: bookingUserIds.length > 0,
  });

  // Pending bookings that need review
  const pendingBookings = bookings.filter((b) => b.status === "pending");

  // Approve/reject booking
  const reviewBooking = useMutation({
    mutationFn: async ({ bookingId, status, note }: { bookingId: string; status: string; note?: string }) => {
      const { error } = await supabase
        .from("course_bookings")
        .update({ status, educator_note: note || "", reviewed_at: new Date().toISOString() })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-bookings"] });
      toast({ title: "Inscription mise à jour" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Create / update mutation
  const saveCourse = useMutation({
    mutationFn: async (payload: typeof form & { id?: string }) => {
      if (!hasAcceptedCharter) {
        throw new Error("Vous devez accepter la Charte Coach avant de publier un cours.");
      }
      // Compliance scan: detect off-platform payment mentions before saving
      const scanText = `${payload.title}\n${payload.description ?? ""}`;
      try {
        const { data: scan } = await supabase.functions.invoke("check-marketplace-compliance", {
          body: { content: scanText, content_type: "course", content_id: payload.id ?? null },
        });
        if (scan?.status === "blocked") {
          throw new Error(
            "Votre cours mentionne un moyen de paiement externe (TWINT, IBAN, PayPal, espèces...). " +
            "Tous les paiements doivent passer par DogWork. Merci de retirer ces mentions."
          );
        }
      } catch (err: any) {
        if (err?.message?.includes("DogWork")) throw err;
        // Scan failure must not block legitimate creation — log and continue
        console.warn("Compliance scan unavailable:", err);
      }

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
      // Send notification to admin for new courses
      if (!editingId) {
        supabase.functions.invoke("send-notification-email", {
          body: {
            type: "course_created",
            data: {
              title: form.title,
              category: form.category,
              price_cents: form.price_cents,
              location: form.location,
            },
          },
        }).catch(console.error);
      }
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Cours modifié" : "Cours créé — En attente de validation" });
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
    <CoachLayout>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pb-4 -mx-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Mes cours</h1>
            <p className="text-sm text-muted-foreground">Gérez vos cours en présentiel</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew} disabled={!hasAcceptedCharter}>
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

      {/* Charter gate — blocks publishing if not accepted */}
      {!hasAcceptedCharter && (
        <div className="px-4 pt-4">
          <CharterGate>{null}</CharterGate>
        </div>
      )}

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
            <p className="text-2xl font-bold text-green-500">{(netRevenue / 100).toFixed(0)} CHF</p>
            <p className="text-xs text-muted-foreground">Revenus nets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{(totalCommission / 100).toFixed(0)} CHF</p>
            <p className="text-xs text-muted-foreground">Commission (30%)</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Bookings Review */}
      {pendingBookings.length > 0 && (
        <div className="px-4 pt-4 space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Inscriptions en attente ({pendingBookings.length})
          </h2>
          {pendingBookings.map((booking) => {
            const course = courses.find((c) => c.id === booking.course_id);
            const dog = bookingDogs.find((d: any) => d.id === booking.dog_id);
            const profile = bookingProfiles.find((p: any) => p.user_id === booking.user_id);
            return (
              <Card key={booking.id} className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{course?.title || "Cours"}</p>
                      <p className="text-xs text-muted-foreground">
                        par {(profile as any)?.display_name || "Utilisateur"} · {booking.created_at ? format(new Date(booking.created_at), "d MMM yyyy", { locale: fr }) : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">En attente</Badge>
                  </div>

                  {dog ? (
                    <div className="bg-card rounded-lg p-3 border border-border/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <Dog className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{(dog as any).name}</span>
                        {(dog as any).breed && <Badge variant="secondary" className="text-[10px]">{(dog as any).breed}</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        {(dog as any).sex && <span>Sexe : {(dog as any).sex === "male" ? "Mâle" : "Femelle"}</span>}
                        {(dog as any).weight_kg && <span>Poids : {(dog as any).weight_kg} kg</span>}
                        {(dog as any).size && <span>Taille : {(dog as any).size}</span>}
                        {(dog as any).birth_date && <span>Né : {format(new Date((dog as any).birth_date), "MMM yyyy", { locale: fr })}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(dog as any).bite_history && (
                          <Badge variant="destructive" className="text-[10px]">⚠️ Historique morsure</Badge>
                        )}
                        {(dog as any).muzzle_required && (
                          <Badge variant="destructive" className="text-[10px]">Muselière requise</Badge>
                        )}
                        {(dog as any).obedience_level != null && (
                          <Badge variant="outline" className="text-[10px]">Obéissance : {(dog as any).obedience_level}/10</Badge>
                        )}
                        {(dog as any).sociability_dogs != null && (
                          <Badge variant="outline" className="text-[10px]">Soc. chiens : {(dog as any).sociability_dogs}/10</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Aucun profil de chien fourni</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => reviewBooking.mutate({ bookingId: booking.id, status: "confirmed" })}
                      disabled={reviewBooking.isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1"
                      onClick={() => reviewBooking.mutate({ bookingId: booking.id, status: "rejected", note: "Profil incompatible" })}
                      disabled={reviewBooking.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Refuser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
                    <span className="font-medium text-foreground">{(course.price_cents / 100).toFixed(0)} CHF</span>
                    <span className="text-xs">(net: {((course.price_cents * 0.7) / 100).toFixed(0)} CHF)</span>
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
                      <span className="font-medium">{(revenue / 100).toFixed(2)} CHF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission (30%)</span>
                      <span className="font-medium text-orange-500">-{(commission / 100).toFixed(2)} CHF</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="text-muted-foreground">Net</span>
                      <span className="font-bold text-green-500">{((revenue - commission) / 100).toFixed(2)} CHF</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

    </CoachLayout>
  );
}
