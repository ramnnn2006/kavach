import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { clearOutbox } from '../data/outbox';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

const PROFILE_COLUMNS =
  'id, society_id, full_name, email, phone, role, specialties, on_duty, flat_id, language, vulnerability, first_responder_skill, ' +
  'flat:flats(id, number, floor, zone_id, zone:zones(id, name, code)), society:societies(id, name, city, security_phone, power_source)';

async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

function friendlyAuthError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Wrong email or password.';
  if (msg.includes('email not confirmed')) return 'Confirm your email first, then sign in.';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'An account with this email already exists.';
  if (msg.includes('password should be')) return 'Password must be at least 8 characters.';
  if (msg.includes('rate limit') || error?.status === 429) return 'Too many attempts. Wait a minute and try again.';
  if (msg.includes('fetch') || msg.includes('network')) return 'No connection. Check your internet and try again.';
  return error?.message || 'Something went wrong. Try again.';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const currentUserId = useRef(null);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return null; }
    try {
      const p = await fetchProfile(userId);
      if (currentUserId.current === userId) setProfile(p);
      return p;
    } catch (err) {
      console.error('Could not load profile:', err);
      if (currentUserId.current === userId) setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const s = data.session;
      currentUserId.current = s?.user?.id ?? null;
      setSession(s);
      await loadProfile(s?.user?.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      const uid = s?.user?.id ?? null;
      const changedUser = uid !== currentUserId.current;
      currentUserId.current = uid;
      setSession(s);
      // Covers sign-outs that don't go through signOut() (expired session, another tab)
      if (event === 'SIGNED_OUT') clearOutbox().catch(() => { /* nothing queued */ });
      if (changedUser) {
        // Defer DB work out of the auth callback (supabase-js recommendation)
        setTimeout(() => {
          loadProfile(uid).finally(() => { if (active) setLoading(false); });
        }, 0);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Keep profile fresh when an admin changes role / duty etc.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return undefined;
    const channel = supabase
      .channel(`profile:${uid}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, () => loadProfile(uid))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(friendlyAuthError(error));
  }, []);

  // Redirects to Google, then back to this origin with a session. New Google users get a
  // profile from the handle_new_user trigger and pick their flat on the Welcome screen.
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(friendlyAuthError(error));
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), phone: phone?.trim() || null } },
    });
    if (error) throw new Error(friendlyAuthError(error));
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign-out failed:', err);
    } finally {
      currentUserId.current = null;
      setSession(null);
      setProfile(null);
      clearOutbox().catch(() => { /* nothing queued */ });
      try {
        sessionStorage.clear();
        Object.keys(localStorage).filter(k => k.startsWith('kavach_cache')).forEach(k => localStorage.removeItem(k));
      } catch { /* storage unavailable */ }
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(friendlyAuthError(error));
  }, []);

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session?.user?.id]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    userProfile: profile, // legacy alias used by older screens
    role: profile?.role ?? null,
    loading,
    isConfigured: isSupabaseConfigured,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    logout: signOut,
    resetPassword,
    refreshProfile,
  }), [session, profile, loading, signIn, signInWithGoogle, signUp, signOut, resetPassword, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
