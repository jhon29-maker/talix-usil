import { FIREBASE_READY, db, auth } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
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
      if (!auth.currentUser) {
        // Not authenticated yet — use localStorage cache
        callback(DB.get('users') || []);
        return;
      }
      try {
        const snap = await getDocs(collection(db, 'users'));
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (users.length > 0) {
          DB.set('users', users); // keep cache fresh
          callback(users);
        } else {
          callback(DB.get('users') || []);
        }
      } catch (_) {
        callback(DB.get('users') || []);
      }
      // Schedule next refresh
      if (!stopped) timer = setTimeout(fetchUsers, 5000);
    };

    // Start as soon as auth is confirmed
    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (timer) clearTimeout(timer);
      fetchUsers();
    });

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      authUnsub();
    };
  },
};
