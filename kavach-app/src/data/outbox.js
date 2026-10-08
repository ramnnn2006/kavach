// Offline outbox for resident reports.
// A report that cannot reach the server is stored here (IndexedDB, falling back to localStorage)
// and re-sent automatically. createIncident() is idempotent by clientId, so a retry after a
// dropped response never creates a second incident.
//
// Record: { clientId, userId, payload, createdAt, attempts, lastError: {code, message} | null,
//           state: 'pending' | 'failed' }
// 'failed' = the server rejected it permanently (invalid / forbidden); it is never retried and
// stays visible until the resident dismisses it, so a lost emergency report is never silent.
import { useMemo, useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import { createIncident } from './db';

const DB_NAME = 'kavach_outbox';
const STORE = 'reports';
const LS_KEY = 'kavach_outbox';
const RETRY_MS = 30000;
const PERMANENT = ['invalid', 'forbidden'];

// ── Storage (IndexedDB with localStorage fallback) ──────────────────────────
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'clientId' });
      };
      req.onsuccess = () => {
        const db = req.result;
        // Let a sign-out cleanup (deleteDatabase) proceed instead of blocking on us
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function idb(db, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function lsRead() {
  try {
    const list = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function lsWrite(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
}

async function readAll() {
  const db = await openDb();
  if (db) {
    try { return (await idb(db, 'readonly', s => s.getAll())) || []; } catch { /* fall through */ }
  }
  return lsRead();
}

async function putRaw(record) {
  const db = await openDb();
  if (db) {
    try { await idb(db, 'readwrite', s => s.put(record)); return; } catch { /* fall through */ }
  }
  lsWrite([...lsRead().filter(r => r.clientId !== record.clientId), record]);
}

async function deleteRaw(clientId) {
  const db = await openDb();
  if (db) {
    try { await idb(db, 'readwrite', s => s.delete(clientId)); } catch { /* ignore */ }
  }
  // Always clear the fallback too, in case the record was written there earlier
  const rest = lsRead().filter(r => r.clientId !== clientId);
  if (rest.length !== lsRead().length) lsWrite(rest);
}

// ── In-memory snapshot for React (useSyncExternalStore) ─────────────────────
let snapshot = { ready: false, items: [] };
const listeners = new Set();
const sentListeners = new Set();
let firstLoad = null;

function emit() {
  listeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });
}

async function refresh() {
  const all = await readAll();
  all.sort((a, b) => a.createdAt - b.createdAt);
  snapshot = { ready: true, items: all };
  emit();
  return all;
}

function subscribe(fn) {
  listeners.add(fn);
  if (!firstLoad) firstLoad = refresh();
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return snapshot;
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Queue a report. `payload` is the createIncident() argument without clientId. */
export async function addToOutbox({ clientId, payload, userId, lastError = null }) {
  const existing = (await readAll()).find(r => r.clientId === clientId);
  await putRaw({
    clientId,
    userId: userId || existing?.userId || null,
    payload,
    createdAt: existing?.createdAt || Date.now(),
    attempts: (existing?.attempts || 0) + 1,
    lastError,
    state: 'pending',
  });
  await refresh();
}

/** All queued records (pending and failed), oldest first. */
export async function listOutbox() {
  return refresh();
}

export async function removeFromOutbox(clientId) {
  await deleteRaw(clientId);
  await refresh();
}

/** Remove everything (call on sign-out). */
export async function clearOutbox() {
  const db = await openDb();
  if (db) {
    try { await idb(db, 'readwrite', s => s.clear()); } catch { /* ignore */ }
  }
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  await refresh();
}

/**
 * Called when a report that was queued reached the server some other way
 * (e.g. the original slow request finally returned).
 */
export async function markSent(clientId, incident) {
  await removeFromOutbox(clientId);
  sentListeners.forEach(fn => { try { fn(clientId, incident); } catch { /* ignore */ } });
}

/** Listen for queued reports that were delivered: fn(clientId, incident). Returns unsubscribe. */
export function onOutboxSent(fn) {
  sentListeners.add(fn);
  return () => sentListeners.delete(fn);
}

let flushing = null;

/**
 * Try to send every pending report that belongs to the signed-in user.
 * Sent → removed. Offline / unknown error → kept (attempts + 1). invalid / forbidden → marked failed.
 * @returns {Promise<{sent:number, kept:number, failed:number}>}
 */
export function flushOutbox() {
  if (flushing) return flushing;
  flushing = (async () => {
    const result = { sent: 0, kept: 0, failed: 0 };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return result;
    if (!supabase) return result;
    let uid = null;
    try {
      const { data } = await supabase.auth.getSession();
      uid = data.session?.user?.id || null;
    } catch { /* no session */ }
    if (!uid) return result;

    const pending = (await readAll())
      .filter(r => r.state !== 'failed' && r.userId === uid)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const item of pending) {
      try {
        const incident = await createIncident({ ...item.payload, clientId: item.clientId });
        await deleteRaw(item.clientId);
        result.sent += 1;
        sentListeners.forEach(fn => { try { fn(item.clientId, incident); } catch { /* ignore */ } });
      } catch (err) {
        const code = err?.code || 'unknown';
        const lastError = { code, message: err?.message || '' };
        if (PERMANENT.includes(code)) {
          await putRaw({ ...item, attempts: item.attempts + 1, lastError, state: 'failed' });
          result.failed += 1;
        } else {
          await putRaw({ ...item, attempts: item.attempts + 1, lastError });
          result.kept += 1;
          if (code === 'offline') break; // no point trying the rest right now
        }
      }
    }
    await refresh();
    return result;
  })().finally(() => { flushing = null; });
  return flushing;
}

let syncUsers = 0;
let syncTimer = null;
const onOnline = () => { flushOutbox(); };

/**
 * Keep the outbox draining: flush now, on every 'online' event, and every 30 s while
 * anything is pending. Safe to call from several screens; returns a stop function.
 */
export function startOutboxSync() {
  syncUsers += 1;
  if (syncUsers === 1) {
    window.addEventListener('online', onOnline);
    syncTimer = setInterval(() => {
      if (snapshot.items.some(r => r.state !== 'failed')) flushOutbox();
    }, RETRY_MS);
  }
  refresh().then(items => { if (items.some(r => r.state !== 'failed')) flushOutbox(); });
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    syncUsers -= 1;
    if (syncUsers === 0) {
      window.removeEventListener('online', onOnline);
      clearInterval(syncTimer);
      syncTimer = null;
    }
  };
}

/**
 * React hook: { ready, items (pending), failed } for `userId` (all users if omitted).
 */
export function useOutbox(userId) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => {
    const mine = userId ? snap.items.filter(r => r.userId === userId) : snap.items;
    return {
      ready: snap.ready,
      items: mine.filter(r => r.state !== 'failed'),
      failed: mine.filter(r => r.state === 'failed'),
    };
  }, [snap, userId]);
}
