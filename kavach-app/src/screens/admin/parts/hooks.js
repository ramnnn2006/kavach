// Small hooks shared by the admin screens.
import { useCallback, useEffect, useState } from 'react';

/** Current time, refreshed every `ms` — keeps "4 min ago" labels and clocks ticking. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/**
 * Subscribe to a realtime feed from db.js / admin.js: `subscribe(onData, onError)` → unsubscribe.
 * `key` identifies the query (re-subscribes when it changes). With `keepStale`, the previous
 * result stays on screen while a new key loads (filters); otherwise it is hidden.
 * Returns { data, error, loading, retry }.
 */
export function useLive(subscribe, key = 'default', { enabled = true, keepStale = false } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, key: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const off = subscribe(
      (data) => setState({ data, error: null, key }),
      (error) => setState((s) => ({ ...s, error, key })),
    );
    return off;
    // `subscribe` is recreated every render; `key` captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, enabled]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
    setAttempt((a) => a + 1);
  }, []);

  const current = state.key === key;
  const data = current || keepStale ? state.data : undefined;
  const error = current ? state.error : null;
  return { data, error, loading: enabled && data === undefined && !error, retry };
}
