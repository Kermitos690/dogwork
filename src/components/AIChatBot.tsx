import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Bot, Sparkles, Loader2, Clock, History, Plus, Trash2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePreferences } from "@/hooks/usePreferences";
import { useAuth } from "@/hooks/useAuth";
import { CreditBalanceBadge } from "@/components/AICredits";
import { useQueryClient } from "@tanstack/react-query";
import { useDogs, useActiveDog } from "@/hooks/useDogs";
import {
  useAIConversations,
  useAIMessages,
  useCreateConversation,
  useAddMessage,
  useDeleteConversation,
  useUpdateConversationTitle,
} from "@/hooks/useAIConversations";
import { useCreditConfirmation } from "@/hooks/useCreditConfirmation";
import { CreditConfirmDialog } from "@/components/CreditConfirmDialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const AI_CREDITS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-with-credits`;
const COOLDOWN_SECONDS = 30;
const FEATURE_CODE = "chat_general";

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
        feature_code: FEATURE_CODE,
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
    onError(`Veuillez patienter ${retryAfter}s avant votre prochaine requête IA.`, "COOLDOWN_ACTIVE", retryAfter);
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
        if (json === "[DONE]") { onDone(); return; }

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
  const [showHistory, setShowHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draftMessages, setDraftMessages] = useState<Msg[]>([]);
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

  const { data: dogs } = useDogs();
  const activeDog = useActiveDog();
  const dogNames = dogs?.map(d => d.name) || [];

  // Conversation persistence
  const { data: conversations } = useAIConversations();
  const { data: persistedMessages } = useAIMessages(conversationId);
  const createConversation = useCreateConversation();
  const addMessage = useAddMessage();
  const deleteConversation = useDeleteConversation();
  const updateTitle = useUpdateConversationTitle();

  // Credit confirmation
  const credit = useCreditConfirmation();

  // Merge persisted messages + draft (during streaming)
  const messages: Msg[] = conversationId
    ? [
        ...((persistedMessages || []).map(m => ({ role: m.role as "user" | "assistant", content: m.content }))),
        ...draftMessages,
      ]
    : draftMessages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, draftMessages]);

  useEffect(() => {
    if (open && inputRef.current && !showHistory) inputRef.current.focus();
  }, [open, showHistory, conversationId]);

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

  const newConversation = useCallback(() => {
    setConversationId(null);
    setDraftMessages([]);
    setShowHistory(false);
    setInput("");
  }, []);

  const openConversation = useCallback((id: string) => {
    setConversationId(id);
    setDraftMessages([]);
    setShowHistory(false);
  }, []);

  const executeSend = useCallback(async (text: string) => {
    // Ensure conversation exists
    let convId = conversationId;
    if (!convId) {
      const conv = await createConversation.mutateAsync({
        title: text.slice(0, 60),
        dogId: activeDog?.id ?? null,
      });
      convId = conv.id;
      setConversationId(convId);
    }

    // Persist user message immediately
    await addMessage.mutateAsync({
      conversationId: convId,
      role: "user",
      content: text,
      creditsUsed: 0,
    });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    let assistantSoFar = "";
    setDraftMessages([{ role: "assistant", content: "" }]);

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setDraftMessages([{ role: "assistant", content: assistantSoFar }]);
    };

    try {
      await streamChatWithCredits({
        messages: [...messages, { role: "user", content: text }],
        activeDogId: activeDog?.id,
        dogNames,
        signal: controller.signal,
        onDelta: upsert,
        onDone: async () => {
          setLoading(false);
          lastSuccessRef.current = Date.now();
          startCooldownTimer(COOLDOWN_SECONDS);
          // Persist assistant response
          if (assistantSoFar.trim()) {
            await addMessage.mutateAsync({
              conversationId: convId!,
              role: "assistant",
              content: assistantSoFar,
              creditsUsed: credit.cost,
            });
          }
          setDraftMessages([]);
          queryClient.invalidateQueries({ queryKey: ["ai-balance"] });
        },
        onError: (msg, code, retryAfter) => {
          setLoading(false);
          setDraftMessages([]);
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
      setDraftMessages([]);
    }
  }, [conversationId, createConversation, addMessage, messages, activeDog, dogNames, startCooldownTimer, toast, navigate, queryClient, credit.cost]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || loading || cooldownRemaining > 0) return;

    const elapsed = (Date.now() - lastSuccessRef.current) / 1000;
    if (elapsed < COOLDOWN_SECONDS && lastSuccessRef.current > 0) {
      const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
      startCooldownTimer(remaining);
      toast({ title: "Cooldown actif", description: `Patientez ${remaining}s entre deux requêtes.` });
      return;
    }

    setInput("");
    credit.requestConfirmation({
      featureCode: FEATURE_CODE,
      benefit: activeDog
        ? `Réponse personnalisée prenant en compte la fiche complète de ${activeDog.name}.`
        : "Réponse experte basée sur les meilleures pratiques en éducation canine.",
      onConfirm: () => executeSend(text),
    });
  }, [input, loading, cooldownRemaining, activeDog, startCooldownTimer, toast, credit, executeSend]);

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
            style={{ height: "75vh", maxHeight: "650px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-sm text-foreground truncate">DogWork AI</span>
                {activeDog && !showHistory && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate">
                    🐕 {activeDog.name}
                  </span>
                )}
                <CreditBalanceBadge />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(v => !v)} aria-label="Historique">
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={newConversation} aria-label="Nouvelle conversation">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label="Fermer">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* History panel */}
            {showHistory ? (
              <div className="flex-1 overflow-y-auto px-3 py-2">
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Historique ({conversations?.length || 0})
                  </p>
                </div>
                {(conversations?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    Aucune conversation pour le moment.
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {conversations!.map(c => (
                      <li
                        key={c.id}
                        className={`group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted cursor-pointer ${conversationId === c.id ? "bg-muted" : ""}`}
                        onClick={() => openConversation(c.id)}
                      >
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Supprimer cette conversation ?")) {
                              deleteConversation.mutate(c.id);
                              if (conversationId === c.id) newConversation();
                            }
                          }}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-6 space-y-3">
                      <Bot className="h-10 w-10 mx-auto text-primary/40" />
                      <p className="font-medium text-foreground">Bonjour ! 🐕</p>
                      <p className="text-xs">
                        {activeDog
                          ? <>Je connais <strong>{activeDog.name}</strong> et sa fiche complète. Comment puis-je vous aider ?</>
                          : "Sélectionnez un chien pour des réponses personnalisées."
                        }
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        💡 Chaque message coûte <strong>1 crédit</strong> · Validation demandée avant envoi
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {activeDog ? (
                          <>
                            <SuggestionChip onClick={(t) => setInput(t)} text={`Quels exercices pour ${activeDog.name} ?`} icon="🎯" />
                            <SuggestionChip onClick={(t) => setInput(t)} text={`Comment gérer la réactivité de ${activeDog.name} ?`} icon="⚡" />
                            <SuggestionChip onClick={(t) => setInput(t)} text={`Routine quotidienne idéale pour ${activeDog.name}`} icon="📅" />
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
                        {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                      </div>
                    </div>
                  ))}
                  {loading && draftMessages.length === 0 && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-border">
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
                  <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
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
                    <Button type="submit" size="icon" className="rounded-full h-9 w-9" disabled={!canSend}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation modale */}
      <CreditConfirmDialog
        open={credit.open}
        onOpenChange={credit.setOpen}
        onConfirm={credit.handleConfirm}
        cost={credit.cost}
        balance={credit.balance}
        featureLabel={credit.featureLabel}
        benefit={credit.benefit}
        loading={credit.loading}
      />
    </>
  );
}
