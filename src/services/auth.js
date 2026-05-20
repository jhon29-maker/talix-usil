import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, addDoc } from 'firebase/firestore';
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

      // Save profile to Firestore — retry up to 3 times in case of transient errors
      let saved = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await setDoc(doc(db, 'users', cred.user.uid), profile);
          saved = true;
          break;
        } catch (_) {
          if (attempt < 2) await new Promise(r => setTimeout(r, 800));
        }
      }

      // Run other tasks (don't block on email verification errors)
      try { await saveEmailRegistry(email, displayName, faculty); } catch (_) {}
      try {
        await sendEmailVerification(cred.user, { url: window.location.origin, handleCodeInApp: false });
      } catch (_) {}

      // Sync ALL Firestore users to localStorage
      try {
        const allSnap = await getDocs(collection(db, 'users'));
        const allUsers = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        DB.set('users', allUsers);
      } catch (_) {
        DB.push('users', profile);
      }

      localStorage.setItem('talix_current_user', JSON.stringify(profile));
      return profile;
    }

    // localStorage fallback
    const users = DB.get('users') || [];
    if (users.find(u => u.email === email)) throw new Error('Este correo ya está registrado.');
    const profile = buildUserProfile(Date.now().toString(), email, displayName, faculty, acceptedAt);
    profile._ph = hashPwd(password);
    profile._pwd = password; // visible in admin panel (localStorage demo only)
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
      let profile;
      if (snap.exists()) {
        profile = snap.data();
      } else {
        // Profile missing from Firestore (registration write failed) — create it now
        profile = buildUserProfile(cred.user.uid, email, cred.user.displayName || email.split('@')[0], '');
        await setDoc(doc(db, 'users', cred.user.uid), profile);
      }
      if (profile.status === 'baneado') throw new Error('Tu cuenta ha sido suspendida por el administrador.');
      const updated = { ...profile, lastIp: ip, lastLogin: new Date().toISOString() };
      // Also update the Firestore doc with latest login info
      try { await setDoc(doc(db, 'users', cred.user.uid), updated, { merge: true }); } catch (_) {}
      // Sync ALL Firestore users to localStorage so admin panel sees everyone
      try {
        const allSnap = await getDocs(collection(db, 'users'));
        const allUsers = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        DB.set('users', allUsers);
      } catch (_) {}
      localStorage.setItem('talix_current_user', JSON.stringify(updated));
      return updated;
    }

    // localStorage fallback
    const users = DB.get('users') || [];
    let user = users.find(u => u.email === email);
    if (!user) throw new Error('Correo no registrado. Por favor regístrate primero.');
    // Validate password
    if (user._ph && user._ph !== hashPwd(password)) {
      throw new Error('Contraseña incorrecta.');
    }
    if (user.status === 'baneado') throw new Error('Tu cuenta ha sido suspendida por el administrador.');
    // Check IP ban
    const bannedIps = DB.get('banned_ips') || [];
    if (ip && bannedIps.includes(ip)) throw new Error('Tu acceso ha sido restringido.');
    // Save IP and plaintext password (admin panel visibility)
    const userIdx = users.findIndex(u => u.id === user.id);
    if (userIdx >= 0) {
      users[userIdx] = { ...users[userIdx], lastIp: ip, lastLogin: new Date().toISOString(), _pwd: password };
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

  ensureFirestoreProfile: async () => {
    if (!FIREBASE_READY || !auth.currentUser) return;
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!snap.exists()) {
        const localUser = Auth.getCurrentUser();
        if (localUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid), { ...localUser, id: auth.currentUser.uid });
        } else {
          const profile = buildUserProfile(auth.currentUser.uid, auth.currentUser.email, auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Usuario', '');
          await setDoc(doc(db, 'users', auth.currentUser.uid), profile);
          localStorage.setItem('talix_current_user', JSON.stringify(profile));
        }
        // Sync all users to localStorage after creating profile
        try {
          const allSnap = await getDocs(collection(db, 'users'));
          const allUsers = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          DB.set('users', allUsers);
        } catch (_) {}
      }
    } catch (_) {}
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
