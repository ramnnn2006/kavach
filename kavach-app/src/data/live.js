// Realtime helper: run `fetcher`, then re-run it whenever any of `tables` change.
// Supabase Realtime applies RLS, so each user only gets events for rows they can see.
import { supabase } from '../lib/supabase';

let channelSeq = 0;

/**
 * @param {string[]|{table:string, filter?:string}[]} tables
 * @param {() => Promise<any>} fetcher
 * @param {(data:any) => void} onData
 * @param {(err:Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function live(tables, fetcher, onData, onError) {
  let closed = false;
  let timer = null;
  let running = false;
  let rerun = false;

  const run = async () => {
    if (closed) return;
    if (running) { rerun = true; return; }
    running = true;
    try {
      const data = await fetcher();
      if (!closed) onData(data);
    } catch (err) {
      if (!closed) (onError || console.error)(err);
    } finally {
      running = false;
      if (rerun && !closed) { rerun = false; run(); }
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, 150); // coalesce bursts (trigger writes several rows)
  };

  let channel = supabase.channel(`live-${++channelSeq}`);
  for (const t of tables) {
    const spec = typeof t === 'string' ? { table: t } : t;
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: spec.table, ...(spec.filter ? { filter: spec.filter } : {}) },
      schedule,
    );
  }
  channel.subscribe((status) => {
    // Refetch after (re)connecting so nothing missed while offline is lost
    if (status === 'SUBSCRIBED') schedule();
  });

  run();

  const onFocus = () => { if (document.visibilityState === 'visible') schedule(); };
  document.addEventListener('visibilitychange', onFocus);
  window.addEventListener('online', schedule);

  return () => {
    closed = true;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onFocus);
    window.removeEventListener('online', schedule);
    supabase.removeChannel(channel);
  };
}
