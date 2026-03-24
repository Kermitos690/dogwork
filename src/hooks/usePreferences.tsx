import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AccentColor = "blue" | "purple" | "cyan" | "pink" | "emerald" | "amber" | "red";
export type ThemeMode = "dark" | "light";

export interface UserPreferences {
  accent_color: AccentColor;
  theme_mode: ThemeMode;
  hide_chatbot: boolean;
  hide_read_aloud: boolean;
  hide_guided_tour: boolean;
  visible_sections: string[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  accent_color: "blue",
  theme_mode: "dark",
  hide_chatbot: false,
  hide_read_aloud: false,
  hide_guided_tour: false,
  visible_sections: ["journal", "stats", "exercises", "courses", "safety", "messages"],
};

const PreferencesContext = createContext<{
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  isLoading: boolean;
}>({
  preferences: DEFAULT_PREFERENCES,
  updatePreference: () => {},
  isLoading: true,
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["user_preferences", user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_PREFERENCES;
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_PREFERENCES;
      return {
        accent_color: data.accent_color as AccentColor,
        theme_mode: (data as any).theme_mode as ThemeMode || "dark",
        hide_chatbot: data.hide_chatbot,
        hide_read_aloud: data.hide_read_aloud,
        hide_guided_tour: data.hide_guided_tour,
        visible_sections: data.visible_sections as string[],
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      if (!user) return;
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_preferences")
          .update(updates as any)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_preferences")
          .insert({ user_id: user.id, ...updates } as any);
        if (error) throw error;
      }
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["user_preferences", user?.id] });
      const previous = queryClient.getQueryData(["user_preferences", user?.id]);
      queryClient.setQueryData(["user_preferences", user?.id], (old: UserPreferences | undefined) => ({
        ...(old || DEFAULT_PREFERENCES),
        ...updates,
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["user_preferences", user?.id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user_preferences", user?.id] });
    },
  });

  const current = preferences || DEFAULT_PREFERENCES;

  // Apply accent color class to body
  useEffect(() => {
    const body = document.body;
    body.classList.forEach((cls) => {
      if (cls.startsWith("accent-")) body.classList.remove(cls);
    });
    if (current.accent_color !== "blue" && !body.classList.contains("theme-coach") && !body.classList.contains("theme-admin") && !body.classList.contains("theme-shelter")) {
      body.classList.add(`accent-${current.accent_color}`);
    }
  }, [current.accent_color]);

  // Apply theme mode (light/dark)
  useEffect(() => {
    const root = document.documentElement;
    if (current.theme_mode === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [current.theme_mode]);

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    mutation.mutate({ [key]: value });
  };

  return (
    <PreferencesContext.Provider value={{ preferences: current, updatePreference, isLoading }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
