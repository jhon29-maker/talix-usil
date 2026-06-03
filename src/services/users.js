import { FIREBASE_READY, db, auth } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { DB } from './db';

async function firestoreUsers() {
  // Ensure we have some auth (real or anonymous) before reading
  if (!auth.currentUser) {
    try { await signInAnonymously(auth); } catch (_) {}
  }
  if (!auth.currentUser) return null; // anonymous auth disabled
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export const UsersService = {
  subscribe: (callback) => {
    if (!FIREBASE_READY) {
      return DB.subscribe('users', callback);
    }

    let stopped = false;
    let timer = null;

    const poll = async () => {
      if (stopped) return;
      try {
        const users = await firestoreUsers();
        if (users && users.length > 0) {
          // Deduplicate by email — keep most recently created per email; users without email shown as-is
          const byEmail = {};
          const noEmail = [];
          users.forEach(u => {
            if (!u.email) { noEmail.push(u); return; }
            const existing = byEmail[u.email];
            if (!existing || (u.createdAt || '') > (existing.createdAt || '')) byEmail[u.email] = u;
          });
          // Exclude no-email entries that have the same displayName as an email-keyed entry (true duplicates)
          const emailNames = new Set(Object.values(byEmail).map(u => u.displayName));
          const uniqueNoEmail = noEmail.filter(u => !emailNames.has(u.displayName));
          const unique = [...Object.values(byEmail), ...uniqueNoEmail];
          DB.set('users', unique);
          callback(unique);
        } else {
          callback(DB.get('users') || []);
        }
      } catch (_) {
        callback(DB.get('users') || []);
      }
      if (!stopped) timer = setTimeout(poll, 2000);
    };

    // Small delay to let Firebase Auth restore persisted session first
    timer = setTimeout(poll, 800);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  },
};
