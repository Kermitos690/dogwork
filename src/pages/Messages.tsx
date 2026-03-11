import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, Search, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  user_id: string;
  display_name: string;
  last_message: string;
  last_at: string;
  unread: number;
}

export default function Messages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      // Get all messages involving user
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (!msgs || msgs.length === 0) return [];

      // Group by other user
      const convMap = new Map<string, { last: typeof msgs[0]; unread: number }>();
      for (const m of msgs) {
        const otherId = m.sender_id === user!.id ? m.recipient_id : m.sender_id;
        if (!convMap.has(otherId)) {
          convMap.set(otherId, { last: m, unread: 0 });
        }
        if (!m.read && m.recipient_id === user!.id) {
          convMap.get(otherId)!.unread++;
        }
      }

      // Get display names
      const otherIds = Array.from(convMap.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", otherIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || "Utilisateur"]) || []);

      return Array.from(convMap.entries()).map(([uid, conv]) => ({
        user_id: uid,
        display_name: profileMap.get(uid) || "Utilisateur",
        last_message: conv.last.content,
        last_at: conv.last.created_at,
        unread: conv.unread,
      })) as Conversation[];
    },
    enabled: !!user,
    refetchInterval: 10_000,
  });

  // Fetch thread messages
  const { data: threadMessages = [] } = useQuery({
    queryKey: ["thread", user?.id, selectedUser],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},recipient_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user && !!selectedUser,
    refetchInterval: 5_000,
  });

  // Mark as read when opening thread
  useEffect(() => {
    if (!selectedUser || !user) return;
    supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", selectedUser)
      .eq("recipient_id", user.id)
      .eq("read", false)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
      });
  }, [selectedUser, user, threadMessages.length]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [threadMessages]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id,
        recipient_id: selectedUser!,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["thread"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Search users to start new conversation
  const { data: searchResults = [] } = useQuery({
    queryKey: ["search-users", search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .ilike("display_name", `%${search}%`)
        .neq("user_id", user!.id)
        .limit(10);
      return data || [];
    },
    enabled: !!user && search.length >= 2,
  });

  const filteredConversations = conversations.filter(c =>
    c.display_name.toLowerCase().includes(search.toLowerCase())
  );

  // Thread view
  if (selectedUser) {
    return (
      <AppLayout>
        <div className="pt-14 pb-4">
          {/* Thread header */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {selectedName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="font-semibold text-foreground">{selectedName}</h2>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="h-[calc(100vh-220px)] overflow-y-auto space-y-3 pr-1">
            {threadMessages.map((msg) => {
              const isMine = msg.sender_id === user!.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="flex gap-2 mt-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-1 bg-muted border-border/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newMessage.trim()) {
                  sendMutation.mutate(newMessage.trim());
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => newMessage.trim() && sendMutation.mutate(newMessage.trim())}
              disabled={!newMessage.trim() || sendMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Conversations list view
  return (
    <AppLayout>
      <div className="pt-14 pb-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Messages</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="pl-10 bg-muted border-border/40"
          />
        </div>

        {/* Search results (new conversation) */}
        {search.length >= 2 && searchResults.length > 0 && (
          <div className="mb-4 rounded-xl border border-border/40 overflow-hidden">
            <p className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">Nouveau message</p>
            {searchResults.map((u) => (
              <button
                key={u.user_id}
                onClick={() => {
                  setSelectedUser(u.user_id);
                  setSelectedName(u.display_name || "Utilisateur");
                  setSearch("");
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-accent/20 text-accent text-xs">
                    {(u.display_name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground">{u.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Conversations */}
        {filteredConversations.length === 0 && search.length < 2 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune conversation</p>
            <p className="text-xs mt-1">Recherchez un utilisateur pour démarrer</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conv) => (
              <button
                key={conv.user_id}
                onClick={() => {
                  setSelectedUser(conv.user_id);
                  setSelectedName(conv.display_name);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {conv.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{conv.display_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(conv.last_at), "dd/MM", { locale: fr })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

import { MessageSquare } from "lucide-react";
