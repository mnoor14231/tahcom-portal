import { supabase } from '../lib/supabaseClient.ts';
import { buildAdminApiUrl } from './apiBase.ts';

const DEFAULT_VAPID_PUBLIC_KEY = 'BBS-5m8-nZLTjJDmWEgTi4o65N1c9_ezF4MJHt2BQsHOEPmLiBwXxo9sQjt3I_l_eL_DvukgLIV9lm_HCodv92c';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  if (!key) {
    console.warn('[Push] Missing VAPID public key. Set VITE_VAPID_PUBLIC_KEY.');
    return null;
  }
  return key;
}

export async function subscribeUserToPush(savePushSubscription: (subscription: PushSubscription) => Promise<void>, options: { silent?: boolean } = {}) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window' } as const;
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.info('[Push] Browser does not support notifications or push.');
    return { ok: false, reason: 'unsupported' } as const;
  }

  if (!window.isSecureContext) {
    console.warn('[Push] Notifications require HTTPS or localhost.');
    return { ok: false, reason: 'insecure_context' } as const;
  }

  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'permission_denied' } as const;
  }

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    return { ok: false, reason: 'missing_key' } as const;
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    await savePushSubscription(existingSubscription);
    return { ok: true, alreadySubscribed: true } as const;
  }

  if (Notification.permission === 'default') {
    if (options.silent) {
      return { ok: false, reason: 'permission_prompt_required' } as const;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: 'permission_denied' } as const;
    }
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  await savePushSubscription(subscription);
  return { ok: true, alreadySubscribed: false } as const;
}

export async function sendServerPushNotification(payload: { userId: string; title: string; body: string; url?: string; data?: Record<string, unknown> }) {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    await fetch(buildAdminApiUrl('/api/push/send'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('[Push] Failed to dispatch push notification', error);
  }
}


