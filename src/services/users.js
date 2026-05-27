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
          DB.set('users', users);
          callback(users);
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
