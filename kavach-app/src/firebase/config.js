import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════
// 🔥 Firebase Config — Connected to project: kavach-app-project-123
// ═══════════════════════════════════════════════════════
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

export const isFirebaseConfigured = !!(
  apiKey &&
  apiKey !== 'your-api-key-here' &&
  apiKey !== ''
);

// Fallback dummy config to prevent fatal initialization/auth crashes in Demo mode
const dummyConfig = {
  apiKey: "AIzaSyDummyKeyForDevelopmentOnly",
  authDomain: "dummy-project.firebaseapp.com",
  projectId: "dummy-project",
  storageBucket: "dummy-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:dummy"
};

const firebaseConfig = isFirebaseConfigured ? {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
} : dummyConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export default app;

