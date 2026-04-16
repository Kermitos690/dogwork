import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AIConversation {
  id: string;
  user_id: string;
  dog_id: string | null;
  title: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  credits_used: number;
  created_at: string;
}

// ─── List user conversations ─────────────────────────────────────
export function useAIConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-conversations", user?.id],
    queryFn: async (): Promise<AIConversation[]> => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AIConversation[];
    },
    enabled: !!user,
    staleTime: 10_000,
  });
}

// ─── Messages of one conversation ────────────────────────────────
export function useAIMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["ai-messages", conversationId],
    queryFn: async (): Promise<AIMessage[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as AIMessage[];
    },
    enabled: !!conversationId,
    staleTime: 5_000,
  });
}

// ─── Create new conversation ─────────────────────────────────────
export function useCreateConversation() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, dogId }: { title?: string; dogId?: string | null }) => {
      if (!user) throw new Error("Non connecté");
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          title: title || "Nouvelle conversation",
          dog_id: dogId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIConversation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });
}

// ─── Persist a message (user or assistant) ───────────────────────
export function useAddMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      role,
      content,
      creditsUsed = 0,
    }: {
      conversationId: string;
      role: "user" | "assistant" | "system";
      content: string;
      creditsUsed?: number;
    }) => {
      if (!user) throw new Error("Non connecté");
      const { data, error } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role,
          content,
          credits_used: creditsUsed,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIMessage;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["ai-messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });
}

// ─── Update conversation title ───────────────────────────────────
export function useUpdateConversationTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("ai_conversations")
        .update({ title })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });
}

// ─── Delete conversation ─────────────────────────────────────────
export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      toast.success("Conversation supprimée");
    },
    onError: () => toast.error("Suppression impossible"),
  });
}
