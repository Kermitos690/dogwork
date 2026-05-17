import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, MessageSquare, Calendar, CreditCard, Heart, LifeBuoy, ShieldAlert, Sparkles, PawPrint } from "lucide-react";

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  type: string;
  title: string;
  body: string;
  url: string | null;
  image_url: string | null;
  priority: "low" | "normal" | "high";
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const ICONS: Record<string, React.ReactNode> = {
  messages: <MessageSquare className="h-4 w-4 text-blue-500" />,
  message: <MessageSquare className="h-4 w-4 text-blue-500" />,
  appointments: <Calendar className="h-4 w-4 text-emerald-500" />,
  appointment: <Calendar className="h-4 w-4 text-emerald-500" />,
  billing: <CreditCard className="h-4 w-4 text-amber-500" />,
  credits: <CreditCard className="h-4 w-4 text-amber-500" />,
  adoption: <Heart className="h-4 w-4 text-rose-500" />,
  shelter: <PawPrint className="h-4 w-4 text-purple-500" />,
  support: <LifeBuoy className="h-4 w-4 text-cyan-500" />,
  admin_alerts: <ShieldAlert className="h-4 w-4 text-red-500" />,
  plans: <Sparkles className="h-4 w-4 text-indigo-500" />,
  exercises: <Sparkles className="h-4 w-4 text-indigo-500" />,
  system: <Bell className="h-4 w-4 text-primary" />,
};

function iconFor(type: string) {
  return ICONS[type] ?? <Bell className="h-4 w-4 text-primary" />;
}

/**
 * Toaster racine DogWork — popup interne unifiée pour TOUTES les notifications
 * (table public.notifications, realtime). Aucune notif ne disparaît silencieusement
 * quand l'app est au premier plan : si Web Push échoue / SW absent / iOS non-PWA,
 * cette popup reste visible.
 */
export function DogWorkNotificationToaster() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userRef = useRef(user);
  userRef.current = user;
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;

    const handle = (n: NotificationRow) => {
      if (n.recipient_user_id !== uid) return;
      if (seenRef.current.has(n.id)) return;
      seenRef.current.add(n.id);
      // garbage-collect set
      if (seenRef.current.size > 200) {
        seenRef.current = new Set(Array.from(seenRef.current).slice(-100));
      }

      const isHigh = n.priority === "high";
      const url = n.url || "/";

      toast(n.title, {
        description: n.body?.length > 140 ? n.body.slice(0, 140) + "…" : n.body,
        icon: iconFor(n.type),
        duration: isHigh ? 15000 : 8000,
        position: "top-center",
        className: "!bg-card !border-border/60 !shadow-2xl !rounded-2xl",
        action: {
          label: "Ouvrir",
          onClick: () => {
            // marque lu best-effort
            supabase
              .from("notifications")
              .update({ read_at: new Date().toISOString() })
              .eq("id", n.id)
              .then(() => {});
            window.location.href = url;
          },
        },
      });

      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notif-unread"] });
      if (n.type === "messages" || n.type === "message") {
        queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    };

    const channel = supabase
      .channel(`notif-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${uid}`,
        },
        (payload) => handle(payload.new as NotificationRow),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return null;
}
