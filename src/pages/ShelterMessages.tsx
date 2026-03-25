import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Send, ArrowLeft, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

interface Conversation {
  user_id: string;
  display_name: string;
  last_message: string;
  last_at: string;
  unread: number;
}

export default function ShelterMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<string | null>(searchParams.get("user"));
  const [selectedName, setSelectedName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get admin user id
  const { data: adminUserId } = useQuery({
    queryKey: ["admin-user-for-shelter"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin" as any)
        .limit(1)
        .maybeSingle();
      return data?.user_id || null;
    },
    enabled: !!user,
  });

  // Get shelter employees (for filtering conversations)
  const { data: employeeUserIds = [] } = useQuery({
    queryKey: ["shelter-employee-emails", user?.id],
    queryFn: async () => {
      // Employees are stored by name/email, not user_id — we'll allow admin only for now
      // since employees don't have user accounts in the system
      return [] as string[];
    },
    enabled: !!user,
  });

  // Allowed contact IDs = admin only (employees don't have accounts)
  const allowedContactIds = adminUserId ? [adminUserId] : [];

  const { data: conversations = [] } = useQuery({
    queryKey: ["shelter-conversations", user?.id],
    queryFn: async () => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (!msgs || msgs.length === 0) return [];

      const convMap = new Map<string, { last: typeof msgs[0]; unread: number }>();
      for (const m of msgs) {
        const otherId = m.sender_id === user!.id ? m.recipient_id : m.sender_id;
        // Only show conversations with allowed contacts (admin)
        if (allowedContactIds.length > 0 && !allowedContactIds.includes(otherId)) continue;
        if (!convMap.has(otherId)) {
          convMap.set(otherId, { last: m, unread: 0 });
        }
        if (!m.read && m.recipient_id === user!.id) {
          convMap.get(otherId)!.unread++;
        }
      }

      const userIds = [...convMap.keys()];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      return userIds.map((uid) => ({
        user_id: uid,
        display_name: profiles?.find((p) => p.user_id === uid)?.display_name || "Administrateur",
        last_message: convMap.get(uid)!.last.content,
        last_at: convMap.get(uid)!.last.created_at,
        unread: convMap.get(uid)!.unread,
      })) as Conversation[];
    },
    enabled: !!user && allowedContactIds.length > 0,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("shelter-messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id || msg.recipient_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ["shelter-conversations"] });
            queryClient.invalidateQueries({ queryKey: ["shelter-chat"] });
            queryClient.invalidateQueries({ queryKey: ["shelter-unread-count"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const { data: chatMessages = [] } = useQuery({
    queryKey: ["shelter-chat", user?.id, selectedUser],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user!.id},recipient_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},recipient_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user && !!selectedUser,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Mark as read
  useEffect(() => {
    if (selectedUser && user) {
      supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", selectedUser)
        .eq("recipient_id", user.id)
        .eq("read", false)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["shelter-conversations"] });
          queryClient.invalidateQueries({ queryKey: ["shelter-unread-count"] });
        });
    }
  }, [selectedUser, chatMessages.length]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim() || !selectedUser) return;
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id,
        recipient_id: selectedUser,
        content: newMessage.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["shelter-chat"] });
      queryClient.invalidateQueries({ queryKey: ["shelter-conversations"] });
    },
  });

  // Chat view
  if (selectedUser) {
    return (
      <ShelterLayout>
        <div className="pt-14 pb-24 flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {selectedName?.[0]?.toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm text-foreground">{selectedName || "Administrateur"}</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
            {chatMessages.map((m: any) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p>{m.content}</p>
                    <p className={`text-[9px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {format(new Date(m.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Votre message..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMutation.mutate()}
            />
            <Button size="icon" onClick={() => sendMutation.mutate()} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </ShelterLayout>
    );
  }

  // Conversation list
  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-14 pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Messages
        </h1>

        {adminUserId && !conversations.some((c) => c.user_id === adminUserId) && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              setSelectedUser(adminUserId);
              setSelectedName("Administrateur");
            }}
          >
            <MessageSquare className="h-4 w-4" /> Contacter l'administrateur
          </Button>
        )}

        {conversations.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune conversation</p>
              <p className="text-xs text-muted-foreground mt-1">Contactez l'administrateur pour démarrer.</p>
            </CardContent>
          </Card>
        )}

        {conversations.map((conv) => (
          <Card
            key={conv.user_id}
            className="cursor-pointer card-press"
            onClick={() => {
              setSelectedUser(conv.user_id);
              setSelectedName(conv.display_name);
            }}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {conv.display_name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">{conv.display_name}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(conv.last_at), "dd/MM HH:mm", { locale: fr })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
              </div>
              {conv.unread > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {conv.unread}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </ShelterLayout>
  );
}
