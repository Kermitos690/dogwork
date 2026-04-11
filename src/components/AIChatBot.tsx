import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Lock, Bot, Sparkles, Loader2, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useHasFeature } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { usePreferences } from "@/hooks/usePreferences";
import { useAIBalance } from "@/hooks/useAICredits";
import { CreditBalanceBadge } from "@/components/AICredits";
import { useQueryClient } from "@tanstack/react-query";
import { useDogs, useActiveDog } from "@/hooks/useDogs";

type Msg = { role: "user" | "assistant"; content: string };

const AI_CREDITS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-with-credits`;

async function streamChatWithCredits({
  messages,
  activeDogId,
  dogNames,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  activeDogId?: string | null;
  dogNames?: string[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (msg: string, code?: string) => void;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    onError("Vous devez être connecté pour utiliser le chatbot.");
    return;
  }

  const resp = await fetch(AI_CREDITS_URL, {
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
  });

  if (resp.status === 429) {
    onError("Trop de requêtes. Réessayez dans quelques instants.");
    return;
  }
  if (resp.status === 402) {
    const data = await resp.json().catch(() => ({}));
    if (data.code === "INSUFFICIENT_CREDITS") {
      onError(`Crédits insuffisants (${data.balance}/${data.required})`, "INSUFFICIENT_CREDITS");
    } else {
      onError("Crédits IA insuffisants.");
    }
    return;
  }
  if (!resp.ok || !resp.body) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "Erreur de connexion à l'IA.");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
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
      if (json === "[DONE]") { done = true; break; }

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
  const { preferences } = usePreferences();
  if (preferences.hide_chatbot) return null;

  return <AIChatBotInner />;
}

function AIChatBotInner() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const hasChat = useHasFeature("ai_chat");
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

  if (!hasChat) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-20 right-4 z-50 rounded-full bg-muted p-3.5 shadow-lg"
        onClick={() => navigate("/subscription")}
        aria-label="Débloquez le chatbot IA avec le plan Expert"
      >
        <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </motion.button>
    );
  }

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
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
        onDelta: upsert,
        onDone: () => {
          setLoading(false);
          queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
        },
        onError: (msg, code) => {
          if (code === "INSUFFICIENT_CREDITS") {
            toast({ title: "Crédits insuffisants", description: "Achetez des crédits IA dans Paramètres.", variant: "destructive" });
          } else {
            toast({ title: "Erreur IA", description: msg, variant: "destructive" });
          }
          setLoading(false);
        },
      });
    } catch {
      toast({ title: "Erreur", description: "Impossible de contacter l'assistant.", variant: "destructive" });
      setLoading(false);
    }
  };

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
                <div className="text-center text-muted-foreground text-sm py-8 space-y-2">
                  <Bot className="h-10 w-10 mx-auto text-primary/40" />
                  <p className="font-medium text-foreground">Bonjour ! 🐕</p>
                  <p>Je suis votre assistant en éducation canine.</p>
                  {activeDog && (
                    <p className="text-xs text-primary/80">
                      Je connais <strong>{activeDog.name}</strong> — posez-moi des questions à son sujet !
                    </p>
                  )}
                  <p className="text-xs">
                    {activeDog 
                      ? `Exemple : "Quels exercices pour ${activeDog.name} ?" ou "Comment gérer sa réactivité ?"`
                      : "Posez-moi une question sur le comportement, les exercices ou l'entraînement de votre chien."
                    }
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {m.content}
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
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeDog ? `Parlez-moi de ${activeDog.name}...` : "Posez votre question..."}
                  className="flex-1 bg-muted rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={loading}
                />
                <Button type="submit" size="icon" className="rounded-full h-9 w-9" disabled={loading || !input.trim()}>
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
