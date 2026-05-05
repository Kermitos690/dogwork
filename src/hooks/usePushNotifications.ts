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

function getPlatform() {
  if (isIos()) return "ios";
  if (/Android/i.test(navigator.userAgent)) return "android";
  return "desktop";
}

async function getReadyPushRegistration(): Promise<ServiceWorkerRegistration> {
  let registration = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);

  if (!registration) {
    registration = await navigator.serviceWorker.register(PUSH_SW_PATH, {
      scope: PUSH_SW_SCOPE,
    });
  }

  await navigator.serviceWorker.ready;

  return registration;
}

async function createOrGetSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    return existing;
  }

  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

  return await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key.buffer as ArrayBuffer,
  });
}

async function registerSubscriptionOnServer(subscription: PushSubscription) {
  const { error } = await supabase.functions.invoke("push-subscribe", {
    body: {
      action: "subscribe",
      subscription: subscription.toJSON(),
      platform: getPlatform(),
    },
  });

  if (error) {
    throw error;
  }
}

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

    const permission = Notification.permission;

    if (permission === "denied") {
      setStatus("denied");
      return;
    }

    if (permission === "default") {
      setStatus("default");
      return;
    }

    try {
      setBusy(true);

      const registration = await getReadyPushRegistration();

      /*
       * Important :
       * Si iOS/navigateur autorise encore les notifications,
       * mais que l'abonnement local est absent, on le recrée.
       * On ne laisse pas l'app dans un faux état "désactivé".
       */
      const subscription = await createOrGetSubscription(registration);

      await registerSubscriptionOnServer(subscription);

      setStatus("subscribed");
    } catch (error) {
      console.error("[push] refresh/repair failed", error);

      /*
       * Une erreur réseau, service worker ou Supabase n'est pas un refus iOS.
       */
      setStatus("granted-not-subscribed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const onFocus = () => refresh();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const enable = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    if (!isPushSupported()) return { ok: false, reason: "unsupported" };
    if (isPreviewOrIframe()) return { ok: false, reason: "preview" };
    if (isIos() && !isStandalonePwa()) return { ok: false, reason: "needs-ios-install" };

    setBusy(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        await refresh();
        return { ok: false, reason: "permission-denied" };
      }

      const registration = await getReadyPushRegistration();
      const subscription = await createOrGetSubscription(registration);

      await registerSubscriptionOnServer(subscription);

      setStatus("subscribed");

      return { ok: true };
    } catch (error: any) {
      console.error("[push] enable failed", error);
      await refresh();
      return { ok: false, reason: error?.message ?? "unknown" };
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disable = useCallback(async (): Promise<{ ok: boolean }> => {
    setBusy(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
      const subscription = await registration?.pushManager.getSubscription();

      /*
       * Seule cette fonction désactive réellement les notifications.
       * Elle doit être déclenchée uniquement par le bouton utilisateur "Désactiver".
       */
      if (subscription) {
        await supabase.functions.invoke("push-subscribe", {
          body: {
            action: "unsubscribe",
            subscription: subscription.toJSON(),
          },
        });

        await subscription.unsubscribe();
      }

      setStatus("granted-not-subscribed");

      return { ok: true };
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    status,
    busy,
    enable,
    disable,
    refresh,
  };
}