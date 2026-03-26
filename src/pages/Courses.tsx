import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDogs } from "@/hooks/useDogs";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, Users, Calendar, GraduationCap, CheckCircle, Loader2, Star, Dog } from "lucide-react";
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
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState("all");
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [bookingDogDialog, setBookingDogDialog] = useState<{ open: boolean; courseId: string }>({ open: false, courseId: "" });
  const [selectedDogId, setSelectedDogId] = useState("");
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; courseId: string; educatorId: string }>({ open: false, courseId: "", educatorId: "" });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // Fetch user's dogs
  const { data: myDogs = [] } = useDogs();

  // Handle return from Stripe (confirmation is done server-side via webhook)
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
      toast({ title: "Paiement effectué ! 🎉", description: "Votre réservation sera confirmée sous peu." });
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

  // Fetch educator profiles
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
        .select("course_id, status, payment_status")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch booking counts
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

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["course-reviews", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from("course_reviews")
        .select("*")
        .in("course_id", courseIds);
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  // Submit review
  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("course_reviews").insert({
        course_id: reviewDialog.courseId,
        user_id: user!.id,
        educator_user_id: reviewDialog.educatorId,
        rating: reviewRating,
        comment: reviewComment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Avis envoyé ✓" });
      qc.invalidateQueries({ queryKey: ["course-reviews"] });
      setReviewDialog({ open: false, courseId: "", educatorId: "" });
      setReviewRating(5);
      setReviewComment("");
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const getEducatorName = (userId: string) => {
    const p = educatorProfiles.find((e: any) => e.user_id === userId);
    return (p as any)?.display_name || "Éducateur";
  };

  const isBooked = (courseId: string) => myBookings.some((b: any) => b.course_id === courseId && (b.status === "confirmed" || b.status === "pending"));
  const hasPaidBooking = (courseId: string) => myBookings.some((b: any) => b.course_id === courseId && b.payment_status === "paid");
  const hasReviewed = (courseId: string) => reviews.some((r: any) => r.course_id === courseId && r.user_id === user?.id);

  const getBookedCount = (courseId: string) =>
    bookingCounts.filter((b: any) => b.course_id === courseId).length;

  const getCourseAvgRating = (courseId: string) => {
    const courseReviews = reviews.filter((r: any) => r.course_id === courseId);
    if (courseReviews.length === 0) return null;
    return courseReviews.reduce((s: number, r: any) => s + r.rating, 0) / courseReviews.length;
  };

  const getCourseReviewCount = (courseId: string) =>
    reviews.filter((r: any) => r.course_id === courseId).length;

  const handleBookClick = (courseId: string) => {
    if (myDogs.length === 0) {
      toast({ title: "Ajoutez d'abord un chien", description: "Vous devez avoir un profil de chien pour réserver un cours.", variant: "destructive" });
      return;
    }
    if (myDogs.length === 1) {
      setSelectedDogId(myDogs[0].id);
      handleBook(courseId, myDogs[0].id);
    } else {
      setSelectedDogId("");
      setBookingDogDialog({ open: true, courseId });
    }
  };

  const handleBook = async (courseId: string, dogId: string) => {
    setBookingLoading(courseId);
    setBookingDogDialog({ open: false, courseId: "" });
    try {
      const { data, error } = await supabase.functions.invoke("create-course-checkout", {
        body: { courseId, dogId },
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
          const avgRating = getCourseAvgRating(course.id);
          const reviewCount = getCourseReviewCount(course.id);
          const canReview = hasPaidBooking(course.id) && !hasReviewed(course.id);

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
                      {avgRating && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                          {avgRating.toFixed(1)} ({reviewCount})
                        </Badge>
                      )}
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
                  <div className="space-y-2">
                    <Button disabled className="w-full gap-2" variant="outline">
                      <CheckCircle className="h-4 w-4 text-green-500" /> Inscrit
                    </Button>
                    {canReview && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full gap-1"
                        onClick={() => setReviewDialog({ open: true, courseId: course.id, educatorId: course.educator_user_id })}
                      >
                        <Star className="h-3.5 w-3.5" /> Laisser un avis
                      </Button>
                    )}
                  </div>
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

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(o) => setReviewDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laisser un avis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium mb-2">Note</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setReviewRating(n)} className="p-1">
                    <Star className={`h-6 w-6 ${n <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Commentaire (optionnel)</p>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Partagez votre expérience..."
              />
            </div>
            <Button
              className="w-full"
              onClick={() => submitReview.mutate()}
              disabled={submitReview.isPending}
            >
              {submitReview.isPending ? "Envoi..." : "Envoyer l'avis"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
