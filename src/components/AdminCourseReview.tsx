import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Eye, Check, X, ChevronDown, MessageSquare, Send, Clock, MapPin, Users,
  Pause, Ban, Play, AlertTriangle, Loader2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-500/20 text-amber-500" },
  approved: { label: "Approuvé", color: "bg-emerald-500/20 text-emerald-500" },
  rejected: { label: "Refusé", color: "bg-destructive/20 text-destructive" },
  paused: { label: "En pause", color: "bg-sky-500/20 text-sky-500" },
  blocked: { label: "Bloqué", color: "bg-destructive/20 text-destructive" },
};

export function AdminCourseReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [remarkText, setRemarkText] = useState("");
  const [sendingRemark, setSendingRemark] = useState(false);
  const [statusAction, setStatusAction] = useState<{ courseId: string; status: string; title: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: courses = [], refetch } = useQuery({
    queryKey: ["admin_all_courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: courseNotes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["admin_course_notes", selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse?.id) return [];
      const { data } = await supabase
        .from("course_admin_notes")
        .select("*")
        .eq("course_id", selectedCourse.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedCourse?.id,
  });

  // Get educator profile for selected course
  const { data: educatorProfile } = useQuery({
    queryKey: ["educator_profile", selectedCourse?.educator_user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", selectedCourse.educator_user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedCourse?.educator_user_id,
  });

  const pendingCourses = courses.filter((c: any) => c.approval_status === "pending");
  const filteredCourses = filterStatus === "all" ? courses : courses.filter((c: any) => c.approval_status === filterStatus);

  const handleStatusChange = async (courseId: string, newStatus: string) => {
    const { error } = await supabase
      .from("courses")
      .update({ approval_status: newStatus })
      .eq("id", courseId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    const labels: Record<string, string> = {
      approved: "Cours approuvé ✅",
      rejected: "Cours refusé ❌",
      paused: "Cours mis en pause ⏸",
      blocked: "Cours bloqué 🚫",
    };

    toast({ title: labels[newStatus] || "Statut mis à jour" });

    // Auto-add a system note for status changes
    if (user) {
      const course = courses.find((c: any) => c.id === courseId);
      if (course) {
        await supabase.from("course_admin_notes").insert({
          course_id: courseId,
          admin_user_id: user.id,
          educator_user_id: course.educator_user_id,
          content: `Statut modifié → ${labels[newStatus] || newStatus}`,
          note_type: "status_change",
        } as any);
      }
    }

    refetch();
    refetchNotes();
    if (selectedCourse?.id === courseId) {
      setSelectedCourse((prev: any) => prev ? { ...prev, approval_status: newStatus } : null);
    }
    setStatusAction(null);

    // Try to send notification
    try {
      await supabase.functions.invoke("send-notification-email", {
        body: { type: newStatus === "approved" ? "course_approved" : "course_rejected", data: { courseId } },
      });
    } catch (e) { console.error("Email notification error:", e); }
  };

  const handleSendRemark = async () => {
    if (!remarkText.trim() || !selectedCourse || !user) return;
    setSendingRemark(true);
    try {
      const { error } = await supabase.from("course_admin_notes").insert({
        course_id: selectedCourse.id,
        admin_user_id: user.id,
        educator_user_id: selectedCourse.educator_user_id,
        content: remarkText.trim(),
        note_type: "review_remark",
      } as any);

      if (error) throw error;
      toast({ title: "Remarque envoyée ✅" });
      setRemarkText("");
      refetchNotes();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setSendingRemark(false);
  };

  return (
    <div className="space-y-3">
      {/* Pending courses section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" /> À valider ({pendingCourses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingCourses.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun cours en attente.</p>
          )}
          {pendingCourses.map((course: any) => (
            <div key={course.id} className="p-3 rounded-lg bg-secondary/30 space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">{course.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(course.price_cents / 100).toFixed(0)} CHF — {course.category} — {course.duration_minutes} min
                </p>
                {course.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => setSelectedCourse(course)}
                >
                  <Eye className="h-3 w-3" /> Consulter
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setStatusAction({ courseId: course.id, status: "approved", title: course.title })}
                >
                  <Check className="h-3 w-3" /> Approuver
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  onClick={() => setStatusAction({ courseId: course.id, status: "rejected", title: course.title })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* All courses section with filter */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Tous les cours ({courses.length})</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px] h-7 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvés</SelectItem>
                <SelectItem value="paused">En pause</SelectItem>
                <SelectItem value="blocked">Bloqués</SelectItem>
                <SelectItem value="rejected">Refusés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          {filteredCourses.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Aucun cours trouvé.</p>
          )}
          {filteredCourses.map((course: any) => {
            const status = STATUS_CONFIG[course.approval_status] || STATUS_CONFIG.pending;
            return (
              <button
                key={course.id}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition text-left"
                onClick={() => setSelectedCourse(course)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(course.price_cents / 100).toFixed(0)} CHF
                    {course.category && ` — ${course.category}`}
                  </p>
                </div>
                <Badge className={`text-[9px] border-0 shrink-0 ml-2 ${status.color}`}>
                  {status.label}
                </Badge>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Course detail dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={(open) => !open && setSelectedCourse(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base leading-snug pr-6">{selectedCourse.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-[10px] border-0 ${(STATUS_CONFIG[selectedCourse.approval_status] || STATUS_CONFIG.pending).color}`}>
                    {(STATUS_CONFIG[selectedCourse.approval_status] || STATUS_CONFIG.pending).label}
                  </Badge>
                  {educatorProfile && (
                    <span className="text-[10px] text-muted-foreground">
                      par {educatorProfile.display_name || "Éducateur"}
                    </span>
                  )}
                </div>
              </DialogHeader>

              {/* Full course details */}
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium text-foreground">Prix :</span>
                    {(selectedCourse.price_cents / 100).toFixed(2)} CHF
                  </div>
                  {selectedCourse.duration_minutes && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {selectedCourse.duration_minutes} min
                    </div>
                  )}
                  {selectedCourse.category && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="font-medium text-foreground">Catégorie :</span>
                      {selectedCourse.category}
                    </div>
                  )}
                  {selectedCourse.dog_level && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="font-medium text-foreground">Niveau :</span>
                      {selectedCourse.dog_level}
                    </div>
                  )}
                  {selectedCourse.max_participants && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      Max {selectedCourse.max_participants} participants
                    </div>
                  )}
                  {selectedCourse.location && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {selectedCourse.location}
                    </div>
                  )}
                </div>

                {selectedCourse.address && (
                  <div className="text-xs">
                    <span className="font-medium text-foreground">Adresse : </span>
                    <span className="text-muted-foreground">{selectedCourse.address}</span>
                  </div>
                )}

                {selectedCourse.description && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Description complète</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{selectedCourse.description}</p>
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground">
                  Commission : {(selectedCourse.commission_rate * 100).toFixed(0)}%
                  {selectedCourse.next_session_at && (
                    <> — Prochaine session : {new Date(selectedCourse.next_session_at).toLocaleDateString("fr-CH")}</>
                  )}
                </div>

                <Separator />

                {/* Admin remarks section */}
                <div>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    Remarques internes (visibles par l'éducateur)
                  </p>

                  <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                    {courseNotes.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">Aucune remarque pour ce cours.</p>
                    ) : (
                      courseNotes.map((note: any) => (
                        <div
                          key={note.id}
                          className={`p-2 rounded-lg text-xs ${
                            note.note_type === "status_change"
                              ? "bg-muted/50 text-muted-foreground italic"
                              : "bg-primary/10 text-foreground"
                          }`}
                        >
                          <p>{note.content}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {new Date(note.created_at).toLocaleDateString("fr-CH")} à {new Date(note.created_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Écrire une remarque à l'éducateur..."
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      className="text-xs min-h-[60px] resize-none flex-1"
                    />
                    <Button
                      size="sm"
                      className="self-end gap-1"
                      disabled={!remarkText.trim() || sendingRemark}
                      onClick={handleSendRemark}
                    >
                      {sendingRemark ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Status actions */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourse.approval_status === "pending" && (
                      <>
                        <Button size="sm" className="gap-1 text-xs" onClick={() => setStatusAction({ courseId: selectedCourse.id, status: "approved", title: selectedCourse.title })}>
                          <Check className="h-3 w-3" /> Approuver
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => setStatusAction({ courseId: selectedCourse.id, status: "rejected", title: selectedCourse.title })}>
                          <X className="h-3 w-3" /> Refuser
                        </Button>
                      </>
                    )}
                    {selectedCourse.approval_status === "approved" && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setStatusAction({ courseId: selectedCourse.id, status: "paused", title: selectedCourse.title })}>
                          <Pause className="h-3 w-3" /> Mettre en pause
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => setStatusAction({ courseId: selectedCourse.id, status: "blocked", title: selectedCourse.title })}>
                          <Ban className="h-3 w-3" /> Bloquer
                        </Button>
                      </>
                    )}
                    {selectedCourse.approval_status === "paused" && (
                      <>
                        <Button size="sm" className="gap-1 text-xs" onClick={() => setStatusAction({ courseId: selectedCourse.id, status: "approved", title: selectedCourse.title })}>
                          <Play className="h-3 w-3" /> Réactiver
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => setStatusAction({ courseId: selectedCourse.id, status: "blocked", title: selectedCourse.title })}>
                          <Ban className="h-3 w-3" /> Bloquer
                        </Button>
                      </>
                    )}
                    {selectedCourse.approval_status === "blocked" && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setStatusAction({ courseId: selectedCourse.id, status: "approved", title: selectedCourse.title })}>
                        <Play className="h-3 w-3" /> Débloquer
                      </Button>
                    )}
                    {selectedCourse.approval_status === "rejected" && (
                      <Button size="sm" className="gap-1 text-xs" onClick={() => setStatusAction({ courseId: selectedCourse.id, status: "approved", title: selectedCourse.title })}>
                        <Check className="h-3 w-3" /> Approuver
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Status change confirmation dialog */}
      <AlertDialog open={!!statusAction} onOpenChange={(open) => !open && setStatusAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {statusAction?.status === "approved" && "Approuver ce cours ?"}
              {statusAction?.status === "rejected" && "Refuser ce cours ?"}
              {statusAction?.status === "paused" && "Mettre ce cours en pause ?"}
              {statusAction?.status === "blocked" && "Bloquer ce cours ?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              <span className="font-medium">{statusAction?.title}</span>
              <br />
              {statusAction?.status === "paused" && "Le cours ne sera plus visible par les utilisateurs mais pourra être réactivé."}
              {statusAction?.status === "blocked" && "Le cours sera bloqué et invisible. L'éducateur sera notifié."}
              {statusAction?.status === "approved" && "Le cours sera visible et réservable par les utilisateurs."}
              {statusAction?.status === "rejected" && "Le cours sera refusé. L'éducateur en sera informé."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={() => statusAction && handleStatusChange(statusAction.courseId, statusAction.status)}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
