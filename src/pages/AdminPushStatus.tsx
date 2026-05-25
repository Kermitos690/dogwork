import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle, Bell, Loader2, Smartphone, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VAPID_PUBLIC_KEY, PUSH_SW_PATH, isPushSupported, isIos, isStandalonePwa } from "@/lib/push/config";

type ClientDiag = {
  notification_permission: NotificationPermission | "unsupported";
  sw_registered: boolean;
  sw_active: boolean;
  push_subscription_present: boolean;
  push_endpoint_short: string | null;
  is_ios: boolean;
  is_standalone: boolean;
  push_supported: boolean;
  vapid_public_short: string;
};

type Diag = {
  trigger_function_exists: boolean;
  trigger_attached: boolean;
  pg_net_enabled: boolean;
  app_url_configured: boolean;
  service_role_configured: boolean;
  push_subscriptions_count: number;
  recent_http_responses: Array<{ id: number; created: string; status_code: number | null; snippet: string }>;
  checked_at: string;
};

function StatusRow({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      {ok ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </div>
      <Badge variant={ok ? "default" : "destructive"} className="shrink-0">
        {ok ? "OK" : "Manquant"}
      </Badge>
    </div>
  );
}

export default function AdminPushStatus() {
  const [diag, setDiag] = useState<Diag | null>(null);
  const [client, setClient] = useState<ClientDiag | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  const refreshClient = useCallback(async () => {
    const supported = isPushSupported();
    if (!supported) {
      setClient({
        notification_permission: "unsupported",
        sw_registered: false, sw_active: false, push_subscription_present: false,
        push_endpoint_short: null, is_ios: isIos(), is_standalone: isStandalonePwa(),
        push_supported: false, vapid_public_short: VAPID_PUBLIC_KEY.slice(0, 16) + "…",
      });
      return;
    }
    const perm = Notification.permission;
    let regs: readonly ServiceWorkerRegistration[] = [];
    try { regs = await navigator.serviceWorker.getRegistrations(); } catch {}
    const pushReg = regs.find((r) => (r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "").includes(PUSH_SW_PATH));
    let subscription: PushSubscription | null = null;
    try { subscription = (await pushReg?.pushManager.getSubscription()) ?? null; } catch {}
    setClient({
      notification_permission: perm,
      sw_registered: !!pushReg,
      sw_active: !!pushReg?.active,
      push_subscription_present: !!subscription,
      push_endpoint_short: subscription?.endpoint ? subscription.endpoint.slice(0, 60) + "…" : null,
      is_ios: isIos(),
      is_standalone: isStandalonePwa(),
      push_supported: true,
      vapid_public_short: VAPID_PUBLIC_KEY.slice(0, 16) + "…",
    });
  }, []);

  const fetchDiag = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_push_diagnostics");
    if (error) {
      toast({ title: "Erreur diagnostic", description: error.message, variant: "destructive" });
    } else {
      setDiag(data as unknown as Diag);
    }
    await refreshClient();
    setLoading(false);
  }, [toast, refreshClient]);


  useEffect(() => { fetchDiag(); }, [fetchDiag]);

  const runBootstrap = async () => {
    setBootstrapping(true);
    const { error } = await supabase.functions.invoke("setup-push-internals", { body: {} });
    setBootstrapping(false);
    if (error) {
      toast({ title: "Échec init", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings initialisés", description: "URL et service_role injectés." });
      await fetchDiag();
    }
  };

  const sendTestMessage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: user.id,
      content: `[TEST PUSH] ${new Date().toISOString()}`,
    });
    if (error) {
      toast({ title: "Insert refusé", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Message test inséré", description: "Rechargement du diagnostic dans 3s…" });
    setTimeout(fetchDiag, 3000);
  };

  const sendTestToSelf = async () => {
    setSendingTest(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSendingTest(false); return; }
    const { error } = await supabase.rpc("admin_send_test_notification", {
      _target_user_id: user.id,
      _title: "Test push admin",
      _body: "Notification de test envoyée depuis /admin/push-status.",
    });
    setSendingTest(false);
    if (error) {
      toast({ title: "Erreur test", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Test envoyé", description: "In-app + push déclenchés. Diag dans 3s…" });
    setTimeout(fetchDiag, 3000);
  };

  const sendTestToUser = async () => {
    const uid = targetUserId.trim();
    if (!uid || !/^[0-9a-f-]{36}$/i.test(uid)) {
      toast({ title: "User ID invalide", description: "Format UUID attendu.", variant: "destructive" });
      return;
    }
    setSendingTest(true);
    const { error } = await supabase.rpc("admin_send_test_notification", {
      _target_user_id: uid,
      _title: "Test push (envoi admin)",
      _body: "Un admin DogWork vous envoie une notification de test.",
    });
    setSendingTest(false);
    if (error) {
      toast({ title: "Erreur envoi", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Envoyé", description: `Notification envoyée à ${uid.slice(0, 8)}…` });
    setTimeout(fetchDiag, 3000);
  };

  const allReady =
    !!diag?.trigger_function_exists &&
    !!diag?.trigger_attached &&
    !!diag?.pg_net_enabled &&
    !!diag?.app_url_configured &&
    !!diag?.service_role_configured;

  const nextStep = (() => {
    if (!diag) return null;
    if (!diag.pg_net_enabled) return "Activer l'extension pg_net en base (contacter support).";
    if (!diag.trigger_function_exists) return "La fonction trigger n'est pas déployée — republier l'app.";
    if (!diag.trigger_attached) return "Le trigger n'est pas attaché à messages — republier l'app pour propager la migration.";
    if (!diag.app_url_configured || !diag.service_role_configured)
      return "Cliquer sur « Initialiser les settings » ci-dessous (1 fois par environnement).";
    if (diag.push_subscriptions_count === 0)
      return "Aucun device enrôlé. Activer Web Push depuis un téléphone (PWA installée) ou Chrome desktop via la carte « Notifications ».";
    return "Infrastructure prête. Envoyer un message test pour valider la livraison réelle.";
  })();

  return (
    <div className="container max-w-3xl mx-auto pt-16 pb-24 px-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">État Web Push</h1>
            <p className="text-sm text-muted-foreground">Diagnostic en direct de l'infrastructure de notifications.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDiag} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      {loading && !diag && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {diag && (
        <>
          <Alert variant={allReady ? "default" : "destructive"}>
            {allReady ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>{allReady ? "Infrastructure opérationnelle" : "Action requise"}</AlertTitle>
            <AlertDescription className="mt-1">{nextStep}</AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Composants backend</CardTitle>
              <CardDescription>Dernier check : {new Date(diag.checked_at).toLocaleString("fr-FR")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <StatusRow ok={diag.pg_net_enabled} label="Extension pg_net active" hint="Permet aux triggers d'appeler les edge functions en HTTP." />
              <StatusRow ok={diag.trigger_function_exists} label="Fonction trg_notify_new_message déployée" hint="Définition SQL du trigger présente." />
              <StatusRow ok={diag.trigger_attached} label="Trigger attaché à la table messages" hint="Sans cela, aucun message n'émet de push." />
              <StatusRow ok={diag.app_url_configured} label="URL Supabase enregistrée (app_internal_settings)" hint="Utilisée par le trigger pour appeler notify-message." />
              <StatusRow ok={diag.service_role_configured} label="Service role enregistré (app_internal_settings)" hint="Authentifie le trigger auprès de notify-message." />
              <StatusRow
                ok={diag.push_subscriptions_count > 0}
                label={`Abonnements push enregistrés (${diag.push_subscriptions_count})`}
                hint="Au moins un device doit avoir activé les notifications."
              />
            </CardContent>
          </Card>

          {client && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> État côté navigateur (ce device)
                </CardTitle>
                <CardDescription>
                  Diagnostic local : permission, service worker, souscription push.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <StatusRow ok={client.push_supported} label="Web Push supporté par ce navigateur"
                  hint={client.push_supported ? "ServiceWorker + PushManager + Notification disponibles." : "Navigateur non compatible."} />
                <StatusRow ok={client.notification_permission === "granted"}
                  label={`Permission navigateur : ${client.notification_permission}`}
                  hint={
                    client.notification_permission === "granted" ? "Notifications autorisées." :
                    client.notification_permission === "denied" ? "Bloqué — réautoriser dans les paramètres du navigateur/système." :
                    "Pas encore demandé — l'utilisateur doit cliquer 'Activer'."
                  } />
                <StatusRow ok={client.sw_registered && client.sw_active}
                  label={`Service worker /sw-push.js : ${client.sw_active ? "actif" : client.sw_registered ? "enregistré (pas encore actif)" : "absent"}`}
                  hint="Le SW est enregistré au premier 'Activer' depuis la carte Notifications." />
                <StatusRow ok={client.push_subscription_present}
                  label="Souscription push locale présente"
                  hint={client.push_endpoint_short ?? "Aucune subscription locale — l'utilisateur doit activer."} />
                {client.is_ios && (
                  <StatusRow ok={client.is_standalone}
                    label={`iOS détecté — ${client.is_standalone ? "PWA installée ✓" : "PWA NON installée"}`}
                    hint={client.is_standalone ? "Push iOS opérationnel (iOS 16.4+ requis)." : "Apple exige l'installation sur l'écran d'accueil pour le push iOS."} />
                )}
                <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  VAPID publique : <code>{client.vapid_public_short}</code> (hardcoded client+serveur)
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runBootstrap} disabled={bootstrapping} className="w-full justify-start">
                {bootstrapping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Initialiser les settings (URL + service_role)
              </Button>
              <Button onClick={sendTestToSelf} disabled={sendingTest} variant="default" className="w-full justify-start">
                {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Tester sur moi-même (in-app + push direct)
              </Button>
              <Button onClick={sendTestMessage} variant="outline" className="w-full justify-start" disabled={!allReady}>
                <Bell className="h-4 w-4 mr-2" />
                Envoyer un message test à moi-même (chaîne complète via trigger DB)
              </Button>
              <div className="pt-3 border-t space-y-2">
                <Label htmlFor="target-uid" className="text-xs">Tester sur un utilisateur précis (UUID)</Label>
                <div className="flex gap-2">
                  <Input id="target-uid" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000" className="font-mono text-xs" />
                  <Button onClick={sendTestToUser} disabled={sendingTest || !targetUserId} variant="secondary">
                    Envoyer
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  L'utilisateur doit avoir Web Push activé pour recevoir la notification système. Le toast in-app fonctionne dans tous les cas s'il est connecté.
                </p>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="text-base">5 derniers appels HTTP sortants (pg_net)</CardTitle>
              <CardDescription>Inclut tous les triggers utilisant pg_net, pas uniquement push.</CardDescription>
            </CardHeader>
            <CardContent>
              {diag.recent_http_responses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun appel récent.</p>
              ) : (
                <div className="space-y-2">
                  {diag.recent_http_responses.map((r) => (
                    <div key={r.id} className="text-xs border rounded-md p-2 bg-muted/30">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant={r.status_code && r.status_code < 300 ? "default" : "destructive"}>
                          {r.status_code ?? "—"}
                        </Badge>
                        <span className="text-muted-foreground">{new Date(r.created).toLocaleString("fr-FR")}</span>
                      </div>
                      <code className="block text-[11px] break-all opacity-80">{r.snippet}</code>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Procédure complète</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>1. <strong>Publier l'app</strong> pour propager le trigger en production.</p>
              <p>2. Sur cette page, cliquer <strong>« Initialiser les settings »</strong> (1 fois par environnement, en tant qu'admin).</p>
              <p>3. Depuis un téléphone ou Chrome desktop, activer les notifications via la carte <strong>« Notifications »</strong> du profil utilisateur.</p>
              <p>4. Cliquer <strong>« Envoyer un message test »</strong> ici → la notif doit arriver sur le device enrôlé.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
