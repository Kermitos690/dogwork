import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CoachLayout } from "@/components/CoachLayout";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, MapPin, Clock, CalendarDays } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

export default function CoachCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Fetch educator's courses
  const { data: courses = [] } = useQuery({
    queryKey: ["coach-calendar-courses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("educator_user_id", user!.id)
        .eq("is_active", true)
        .not("next_session_at", "is", null)
        .order("next_session_at", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch bookings for those courses
  const courseIds = courses.map((c: any) => c.id);
  const { data: bookings = [] } = useQuery({
    queryKey: ["coach-calendar-bookings", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from("course_bookings")
        .select("*")
        .in("course_id", courseIds)
        .in("status", ["confirmed", "pending"]);
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  // Dates with sessions
  const sessionDates = courses
    .filter((c: any) => c.next_session_at)
    .map((c: any) => new Date(c.next_session_at));

  // Courses for selected date
  const selectedCourses = selectedDate
    ? courses.filter((c: any) => c.next_session_at && isSameDay(new Date(c.next_session_at), selectedDate))
    : [];

  const getBookingCount = (courseId: string) =>
    bookings.filter((b: any) => b.course_id === courseId).length;

  return (
    <CoachLayout>
      <div className="space-y-4 pb-24 pt-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Calendrier
            </h1>
            <p className="text-xs text-muted-foreground">{courses.length} session{courses.length !== 1 ? "s" : ""} planifiée{courses.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Calendar */}
        <Card className="bg-card/70 border-border/40">
          <CardContent className="p-3 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={fr}
              modifiers={{
                hasSession: sessionDates,
              }}
              modifiersClassNames={{
                hasSession: "bg-primary/20 text-primary font-bold",
              }}
            />
          </CardContent>
        </Card>

        {/* Sessions for selected day */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            {selectedDate ? format(selectedDate, "EEEE d MMMM", { locale: fr }) : "Sélectionnez un jour"}
          </h2>

          {selectedCourses.length === 0 && selectedDate && (
            <Card className="bg-card/50 border-border/40">
              <CardContent className="p-6 text-center">
                <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Aucune session ce jour</p>
              </CardContent>
            </Card>
          )}

          {selectedCourses.map((course: any, i: number) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-card/70 border-border/40">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{course.category}</Badge>
                        <Badge variant="outline" className="text-[10px]">{course.dog_level}</Badge>
                      </div>
                    </div>
                    <Badge className="text-xs bg-primary/20 text-primary border-0">
                      {(course.price_cents / 100).toFixed(0)} CHF
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(course.next_session_at), "HH:mm", { locale: fr })} · {course.duration_minutes} min
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{getBookingCount(course.id)}/{course.max_participants} inscrits</span>
                    </div>
                    {course.location && (
                      <div className="flex items-center gap-1 col-span-2">
                        <MapPin className="h-3 w-3" />
                        <span>{course.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Upcoming sessions list */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-semibold text-foreground">Prochaines sessions</h2>
          {courses.filter((c: any) => new Date(c.next_session_at) >= new Date()).length === 0 && (
            <p className="text-xs text-muted-foreground">Aucune session à venir. Créez un cours dans l'onglet Cours.</p>
          )}
          {courses
            .filter((c: any) => new Date(c.next_session_at) >= new Date())
            .slice(0, 5)
            .map((course: any) => (
              <Card key={course.id} className="bg-card/50 border-border/40">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(course.next_session_at), "EEEE d MMM 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getBookingCount(course.id)}/{course.max_participants}
                  </Badge>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </CoachLayout>
  );
}
