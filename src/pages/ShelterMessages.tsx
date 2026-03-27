import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Send, ArrowLeft, MessageSquare, Search, Users, ShieldCheck, GraduationCap, Heart } from "lucide-react";
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

interface Contact {
  user_id: string;
  display_name: string;
  role_label: string;
  detail?: string;
}

export default function ShelterMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<string | null>(searchParams.get("user"));
  const [selectedName, setSelectedName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch contacts: admin + coaches + adopters
  const { data: contacts = [] } = useQuery({
    queryKey: ["shelter-contacts", user?.id],
    queryFn: async () => {
      const result: Contact[] = [];

      // 1. Admin
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin" as any)
        .limit(1)
        .maybeSingle();
      if (adminRole) {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", adminRole.user_id)
          .maybeSingle();
        result.push({
          user_id: adminRole.user_id,
          display_name: adminProfile?.display_name || "Administrateur",
          role_label: "Support",
        });
      }

      // 2. Linked coaches
      const { data: coachLinks } = await supabase
        .from("shelter_coaches")
        .select("coach_user_id")
        .eq("shelter_user_id", user!.id)
        .eq("status", "active");
      if (coachLinks && coachLinks.length > 0) {
        const coachIds = coachLinks.map(c => c.coach_user_id);
        const { data: coachProfiles } = await supabase
          .from("coach_profiles")
          .select("user_id, display_name, specialty")
          .in("user_id", coachIds);
        for (const cp of coachProfiles || []) {
          result.push({
            user_id: cp.user_id,
            display_name: cp.display_name || "Éducateur",
            role_label: "Éducateur",
            detail: cp.specialty || undefined,
          });
        }
      }

      // 3. Adopters via adopter_links
      const { data: adopterLinks } = await supabase
        .from("adopter_links" as any)
        .select("adopter_user_id, animal_name")
        .eq("shelter_user_id", user!.id);
      if (adopterLinks && adopterLinks.length > 0) {
        const adopterIds = [...new Set((adopterLinks as any[]).map((l: any) => l.adopter_user_id))];
        const { data: adopterProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", adopterIds);
        for (const ap of adopterProfiles || []) {
          const animals = (adopterLinks as any[])
            .filter((l: any) => l.adopter_user_id === ap.user_id)
            .map((l: any) => l.animal_name)
            .filter(Boolean)
            .join(", ");
          result.push({
            user_id: ap.user_id,
            display_name: ap.display_name || "Adoptant",
            role_label: "Adoptant",
            detail: animals ? `A adopté : ${animals}` : undefined,
          });
        }
      }

      return result;
    },
    enabled: !!user,
  });

  // Fetch conversations
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
        display_name: profiles?.find((p) => p.user_id === uid)?.display_name || "Utilisateur",
        last_message: convMap.get(uid)!.last.content,
        last_at: convMap.get(uid)!.last.created_at,
        unread: convMap.get(uid)!.unread,
      })) as Conversation[];
    },
    enabled: !!user,
  });

  // Search users
  const { data: searchResults = [] } = useQuery({
    queryKey: ["shelter-search-contacts", search],
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

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("shelter-messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user.id || msg.recipient_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ["shelter-conversations"] });
          queryClient.invalidateQueries({ queryKey: ["shelter-chat"] });
          queryClient.invalidateQueries({ queryKey: ["shelter-unread-count"] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const { data: chatMessages = [] } = useQuery({
    queryKey: ["shelter-chat", user?.id, selectedUser],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},recipient_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user && !!selectedUser,
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

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

  const filteredConversations = conversations.filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const roleIcon = (label: string) => {
    if (label === "Éducateur") return <GraduationCap className="h-3.5 w-3.5" />;
    if (label === "Adoptant") return <Heart className="h-3.5 w-3.5" />;
    return <ShieldCheck className="h-3.5 w-3.5" />;
  };

  // Chat view
  if (selectedUser) {
    return (
      <ShelterLayout>
        <div className="pb-24 flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {selectedName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm text-foreground">{selectedName || "Utilisateur"}</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
            {chatMessages.map((m: any) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                  }`}>
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

  // Conversation list with contacts
  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Messages
        </h1>

        {/* Contacts section */}
        {contacts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Vos contacts
            </p>
            <div className="space-y-1.5">
              {contacts.map((c) => {
                const existing = conversations.find(conv => conv.user_id === c.user_id);
                return (
                  <button
                    key={c.user_id}
                    onClick={() => {
                      setSelectedUser(c.user_id);
                      setSelectedName(c.display_name);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors border border-border/30"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {c.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{c.display_name}</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5 text-muted-foreground">
                          {roleIcon(c.role_label)} {c.role_label}
                        </span>
                      </div>
                      {c.detail && <p className="text-xs text-muted-foreground truncate">{c.detail}</p>}
                    </div>
                    {existing && existing.unread > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {existing.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un contact..."
            className="pl-10 bg-muted border-border/40"
          />
        </div>

        {search.length >= 2 && searchResults.length > 0 && (
          <div className="rounded-xl border border-border/40 overflow-hidden">
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

        {/* Other conversations not in contacts */}
        {(() => {
          const contactIds = new Set(contacts.map(c => c.user_id));
          const otherConvs = filteredConversations.filter(c => !contactIds.has(c.user_id));

          if (otherConvs.length === 0 && contacts.length === 0 && search.length < 2) {
            return (
              <Card>
                <CardContent className="p-6 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune conversation</p>
                </CardContent>
              </Card>
            );
          }

          if (otherConvs.length > 0) {
            return (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Autres conversations</p>
                {otherConvs.map((conv) => (
                  <Card key={conv.user_id} className="cursor-pointer card-press" onClick={() => {
                    setSelectedUser(conv.user_id);
                    setSelectedName(conv.display_name);
                  }}>
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
              </div>
            );
          }
          return null;
        })()}
      </motion.div>
    </ShelterLayout>
  );
}
