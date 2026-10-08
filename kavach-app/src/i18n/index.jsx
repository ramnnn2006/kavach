// Tiny i18n: t('ns.key', { vars }) with English fallback. Namespaces live in ./strings/*.js
// and export { en: {...}, ta: {...} }. Add a key to BOTH languages.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import common from './strings/common';
import auth from './strings/auth';
import resident from './strings/resident';
import responder from './strings/responder';
import admin from './strings/admin';
import profile from './strings/profile';
import landing from './strings/landing';

const NAMESPACES = { common, auth, resident, responder, admin, profile, landing };
// eslint-disable-next-line react-refresh/only-export-components
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
];
const STORAGE_KEY = 'kavach_lang';

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'ta' || v === 'en' ? v : null;
  } catch { return null; }
}

function lookup(lang, key) {
  const dot = key.indexOf('.');
  if (dot < 0) return undefined;
  const ns = NAMESPACES[key.slice(0, dot)];
  const k = key.slice(dot + 1);
  return ns?.[lang]?.[k] ?? ns?.en?.[k];
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, name) => (vars[name] ?? m));
}

const I18nContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children, profileLanguage, onPersist }) {
  const [lang, setLangState] = useState(() =>
    (profileLanguage === 'en' || profileLanguage === 'ta' ? profileLanguage : null) || readStored() || 'en');

  // Profile setting wins whenever it loads or changes (synced across devices)
  const [seenProfileLang, setSeenProfileLang] = useState(profileLanguage);
  if (profileLanguage !== seenProfileLang) {
    setSeenProfileLang(profileLanguage);
    if (profileLanguage === 'en' || profileLanguage === 'ta') setLangState(profileLanguage);
  }

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
    onPersist?.(next);
  }, [onPersist]);

  const t = useCallback((key, vars) => {
    const raw = lookup(lang, key);
    if (raw === undefined) {
      if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
      return key;
    }
    return interpolate(raw, vars);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT() {
  return useContext(I18nContext);
}
