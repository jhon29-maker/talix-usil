import { FIREBASE_READY, db, auth } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { DB } from './db';

export const UsersService = {
  subscribe: (callback) => {
    if (!FIREBASE_READY) {
      return DB.subscribe('users', callback);
    }

    let stopped = false;
    let timer = null;

    const fetchUsers = async () => {
      if (stopped) return;
      try {
        const snap = await getDocs(collection(db, 'users'));
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (users.length > 0) {
          DB.set('users', users);
          callback(users);
        } else {
          callback(DB.get('users') || []);
        }
      } catch (_) {
        callback(DB.get('users') || []);
      }
      if (!stopped) timer = setTimeout(fetchUsers, 5000);
    };

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (timer) clearTimeout(timer);
      if (user) {
        // Authenticated (real or anonymous) — start polling Firestore
        fetchUsers();
      } else {
        // No auth — try anonymous sign-in so admin panel can read Firestore
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged will fire again with the anonymous user
        } catch (_) {
          // Anonymous auth disabled — fall back to localStorage cache
          callback(DB.get('users') || []);
          if (!stopped) timer = setTimeout(fetchUsers, 5000);
        }
      }
    });

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      authUnsub();
    };
  },
};
