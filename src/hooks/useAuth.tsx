import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Check if URL contains recovery markers — if so, we must wait for the
    // code exchange to complete before declaring "not loading" to avoid
    // premature redirect to /landing.
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hasRecoveryMarkers =
      params.has("code") ||
      params.get("type") === "recovery" ||
      hash.includes("type=recovery") ||
      hash.includes("access_token=");
    let codeExchangeHandled = !hasRecoveryMarkers; // if no markers, no need to wait

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
      // For recovery flows, only stop loading once we get a real auth event
      // (not INITIAL_SESSION which fires before code exchange).
      if (event !== "INITIAL_SESSION" || codeExchangeHandled) {
        codeExchangeHandled = true;
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Only stop loading from getSession if there's no pending code exchange
      if (codeExchangeHandled) {
        setLoading(false);
      }
    });

    // Safety timeout: if code exchange never fires (expired/invalid token),
    // stop loading after 5 seconds to avoid infinite spinner.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (hasRecoveryMarkers) {
      timeout = setTimeout(() => {
        codeExchangeHandled = true;
        setLoading(false);
      }, 5000);
    }

    return () => {
      subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    // Use the current origin so the redirect works from any deployed domain
    // (dogwork.lovable.app, www.dogwork-at-home.com, preview, etc.)
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error: error as Error | null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, isPasswordRecovery, clearPasswordRecovery, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
