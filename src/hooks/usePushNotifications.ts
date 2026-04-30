import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  VAPID_PUBLIC_KEY,
  PUSH_SW_PATH,
  PUSH_SW_SCOPE,
  urlBase64ToUint8Array,
  isPreviewOrIframe,
  isIos,
  isStandalonePwa,
  isPushSupported,
} from "@/lib/push/config";

export type PushStatus =
  | "unsupported"
  | "blocked-preview"
  | "needs-ios-install"
  | "denied"
  | "default"
  | "granted-not-subscribed"
  | "subscribed";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("default");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    if (isPreviewOrIframe()) {
      setStatus("blocked-preview");
      return;
    }
    if (isIos() && !isStandalonePwa()) {
      setStatus("needs-ios-install");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setStatus("denied"); return; }
    if (perm === "default") { setStatus("default"); return; }

    try {
      const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "granted-not-subscribed");
    } catch {
      setStatus("granted-not-subscribed");
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const enable = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    if (!isPushSupported()) return { ok: false, reason: "unsupported" };
    if (isPreviewOrIframe()) return { ok: false, reason: "preview" };
    if (isIos() && !isStandalonePwa()) return { ok: false, reason: "needs-ios-install" };

    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        await refresh();
        return { ok: false, reason: "permission-denied" };
      }

      // Enregistre le SW push (séparé du SW PWA)
      const reg = await navigator.serviceWorker.register(PUSH_SW_PATH, { scope: PUSH_SW_SCOPE });
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Cast required: TS lib types of PushManager are stricter than spec.
          applicationServerKey: key.buffer as ArrayBuffer,
        });
      }

      const { error } = await supabase.functions.invoke("push-subscribe", {
        body: {
          action: "subscribe",
          subscription: sub.toJSON(),
          platform: isIos() ? "ios" : /Android/i.test(navigator.userAgent) ? "android" : "desktop",
        },
      });
      if (error) {
        await refresh();
        return { ok: false, reason: error.message };
      }

      setStatus("subscribed");
      return { ok: true };
    } catch (e: any) {
      await refresh();
      return { ok: false, reason: e?.message ?? "unknown" };
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disable = useCallback(async (): Promise<{ ok: boolean }> => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.functions.invoke("push-subscribe", {
          body: { action: "unsubscribe", subscription: sub.toJSON() },
        });
        await sub.unsubscribe();
      }
      setStatus("granted-not-subscribed");
      return { ok: true };
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable, refresh };
}
