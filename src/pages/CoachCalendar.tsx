import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachClients } from "@/hooks/useCoach";
import { CoachLayout } from "@/components/CoachLayout";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, Clock, CalendarDays, MapPin, Users, User,
  Trash2, Dog, BookOpen, CalendarCheck
} from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type CalendarEvent = {
  id: string;
  coach_user_id: string;
  event_type: string;
  title: string;
  description: string | null;
  client_user_id: string | null;
  dog_id: string | null;
  course_id: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  is_available_slot: boolean;
  status: string;
  created_at: string;
};

const EVENT_TYPES = [
  { value: "appointment", label: "Rendez-vous", icon: User, color: "bg-primary/20 text-primary" },
  { value: "course_session", label: "Cours IRL", icon: BookOpen, color: "bg-emerald-500/20 text-emerald-400" },
  { value: "availability", label: "Disponibilité", icon: CalendarCheck, color: "bg-sky-500/20 text-sky-400" },
];

export default function CoachCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clients = [] } = useCoachClients();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("agenda");

  // Form state
  const [form, setForm] = useState({
    event_type: "appointment",
    title: "",
    description: "",
    client_user_id: "",
    start_time: "09:00",
    end_time: "10:00",
    location: "",
    is_available_slot: false,
  });

  // Fetch events for current month range (+ buffer)
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["coach-calendar-events", user?.id],
    queryFn: async () => {
      const start = startOfMonth(addMonths(new Date(), -1)).toISOString();
      const end = endOfMonth(addMonths(new Date(), 3)).toISOString();
      const { data, error } = await supabase
        .from("coach_calendar_events")
        .select("*")
        .eq("coach_user_id", user!.id)
        .gte("start_at", start)
        .lte("start_at", end)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
    enabled: !!user,
  });

  // Fetch courses for linking
  const { data: courses = [] } = useQuery({
    queryKey: ["coach-courses-cal", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, next_session_at, location, duration_minutes, max_participants")
        .eq("educator_user_id", user!.id)
        .eq("is_active", true);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Create event
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !user) throw new Error("Missing data");
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const startAt = new Date(`${dateStr}T${form.start_time}:00`);
      const endAt = new Date(`${dateStr}T${form.end_time}:00`);

      if (endAt <= startAt) throw new Error("L'heure de fin doit être après l'heure de début");

      const { error } = await supabase.from("coach_calendar_events").insert({
        coach_user_id: user.id,
        event_type: form.is_available_slot ? "availability" : form.event_type,
        title: form.is_available_slot ? "Disponible" : form.title,
        description: form.description || null,
        client_user_id: form.client_user_id || null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        location: form.location || null,
        is_available_slot: form.is_available_slot,
        status: "confirmed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-calendar-events"] });
      toast({ title: "Événement créé" });
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: Error) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  // Delete event
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-calendar-events"] });
      toast({ title: "Événement supprimé" });
    },
  });

  const resetForm = () => {
    setForm({ event_type: "appointment", title: "", description: "", client_user_id: "", start_time: "09:00", end_time: "10:00", location: "", is_available_slot: false });
  };

  // Dates with events for calendar markers
  const eventDates = useMemo(() => {
    const map = new Map<string, string[]>();
    events.forEach((e) => {
      const key = format(new Date(e.start_at), "yyyy-MM-dd");
      const types = map.get(key) || [];
      types.push(e.event_type);
      map.set(key, types);
    });
    return map;
  }, [events]);

  const datesWithEvents = useMemo(
    () => events.map((e) => new Date(e.start_at)),
    [events]
  );

  // Events for selected date
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => isSameDay(new Date(e.start_at), selectedDate));
  }, [events, selectedDate]);

  // Upcoming events
  const upcomingEvents = useMemo(
    () => events.filter((e) => isAfter(new Date(e.start_at), new Date())).slice(0, 10),
    [events]
  );

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    const client = clients.find((c: any) => c.userId === clientId);
    return client?.displayName || "Client";
  };

  const getEventConfig = (type: string) =>
    EVENT_TYPES.find((t) => t.value === type) || EVENT_TYPES[0];

  return (
    <CoachLayout>
      <div className="space-y-4 pb-24 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> Calendrier
              </h1>
              <p className="text-xs text-muted-foreground">
                {events.length} événement{events.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Create button */}
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Nouvel événement — {selectedDate ? format(selectedDate, "d MMM yyyy", { locale: fr }) : ""}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {/* Quick: availability slot */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="avail"
                    checked={form.is_available_slot}
                    onChange={(e) => setForm({ ...form, is_available_slot: e.target.checked })}
                    className="rounded border-border"
                  />
                  <Label htmlFor="avail" className="text-sm">Créneau de disponibilité</Label>
                </div>

                {!form.is_available_slot && (
                  <>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appointment">Rendez-vous client</SelectItem>
                          <SelectItem value="course_session">Session de cours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Titre</Label>
                      <Input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Ex: Bilan comportemental"
                      />
                    </div>
                    {form.event_type === "appointment" && clients.length > 0 && (
                      <div>
                        <Label className="text-xs">Client (optionnel)</Label>
                        <Select value={form.client_user_id} onValueChange={(v) => setForm({ ...form, client_user_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                          <SelectContent>
                            {clients.map((c: any) => (
                              <SelectItem key={c.userId} value={c.userId}>{c.displayName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Début</Label>
                    <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Fin</Label>
                    <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Lieu (optionnel)</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Adresse ou en ligne"
                  />
                </div>

                {!form.is_available_slot && (
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Détails supplémentaires..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Annuler</Button>
                </DialogClose>
                <Button
                  size="sm"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || (!form.is_available_slot && !form.title.trim())}
                >
                  {createMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar widget */}
        <Card className="bg-card/70 border-border/40">
          <CardContent className="p-3 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={fr}
              className="pointer-events-auto"
              modifiers={{ hasEvent: datesWithEvents }}
              modifiersClassNames={{ hasEvent: "bg-primary/20 text-primary font-bold rounded-full" }}
            />
          </CardContent>
        </Card>

        {/* Tabs: Day view / Upcoming */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="agenda" className="flex-1 text-xs">
              {selectedDate ? format(selectedDate, "d MMM", { locale: fr }) : "Jour"}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1 text-xs">À venir</TabsTrigger>
          </TabsList>

          {/* Day events */}
          <TabsContent value="agenda" className="space-y-2 mt-2">
            <h2 className="text-sm font-semibold text-foreground">
              {selectedDate ? format(selectedDate, "EEEE d MMMM", { locale: fr }) : ""}
            </h2>

            {dayEvents.length === 0 && (
              <Card className="bg-card/50 border-border/40">
                <CardContent className="p-6 text-center">
                  <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun événement</p>
                  <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                  </Button>
                </CardContent>
              </Card>
            )}

            <AnimatePresence>
              {dayEvents.map((event, i) => {
                const config = getEventConfig(event.event_type);
                const IconComp = config.icon;
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="bg-card/70 border-border/40">
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${config.color}`}>
                              <IconComp className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{event.title || config.label}</p>
                              <p className="text-[10px] text-muted-foreground">{config.label}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate(event.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.start_at), "HH:mm")} — {format(new Date(event.end_at), "HH:mm")}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {event.location}
                            </span>
                          )}
                          {event.client_user_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {getClientName(event.client_user_id)}
                            </span>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-xs text-muted-foreground/80 line-clamp-2">{event.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </TabsContent>

          {/* Upcoming */}
          <TabsContent value="upcoming" className="space-y-2 mt-2">
            <h2 className="text-sm font-semibold text-foreground">Prochains événements</h2>
            {upcomingEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun événement à venir.</p>
            )}
            {upcomingEvents.map((event) => {
              const config = getEventConfig(event.event_type);
              const IconComp = config.icon;
              return (
                <Card key={event.id} className="bg-card/50 border-border/40">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.title || config.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(event.start_at), "EEE d MMM · HH:mm", { locale: fr })}
                        {event.client_user_id && ` · ${getClientName(event.client_user_id)}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </CoachLayout>
  );
}
