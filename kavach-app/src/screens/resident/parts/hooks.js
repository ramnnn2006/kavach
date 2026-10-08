import { useCallback, useEffect, useState } from 'react';

/**
 * Subscribe to a live query: `subscribe(onData, onError) => unsubscribe` (e.g. listenNotices).
 * Pass a stable function (module export or useCallback). Pass null to skip.
 * @returns {{ data:any, error:Error|null, loading:boolean, retry:() => void }}
 */
export function useLive(subscribe) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ src: null, attempt: -1, data: undefined, error: null });

  useEffect(() => {
    if (!subscribe) return undefined;
    return subscribe(
      (data) => setState({ src: subscribe, attempt, data, error: null }),
      (error) => setState(s => ({
        src: subscribe,
        attempt,
        data: s.src === subscribe && s.attempt === attempt ? s.data : undefined,
        error,
      })),
    );
  }, [subscribe, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  const current = !!subscribe && state.src === subscribe && state.attempt === attempt;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : null,
    loading: !!subscribe && !current,
    retry,
  };
}

/** Current time, refreshed every `intervalMs` (for "4 min ago" labels). */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
