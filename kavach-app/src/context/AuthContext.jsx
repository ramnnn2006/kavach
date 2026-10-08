import { createContext, useContext, useState, useEffect } from 'react';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { setUserProfile, getUserProfile } from '../firebase/firestore';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

const DEMO_PROFILES = {
  student: { name: 'Anjum Sana', email: 'student@kavach.com', role: 'student', phone: '+91 98XXXXXXXX' },
  responder: { name: 'Rajesh Kumar', email: 'responder@kavach.com', role: 'responder', phone: '+91 87XXXXXXXX' },
  admin: { name: 'Dr. Sharma', email: 'admin@kavach.com', role: 'admin', phone: '+91 76XXXXXXXX' },
};
const DEMO_KEY = 'kavach_demo_role';

function readDemoRole() {
  try { return sessionStorage.getItem(DEMO_KEY); } catch { return null; }
}

export function AuthProvider({ children }) {
  // Demo sessions survive reloads within the tab
  const initialDemo = !isFirebaseConfigured ? DEMO_PROFILES[readDemoRole()] : null;
  const [user, setUser] = useState(initialDemo ? { uid: `demo-${initialDemo.role}`, email: initialDemo.email } : null);
  const [userProfile, setProfile] = useState(initialDemo);
  // Only Firebase needs to wait for the session to be restored
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const profile = await getUserProfile(u.uid);
          setProfile(profile);
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email, password) {
    if (!isFirebaseConfigured) throw new Error('Firebase not configured. Use Demo mode instead.');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(cred.user.uid);
    setProfile(profile);
    return profile;
  }

  async function signup(email, password, name) {
    if (!isFirebaseConfigured) throw new Error('Firebase not configured. Use Demo mode instead.');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Firestore rules only allow self-registration as 'student'; admins promote responders/admins.
    const profile = { name, email, role: 'student', phone: '' };
    await setUserProfile(cred.user.uid, profile);
    setProfile(profile);
    return profile;
  }

  async function logout() {
    try {
      if (isFirebaseConfigured && auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      try { sessionStorage.removeItem(DEMO_KEY); } catch { /* storage unavailable */ }
      setUser(null);
      setProfile(null);
    }
  }

  async function updateProfileLocally(newFields) {
    if (user && isFirebaseConfigured) {
      await setUserProfile(user.uid, newFields);
    }
    const updated = { ...userProfile, ...newFields };
    setProfile(updated);
    return updated;
  }

  async function resetPassword(email) {
    if (!isFirebaseConfigured) throw new Error('Firebase not configured. Use Demo mode instead.');
    await sendPasswordResetEmail(auth, email);
  }

  // Demo mode - skip Firebase auth entirely
  function demoLogin(role) {
    if (isFirebaseConfigured) throw new Error('Demo mode is only available without a backend.');
    const profile = DEMO_PROFILES[role];
    try { sessionStorage.setItem(DEMO_KEY, role); } catch { /* storage unavailable */ }
    setUser({ uid: `demo-${role}`, email: profile.email });
    setProfile(profile);
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, signup, logout, demoLogin, updateProfileLocally, resetPassword, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}
