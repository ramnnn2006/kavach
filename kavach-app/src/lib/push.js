// Web Push client API (implemented by the notifications work). Screens import only these.
// Until implemented, everything reports "unsupported" so UI can render a disabled switch.

/** @returns {boolean} */
export function isPushSupported() {
  return false;
}

/** @returns {Promise<'unsupported'|'denied'|'enabled'|'disabled'>} */
export async function getPushState() {
  return 'unsupported';
}

/** Ask permission, subscribe, save to Supabase. @returns {Promise<'enabled'|'denied'|'unsupported'>} */
export async function enablePush() {
  return 'unsupported';
}

/** Unsubscribe this device and delete it server-side. */
export async function disablePush() {}
