import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Bot, Sparkles, Loader2, Coins, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePreferences } from "@/hooks/usePreferences";
import { useAuth } from "@/hooks/useAuth";
import { useAIBalance } from "@/hooks/useAICredits";
import { CreditBalanceBadge } from "@/components/AICredits";
import { useQueryClient } from "@tanstack/react-query";
import { useDogs, useActiveDog } from "@/hooks/useDogs";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const AI_CREDITS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-with-credits`;
const COOLDOWN_SECONDS = 30;

async function streamChatWithCredits({
  messages,
  activeDogId,
  dogNames,
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: Msg[];
  activeDogId?: string | null;
  dogNames?: string[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (msg: string, code?: string, retryAfter?: number) => void;
  signal?: AbortSignal;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    onError("Vous devez être connecté pour utiliser le chatbot.", "AUTH_REQUIRED");
    return;
  }

  let resp: Response;
  try {
    resp = await fetch(AI_CREDITS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        feature_code: "chat_general",
        messages,
        stream: true,
        active_dog_id: activeDogId || undefined,
        dog_names: dogNames || [],
      }),
      signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError") return;
    onError("Impossible de contacter l'assistant. Vérifiez votre connexion.", "NETWORK_ERROR");
    return;
  }

  if (resp.status === 429) {
    const data = await resp.json().catch(() => ({}));
    const retryAfter = data.retry_after ?? COOLDOWN_SECONDS;
    onError(
      `Veuillez patienter ${retryAfter}s avant votre prochaine requête IA.`,
      "COOLDOWN_ACTIVE",
      retryAfter
    );
    return;
  }
  if (resp.status === 402) {
    const data = await resp.json().catch(() => ({}));
    onError(
      data.code === "INSUFFICIENT_CREDITS"
        ? `Crédits insuffisants (${data.balance ?? 0}/${data.required ?? 1}). Rechargez dans le Shop.`
        : "Crédits IA insuffisants. Rechargez dans le Shop.",
      "INSUFFICIENT_CREDITS"
    );
    return;
  }
  if (resp.status === 401 || resp.status === 403) {
    onError("Session expirée. Veuillez vous reconnecter.", "AUTH_EXPIRED");
    return;
  }
  if (!resp.ok || !resp.body) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "Erreur technique. Réessayez dans un instant.", "TECHNICAL_ERROR");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      const { done: rd, value } = await reader.read();
      if (rd) break;
      buf += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const json = line.slice(6).trim();
        if (json === "[DONE]") {
          onDone();
          return;
        }

        try {
          const p = JSON.parse(json);
          const c = p.choices?.[0]?.delta?.content as string | undefined;
          if (c) onDelta(c);
        } catch {
          buf = line + "\n" + buf;
          break;
        }
      }
    }
  } catch (err: any) {
    if (err.name === "AbortError") return;
    throw err;
  }
  onDone();
}

class AIChatBotBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? null : this.props.children; }
}

export function AIChatBot() {
  return (
    <AIChatBotBoundary>
      <AIChatBotSafe />
    </AIChatBotBoundary>
  );
}

function AIChatBotSafe() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  if (!user || preferences.hide_chatbot) return null;
  return <AIChatBotInner />;
}

function SuggestionChip({ text, icon, onClick }: { text: string; icon: string; onClick: (t: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 text-xs text-foreground transition-colors border border-border"
    >
      <span>{icon}</span>
      <span className="text-left">{text}</span>
    </button>
  );
}

function AIChatBotInner() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSuccessRef = useRef<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dog context
  const { data: dogs } = useDogs();
  const activeDog = useActiveDog();
  const dogNames = dogs?.map(d => d.name) || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const startCooldownTimer = useCallback((seconds: number) => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setCooldownRemaining(seconds);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const canSend = !loading && cooldownRemaining === 0 && input.trim().length > 0;

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || cooldownRemaining > 0) return;

    // Prevent rapid fire: check frontend cooldown
    const elapsed = (Date.now() - lastSuccessRef.current) / 1000;
    if (elapsed < COOLDOWN_SECONDS && lastSuccessRef.current > 0) {
      const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
      startCooldownTimer(remaining);
      toast({ title: "Cooldown actif", description: `Patientez ${remaining}s entre deux requêtes.` });
      return;
    }

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChatWithCredits({
        messages: [...messages, userMsg],
        activeDogId: activeDog?.id,
        dogNames,
        signal: controller.signal,
        onDelta: upsert,
        onDone: () => {
          setLoading(false);
          lastSuccessRef.current = Date.now();
          startCooldownTimer(COOLDOWN_SECONDS);
          queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
        },
        onError: (msg, code, retryAfter) => {
          setLoading(false);

          if (code === "COOLDOWN_ACTIVE") {
            const wait = retryAfter ?? COOLDOWN_SECONDS;
            startCooldownTimer(wait);
            toast({ title: "Cooldown actif", description: msg });
          } else if (code === "INSUFFICIENT_CREDITS") {
            toast({
              title: "Crédits insuffisants",
              description: msg,
              variant: "destructive",
              action: (
                <Button variant="outline" size="sm" onClick={() => navigate("/shop")}>
                  Shop
                </Button>
              ) as any,
            });
          } else if (code === "AUTH_EXPIRED" || code === "AUTH_REQUIRED") {
            toast({ title: "Session expirée", description: msg, variant: "destructive" });
          } else {
            toast({ title: "Erreur IA", description: msg, variant: "destructive" });
          }
        },
      });
    } catch {
      toast({ title: "Erreur", description: "Impossible de contacter l'assistant.", variant: "destructive" });
      setLoading(false);
    }
  }, [input, loading, cooldownRemaining, messages, activeDog?.id, dogNames, startCooldownTimer, toast, navigate, queryClient]);

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 right-4 z-50"
          >
            <Button
              onClick={() => setOpen(true)}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              aria-label="Ouvrir l'assistant IA"
            >
              <Bot className="h-5 w-5" aria-hidden="true" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card border-t border-border rounded-t-2xl shadow-2xl"
            style={{ height: "70vh", maxHeight: "600px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">DogWork AI</span>
                {activeDog && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    🐕 {activeDog.name}
                  </span>
                )}
                <CreditBalanceBadge />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label="Fermer le chat">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-6 space-y-3">
                  <Bot className="h-10 w-10 mx-auto text-primary/40" />
                  <p className="font-medium text-foreground">Bonjour ! 🐕</p>
                  <p className="text-xs">
                    {activeDog
                      ? <>Je connais <strong>{activeDog.name}</strong> et sa fiche complète. Comment puis-je vous aider ?</>
                      : "Sélectionnez un chien pour que je puisse accéder à sa fiche et vous aider au mieux."
                    }
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {activeDog ? (
                      <>
                        <SuggestionChip onClick={(t) => setInput(t)} text={`${activeDog.name} vient d'un refuge ?`} icon="🏠" />
                        <SuggestionChip onClick={(t) => setInput(t)} text={`Quels exercices pour ${activeDog.name} ?`} icon="🎯" />
                        <SuggestionChip onClick={(t) => setInput(t)} text={`Comment gérer la réactivité de ${activeDog.name} ?`} icon="⚡" />
                        <SuggestionChip onClick={(t) => setInput(t)} text={`Analyse comportementale de ${activeDog.name}`} icon="📊" />
                      </>
                    ) : (
                      <>
                        <SuggestionChip onClick={(t) => setInput(t)} text="J'ai adopté un chien en refuge" icon="🏠" />
                        <SuggestionChip onClick={(t) => setInput(t)} text="Mon chien tire en laisse" icon="🐕‍🦺" />
                        <SuggestionChip onClick={(t) => setInput(t)} text="Comment socialiser mon chien ?" icon="🤝" />
                      </>
                    )}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                        : "bg-muted text-foreground rounded-bl-md prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border">
              {/* Cooldown indicator */}
              {cooldownRemaining > 0 && !loading && (
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Prochaine requête dans {cooldownRemaining}s</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/40 rounded-full transition-all duration-1000"
                      style={{ width: `${((COOLDOWN_SECONDS - cooldownRemaining) / COOLDOWN_SECONDS) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    loading ? "Réponse en cours..."
                    : cooldownRemaining > 0 ? `Disponible dans ${cooldownRemaining}s...`
                    : activeDog ? `Parlez-moi de ${activeDog.name}...`
                    : "Posez votre question..."
                  }
                  className="flex-1 bg-muted rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full h-9 w-9"
                  disabled={!canSend}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
