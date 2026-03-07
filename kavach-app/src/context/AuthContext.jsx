import { createContext, useContext, useState, useEffect } from 'react';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { setUserProfile, getUserProfile } from '../firebase/firestore';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!isFirebaseConfigured);

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

  async function signup(email, password, name, role) {
    if (!isFirebaseConfigured) throw new Error('Firebase not configured. Use Demo mode instead.');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const profile = { name, email, role, phone: '' };
    await setUserProfile(cred.user.uid, profile);
    setProfile(profile);
    return profile;
  }

  async function logout() {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    setUser(null);
    setProfile(null);
  }

  async function updateProfileLocally(newFields) {
    if (user && isFirebaseConfigured) {
      await setUserProfile(user.uid, newFields);
    }
    const updated = { ...userProfile, ...newFields };
    setProfile(updated);
    return updated;
  }

  // Demo mode — skip Firebase auth entirely
  function demoLogin(role) {
    const demoProfiles = {
      student: { name: 'Anjum Sana', email: 'student@kavach.com', role: 'student', phone: '+91 98XXXXXXXX' },
      responder: { name: 'Rajesh Kumar', email: 'responder@kavach.com', role: 'responder', phone: '+91 87XXXXXXXX' },
      admin: { name: 'Dr. Sharma', email: 'admin@kavach.com', role: 'admin', phone: '+91 76XXXXXXXX' },
    };
    const profile = demoProfiles[role];
    setUser({ uid: `demo-${role}`, email: profile.email });
    setProfile(profile);
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, signup, logout, demoLogin, updateProfileLocally, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}
