/**
 * Bibliothèque centralisée des documents générés par l'IA.
 * Sauvegarde automatique à chaque génération réussie + consultation/archivage.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type AIDocumentType =
  | "training_plan"
  | "behavior_analysis"
  | "evaluation_scoring"
  | "adoption_plan"
  | "progress_report"
  | "image"
  | "other";

export interface AIDocument {
  id: string;
  user_id: string;
  dog_id: string | null;
  feature_code: string;
  document_type: AIDocumentType;
  title: string;
  summary: string | null;
  content: Record<string, unknown>;
  credits_spent: number;
  model_used: string | null;
  is_archived: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface SaveDocumentInput {
  dog_id?: string | null;
  feature_code: string;
  document_type: AIDocumentType;
  title: string;
  summary?: string;
  content: Record<string, unknown>;
  credits_spent?: number;
  model_used?: string;
  metadata?: Record<string, unknown>;
}

/** Liste des documents (filtrable par type, par chien, archivés ou actifs) */
export function useAIDocuments(filter?: {
  type?: AIDocumentType;
  dogId?: string;
  includeArchived?: boolean;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-documents", user?.id, filter],
    queryFn: async () => {
      let q = supabase
        .from("ai_generated_documents" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (filter?.type) q = q.eq("document_type", filter.type);
      if (filter?.dogId) q = q.eq("dog_id", filter.dogId);
      if (!filter?.includeArchived) q = q.eq("is_archived", false);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AIDocument[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

/** Sauvegarde un document IA généré (à appeler après chaque génération réussie) */
export function useSaveAIDocument() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveDocumentInput) => {
      if (!user) throw new Error("Non connecté");

      const { data, error } = await supabase
        .from("ai_generated_documents" as any)
        .insert({
          user_id: user.id,
          dog_id: input.dog_id ?? null,
          feature_code: input.feature_code,
          document_type: input.document_type,
          title: input.title,
          summary: input.summary ?? "",
          content: input.content,
          credits_spent: input.credits_spent ?? 0,
          model_used: input.model_used ?? null,
          metadata: input.metadata ?? {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AIDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-documents"] });
    },
  });
}

/** Renomme / archive / désarchive un document */
export function useUpdateAIDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<AIDocument, "title" | "summary" | "is_archived">>;
    }) => {
      const { data, error } = await supabase
        .from("ai_generated_documents" as any)
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AIDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-documents"] });
      toast.success("Document mis à jour");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Supprime définitivement un document */
export function useDeleteAIDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_generated_documents" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-documents"] });
      toast.success("Document supprimé");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
