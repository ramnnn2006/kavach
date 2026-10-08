// Web Push client API. Screens import only these four functions.
//
// The service worker (src/sw.js) is registered by UpdatePrompt in production builds only, so in
// `vite dev` isPushSupported() can be true while enablePush() throws a clear "not ready" error.
// Subscriptions are stored server-side via the save_push_subscription RPC (one row per device);
// the `notify` edge function sends the pushes.
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const READY_TIMEOUT_MS = 10000;

class PushError extends Error {
  constructor(code, message, reason) {
    super(message);
    this.name = 'PushError';
    this.code = code; // errorMessage(err, t) shows .message for 'invalid', a translated text for 'offline'
    this.reason = reason;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// True when the subscription was made with this server key (or the browser doesn't expose it).
function sameKey(buffer, key) {
  if (!buffer) return true;
  const a = new Uint8Array(buffer);
  return a.length === key.length && a.every((v, i) => v === key[i]);
}

async function getRegistration() {
  try {
    return (await navigator.serviceWorker.getRegistration()) || null;
  } catch {
    return null;
  }
}

async function getSubscription() {
  const reg = await getRegistration();
  if (!reg || !reg.pushManager) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

async function saveSubscription(subscription) {
  if (!supabase) throw new PushError('offline', 'Server is not configured', 'no_backend');
  const { endpoint, keys = {} } = subscription.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) {
    const offline = !navigator.onLine || /fetch|network/i.test(error.message || '');
    throw new PushError(offline ? 'offline' : error.message === 'forbidden' ? 'forbidden' : 'invalid',
      offline ? 'You are offline' : 'Could not turn on notifications. Try again.', 'save_failed');
  }
}

// Re-link this device's subscription to the signed-in account (heals rows removed server-side).
let syncedFor = null;
async function syncSubscription(userId) {
  if (!isPushSupported() || Notification.permission !== 'granted' || syncedFor === userId) return;
  const sub = await getSubscription();
  if (!sub) return;
  syncedFor = userId;
  await saveSubscription(sub).catch(() => {
    syncedFor = null;
  });
}

/** @returns {boolean} */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

/** @returns {Promise<'unsupported'|'denied'|'enabled'|'disabled'>} */
export async function getPushState() {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'disabled';
  const sub = await getSubscription();
  // A subscription made with an old server key can't receive our pushes: show it as off.
  if (!sub || !sameKey(sub.options?.applicationServerKey, urlBase64ToUint8Array(VAPID_PUBLIC_KEY))) return 'disabled';
  if (supabase) {
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id;
      if (id) syncSubscription(id);
    }).catch(() => {});
  }
  return 'enabled';
}

/**
 * Ask permission, subscribe this device, save it to Supabase.
 * Throws a PushError (.code 'invalid' | 'offline' | 'forbidden', .message fit for a toast, .reason) when the
 * prompt was dismissed or the app can't subscribe right now.
 * @returns {Promise<'enabled'|'denied'|'unsupported'>}
 */
export async function enablePush() {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';

  // Ask first, with nothing awaited before it: iOS Safari only shows the prompt inside the tap.
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') {
    throw new PushError('invalid', 'Notifications were not allowed. Tap the switch again and choose Allow.', 'dismissed');
  }

  const reg = await getRegistration();
  if (!reg) {
    throw new PushError('invalid', 'Notifications are not ready yet. Reload the app and try again.', 'no_service_worker');
  }

  const active = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), READY_TIMEOUT_MS)),
  ]);
  if (!active || !active.pushManager) {
    throw new PushError('invalid', 'Notifications are not ready yet. Reload the app and try again.', 'no_service_worker');
  }

  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  let sub = await active.pushManager.getSubscription();
  if (sub && !sameKey(sub.options?.applicationServerKey, key)) {
    await sub.unsubscribe().catch(() => {}); // made with an old server key: replace it
    sub = null;
  }
  if (!sub) {
    try {
      sub = await active.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    } catch {
      throw new PushError('invalid', 'This browser could not turn on notifications. Try again.', 'subscribe_failed');
    }
  }

  try {
    await saveSubscription(sub);
  } catch (err) {
    await sub.unsubscribe().catch(() => {}); // keep device and server in step
    throw err;
  }
  const { data } = supabase ? await supabase.auth.getSession() : { data: null };
  syncedFor = data?.session?.user?.id ?? null;
  return 'enabled';
}

/** Unsubscribe this device and delete it server-side. */
export async function disablePush() {
  const sub = await getSubscription();
  if (!sub) return;
  const { endpoint } = sub;
  if (supabase) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    // If this fails (offline) the unsubscribe below still stops delivery; the server drops the
    // row the next time the push service answers 410 Gone.
    if (error) console.warn('[kavach] Could not remove push subscription', error.message);
  }
  await sub.unsubscribe();
  syncedFor = null;
}

// Signing out must stop this device receiving the account's alerts (shared phones),
// and signing in re-links an existing subscription to the new account.
if (supabase && typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    // Defer: supabase-js warns against awaiting its own calls inside this callback.
    if (event === 'SIGNED_OUT') {
      setTimeout(() => {
        syncedFor = null;
        getSubscription().then((sub) => sub && sub.unsubscribe()).catch(() => {});
      }, 0);
    } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.id) {
      const id = session.user.id;
      setTimeout(() => { syncSubscription(id); }, 0);
    }
  });
}
