import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatCapture = {
  kind: "behavior_log" | "health_note" | "dog_field_update" | "dog_problem" | "dog_objective";
  target_field?: string | null;
  payload: Record<string, any>;
  summary: string;
  confidence: number;
  dog_id: string;
  dog_name: string;
};

/**
 * Hook léger : déclenche l'extraction des captures pour un message utilisateur
 * et expose une fonction `apply` pour valider une capture (écriture en DB).
 */
export function useChatCapture() {
  const [extracting, setExtracting] = useState(false);

  const extract = useCallback(async (params: {
    user_message: string;
    active_dog_id: string;
  }): Promise<ChatCapture[]> => {
    if (!params.active_dog_id || !params.user_message?.trim()) return [];
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-capture-event", {
        body: params,
      });
      if (error) {
        console.warn("[useChatCapture] extract error", error);
        return [];
      }
      const captures = Array.isArray(data?.captures) ? (data.captures as ChatCapture[]) : [];
      return captures;
    } catch (err) {
      console.warn("[useChatCapture] extract exception", err);
      return [];
    } finally {
      setExtracting(false);
    }
  }, []);

  const apply = useCallback(async (capture: ChatCapture): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("apply-chat-capture", {
        body: { capture },
      });
      if (error) return { ok: false, error: error.message };
      if (data?.error) return { ok: false, error: data.error };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? "Erreur inconnue" };
    }
  }, []);

  return { extract, apply, extracting };
}
