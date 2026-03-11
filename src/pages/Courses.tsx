import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, Users, Euro, Calendar, GraduationCap, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

const CATEGORIES = [
  { value: "all", label: "Toutes catégories" },
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

const DOG_LEVELS: Record<string, string> = {
  tous: "Tous niveaux",
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export default function Courses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState("all");
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  // Confirm payment on return from Stripe
  useEffect(() => {
    const success = searchParams.get("success");
    const bookingId = searchParams.get("booking");
    if (success === "true" && bookingId) {
      supabase.functions.invoke("confirm-course-payment", {
        body: { bookingId },
      }).then(() => {
        toast({ title: "Réservation confirmée ! 🎉", description: "Vous recevrez les détails par email." });
      });
    }
    if (searchParams.get("canceled") === "true") {
      toast({ title: "Paiement annulé", description: "Votre réservation n'a pas été confirmée.", variant: "destructive" });
    }
  }, [searchParams]);

  // Fetch approved active courses
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["public-courses", category],
    queryFn: async () => {
      let q = supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("next_session_at", { ascending: true, nullsFirst: false });

      if (category !== "all") q = q.eq("category", category);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Fetch educator profiles for display names
  const educatorIds = [...new Set(courses.map(c => c.educator_user_id))];
  const { data: educatorProfiles = [] } = useQuery({
    queryKey: ["educator-profiles", educatorIds],
    queryFn: async () => {
      if (educatorIds.length === 0) return [];
      const { data } = await supabase
        .from("coach_profiles")
        .select("user_id, display_name")
        .in("user_id", educatorIds);
      return data || [];
    },
    enabled: educatorIds.length > 0,
  });

  // Fetch user's existing bookings
  const { data: myBookings = [] } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_bookings")
        .select("course_id, status")
        .eq("user_id", user!.id)
        .in("status", ["confirmed", "pending"]);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch booking counts per course
  const courseIds = courses.map(c => c.id);
  const { data: bookingCounts = [] } = useQuery({
    queryKey: ["course-booking-counts", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from("course_bookings")
        .select("course_id, status")
        .in("course_id", courseIds)
        .in("status", ["confirmed", "pending"]);
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  const getEducatorName = (userId: string) => {
    const p = educatorProfiles.find((e: any) => e.user_id === userId);
    return (p as any)?.display_name || "Éducateur";
  };

  const isBooked = (courseId: string) => myBookings.some((b: any) => b.course_id === courseId);

  const getBookedCount = (courseId: string) =>
    bookingCounts.filter((b: any) => b.course_id === courseId).length;

  const handleBook = async (courseId: string) => {
    setBookingLoading(courseId);
    try {
      const { data, error } = await supabase.functions.invoke("create-course-checkout", {
        body: { courseId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setBookingLoading(null);
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-6 pb-8 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Cours en présentiel
          </h1>
          <p className="text-sm text-muted-foreground">Trouvez un éducateur canin près de chez vous</p>
        </div>

        {/* Filter */}
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading && <p className="text-center text-muted-foreground py-8">Chargement...</p>}

        {!isLoading && courses.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Aucun cours disponible</p>
              <p className="text-sm text-muted-foreground mt-1">De nouveaux cours seront bientôt proposés.</p>
            </CardContent>
          </Card>
        )}

        {courses.map((course: any) => {
          const catLabel = CATEGORIES.find(c => c.value === course.category)?.label || course.category;
          const levelLabel = DOG_LEVELS[course.dog_level] || course.dog_level;
          const booked = isBooked(course.id);
          const count = getBookedCount(course.id);
          const isFull = count >= (course.max_participants || 10);

          return (
            <Card key={course.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">par {getEducatorName(course.educator_user_id)}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge variant="secondary" className="text-[10px]">{catLabel}</Badge>
                      <Badge variant="outline" className="text-[10px]">{levelLabel}</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-primary">{(course.price_cents / 100).toFixed(0)} CHF</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
                )}
                <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{course.duration_minutes || 60} min</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{count}/{course.max_participants || 10} inscrits</span>
                  </div>
                  {course.location && (
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{course.location}{course.address ? `, ${course.address}` : ""}</span>
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

                {booked ? (
                  <Button disabled className="w-full gap-2" variant="outline">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Inscrit
                  </Button>
                ) : isFull ? (
                  <Button disabled className="w-full" variant="outline">Complet</Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    onClick={() => handleBook(course.id)}
                    disabled={bookingLoading === course.id}
                  >
                    {bookingLoading === course.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Réservation...</>
                    ) : (
                      <>Réserver — {(course.price_cents / 100).toFixed(0)} CHF</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </motion.div>
    </AppLayout>
  );
}
