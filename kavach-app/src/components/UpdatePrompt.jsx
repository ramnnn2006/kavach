// Service-worker update / offline-ready prompts. Registers the SW (injectRegister is off in vite.config.js).
// Safety rule: this never reloads the page on its own. A reload only happens after the user taps the button,
// and on the SOS / report screens it waits until the user has left them, so an in-progress report is never lost.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, CircleCheck } from 'lucide-react';
import { useT } from '../i18n';

const UPDATE_CHECK_MS = 60 * 60 * 1000;
const OFFLINE_TOAST_MS = 4000;
const PROTECTED_PATHS = ['/resident/sos', '/resident/report'];

// This component sits outside the router, so it tracks the URL itself: popstate for back/forward
// plus a light poll for pushState navigations (only while an update is pending).
const getPathname = () => window.location.pathname;
const subscribeNoop = () => () => {};
function subscribePathname(onChange) {
  const id = setInterval(onChange, 1000);
  window.addEventListener('popstate', onChange);
  return () => {
    clearInterval(id);
    window.removeEventListener('popstate', onChange);
  };
}

const isProtectedPath = (pathname) => PROTECTED_PATHS.some((p) => pathname.startsWith(p));

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        if (registration.installing || !navigator.onLine) return;
        registration.update().catch(() => {});
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(error) {
      console.warn('[kavach] Service worker registration failed', error);
    },
  });

  const { t } = useT();
  const [queued, setQueued] = useState(false);
  const pathname = useSyncExternalStore(needRefresh ? subscribePathname : subscribeNoop, getPathname);
  const onProtectedScreen = isProtectedPath(pathname);

  // User already agreed to update while on SOS/report: apply it once they've left those screens.
  useEffect(() => {
    if (needRefresh && queued && !onProtectedScreen) updateServiceWorker(true);
  }, [needRefresh, queued, onProtectedScreen, updateServiceWorker]);

  useEffect(() => {
    if (!offlineReady) return undefined;
    const timer = setTimeout(() => setOfflineReady(false), OFFLINE_TOAST_MS);
    return () => clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh && !offlineReady) return null;

  const reload = () => {
    if (isProtectedPath(window.location.pathname)) setQueued(true);
    else updateServiceWorker(true);
  };
  const later = () => setNeedRefresh(false);

  return createPortal(
    <div className="toasts toasts--top">
      {needRefresh && (
        <div className="toast" role="status" style={{ '--tone': 'var(--blue)', flexWrap: 'wrap' }}>
          <RefreshCw size={18} aria-hidden="true" />
          <p className="toast__msg" style={{ flex: '1 1 10rem' }}>
            {queued ? t('common.updateQueued') : t('common.updateAvailable')}
          </p>
          <div style={{ display: 'flex', gap: 'var(--s-2)', marginLeft: 'auto' }}>
            {!queued && (
              <button type="button" className="btn btn--sm btn--primary" onClick={reload}>
                {onProtectedScreen ? t('common.updateAfterReport') : t('common.updateReload')}
              </button>
            )}
            <button
              type="button"
              className="btn btn--sm"
              style={{ background: 'transparent', color: 'inherit' }}
              onClick={queued ? () => setQueued(false) : later}
            >
              {queued ? t('common.cancel') : t('common.updateLater')}
            </button>
          </div>
        </div>
      )}
      {offlineReady && (
        <div className="toast" role="status" style={{ '--tone': 'var(--green)' }}>
          <CircleCheck size={18} aria-hidden="true" />
          <p className="toast__msg">{t('common.offlineReady')}</p>
        </div>
      )}
    </div>,
    document.body
  );
}
