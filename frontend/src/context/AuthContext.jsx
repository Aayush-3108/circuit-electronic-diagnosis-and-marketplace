import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, firebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

function createMockUser(email) {
  const safeEmail = email || 'user@example.com';
  const uid = 'usr_' + btoa(safeEmail).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({ uid, user_id: uid, email: safeEmail, sub: uid }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const token = `${header}.${payload}.recircuit_sig`;

  return {
    uid,
    email: safeEmail,
    getIdToken: async () => token,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) {
      const savedEmail = localStorage.getItem('recircuit_user_email');
      if (savedEmail) {
        setUser(createMockUser(savedEmail));
      }
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signup(email, password) {
    if (!firebaseConfigured) {
      localStorage.setItem('recircuit_user_email', email);
      const u = createMockUser(email);
      setUser(u);
      return u;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function login(email, password) {
    if (!firebaseConfigured) {
      localStorage.setItem('recircuit_user_email', email);
      const u = createMockUser(email);
      setUser(u);
      return u;
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function logout() {
    if (!firebaseConfigured) {
      localStorage.removeItem('recircuit_user_email');
      setUser(null);
      return;
    }
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, firebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
