import { FIREBASE_READY, db, auth } from '../config/firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { DB } from './db';

export const UsersService = {
  subscribe: (callback) => {
    if (FIREBASE_READY) {
      // Start snapshot — works if user is authenticated (Firestore rules: auth != null)
      const unsub = onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Also update localStorage cache for admin panel
          DB.set('users', users);
          callback(users);
        },
        async () => {
          // Permission error: try one-time read with current auth, fallback to localStorage cache
          try {
            const snap = await getDocs(collection(db, 'users'));
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            DB.set('users', users);
            callback(users);
          } catch (_) {
            callback(DB.get('users') || []);
          }
        }
      );
      return unsub;
    }
    return DB.subscribe('users', callback);
  },
};
