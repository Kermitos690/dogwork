import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

/**
 * Global component that listens to realtime events and shows native-like popup notifications.
 * Mount once at app root level.
 */
export function NotificationToast() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.recipient_id !== userRef.current?.id) return;
          if (msg.sender_id === userRef.current?.id) return;

          // Fetch sender name
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", msg.sender_id)
            .maybeSingle();

          const senderName = profile?.display_name || "Quelqu'un";

          toast(senderName, {
            description: msg.content?.substring(0, 80) + (msg.content?.length > 80 ? "…" : ""),
            icon: <MessageSquare className="h-4 w-4 text-primary" />,
            duration: 5000,
            position: "top-center",
            className: "!bg-card !border-border/60 !shadow-2xl !rounded-2xl",
          });

          // Invalidate caches
          queryClient.invalidateQueries({ queryKey: ["notif-unread-messages"] });
          queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return null;
}
