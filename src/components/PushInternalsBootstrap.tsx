// Auto-configure les paramètres internes du push (URL + service role) la 1ère fois
// qu'un admin charge l'app. Idempotent côté backend.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

let attempted = false;

export function PushInternalsBootstrap() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || attempted || ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!role) return;
        // Vérifie si déjà configuré
        const { data: existing } = await supabase
          .from("app_internal_settings")
          .select("key")
          .eq("key", "service_role_key")
          .maybeSingle();
        // Toujours appeler — la function lit les VRAIES env vars Supabase et upsert
        await supabase.functions.invoke("setup-push-internals", { body: {} });
        attempted = true;
      } catch {
        attempted = true;
      }
    })();
  }, [user]);

  return null;
}
