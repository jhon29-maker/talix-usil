import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { FIREBASE_READY, auth, db } from '../config/firebase';
import { DB } from './db';

const AVATAR_COLORS = ['#6DBE7E', '#5B9BD5', '#F5A623', '#9C6BBE', '#E57373', '#4DB6AC'];
const randomColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

// Simple non-crypto hash for localStorage demo mode (Firebase handles real auth)
function hashPwd(s) {
  return [...s].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0).toString(36);
}

function buildUserProfile(uid, email, displayName, faculty, termsAcceptedAt = null) {
  return {
    id: uid,
    email,
    displayName,
    faculty: faculty || 'No especificada',
    swaps: 0,
    co2: 0,
    verified: true,
    joined: new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' }),
    avatarColor: randomColor(),
    createdAt: new Date().toISOString(),
    termsAcceptedAt: termsAcceptedAt || new Date().toISOString(),
    status: 'activo',
    isAdmin: false,
  };
}

async function saveEmailRegistry(email, displayName, faculty) {
  const record = {
    email,
    displayName,
    faculty: faculty || 'No especificada',
    registeredAt: new Date().toISOString(),
    termsAcceptedAt: new Date().toISOString(),
    source: 'registration',
  };
  if (FIREBASE_READY) {
    await addDoc(collection(db, 'email_registry'), record);
  } else {
    const registry = DB.get('email_registry') || [];
    if (!registry.find(r => r.email === email)) {
      registry.push(record);
      DB.set('email_registry', registry);
    }
  }
}

export const Auth = {
  getCurrentUser: () => {
    try { return JSON.parse(localStorage.getItem('talix_current_user') || 'null'); }
    catch { return null; }
  },

  register: async (email, password, displayName, faculty) => {
    if (!email.endsWith('@usil.edu.pe') && !email.endsWith('@gmail.com')) {
      throw new Error('Usa tu correo institucional USIL (@usil.edu.pe) o Gmail.');
    }
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const acceptedAt = new Date().toISOString();

    if (FIREBASE_READY) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      const profile = buildUserProfile(cred.user.uid, email, displayName, faculty, acceptedAt);
      await Promise.all([
        setDoc(doc(db, 'users', cred.user.uid), profile),
        saveEmailRegistry(email, displayName, faculty),
        sendEmailVerification(cred.user, {
          url: window.location.origin,
          handleCodeInApp: false,
        }),
      ]);
      localStorage.setItem('talix_current_user', JSON.stringify(profile));
      return profile;
    }

    // localStorage fallback
    const users = DB.get('users') || [];
    if (users.find(u => u.email === email)) throw new Error('Este correo ya está registrado.');
    const profile = buildUserProfile(Date.now().toString(), email, displayName, faculty, acceptedAt);
    profile._ph = hashPwd(password);
    DB.push('users', profile);
    await saveEmailRegistry(email, displayName, faculty);
    localStorage.setItem('talix_current_user', JSON.stringify(profile));
    return profile;
  },

  login: async (email, password) => {
    // Fetch IP silently
    let ip = null;
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip;
    } catch {}

    if (FIREBASE_READY) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      const profile = snap.exists()
        ? snap.data()
        : buildUserProfile(cred.user.uid, email, cred.user.displayName || email.split('@')[0], '');
      if (profile.status === 'baneado') throw new Error('Tu cuenta ha sido suspendida por el administrador.');
      const updated = { ...profile, lastIp: ip, lastLogin: new Date().toISOString() };
      localStorage.setItem('talix_current_user', JSON.stringify(updated));
      return updated;
    }

    // localStorage fallback
    const users = DB.get('users') || [];
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('Correo no registrado. Por favor regístrate primero.');
    // Validate password
    if (user._ph && user._ph !== hashPwd(password)) {
      throw new Error('Contraseña incorrecta.');
    }
    if (user.status === 'baneado') throw new Error('Tu cuenta ha sido suspendida por el administrador.');
    // Check IP ban
    const bannedIps = DB.get('banned_ips') || [];
    if (ip && bannedIps.includes(ip)) throw new Error('Tu acceso ha sido restringido.');
    // Save IP to user
    const userIdx = users.findIndex(u => u.id === user.id);
    if (userIdx >= 0) {
      users[userIdx] = { ...users[userIdx], lastIp: ip, lastLogin: new Date().toISOString() };
      DB.set('users', users);
      user = users[userIdx];
    }
    localStorage.setItem('talix_current_user', JSON.stringify(user));
    return user;
  },

  logout: async () => {
    if (FIREBASE_READY) await signOut(auth).catch(() => {});
    localStorage.removeItem('talix_current_user');
    localStorage.removeItem('talix_logged');
  },

  updateProfile: (updates) => {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const merged = { ...user, ...updates };
    localStorage.setItem('talix_current_user', JSON.stringify(merged));
    const users = DB.get('users') || [];
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) { users[idx] = { ...users[idx], ...updates }; DB.set('users', users); }
    return merged;
  },
};
