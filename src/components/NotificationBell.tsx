import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, MessageSquare, CheckCircle, GraduationCap, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationItem {
  id: string;
  type: "message" | "approval" | "update";
  title: string;
  description: string;
  path: string;
  time: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Unread messages count
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ["notif-unread-messages", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .eq("read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 15_000,
  });

  // Pending course approvals (admin only)
  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["notif-pending-approvals", user?.id],
    queryFn: async () => {
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (!isAdmin) return 0;
      const { count } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "pending");
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  // Pending bookings (for educators)
  const { data: pendingBookings = 0 } = useQuery({
    queryKey: ["notif-pending-bookings", user?.id],
    queryFn: async () => {
      const { data: isEducator } = await supabase.rpc("is_educator");
      if (!isEducator) return 0;
      const { data: myCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("educator_user_id", user!.id);
      if (!myCourses || myCourses.length === 0) return 0;
      const { count } = await supabase
        .from("course_bookings")
        .select("*", { count: "exact", head: true })
        .in("course_id", myCourses.map(c => c.id))
        .eq("status", "pending");
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const totalCount = unreadMessages + pendingApprovals + pendingBookings;

  // Build notification list
  const notifications: NotificationItem[] = [];
  if (unreadMessages > 0) {
    notifications.push({
      id: "messages",
      type: "message",
      title: `${unreadMessages} message${unreadMessages > 1 ? "s" : ""} non lu${unreadMessages > 1 ? "s" : ""}`,
      description: "Consultez vos messages",
      path: "/messages",
      time: "Maintenant",
    });
  }
  if (pendingApprovals > 0) {
    notifications.push({
      id: "approvals",
      type: "approval",
      title: `${pendingApprovals} cours à approuver`,
      description: "En attente de validation",
      path: "/admin",
      time: "En attente",
    });
  }
  if (pendingBookings > 0) {
    notifications.push({
      id: "bookings",
      type: "approval",
      title: `${pendingBookings} réservation${pendingBookings > 1 ? "s" : ""} en attente`,
      description: "Nouvelles demandes de cours",
      path: "/coach/courses",
      time: "En attente",
    });
  }

  const iconForType = (type: string) => {
    switch (type) {
      case "message": return <MessageSquare className="h-4 w-4 text-primary" />;
      case "approval": return <CheckCircle className="h-4 w-4 text-amber-400" />;
      default: return <GraduationCap className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-xl bg-card/80 backdrop-blur-md border border-border/40 flex items-center justify-center text-foreground shadow-lg hover:bg-card transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold shadow-sm"
          >
            {totalCount > 9 ? "9+" : totalCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70]"
              onClick={() => setOpen(false)}
            />
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="absolute right-0 top-12 z-[80] w-[300px] rounded-2xl bg-card border border-border/60 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucune notification</p>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.map((notif) => (
                    <motion.button
                      key={notif.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setOpen(false);
                        navigate(notif.path);
                      }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/20 last:border-0 text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {iconForType(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{notif.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{notif.description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{notif.time}</span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
